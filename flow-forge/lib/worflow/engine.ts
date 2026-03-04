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
import { validateDelayConfig } from "./delay";
import { resolveLoopArray, validateLoopConfig } from "./loop";

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

type ExecutionState = {
  ordered_node_ids: string[];
  next_index: number;
  context: Record<string, any>;
  executed_node_ids: string[];
  pruned_edge_ids: string[];
  last_output: any;
  pending_sequential_retry: RetryConfig | null;
  use_edges: boolean;
};

type DelayRow = {
  id: string;
  workflow_run_id: string;
  workflow_id: string;
  user_id: string;
  resume_at: string;
  state: ExecutionState;
};

const LOOP_MAX_ITEMS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeError(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function buildNodeErrorPayload(node: WorkflowNode, nodeInput: any, err: unknown) {
  return {
    source: "node_error",
    failed_node_id: node.id,
    failed_node_type: node.type,
    message: normalizeError(err),
    input: nodeInput,
    at: new Date().toISOString(),
  };
}

async function buildGraph(workflowId: string) {
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

  let orderedNodeIds = normalizedNodes.map((node) => node.id);

  if (useEdges) {
    const queue: WorkflowNode[] = [];
    for (const node of normalizedNodes) {
      if ((indegree.get(node.id) ?? 0) === 0) queue.push(node);
    }

    const ordered: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      ordered.push(current.id);
      for (const edge of outgoingEdges.get(current.id) || []) {
        const next = (indegree.get(edge.target_node_id) ?? 0) - 1;
        indegree.set(edge.target_node_id, next);
        if (next === 0) {
          const nextNode = nodeById.get(edge.target_node_id);
          if (nextNode) queue.push(nextNode);
        }
      }
    }

    if (ordered.length !== normalizedNodes.length) {
      throw new Error("Workflow graph has a cycle or disconnected edges.");
    }

    orderedNodeIds = ordered;
  }

  return {
    nodes: normalizedNodes,
    nodeById,
    edges: normalizedEdges,
    incomingEdges,
    outgoingEdges,
    useEdges,
    orderedNodeIds,
  };
}

function createInitialState(orderedNodeIds: string[], useEdges: boolean, input: any): ExecutionState {
  return {
    ordered_node_ids: orderedNodeIds,
    next_index: 0,
    context: {},
    executed_node_ids: [],
    pruned_edge_ids: [],
    last_output: input,
    pending_sequential_retry: null,
    use_edges: useEdges,
  };
}

function deserializeState(raw: any, fallbackOrder: string[], useEdges: boolean, input: any): ExecutionState {
  if (!raw || typeof raw !== "object") {
    return createInitialState(fallbackOrder, useEdges, input);
  }

  return {
    ordered_node_ids: Array.isArray(raw.ordered_node_ids) ? raw.ordered_node_ids : fallbackOrder,
    next_index: Number.isInteger(raw.next_index) ? raw.next_index : 0,
    context: raw.context && typeof raw.context === "object" ? raw.context : {},
    executed_node_ids: Array.isArray(raw.executed_node_ids) ? raw.executed_node_ids : [],
    pruned_edge_ids: Array.isArray(raw.pruned_edge_ids) ? raw.pruned_edge_ids : [],
    last_output: "last_output" in raw ? raw.last_output : input,
    pending_sequential_retry:
      raw.pending_sequential_retry && typeof raw.pending_sequential_retry === "object"
        ? raw.pending_sequential_retry
        : null,
    use_edges: typeof raw.use_edges === "boolean" ? raw.use_edges : useEdges,
  };
}

async function upsertDelayRow(params: {
  workflowRunId: string;
  workflowId: string;
  userId: string;
  resumeAtIso: string;
  state: ExecutionState;
}) {
  const nowIso = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("workflow_run_delays")
    .upsert(
      {
        workflow_run_id: params.workflowRunId,
        workflow_id: params.workflowId,
        user_id: params.userId,
        resume_at: params.resumeAtIso,
        state: params.state,
        status: "WAITING",
        last_error: null,
        updated_at: nowIso,
      },
      { onConflict: "workflow_run_id" }
    );

  if (error) {
    throw new Error(`Failed to persist delay state: ${error.message}`);
  }
}

