"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function renameWorkflow(workflowId: string, name: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("workflows")
    .update({ name })
    .eq("id", workflowId)
    .eq("user_id", user.id);
}

export async function deleteWorkflow(workflowId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId)
    .eq("user_id", user.id);
}
