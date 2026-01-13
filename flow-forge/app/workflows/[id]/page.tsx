import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NodeEditor from "@/components/NodeEditor";
import { runWorkflow } from "./run/actions";


export default async function WorkflowEditor({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
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

  // Fetch nodes
  const { data: nodes } = await supabase
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_id", id)
    .order("position", { ascending: true });

  async function addNode() {
    "use server";

    const supabase = await createSupabaseServerClient();

    const { count } = await supabase
      .from("workflow_nodes")
      .select("*", { count: "exact", head: true })
      .eq("workflow_id", id);

    await supabase.from("workflow_nodes").insert({
      workflow_id: id,
      type: "TRIGGER",
      position: count ?? 0,
      config: {},
    });

    redirect(`/workflows/${id}`);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>{workflow.name}</h2>
      <p>{workflow.description}</p>

      <h3>Steps</h3>

      {nodes?.map((node: any) => (
        <NodeEditor key={node.id} node={node} />
      ))}

      <form action={addNode}>
        <button>Add Step</button>
      </form>
      <form
        action={async (formData) => {
            "use server";
            const input = formData.get("input");
            await runWorkflow(workflow.id, input);
        }}
      >
        <textarea name="input" placeholder="Workflow input" />
        <button>Run Workflow</button>
      </form>
    </div>
  );
}
