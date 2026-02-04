"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NODE_TYPES } from "@/lib/constants/nodeTypes";
import { getDefaultNodeConfig } from "@/lib/constants/nodeDefaults";

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
