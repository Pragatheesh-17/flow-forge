import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  // Create workflow run
  const { data: run } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_id: workflowId,
      user_id: userId,
      input,
      status: "RUNNING",
    })
    .select()
    .single();

  let lastOutput: any = input;
  const context: Record<string, any> = {};

  // Fetch nodes
  const { data: nodes } = await supabase
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("position", { ascending: true });

  try {
    for (const node of nodes || []) {
      const nodeInput = lastOutput;

      // Create node run
      const { data: nodeRun } = await supabase
        .from("node_runs")
        .insert({
          workflow_run_id: run.id,
          node_id: node.id,
          input: nodeInput,
          status: "RUNNING",
        })
        .select()
        .single();

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

      // Save node output
      await supabase
        .from("node_runs")
        .update({
          output: nodeOutput,
          status: "SUCCESS",
        })
        .eq("id", nodeRun.id);

      context[node.id] = nodeOutput;
      lastOutput = nodeOutput;
    }

    // Mark workflow success
    await supabase
      .from("workflow_runs")
      .update({
        output: lastOutput,
        status: "SUCCESS",
      })
      .eq("id", run.id);

    return lastOutput;
  } catch (err: any) {
    await supabase
      .from("workflow_runs")
      .update({
        status: "FAILED",
        error: err.message,
      })
      .eq("id", run.id);

    throw err;
  }
}
