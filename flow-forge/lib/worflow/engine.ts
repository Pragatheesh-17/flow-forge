import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveTemplate } from "./template";
import { executeRAG } from "./rag";
import { executeAI } from "./ai";
import { executeHttp } from "./http";


export async function executeWorkflow({
  workflowId,
  userId,
  input,
}: {
  workflowId: string;
  userId: string;
  input: any;
}) {
  const supabase = await createSupabaseServerClient();

  // Create workflow run (using admin client to bypass RLS)
  const { data: run, error: runError } = await supabaseAdmin
    .from("workflow_runs")
    .insert({
      workflow_id: workflowId,
      user_id: userId,
      input,
      status: "RUNNING",
    })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create workflow run: ${runError?.message}`);
  }

  let lastOutput: any = input;
  const context: Record<string, any> = {};

  // Fetch nodes (using admin client to bypass RLS)
  const { data: nodes } = await supabaseAdmin
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("position", { ascending: true });

  try {
    for (const node of nodes || []) {
      const nodeInput = lastOutput;

      // Create node run (using admin client to bypass RLS)
      const { data: nodeRun, error: nodeRunError } = await supabaseAdmin
        .from("node_runs")
        .insert({
          workflow_run_id: run.id,
          node_id: node.id,
          input: nodeInput,
          status: "RUNNING",
        })
        .select()
        .single();

      if (nodeRunError || !nodeRun) {
        throw new Error(`Failed to create node run: ${nodeRunError?.message}`);
      }

      let nodeOutput;

      switch (node.type) {
        case "TRIGGER":
          nodeOutput = nodeInput;
          break;

        case "AI_TRANSFORM":
          nodeOutput = await executeAI(node.config, nodeInput);
          break;

        case "HTTP_REQUEST":
          const resolvedConfig = resolveTemplate(node.config, { input: nodeInput });
          nodeOutput = await executeHttp(resolvedConfig, nodeInput);
          break;
        
        case "RAG_QA":
          nodeOutput = await executeRAG(node.config, nodeInput, userId);
          break;


        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      // Save node output (using admin client to bypass RLS)
      await supabaseAdmin
        .from("node_runs")
        .update({
          output: nodeOutput,
          status: "SUCCESS",
        })
        .eq("id", nodeRun.id);

      context[node.id] = nodeOutput;
      lastOutput = nodeOutput;
    }

    // Mark workflow success (using admin client to bypass RLS)
    await supabaseAdmin
      .from("workflow_runs")
      .update({
        output: lastOutput,
        status: "SUCCESS",
      })
      .eq("id", run.id);

    return lastOutput;
  } catch (err: any) {
    await supabaseAdmin
      .from("workflow_runs")
      .update({
        status: "FAILED",
        error: err.message,
      })
      .eq("id", run.id);

    throw err;
  }
}
