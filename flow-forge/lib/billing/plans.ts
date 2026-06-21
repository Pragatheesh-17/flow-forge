export const PLAN_IDS = ["free", "pro"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_LIMITS: Record<
  PlanId,
  {
    max_workflows: number;
    max_executions_per_month: number;
  }
> = {
  free: {
    max_workflows: 5,
    max_executions_per_month: 100,
  },
  pro: {
    max_workflows: 1000,
    max_executions_per_month: 10000,
  },
};

export function getPlanLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
