"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { executeWorkflow } from "@/lib/worflow/engine";

export async function runWorkflow(workflowId: string, input: any) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  return executeWorkflow({
    workflowId,
    userId: user.id,
    input,
  });
}
