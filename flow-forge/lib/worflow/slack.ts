import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveTemplate } from "./template";

type SlackConnection = {
  id: string;
  user_id: string;
  team_id: string;
  team_name: string | null;
  bot_user_id: string | null;
  bot_access_token: string;
  scope: string | null;
};

type SlackSendConfig = {
  action: "SEND";
  team_id?: string;
  channel?: string;
  text?: string;
};

type SlackWorkflowInput = {
  source?: string;
  team_id?: string | null;
  channel?: string | null;
};

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

async function getConnection(userId: string, teamId?: string): Promise<SlackConnection> {
  let query = supabaseAdmin
    .from("slack_connections")
    .select("*")
    .eq("user_id", userId);

  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query.single();
  if (error || !data) {
    throw new Error("Slack not connected for this user/workspace.");
  }
  return data as SlackConnection;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function slackRequest(
  token: string,
  path: string,
  body: any,
  retryOnRateLimit = true
) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && retryOnRateLimit) {
    const retryAfter = Number(res.headers.get("retry-after") || "1");
    await sleep(Math.min(Math.max(retryAfter, 1), 5) * 1000);
    return slackRequest(token, path, body, false);
  }

  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Slack API error: ${json.error || "unknown_error"}`);
  }
  return json;
}

export async function executeSlackSend(
  config: SlackSendConfig,
  nodeInput: any,
  userId: string,
  workflowInput?: SlackWorkflowInput
) {
  const resolved = resolveTemplate(config, { input: nodeInput });
  const teamId =
    resolved.team_id ||
    (workflowInput?.source === "slack" ? workflowInput.team_id || undefined : undefined);
  const channel =
    resolved.channel ||
    (workflowInput?.source === "slack" ? workflowInput.channel || undefined : undefined);
  const text = resolved.text;

  if (!teamId) throw new Error("Slack SEND requires 'team_id' in config.");
  if (!channel) throw new Error("Slack SEND requires 'channel' in config.");
  if (!text) throw new Error("Slack SEND requires 'text' in config.");

  const connection = await getConnection(userId, teamId);

  await slackRequest(connection.bot_access_token, "chat.postMessage", {
    channel,
    text,
  });

  return {
    team_id: teamId,
    channel,
    text,
    ok: true,
  };
}
