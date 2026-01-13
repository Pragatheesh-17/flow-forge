"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
