import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runWorkflow } from "./run/actions";
import { addEdge, addNode, deleteEdge, deleteNode } from "./actions";
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

  const { data: latestRun } = await supabase
    .from("workflow_runs")
    .select("id, created_at")
    .eq("workflow_id", id)
    .order("created_at", { ascending: false })
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

      {/* Canvas */}
      <h3>Workflow Canvas</h3>
      <WorkflowEditorClient
        initialNodes={nodes ?? []}
        initialEdges={edges ?? []}
        initialNodeRuns={nodeRuns ?? []}
        latestRunAt={latestRun?.created_at ?? null}
        addNodeAction={addNodeAction}
        addEdgeAction={addEdgeAction}
        deleteNodeAction={deleteNode}
        deleteEdgeAction={deleteEdge}
      />

      <form
        action={async (formData) => {
          "use server";
          const input = formData.get("input");
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
