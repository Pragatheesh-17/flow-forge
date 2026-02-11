import { supabaseAdmin } from "@/lib/supabase/admin";

type GmailConnection = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

type GmailConfig = {
  action: "READ" | "SEND";
  query?: string;
  max_results?: number;
  to?: string;
  subject?: string;
  body?: string;
};

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

function shouldRefresh(expiresAt: string | null) {
  if (!expiresAt) return true;
  const expires = new Date(expiresAt).getTime();
  return expires - Date.now() < 60_000;
}

async function getConnection(userId: string): Promise<GmailConnection> {
  const { data, error } = await supabaseAdmin
    .from("gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Gmail not connected for this user.");
  }

  return data as GmailConnection;
}

async function refreshAccessToken(connection: GmailConnection) {
  if (!connection.refresh_token) {
    throw new Error("Missing Gmail refresh token. Reconnect Gmail.");
  }

  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Gmail token: ${text}`);
  }

  const token = await res.json();
  const expiresAt = new Date(Date.now() + (token.expires_in ?? 0) * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("gmail_connections")
    .update({
      access_token: token.access_token,
      expires_at: expiresAt,
      updated_at: nowIso(),
    })
    .eq("id", connection.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to update Gmail token.");
  }

  return data as GmailConnection;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildRawEmail(to: string, subject: string, body: string) {
  const headers = [
    `To: ${to}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    `Subject: ${subject}`,
    "",
  ];
  return base64UrlEncode([...headers, body].join("\r\n"));
}

function decodeBase64Url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const paddedInput = padded + "=".repeat(padLength);
  return Buffer.from(paddedInput, "base64").toString("utf-8");
}

function findBody(part: any): string | null {
  if (!part) return null;
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts && Array.isArray(part.parts)) {
    for (const p of part.parts) {
      const found = findBody(p);
      if (found) return found;
    }
  }
  return null;
}

async function gmailRequest<T>(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API error: ${text}`);
  }

  return (await res.json()) as T;
}

export async function executeGmail(config: GmailConfig, nodeInput: any, userId: string) {
  let connection = await getConnection(userId);
  if (shouldRefresh(connection.expires_at)) {
    connection = await refreshAccessToken(connection);
  }

  if (config.action === "READ") {
    const query = config.query ?? "";
    const maxResults = Math.max(1, Math.min(50, config.max_results ?? 5));
    const list = await gmailRequest<{ messages?: { id: string; threadId: string }[] }>(
      connection.access_token,
      `/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
    );

    const messages = [];
    for (const msg of list.messages ?? []) {
      const detail = await gmailRequest<any>(
        connection.access_token,
        `/messages/${msg.id}?format=full`
      );
      const headers = detail.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value;
      messages.push({
        id: detail.id,
        threadId: detail.threadId,
        snippet: detail.snippet,
        internalDate: detail.internalDate,
        from: getHeader("From"),
        to: getHeader("To"),
        subject: getHeader("Subject"),
        body: findBody(detail.payload),
      });
    }

    return {
      query,
      count: messages.length,
      messages,
    };
  }

  if (config.action === "SEND") {
    const to = config.to ?? "";
    const subject = config.subject ?? "";
    const body = config.body ?? JSON.stringify(nodeInput ?? "");

    if (!to) {
      throw new Error("GMAIL SEND requires 'to' in config.");
    }

    const raw = buildRawEmail(to, subject, body);
    const result = await gmailRequest<{ id: string; threadId: string }>(
      connection.access_token,
      "/messages/send",
      {
        method: "POST",
        body: JSON.stringify({ raw }),
      }
    );

    return {
      to,
      subject,
      id: result.id,
      threadId: result.threadId,
    };
  }

  throw new Error(`Unsupported Gmail action: ${config.action}`);
}