async function clearDelayRow(workflowRunId: string) {
  await supabaseAdmin.from("workflow_run_delays").delete().eq("workflow_run_id", workflowRunId);
}

async function continueWorkflowRun(params: {
  workflowRunId: string;
  workflowId: string;
  userId: string;
  input: any;
  resumeState?: any;
}) {
  const graph = await buildGraph(params.workflowId);
  const state = deserializeState(
    params.resumeState,
    graph.orderedNodeIds,
    graph.useEdges,
    params.input
  );

  const orderedNodeIds = state.ordered_node_ids;
  const executedNodeIds = new Set<string>(state.executed_node_ids);
  const prunedEdgeIds = new Set<string>(state.pruned_edge_ids);
  let pendingSequentialRetry = state.pending_sequential_retry;
  let lastOutput = state.last_output;
  const context: Record<string, any> = state.context || {};

  const executeNodeCore = async (
    node: WorkflowNode,
    nodeInput: any,
    pruneTarget: Set<string>
  ) => {
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

      case "DELAY":
        validateDelayConfig(node.config);
        nodeOutput = nodeInput;
        break;

      case "LOOP":
        validateLoopConfig(node.config);
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
        nodeOutput = await executeRAG(node.config, nodeInput, params.userId);
        break;

      case "GMAIL": {
        const resolvedConfig = resolveTemplate(node.config, { input: nodeInput });
        nodeOutput = await executeGmail(resolvedConfig, nodeInput, params.userId);
        break;
      }

      case "SLACK":
        nodeOutput = await executeSlackSend(node.config, nodeInput, params.userId, params.input);
        break;

      case "CONDITIONAL": {
        validateConditionalConfig(node.config);
        const evaluation = evaluateConditional(node.config, nodeInput);
        const selectedBranch = evaluation.result ? "true" : "false";
        const conditionalOutgoing = graph.outgoingEdges.get(node.id) || [];

        for (const edge of conditionalOutgoing) {
          if (edge.source_handle !== "true" && edge.source_handle !== "false") {
            throw new Error(
              `Conditional node ${node.id} has edge ${edge.id} without a valid source_handle (true/false).`
            );
          }
          if (edge.source_handle !== selectedBranch) {
            pruneTarget.add(edge.id);
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
    retryConfig: RetryConfig | null,
    pruneTarget: Set<string>
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
          workflow_run_id: params.workflowRunId,
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
          const nodeOutput = await executeNodeCore(node, nodeInput, pruneTarget);
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

  for (let index = state.next_index; index < orderedNodeIds.length; index++) {
    const nodeId = orderedNodeIds[index];
    const node = graph.nodeById.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found while resuming workflow.`);
    }

    let nodeInput: any;
    let activeIncomingEdges: WorkflowEdge[] = [];

    if (state.use_edges) {
      activeIncomingEdges = (graph.incomingEdges.get(node.id) || []).filter(
        (edge) =>
          !prunedEdgeIds.has(edge.id) &&
          executedNodeIds.has(edge.source_node_id) &&
          edge.source_node_id !== edge.target_node_id
      );

      const isRoot = (graph.incomingEdges.get(node.id)?.length ?? 0) === 0;
      if (!isRoot && activeIncomingEdges.length === 0) {
        state.next_index = index + 1;
        continue;
      }

      if (isRoot) {
        nodeInput = params.input;
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
      if (state.use_edges) {
        const retrySourceEdges = activeIncomingEdges.filter(
          (edge) => graph.nodeById.get(edge.source_node_id)?.type === "RETRY"
        );

        if (retrySourceEdges.length > 1) {
          throw new Error(
            `Node ${node.id} has multiple RETRY parents. Only one RETRY parent is allowed.`
          );
        }

        if (retrySourceEdges.length === 1) {
          const retryNode = graph.nodeById.get(retrySourceEdges[0].source_node_id);
          if (!retryNode) throw new Error(`Retry source node not found for node ${node.id}.`);
          validateRetryConfig(retryNode.config);
          retryConfigForNode = retryNode.config;
        }
      } else if (pendingSequentialRetry) {
        retryConfigForNode = pendingSequentialRetry;
        pendingSequentialRetry = null;
      }
    }

    let nodeOutput: any;
    let routedToErrorBranch = false;
    try {
      nodeOutput = await executeNodeWithRetry(node, nodeInput, retryConfigForNode, prunedEdgeIds);

      if (node.type === "LOOP") {
        validateLoopConfig(node.config);
        const resolved = resolveLoopArray(node.config.path, nodeInput);
        if (!Array.isArray(resolved)) {
          throw new Error(`LOOP path '${node.config.path}' did not resolve to an array.`);
        }
        if (resolved.length > LOOP_MAX_ITEMS) {
          throw new Error(`LOOP exceeds max items (${LOOP_MAX_ITEMS}).`);
        }

        const outgoingFromLoop = graph.outgoingEdges.get(node.id) || [];
        const itemTargets = outgoingFromLoop
          .filter((edge) => edge.source_handle === "item")
          .map((edge) => edge.target_node_id);

        const doneTargets = outgoingFromLoop
          .filter((edge) => edge.source_handle === "done")
          .map((edge) => edge.target_node_id);

        const walkReachable = (starts: string[]) => {
          const reachable = new Set<string>();
          const queue = [...starts];
          while (queue.length > 0) {
            const current = queue.shift();
            if (!current || reachable.has(current)) continue;
            reachable.add(current);
            for (const edge of graph.outgoingEdges.get(current) || []) {
              if (!reachable.has(edge.target_node_id)) {
                queue.push(edge.target_node_id);
              }
            }
          }
          return reachable;
        };

        const doneReachable = walkReachable(doneTargets);
        const bodyReachable = walkReachable(itemTargets);
        bodyReachable.delete(node.id);
        for (const id of doneReachable) {
          bodyReachable.delete(id);
        }

        const orderedBodyNodes = orderedNodeIds.filter((id) => bodyReachable.has(id));
        for (const bodyNodeId of orderedBodyNodes) {
          const bodyNode = graph.nodeById.get(bodyNodeId);
          if (bodyNode?.type === "LOOP") {
            throw new Error("Nested LOOP nodes are not supported.");
          }
        }

        const results: any[] = [];

        for (let loopIndex = 0; loopIndex < resolved.length; loopIndex++) {
          const item = resolved[loopIndex];
          const localPruned = new Set<string>();
          const localExecuted = new Set<string>();
          const localContext: Record<string, any> = {};
          let localPendingRetry: RetryConfig | null = null;

          for (const bodyNodeId of orderedBodyNodes) {
            const bodyNode = graph.nodeById.get(bodyNodeId);
            if (!bodyNode) continue;

            const incoming = (graph.incomingEdges.get(bodyNode.id) || []).filter(
              (edge) => !localPruned.has(edge.id)
            );

            const availableInputs: { sourceId: string; value: any; edge: WorkflowEdge }[] = [];
            for (const edge of incoming) {
              if (edge.source_node_id === node.id && edge.source_handle === "item") {
                availableInputs.push({ sourceId: edge.source_node_id, value: item, edge });
                continue;
              }
              if (bodyReachable.has(edge.source_node_id) && localExecuted.has(edge.source_node_id)) {
                availableInputs.push({
                  sourceId: edge.source_node_id,
                  value: localContext[edge.source_node_id],
                  edge,
                });
                continue;
              }
              if (!bodyReachable.has(edge.source_node_id) && executedNodeIds.has(edge.source_node_id)) {
                availableInputs.push({
                  sourceId: edge.source_node_id,
                  value: context[edge.source_node_id],
                  edge,
                });
              }
            }

            const localIsRoot = incoming.length === 0;
            if (!localIsRoot && availableInputs.length === 0) {
              continue;
            }

            let bodyNodeInput: any;
            if (localIsRoot) {
              bodyNodeInput = item;
            } else if (availableInputs.length === 1) {
              bodyNodeInput = availableInputs[0].value;
            } else {
              const bundled: Record<string, any> = {};
              for (const entry of availableInputs) {
                bundled[entry.sourceId] = entry.value;
              }
              bodyNodeInput = bundled;
            }

            let bodyRetry: RetryConfig | null = null;
            const retrySources = availableInputs.filter(
              (entry) => graph.nodeById.get(entry.edge.source_node_id)?.type === "RETRY"
            );
            if (retrySources.length > 1) {
              throw new Error(`Loop body node ${bodyNode.id} has multiple RETRY parents.`);
            }
            if (retrySources.length === 1) {
              const retryNode = graph.nodeById.get(retrySources[0].edge.source_node_id);
              if (!retryNode) throw new Error("Retry source node not found in loop body.");
              validateRetryConfig(retryNode.config);
              bodyRetry = retryNode.config;
            } else if (localPendingRetry) {
              bodyRetry = localPendingRetry;
              localPendingRetry = null;
            }

            let bodyOutput: any;
            let bodyRoutedError = false;
            try {
              bodyOutput = await executeNodeWithRetry(bodyNode, bodyNodeInput, bodyRetry, localPruned);
            } catch (bodyErr) {
              const hasBodyError =
                (graph.outgoingEdges.get(bodyNode.id) || []).some(
                  (edge) => edge.source_handle === "error" && bodyReachable.has(edge.target_node_id)
                );
              if (!hasBodyError) {
                throw bodyErr;
              }
              for (const edge of graph.outgoingEdges.get(bodyNode.id) || []) {
                if (!bodyReachable.has(edge.target_node_id)) continue;
                if (edge.source_handle !== "error") localPruned.add(edge.id);
              }
              bodyOutput = buildNodeErrorPayload(bodyNode, bodyNodeInput, bodyErr);
              bodyRoutedError = true;
            }

            if (!bodyRoutedError) {
              for (const edge of graph.outgoingEdges.get(bodyNode.id) || []) {
                if (!bodyReachable.has(edge.target_node_id)) continue;
                if (edge.source_handle === "error") localPruned.add(edge.id);
              }
            }

            if (bodyNode.type === "RETRY") {
              validateRetryConfig(bodyNode.config);
              localPendingRetry = bodyNode.config;
            }

            localContext[bodyNode.id] =
              bodyNode.type === "CONDITIONAL" ? bodyOutput.passthrough : bodyOutput;
            localExecuted.add(bodyNode.id);
          }

          const terminalBody = orderedBodyNodes.filter((bodyNodeId) => {
            if (!localExecuted.has(bodyNodeId)) return false;
            const activeOut = (graph.outgoingEdges.get(bodyNodeId) || []).filter(
              (edge) => bodyReachable.has(edge.target_node_id) && !localPruned.has(edge.id)
            );
            return activeOut.length === 0;
          });

          if (terminalBody.length === 0) {
            results.push(item);
          } else if (terminalBody.length === 1) {
            results.push(localContext[terminalBody[0]]);
          } else {
            const merged = terminalBody.reduce((acc, id) => {
              acc[id] = localContext[id];
              return acc;
            }, {} as Record<string, any>);
            results.push(merged);
          }
        }

        // Loop body is executed internally; skip item edges in main traversal.
        for (const edge of outgoingFromLoop) {
          if (edge.source_handle === "item") {
            prunedEdgeIds.add(edge.id);
          }
        }

        nodeOutput = {
          items_processed: resolved.length,
          results,
        };
      }
    } catch (err) {
      const hasErrorBranch =
        state.use_edges &&
        (graph.outgoingEdges.get(node.id) || []).some((edge) => edge.source_handle === "error");

      if (!hasErrorBranch) {
        throw err;
      }

      const outgoing = graph.outgoingEdges.get(node.id) || [];
      for (const edge of outgoing) {
        if (edge.source_handle !== "error") {
          prunedEdgeIds.add(edge.id);
        }
      }

      nodeOutput = buildNodeErrorPayload(node, nodeInput, err);
      routedToErrorBranch = true;
    }

    // On successful execution, error edges must not execute.
    if (state.use_edges && !routedToErrorBranch) {
      const outgoing = graph.outgoingEdges.get(node.id) || [];
      for (const edge of outgoing) {
        if (edge.source_handle === "error") {
          prunedEdgeIds.add(edge.id);
        }
      }
    }

    if (node.type === "RETRY" && !state.use_edges) {
      validateRetryConfig(node.config);
      pendingSequentialRetry = node.config;
    }

    context[node.id] = node.type === "CONDITIONAL" ? nodeOutput.passthrough : nodeOutput;
    lastOutput = context[node.id];
    executedNodeIds.add(node.id);

    if (node.type === "DELAY") {
      validateDelayConfig(node.config);
      const now = Date.now();
      const resumeAtIso = new Date(now + node.config.delay_ms).toISOString();

      const pauseState: ExecutionState = {
        ordered_node_ids: orderedNodeIds,
        next_index: index + 1,
        context,
        executed_node_ids: Array.from(executedNodeIds),
        pruned_edge_ids: Array.from(prunedEdgeIds),
        last_output: lastOutput,
        pending_sequential_retry: pendingSequentialRetry,
        use_edges: state.use_edges,
      };

      await upsertDelayRow({
        workflowRunId: params.workflowRunId,
        workflowId: params.workflowId,
        userId: params.userId,
        resumeAtIso,
        state: pauseState,
      });

      await supabaseAdmin
        .from("workflow_runs")
        .update({
          status: "PAUSED",
          output: lastOutput,
        })
        .eq("id", params.workflowRunId);

      return { paused: true, resume_at: resumeAtIso };
    }

    state.next_index = index + 1;
  }

  let workflowOutput: any = lastOutput;
  if (state.use_edges) {
    const terminalIds = graph.nodes
      .map((node) => node.id)
      .filter((nodeId) => {
        const activeOutgoing = (graph.outgoingEdges.get(nodeId) || []).filter(
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
      error: null,
    })
    .eq("id", params.workflowRunId);

  await clearDelayRow(params.workflowRunId);
  return workflowOutput;
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

  try {
    return await continueWorkflowRun({
      workflowRunId: run.id,
      workflowId,
      userId,
      input,
    });
  } catch (err: any) {
    await clearDelayRow(run.id);
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

export async function resumeWorkflowRun(delay: DelayRow) {
  const { data: run } = await supabaseAdmin
    .from("workflow_runs")
    .select("id, input, status")
    .eq("id", delay.workflow_run_id)
    .single();

  if (!run) {
    await clearDelayRow(delay.workflow_run_id);
    throw new Error("Workflow run not found for delayed resume.");
  }

  await supabaseAdmin
    .from("workflow_runs")
    .update({
      status: "RUNNING",
      error: null,
    })
    .eq("id", delay.workflow_run_id);

  try {
    return await continueWorkflowRun({
      workflowRunId: delay.workflow_run_id,
      workflowId: delay.workflow_id,
      userId: delay.user_id,
      input: run.input,
      resumeState: delay.state,
    });
  } catch (err) {
    const message = normalizeError(err);
    await supabaseAdmin
      .from("workflow_runs")
      .update({
        status: "FAILED",
        error: message,
      })
      .eq("id", delay.workflow_run_id);

    await supabaseAdmin
      .from("workflow_run_delays")
      .update({
        status: "FAILED",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("workflow_run_id", delay.workflow_run_id);

    throw err;
  }
}
