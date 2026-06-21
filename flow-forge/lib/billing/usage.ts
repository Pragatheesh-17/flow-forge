import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_IDS, PlanId, getPlanLimits } from "./plans";

export const SUBSCRIPTION_STATUSES = ["active", "canceled"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type SubscriptionRow = {
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  current_period_end: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && PLAN_IDS.includes(value as PlanId);
}

function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === "string" && SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus);
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subscription: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...data,
    plan: isPlanId(data.plan) ? data.plan : "free",
    status: isSubscriptionStatus(data.status) ? data.status : "canceled",
  } as SubscriptionRow;
}

export function getCurrentMonthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export function getEffectivePlan(subscription: SubscriptionRow | null, now = new Date()): PlanId {
  if (!subscription) return "free";
  if (subscription.plan !== "pro") return "free";
  if (subscription.status === "active") return "pro";

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  if (subscription.status === "canceled" && periodEnd && periodEnd.getTime() > now.getTime()) {
    return "pro";
  }

  return "free";
}

export async function countUserWorkflows(userId: string) {
  const { count, error } = await supabaseAdmin
    .from("workflows")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to count workflows: ${error.message}`);
  }

  return count ?? 0;
}

export async function countUserExecutionsThisMonth(userId: string, now = new Date()) {
  const window = getCurrentMonthWindow(now);
  const { count, error } = await supabaseAdmin
    .from("workflow_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", window.start.toISOString())
    .lt("created_at", window.end.toISOString());

  if (error) {
    throw new Error(`Failed to count executions: ${error.message}`);
  }

  return count ?? 0;
}

export async function getBillingSnapshot(userId: string, now = new Date()) {
  const subscription = await getSubscription(userId);
  const plan = getEffectivePlan(subscription, now);
  const limits = getPlanLimits(plan);
  const [workflowCount, executionCount] = await Promise.all([
    countUserWorkflows(userId),
    countUserExecutionsThisMonth(userId, now),
  ]);

  return {
    subscription,
    plan,
    limits,
    workflowCount,
    executionCount,
    workflowLimitReached: workflowCount >= limits.max_workflows,
    executionLimitReached: executionCount >= limits.max_executions_per_month,
  };
}

export async function assertWorkflowCreationAllowed(userId: string) {
  const snapshot = await getBillingSnapshot(userId);
  if (snapshot.workflowLimitReached) {
    throw new Error(
      `Workflow limit reached for ${snapshot.plan} plan. You are using ${snapshot.workflowCount}/${snapshot.limits.max_workflows} workflows.`
    );
  }
  return snapshot;
}

export async function claimWorkflowExecution(params: {
  workflowId: string;
  userId: string;
  input: any;
}) {
  const { data, error } = await supabaseAdmin.rpc("claim_workflow_execution_slot", {
    p_workflow_id: params.workflowId,
    p_user_id: params.userId,
    p_input: params.input,
  });

  if (error) {
    throw new Error(`Failed to claim workflow execution slot: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Failed to claim workflow execution slot: no workflow run returned.");
  }

  return data[0];
}
