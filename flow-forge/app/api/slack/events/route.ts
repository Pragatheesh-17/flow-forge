import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { executeWorkflow } from "@/lib/worflow/engine";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySlackSignature(rawBody: string, timestamp: string, signature: string) {
  const signingSecret = getEnv("SLACK_SIGNING_SECRET");
  const base = `v0:${timestamp}:${rawBody}`;
  const hash = crypto
    .createHmac("sha256", signingSecret)
    .update(base, "utf8")
    .digest("hex");
  const expected = `v0=${hash}`;
  return timingSafeEqual(expected, signature);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const payload = JSON.parse(rawBody);

  // Slack URL verification expects JSON with the challenge value.
  // Handle this first so endpoint verification is not blocked by signature/timestamp issues.
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge }, { status: 200 });
  }

  const timestamp = req.headers.get("x-slack-request-timestamp") || "";
  const signature = req.headers.get("x-slack-signature") || "";

  const ts = Number(timestamp);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 60 * 5) {
    return NextResponse.json({ error: "Invalid timestamp." }, { status: 400 });
  }

  if (!signature || !verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (payload.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event || {};
  if (event.subtype === "bot_message" || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const teamId = payload.team_id || event.team;
  if (!teamId) {
    return NextResponse.json({ ok: true });
  }

  const { data: nodes, error } = await supabaseAdmin
    .from("workflow_nodes")
    .select("id, workflow_id, config")
    .eq("type", "SLACK_TRIGGER");

  if (error || !nodes) {
    return NextResponse.json({ ok: true });
  }

  const matchingNodes = nodes.filter((node: any) => {
    const cfg = node.config || {};

    // If team_id is configured, it must match. If empty, allow any team.
    if (cfg.team_id && cfg.team_id !== teamId) return false;

    if (cfg.channel && event.channel && cfg.channel !== event.channel) return false;

    const configuredTypes = Array.isArray(cfg.event_types) && cfg.event_types.length > 0
      ? cfg.event_types
      : ["message", "app_mention"];

    return configuredTypes.includes(event.type);
  });

  if (matchingNodes.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const workflowIds = Array.from(new Set(matchingNodes.map((n: any) => n.workflow_id)));

  const { data: workflows } = await supabaseAdmin
    .from("workflows")
    .select("id, user_id")
    .in("id", workflowIds);

  const workflowById = new Map((workflows || []).map((w: any) => [w.id, w]));

  const input = {
    source: "slack",
    team_id: teamId,
    event_id: payload.event_id,
    event_type: event.type,
    event_subtype: event.subtype || null,
    channel: event.channel || null,
    user: event.user || null,
    text: event.text || null,
    raw: payload,
  };

  await Promise.all(
    workflowIds.map(async (workflowId) => {
      const wf = workflowById.get(workflowId);
      if (!wf) return;

      const { count } = await supabaseAdmin
        .from("workflow_runs")
        .select("id", { count: "exact", head: true })
        .eq("workflow_id", workflowId)
        .contains("input", {
          source: "slack",
          event_id: payload.event_id,
        });

      if ((count || 0) > 0) {
        return;
      }

      await executeWorkflow({
        workflowId,
        userId: wf.user_id,
        input,
      });
    })
  );

  return NextResponse.json({ ok: true });
}
