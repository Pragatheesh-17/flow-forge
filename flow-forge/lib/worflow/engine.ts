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

  const { data: edges } = await supabaseAdmin
    .from("workflow_edges")
    .select("*")
    .eq("workflow_id", workflowId);

  const nodeById = new Map((nodes || []).map((node) => [node.id, node]));

  const normalizedEdges = (edges || []).filter(
    (edge) => nodeById.has(edge.source_node_id) && nodeById.has(edge.target_node_id)
  );

  const useEdges = normalizedEdges.length > 0;

  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  if (useEdges) {
    for (const node of nodes || []) {
      incoming.set(node.id, new Set());
      outgoing.set(node.id, new Set());
      indegree.set(node.id, 0);
    }

    for (const edge of normalizedEdges) {
      if (edge.source_node_id === edge.target_node_id) continue;
      incoming.get(edge.target_node_id)?.add(edge.source_node_id);
      outgoing.get(edge.source_node_id)?.add(edge.target_node_id);
    }

    for (const [nodeId, sources] of incoming.entries()) {
      indegree.set(nodeId, sources.size);
    }
  }

  try {
    let executionOrder: any[] = nodes || [];

    if (useEdges) {
      const queue: any[] = [];
      for (const node of nodes || []) {
        if ((indegree.get(node.id) ?? 0) === 0) {
          queue.push(node);
        }
      }

      const ordered: any[] = [];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        ordered.push(current);
        for (const targetId of outgoing.get(current.id) || []) {
          const next = (indegree.get(targetId) ?? 0) - 1;
          indegree.set(targetId, next);
          if (next === 0) {
            const nextNode = nodeById.get(targetId);
            if (nextNode) queue.push(nextNode);
          }
        }
      }

      if (ordered.length !== (nodes || []).length) {
        throw new Error("Workflow graph has a cycle or disconnected edges.");
      }

      executionOrder = ordered;
    }

    for (const node of executionOrder) {
      let nodeInput: any;
      if (useEdges) {
        const sources = incoming.get(node.id);
        if (!sources || sources.size === 0) {
          nodeInput = input;
        } else if (sources.size === 1) {
          const sourceId = Array.from(sources)[0];
          nodeInput = context[sourceId];
        } else {
          const bundled: Record<string, any> = {};
          for (const sourceId of sources) {
            bundled[sourceId] = context[sourceId];
          }
          nodeInput = bundled;
        }
      } else {
        nodeInput = lastOutput;
      }

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

    let workflowOutput: any = lastOutput;
    if (useEdges) {
      const terminalIds = (nodes || [])
        .map((node) => node.id)
        .filter((nodeId) => (outgoing.get(nodeId)?.size ?? 0) === 0);

      if (terminalIds.length === 1) {
        workflowOutput = context[terminalIds[0]];
      } else if (terminalIds.length > 1) {
        workflowOutput = terminalIds.reduce((acc, nodeId) => {
          acc[nodeId] = context[nodeId];
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Mark workflow success (using admin client to bypass RLS)
    await supabaseAdmin
      .from("workflow_runs")
      .update({
        output: workflowOutput,
        status: "SUCCESS",
      })
      .eq("id", run.id);

    return workflowOutput;
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
