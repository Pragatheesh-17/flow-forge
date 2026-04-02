import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NodeRunCard from "@/components/workflows/NodeRunCard";

type NodeRunRow = {
  id: string;
  node_id: string;
  status: string;
  input: any;
  output: any;
  error?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

type NodeMeta = {
  id: string;
  type: string;
  position: number;
};

function toDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickStart(run: NodeRunRow) {
  return run.started_at ?? run.created_at ?? null;
}

function durationMs(run: NodeRunRow) {
  const start = toDate(pickStart(run));
  const end = toDate(run.completed_at);
  if (!start || !end) return null;
  return Math.max(0, end.getTime() - start.getTime());
}

function runDurationMs(startedAt?: string | null, completedAt?: string | null) {
  const start = toDate(startedAt);
  if (!start) return null;
  const end = toDate(completedAt) ?? new Date();
  return Math.max(0, end.getTime() - start.getTime());
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = toDate(value);
  return d ? d.toISOString() : "-";
}

function fmtDuration(ms: number | null) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

type Grouped = {
  nodeId: string;
  nodeType: string;
  attempts: NodeRunRow[];
  derivedStatus: "SUCCESS" | "FAILED" | "RETRIED" | "PAUSED" | "RUNNING";
  retryCount: number;
  durationMs: number | null;
  loopIteration: number | null;
  isErrorPath: boolean;
};

function groupNodeRuns(runs: NodeRunRow[], nodeMetaById: Map<string, NodeMeta>): Grouped[] {
  const sorted = [...runs].sort((a, b) => {
    const ta = toDate(pickStart(a))?.getTime() ?? 0;
    const tb = toDate(pickStart(b))?.getTime() ?? 0;
    return ta - tb;
  });

  const groups: Grouped[] = [];
  let i = 0;
  while (i < sorted.length) {
    const first = sorted[i];
    const attempts: NodeRunRow[] = [first];
    let j = i + 1;
    while (j < sorted.length && sorted[j].node_id === first.node_id) {
      const previous = attempts[attempts.length - 1];
      const prevFailed = previous.status === "FAILED";
      const curLooksRetry =
        typeof sorted[j]?.input?.retry?.attempt === "number" ||
        typeof sorted[j]?.input?.retry?.max_attempts === "number";
      if (prevFailed || curLooksRetry) {
        attempts.push(sorted[j]);
        j += 1;
        continue;
      }
      break;
    }

    const final = attempts[attempts.length - 1];
    const anyFailed = attempts.some((a) => a.status === "FAILED");
    const finalStatus = final.status;
    const derivedStatus =
      finalStatus === "SUCCESS" && anyFailed
        ? "RETRIED"
        : finalStatus === "SUCCESS"
        ? "SUCCESS"
        : finalStatus === "PAUSED"
        ? "PAUSED"
        : finalStatus === "RUNNING"
        ? "RUNNING"
        : "FAILED";

    const totalDuration = attempts
      .map((a) => durationMs(a))
      .filter((v): v is number => typeof v === "number")
      .reduce((acc, v) => acc + v, 0);

    const iterationCandidate =
      first.input?.loop?.index ?? first.output?.loop?.index ?? null;
    const loopIteration =
      typeof iterationCandidate === "number" ? iterationCandidate + 1 : null;

    const isErrorPath =
      first.input?.source === "node_error" ||
      first.output?.source === "node_error" ||
      first.input?.error?.message != null;

    groups.push({
      nodeId: first.node_id,
      nodeType: nodeMetaById.get(first.node_id)?.type ?? "UNKNOWN",
      attempts,
      derivedStatus,
      retryCount: Math.max(0, attempts.length - 1),
      durationMs: totalDuration > 0 ? totalDuration : null,
      loopIteration,
      isErrorPath,
    });

    i = j;
  }

  return groups;
}

export default async function WorkflowRunInspector({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workflow } = await supabase
    .from("workflows")
    .select("id, name, user_id")
    .eq("id", id)
    .single();
  if (!workflow || workflow.user_id !== user.id) redirect("/workflows");

  const { data: run } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("id", runId)
    .eq("workflow_id", id)
    .maybeSingle();
  if (!run) redirect(`/workflows/${id}`);

  const { data: nodes } = await supabase
    .from("workflow_nodes")
    .select("id, type, position")
    .eq("workflow_id", id)
    .order("position", { ascending: true });

  const { data: nodeRuns } = await supabase
    .from("node_runs")
    .select("*")
    .eq("workflow_run_id", runId);

  const nodeMetaById = new Map<string, NodeMeta>(
    ((nodes || []) as NodeMeta[]).map((n) => [n.id, n])
  );
  const grouped = groupNodeRuns((nodeRuns || []) as NodeRunRow[], nodeMetaById);

  const executedNodeIds = new Set(grouped.map((g) => g.nodeId));
  const skippedNodes = ((nodes || []) as NodeMeta[]).filter((n) => !executedNodeIds.has(n.id));

  const totalDuration = runDurationMs(run.started_at ?? run.created_at, run.completed_at);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto", color: "#f3f4f6" }}>
      <div
        style={{
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          padding: 16,
          background: "#111",
          marginBottom: 16,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>
          {workflow.name} - Run Inspector
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(200px, 1fr))", gap: 8 }}>
          <div>Run Status: <strong>{run.status ?? "N/A"}</strong></div>
          <div>Total Duration: <strong>{fmtDuration(totalDuration)}</strong></div>
          <div>Started At: <strong>{fmtDate(run.started_at ?? run.created_at)}</strong></div>
          <div>Completed At: <strong>{fmtDate(run.completed_at)}</strong></div>
        </div>
        {run.error ? (
          <div style={{ marginTop: 10, color: "#f87171", fontSize: 13 }}>
            Run Error: {run.error}
          </div>
        ) : null}
      </div>

      <h3 style={{ marginBottom: 8 }}>Execution Timeline</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {grouped.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No node runs recorded for this workflow run.</div>
        ) : (
          grouped.map((entry, idx) => (
            <NodeRunCard
              key={`${entry.nodeId}-${idx}`}
              nodeId={entry.nodeId}
              nodeType={entry.nodeType}
              derivedStatus={entry.derivedStatus}
              retryCount={entry.retryCount}
              durationMs={entry.durationMs}
              attempts={entry.attempts.map((a) => ({
                id: a.id,
                status: a.status,
                started_at: a.started_at ?? null,
                completed_at: a.completed_at ?? null,
                created_at: a.created_at ?? null,
                input: a.input,
                output: a.output,
                error: a.error ?? a.output?.error ?? null,
              }))}
              loopIteration={entry.loopIteration}
              isErrorPath={entry.isErrorPath}
            />
          ))
        )}
      </div>

      <h3 style={{ marginTop: 22, marginBottom: 8 }}>Skipped Nodes</h3>
      {skippedNodes.length === 0 ? (
        <div style={{ color: "#9ca3af" }}>No skipped nodes.</div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {skippedNodes.map((n) => (
            <div
              key={n.id}
              style={{
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                padding: "8px 10px",
                background: "#0f0f0f",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              {n.type} ({n.id}) - SKIPPED
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
