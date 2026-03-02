import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveTemplate } from "./template";
import { executeRAG } from "./rag";
import { executeAI } from "./ai";
import { executeHttp } from "./http";
import { executeGmail } from "./gmail";
import { executeSlackSend } from "./slack";
import { evaluateConditional, validateConditionalConfig } from "./conditional";
import { RetryConfig, retryDelayMs, validateRetryConfig } from "./retry";
import { executeJsonTransform } from "./jsonTransform";

type WorkflowNode = {
  id: string;
  type: string;
  config: any;
};

type WorkflowEdge = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle?: string | null;
  target_handle?: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeError(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function executeWorkflow({
  workflowId,
  userId,
  input,
}: {
  workflowId: string;
  userId: string;
  input: any;
}) {
  await createSupabaseServerClient();

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
  const executedNodeIds = new Set<string>();

  const { data: nodes } = await supabaseAdmin
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("position", { ascending: true });

  const { data: edges } = await supabaseAdmin
    .from("workflow_edges")
    .select("*")
    .eq("workflow_id", workflowId);

  const normalizedNodes = (nodes || []) as WorkflowNode[];
  const nodeById = new Map(normalizedNodes.map((node) => [node.id, node]));
  const normalizedEdges = ((edges || []) as WorkflowEdge[]).filter(
    (edge) => nodeById.has(edge.source_node_id) && nodeById.has(edge.target_node_id)
  );

  const useEdges = normalizedEdges.length > 0;
  const incomingEdges = new Map<string, WorkflowEdge[]>();
  const outgoingEdges = new Map<string, WorkflowEdge[]>();
  const indegree = new Map<string, number>();

  for (const node of normalizedNodes) {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
    indegree.set(node.id, 0);
  }

  for (const edge of normalizedEdges) {
    if (edge.source_node_id === edge.target_node_id) continue;
    incomingEdges.get(edge.target_node_id)?.push(edge);
    outgoingEdges.get(edge.source_node_id)?.push(edge);
    indegree.set(edge.target_node_id, (indegree.get(edge.target_node_id) ?? 0) + 1);
  }

  const queue: WorkflowNode[] = [];
  for (const node of normalizedNodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      queue.push(node);
    }
  }

  const executionOrder: WorkflowNode[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    executionOrder.push(current);
    for (const edge of outgoingEdges.get(current.id) || []) {
      const next = (indegree.get(edge.target_node_id) ?? 0) - 1;
      indegree.set(edge.target_node_id, next);
      if (next === 0) {
        const nextNode = nodeById.get(edge.target_node_id);
        if (nextNode) queue.push(nextNode);
      }
    }
  }

  try {
    if (useEdges && executionOrder.length !== normalizedNodes.length) {
      throw new Error("Workflow graph has a cycle or disconnected edges.");
    }

    const orderedNodes = useEdges ? executionOrder : normalizedNodes;
    const prunedEdgeIds = new Set<string>();
    let pendingSequentialRetry: RetryConfig | null = null;

    const executeNodeCore = async (node: WorkflowNode, nodeInput: any) => {
      let nodeOutput: any;

      switch (node.type) {
        case "TRIGGER":
        case "SLACK_TRIGGER":
          nodeOutput = nodeInput;
          break;

        case "RETRY":
          validateRetryConfig(node.config);
          nodeOutput = nodeInput;
          break;

        case "AI_TRANSFORM":
          nodeOutput = await executeAI(node.config, nodeInput);
          break;

        case "JSON_TRANSFORM":
          nodeOutput = executeJsonTransform(node.config, nodeInput);
          break;

        case "HTTP_REQUEST": {
          const resolvedConfig = resolveTemplate(node.config, { input: nodeInput });
          nodeOutput = await executeHttp(resolvedConfig, nodeInput);
          break;
        }

        case "RAG_QA":
          nodeOutput = await executeRAG(node.config, nodeInput, userId);
          break;

        case "GMAIL": {
          const resolvedConfig = resolveTemplate(node.config, { input: nodeInput });
          nodeOutput = await executeGmail(resolvedConfig, nodeInput, userId);
          break;
        }

        case "SLACK":
          nodeOutput = await executeSlackSend(node.config, nodeInput, userId, input);
          break;

        case "CONDITIONAL": {
          validateConditionalConfig(node.config);
          const evaluation = evaluateConditional(node.config, nodeInput);
          const selectedBranch = evaluation.result ? "true" : "false";
          const conditionalOutgoing = outgoingEdges.get(node.id) || [];

          for (const edge of conditionalOutgoing) {
            if (edge.source_handle !== "true" && edge.source_handle !== "false") {
              throw new Error(
                `Conditional node ${node.id} has edge ${edge.id} without a valid source_handle (true/false).`
              );
            }
            if (edge.source_handle !== selectedBranch) {
              prunedEdgeIds.add(edge.id);
            }
          }

          nodeOutput = {
            branch: selectedBranch,
            condition: {
              left: evaluation.left,
              operator: node.config.operator,
              right: evaluation.right,
              result: evaluation.result,
            },
            passthrough: nodeInput,
          };
          break;
        }

        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      return nodeOutput;
    };

    const executeNodeWithRetry = async (
      node: WorkflowNode,
      nodeInput: any,
      retryConfig: RetryConfig | null
    ) => {
      const maxRetries = retryConfig?.max_retries ?? 0;
      const maxAttempts = maxRetries + 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const runInput =
          attempt === 1
            ? nodeInput
            : {
                payload: nodeInput,
                retry: {
                  attempt,
                  max_attempts: maxAttempts,
                  strategy: retryConfig?.strategy ?? "fixed",
                  delay_ms: retryConfig?.delay_ms ?? 0,
                },
              };

        const { data: nodeRun, error: nodeRunError } = await supabaseAdmin
          .from("node_runs")
          .insert({
            workflow_run_id: run.id,
            node_id: node.id,
            input: runInput,
            status: "RUNNING",
          })
          .select()
          .single();

        if (nodeRunError || !nodeRun) {
          throw new Error(`Failed to create node run: ${nodeRunError?.message}`);
        }

        try {
          const nodeOutput = await executeNodeCore(node, nodeInput);
          await supabaseAdmin
            .from("node_runs")
            .update({
              output: nodeOutput,
              status: "SUCCESS",
            })
            .eq("id", nodeRun.id);
          return nodeOutput;
        } catch (err) {
          const message = normalizeError(err);
          await supabaseAdmin
            .from("node_runs")
            .update({
              output: {
                error: message,
                retry: {
                  attempt,
                  max_attempts: maxAttempts,
                  will_retry: attempt < maxAttempts,
                },
              },
              status: "FAILED",
            })
            .eq("id", nodeRun.id);

          if (attempt >= maxAttempts) {
            throw err;
          }

          const waitMs = retryDelayMs(
            retryConfig?.delay_ms ?? 0,
            retryConfig?.strategy ?? "fixed",
            attempt
          );
          if (waitMs > 0) {
            await sleep(waitMs);
          }
        }
      }

      throw new Error("Unexpected retry flow termination.");
    };

    for (const node of orderedNodes) {
      let nodeInput: any;
      let activeIncomingEdges: WorkflowEdge[] = [];

      if (useEdges) {
        activeIncomingEdges = (incomingEdges.get(node.id) || []).filter(
          (edge) =>
            !prunedEdgeIds.has(edge.id) &&
            executedNodeIds.has(edge.source_node_id) &&
            edge.source_node_id !== edge.target_node_id
        );

        const isRoot = (incomingEdges.get(node.id)?.length ?? 0) === 0;
        if (!isRoot && activeIncomingEdges.length === 0) {
          continue;
        }

        if (isRoot) {
          nodeInput = input;
        } else if (activeIncomingEdges.length === 1) {
          nodeInput = context[activeIncomingEdges[0].source_node_id];
        } else {
          const bundled: Record<string, any> = {};
          for (const edge of activeIncomingEdges) {
            bundled[edge.source_node_id] = context[edge.source_node_id];
          }
          nodeInput = bundled;
        }
      } else {
        nodeInput = lastOutput;
      }

      let retryConfigForNode: RetryConfig | null = null;

      if (node.type !== "RETRY") {
        if (useEdges) {
          const retrySourceEdges = activeIncomingEdges.filter(
            (edge) => nodeById.get(edge.source_node_id)?.type === "RETRY"
          );

          if (retrySourceEdges.length > 1) {
            throw new Error(
              `Node ${node.id} has multiple RETRY parents. Only one RETRY parent is allowed.`
            );
          }

          if (retrySourceEdges.length === 1) {
            const retryNode = nodeById.get(retrySourceEdges[0].source_node_id);
            if (!retryNode) {
              throw new Error(`Retry source node not found for node ${node.id}.`);
            }
            validateRetryConfig(retryNode.config);
            retryConfigForNode = retryNode.config;
          }
        } else if (pendingSequentialRetry) {
          retryConfigForNode = pendingSequentialRetry;
          pendingSequentialRetry = null;
        }
      }

      const nodeOutput = await executeNodeWithRetry(node, nodeInput, retryConfigForNode);

      if (node.type === "RETRY" && !useEdges) {
        validateRetryConfig(node.config);
        pendingSequentialRetry = node.config;
      }

      context[node.id] = node.type === "CONDITIONAL" ? nodeOutput.passthrough : nodeOutput;
      lastOutput = context[node.id];
      executedNodeIds.add(node.id);
    }

    let workflowOutput: any = lastOutput;
    if (useEdges) {
      const terminalIds = normalizedNodes
        .map((node) => node.id)
        .filter((nodeId) => {
          const activeOutgoing = (outgoingEdges.get(nodeId) || []).filter(
            (edge) => !prunedEdgeIds.has(edge.id)
          );
          return activeOutgoing.length === 0;
        })
        .filter((nodeId) => executedNodeIds.has(nodeId));

      if (terminalIds.length === 1) {
        workflowOutput = context[terminalIds[0]];
      } else if (terminalIds.length > 1) {
        workflowOutput = terminalIds.reduce((acc, nodeId) => {
          acc[nodeId] = context[nodeId];
          return acc;
        }, {} as Record<string, any>);
      }
    }

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
