import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", getBaseUrl()));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = `${getBaseUrl()}/api/gmail/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json(
      { error: `Failed to exchange code: ${text}` },
      { status: 400 }
    );
  }

  const token = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (token.expires_in ?? 0) * 1000).toISOString();

  const { data: existing } = await supabaseAdmin
    .from("gmail_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const refreshToken = token.refresh_token || existing?.refresh_token || null;

  const { error } = await supabaseAdmin.from("gmail_connections").upsert(
    {
      user_id: user.id,
      access_token: token.access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json(
      { error: `Failed to store Gmail tokens: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL("/workflows", getBaseUrl()));
}
