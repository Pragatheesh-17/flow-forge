"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NODE_TYPES } from "@/lib/constants/nodeTypes";
import { getDefaultNodeConfig } from "@/lib/constants/nodeDefaults";
import { nextRunAt, validateSchedule } from "@/lib/worflow/schedule";

export async function addNode(workflowId: string, formData: FormData) {
  const rawType = String(formData.get("type") || "TRIGGER");
  const type = NODE_TYPES.includes(rawType as (typeof NODE_TYPES)[number])
    ? rawType
    : "TRIGGER";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { count } = await supabase
    .from("workflow_nodes")
    .select("*", { count: "exact", head: true })
    .eq("workflow_id", workflowId);

  const x = 100 + (count ?? 0) * 250;
  const y = 100;

  const { data, error } = await supabase
    .from("workflow_nodes")
    .insert({
      workflow_id: workflowId,
      type,
      position: count ?? 0,
      pos_x: x,
      pos_y: y,
      config: getDefaultNodeConfig(type as (typeof NODE_TYPES)[number]),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateNode(
  nodeId: string,
  updates: {
    type: string;
    config: any;
  }
) {
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("workflow_nodes")
    .update({
      type: updates.type,
      config: updates.config,
    })
    .eq("id", nodeId);
}

export async function deleteNode(nodeId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await supabase.from("workflow_nodes").delete().eq("id", nodeId);
}

export async function reorderNodes(
  updates: { id: string; position: number; pos_x: number; pos_y: number }[]
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await Promise.all(
    updates.map((update) =>
      supabase
        .from("workflow_nodes")
        .update({
          position: update.position,
          pos_x: update.pos_x,
          pos_y: update.pos_y,
        })
        .eq("id", update.id)
      )
  );
}

export async function addEdge(
  workflowId: string,
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("workflow_edges")
    .insert({
      workflow_id: workflowId,
      source_node_id: source,
      target_node_id: target,
      source_handle: sourceHandle ?? null,
      target_handle: targetHandle ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEdge(edgeId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await supabase.from("workflow_edges").delete().eq("id", edgeId);
}

export async function saveWorkflowSchedule(
  workflowId: string,
  schedule: {
    enabled: boolean;
    cron_expression: string;
    timezone: string;
  }
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: workflow } = await supabase
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("user_id", user.id)
    .single();

  if (!workflow) throw new Error("Workflow not found");

  const cronExpression = schedule.cron_expression.trim();
  const timezone = schedule.timezone.trim();
  validateSchedule(cronExpression, timezone);

  const nextRun = schedule.enabled ? nextRunAt(cronExpression, timezone, new Date()) : null;

  const { data, error } = await supabaseAdmin
    .from("workflow_schedules")
    .upsert(
      {
        workflow_id: workflowId,
        enabled: schedule.enabled,
        cron_expression: cronExpression,
        timezone,
        next_run_at: nextRun,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workflow_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
