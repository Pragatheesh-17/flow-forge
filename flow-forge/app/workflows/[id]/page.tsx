import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runWorkflow } from "./run/actions";
import { addEdge, addNode, deleteEdge, deleteNode, saveWorkflowSchedule } from "./actions";
import WorkflowEditorClient from "@/components/workflows/WorkflowEditorClient";

export default async function WorkflowEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch workflow
  const { data: workflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (!workflow) redirect("/workflows");

  // Fetch workflow nodes
  const { data: nodes } = await supabase
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_id", id)
    .order("position", { ascending: true });

  const { data: edges } = await supabase
    .from("workflow_edges")
    .select("*")
    .eq("workflow_id", id);

  const { data: schedule } = await supabaseAdmin
    .from("workflow_schedules")
    .select("*")
    .eq("workflow_id", id)
    .maybeSingle();

  const { data: latestRun } = await supabase
    .from("workflow_runs")
    .select("id, created_at, status, error")
    .eq("workflow_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: nextResume } = await supabaseAdmin
    .from("workflow_run_delays")
    .select("workflow_run_id, resume_at, status")
    .eq("workflow_id", id)
    .in("status", ["WAITING", "RUNNING"])
    .order("resume_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: nodeRuns } = latestRun?.id
    ? await supabase
        .from("node_runs")
        .select("id, node_id, input, output, created_at")
        .eq("workflow_run_id", latestRun.id)
    : { data: [] };
  const addNodeAction = addNode.bind(null, id);
  const addEdgeAction = addEdge.bind(null, id);
  const saveScheduleAction = saveWorkflowSchedule.bind(null, id);

  return (
    <div style={{ padding: 24 }}>
      <h2>{workflow.name}</h2>
      <p>{workflow.description}</p>

      {/* Webhook */}
      <p>
        <strong>Webhook URL:</strong>
        <br />
        <code>
          {`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/${workflow.webhook_id}`}
        </code>
      </p>

      <div style={{ marginBottom: 12, fontSize: 14 }}>
        <strong>Latest Run:</strong>{" "}
        <span>{latestRun?.status ?? "N/A"}</span>
        {latestRun?.id ? (
          <a
            href={`/workflows/${id}/runs/${latestRun.id}`}
            style={{ marginLeft: 12, color: "#2563eb", textDecoration: "underline" }}
          >
            Open Run Inspector
          </a>
        ) : null}
        {latestRun?.error ? (
          <span style={{ color: "#b91c1c", marginLeft: 8 }}>
            Error: {latestRun.error}
          </span>
        ) : null}
      </div>
      {nextResume ? (
        <div
          style={{
            marginBottom: 12,
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #666",
            background: "#111",
            color: "#eab308",
            fontSize: 12,
          }}
        >
          PAUSED - resumes at {nextResume.resume_at}
        </div>
      ) : null}

      {/* Canvas */}
      <h3>Workflow Canvas</h3>
      <WorkflowEditorClient
        initialNodes={nodes ?? []}
        initialEdges={edges ?? []}
        initialSchedule={schedule ?? null}
        initialNodeRuns={nodeRuns ?? []}
        latestRunAt={latestRun?.created_at ?? null}
        addNodeAction={addNodeAction}
        addEdgeAction={addEdgeAction}
        saveScheduleAction={saveScheduleAction}
        deleteNodeAction={deleteNode}
        deleteEdgeAction={deleteEdge}
      />

      <form
        action={async (formData) => {
          "use server";
          const raw = String(formData.get("input") ?? "");
          let input: unknown = raw;
          try {
            input = JSON.parse(raw);
          } catch {
            input = raw;
          }
          await runWorkflow(workflow.id, input);
        }}
        style={{ marginTop: 16 }}
      >
        <textarea
          name="input"
          placeholder="Workflow input"
          rows={4}
          style={{ width: "100%", marginBottom: 8 }}
        />
        <button>Run Workflow</button>
      </form>
    </div>
  );
}
