import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import crypto from "crypto";

export default async function WorkflowsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .order("created_at", { ascending: false });

  async function createWorkflow() {
    "use server";
    const webhookId = crypto.randomBytes(16).toString("hex");
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data, error } = await supabase.from("workflows").insert({
      user_id: user.id,
      name: "Untitled Workflow",
      webhook_id: webhookId,
    }).select();

    if (error) {
      throw error;
    }

    redirect("/workflows");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Your Workflows</h1>

      <form action={createWorkflow}>
        <button>Create Workflow</button>
      </form>

      <ul>
        {workflows?.map((wf: any) => (
          <li key={wf.id}>
            <a href={`/workflows/${wf.id}`}>{wf.name}</a>
          </li>
        ))}
      </ul>
      <LogoutButton />
    </div>
  );
}
