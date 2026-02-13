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
  const expectedState = cookieStore.get("slack_oauth_state")?.value;
  const returnTo = cookieStore.get("slack_oauth_return_to")?.value;
  cookieStore.delete("slack_oauth_state");
  cookieStore.delete("slack_oauth_return_to");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const clientId = getEnv("SLACK_CLIENT_ID");
  const clientSecret = getEnv("SLACK_CLIENT_SECRET");
  const redirectUri = `${getBaseUrl()}/api/slack/callback`;

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.ok) {
    return NextResponse.json(
      { error: `Failed to exchange code: ${token.error || "unknown_error"}` },
      { status: 400 }
    );
  }

  const teamId = token.team?.id;
  const teamName = token.team?.name || null;
  const botUserId = token.bot_user_id || null;
  const botAccessToken = token.access_token;

  if (!teamId || !botAccessToken) {
    return NextResponse.json(
      { error: "Slack token response missing team or bot token." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("slack_connections").upsert(
    {
      user_id: user.id,
      team_id: teamId,
      bot_access_token: botAccessToken,
    },
    { onConflict: "user_id,team_id" }
  );

  if (error) {
    return NextResponse.json(
      { error: `Failed to store Slack tokens: ${error.message}` },
      { status: 500 }
    );
  }

  const safeReturnTo = returnTo && returnTo.startsWith("/") ? returnTo : "/workflows";
  return NextResponse.redirect(new URL(safeReturnTo, getBaseUrl()));
}
