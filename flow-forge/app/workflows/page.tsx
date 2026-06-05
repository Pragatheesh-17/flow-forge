import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import crypto from "crypto";
import { deleteWorkflow, renameWorkflow } from "./actions";
import WorkflowCard from "@/components/workflows/WorkflowCard";
import { assertWorkflowCreationAllowed, getBillingSnapshot } from "@/lib/billing/usage";
import { getPlanLimits } from "@/lib/billing/plans";

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = (await searchParams) || {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .order("created_at", { ascending: false });

  const billing = await getBillingSnapshot(user.id);
  const planLimits = getPlanLimits(billing.plan);
  const errorMessage =
    typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const billingMessage =
    typeof resolvedSearchParams.billing === "string" ? resolvedSearchParams.billing : null;

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

    try {
      await assertWorkflowCreationAllowed(user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Workflow limit reached.";
      redirect(`/workflows?error=${encodeURIComponent(message)}`);
    }

    const { error } = await supabase.from("workflows").insert({
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

      {errorMessage ? (
        <div
          style={{
            border: "1px solid #7f1d1d",
            borderRadius: 12,
            padding: 14,
            background: "#1f1111",
            color: "#fca5a5",
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      {billingMessage === "return" ? (
        <div
          style={{
            border: "1px solid #14532d",
            borderRadius: 12,
            padding: 14,
            background: "#0e1b12",
            color: "#86efac",
          }}
        >
          Returned from Dodo checkout. Your plan status updates only after the webhook confirms the subscription event.
        </div>
      ) : null}

      {billingMessage === "cancel" ? (
        <div
          style={{
            border: "1px solid #3f3f46",
            borderRadius: 12,
            padding: 14,
            background: "#111214",
            color: "#d4d4d8",
          }}
        >
          Upgrade checkout was canceled.
        </div>
      ) : null}

      {billingMessage === "already-pro" ? (
        <div
          style={{
            border: "1px solid #134e4a",
            borderRadius: 12,
            padding: 14,
            background: "#0f2f2d",
            color: "#99f6e4",
          }}
        >
          Your account is already on Pro.
        </div>
      ) : null}

      <section
        style={{
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          padding: 18,
          background:
            billing.plan === "pro"
              ? "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f766e 100%)"
              : "linear-gradient(135deg, #161616 0%, #111827 100%)",
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase", color: "#a1a1aa" }}>
              Current Plan
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {billing.plan === "pro" ? "Pro" : "Free"}
            </div>
            <div style={{ color: "#d4d4d8", marginTop: 4 }}>
              Workflows and executions are limited by plan. All node types remain available.
            </div>
          </div>

          {billing.plan === "free" ? (
            <form method="POST" action="/api/dodo/checkout">
              <button
                type="submit"
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  border: "1px solid #164e63",
                  background: "#0f766e",
                  color: "#f8fafc",
                  fontWeight: 600,
                }}
              >
                Upgrade to Pro
              </button>
            </form>
          ) : (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #134e4a",
                background: "#0f2f2d",
                color: "#99f6e4",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              PRO ACTIVE
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid #2f2f2f",
              borderRadius: 10,
              padding: 14,
              background: "rgba(10, 10, 10, 0.5)",
            }}
          >
            <div style={{ color: "#a1a1aa", fontSize: 12, textTransform: "uppercase" }}>Workflows Used</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>
              {billing.workflowCount} / {planLimits.max_workflows}
            </div>
          </div>
          <div
            style={{
              border: "1px solid #2f2f2f",
              borderRadius: 10,
              padding: 14,
              background: "rgba(10, 10, 10, 0.5)",
            }}
          >
            <div style={{ color: "#a1a1aa", fontSize: 12, textTransform: "uppercase" }}>
              Executions This Month
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>
              {billing.executionCount} / {planLimits.max_executions_per_month}
            </div>
          </div>
          <div
            style={{
              border: "1px solid #2f2f2f",
              borderRadius: 10,
              padding: 14,
              background: "rgba(10, 10, 10, 0.5)",
            }}
          >
            <div style={{ color: "#a1a1aa", fontSize: 12, textTransform: "uppercase" }}>Subscription Status</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>
              {billing.subscription?.status?.toUpperCase() ?? "FREE"}
            </div>
          </div>
        </div>
      </section>

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
            disabled={billing.workflowLimitReached}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #111",
              background: billing.workflowLimitReached ? "#27272a" : "#111",
              color: "#fff",
              opacity: billing.workflowLimitReached ? 0.7 : 1,
            }}
          >
            Create Workflow
          </button>
        </form>
        <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>
          {billing.workflowLimitReached
            ? `Workflow limit reached for ${billing.plan} plan. Upgrade to create more workflows.`
            : `You are using ${billing.workflowCount}/${planLimits.max_workflows} workflow slots.`}
        </div>
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

