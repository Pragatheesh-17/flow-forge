import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import crypto from "crypto";
import { deleteWorkflow, renameWorkflow } from "./actions";
import WorkflowCard from "@/components/workflows/WorkflowCard";

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

  async function createWorkflow(formData: FormData) {
    "use server";
    const name =
      String(formData.get("name") || "").trim() || "Untitled Workflow";
    const webhookId = crypto.randomBytes(16).toString("hex");
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data, error } = await supabase.from("workflows").insert({
      user_id: user.id,
      name,
      webhook_id: webhookId,
    }).select();

    if (error) {
      throw error;
    }

    redirect("/workflows");
  }

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 960,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: "#0a0a0a",
        color: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Your Workflows</h1>
        </div>
        <LogoutButton />
      </header>

      <section
        style={{
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          padding: 16,
          background: "#121212",
        }}
      >
        <form action={createWorkflow} style={{ display: "flex", gap: 12 }}>
          <input
            type="text"
            name="name"
            placeholder="Workflow name"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#0f0f0f",
              color: "#ffffff",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
            }}
          >
            Create Workflow
          </button>
        </form>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {workflows?.map((wf: any) => (
          <WorkflowCard
            key={wf.id}
            workflow={wf}
            onRename={renameWorkflow.bind(null, wf.id)}
            onDelete={deleteWorkflow.bind(null, wf.id)}
          />
        ))}
      </section>
    </div>
  );
}
