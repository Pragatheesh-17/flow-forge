import { supabaseAdmin } from "@/lib/supabase/admin";
import { executeWorkflow, resumeWorkflowRun } from "@/lib/worflow/engine";
import { nextRunAt } from "@/lib/worflow/schedule";

export type SchedulerTickResult = {
  success: true;
  now: string;
  due_count: number;
  processed: number;
  failed: number;
  delayed_due_count: number;
  delayed_resumed: number;
  delayed_failed: number;
  details: { schedule_id: string; workflow_id: string; status: string; error?: string }[];
};

export async function runSchedulerTick(nowDate = new Date()): Promise<SchedulerTickResult> {
  const nowIso = nowDate.toISOString();

  const { data: dueSchedules, error } = await supabaseAdmin
    .from("workflow_schedules")
    .select("id, workflow_id, cron_expression, timezone, next_run_at, enabled")
    .eq("enabled", true)
    .not("next_run_at", "is", null)
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch due schedules: ${error.message}`);
  }

  let processed = 0;
  let failed = 0;
  let delayedResumed = 0;
  let delayedFailed = 0;
  const details: { schedule_id: string; workflow_id: string; status: string; error?: string }[] =
    [];

  for (const schedule of dueSchedules || []) {
    let computedNextRun: string;
    try {
      computedNextRun = nextRunAt(
        schedule.cron_expression,
        schedule.timezone,
        new Date(schedule.next_run_at || nowIso)
      );
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "Failed to compute next run";
      await supabaseAdmin
        .from("workflow_schedules")
        .update({
          last_run_at: nowIso,
          last_status: "FAILED",
          last_error: message,
          updated_at: nowIso,
        })
        .eq("id", schedule.id);
      details.push({
        schedule_id: schedule.id,
        workflow_id: schedule.workflow_id,
        status: "FAILED",
        error: message,
      });
      continue;
    }

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("workflow_schedules")
      .update({
        next_run_at: computedNextRun,
        updated_at: nowIso,
      })
      .eq("id", schedule.id)
      .eq("enabled", true)
      .eq("next_run_at", schedule.next_run_at)
      .select("id, workflow_id")
      .maybeSingle();

    if (claimError || !claimed) {
      continue;
    }

    const { data: workflow } = await supabaseAdmin
      .from("workflows")
      .select("id, user_id")
      .eq("id", schedule.workflow_id)
      .single();

    if (!workflow) {
      failed += 1;
      const message = "Workflow not found for schedule";
      await supabaseAdmin
        .from("workflow_schedules")
        .update({
          last_run_at: nowIso,
          last_status: "FAILED",
          last_error: message,
          updated_at: nowIso,
        })
        .eq("id", schedule.id);
      details.push({
        schedule_id: schedule.id,
        workflow_id: schedule.workflow_id,
        status: "FAILED",
        error: message,
      });
      continue;
    }

    try {
      await executeWorkflow({
        workflowId: workflow.id,
        userId: workflow.user_id,
        input: {
          source: "schedule",
          schedule_id: schedule.id,
          fired_at: nowIso,
        },
      });

      processed += 1;
      await supabaseAdmin
        .from("workflow_schedules")
        .update({
          last_run_at: nowIso,
          last_status: "SUCCESS",
          last_error: null,
          updated_at: nowIso,
        })
        .eq("id", schedule.id);

      details.push({
        schedule_id: schedule.id,
        workflow_id: schedule.workflow_id,
        status: "SUCCESS",
      });
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "Workflow execution failed";
      await supabaseAdmin
        .from("workflow_schedules")
        .update({
          last_run_at: nowIso,
          last_status: "FAILED",
          last_error: message,
          updated_at: nowIso,
        })
        .eq("id", schedule.id);

      details.push({
        schedule_id: schedule.id,
        workflow_id: schedule.workflow_id,
        status: "FAILED",
        error: message,
      });
    }
  }

  const { data: dueDelays, error: delayError } = await supabaseAdmin
    .from("workflow_run_delays")
    .select("id, workflow_run_id, workflow_id, user_id, resume_at, state, status")
    .eq("status", "WAITING")
    .lte("resume_at", nowIso)
    .order("resume_at", { ascending: true })
    .limit(50);

  if (delayError) {
    throw new Error(`Failed to fetch due delayed runs: ${delayError.message}`);
  }

  for (const delay of dueDelays || []) {
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("workflow_run_delays")
      .update({
        status: "RUNNING",
        updated_at: nowIso,
      })
      .eq("id", delay.id)
      .eq("status", "WAITING")
      .eq("resume_at", delay.resume_at)
      .select("id, workflow_run_id, workflow_id, user_id, resume_at, state")
      .maybeSingle();

    if (claimErr || !claimed) {
      continue;
    }

    try {
      await resumeWorkflowRun(claimed as any);
      delayedResumed += 1;
    } catch (err) {
      delayedFailed += 1;
      const message = err instanceof Error ? err.message : "Delayed workflow resume failed";
      await supabaseAdmin
        .from("workflow_run_delays")
        .update({
          status: "FAILED",
          last_error: message,
          updated_at: nowIso,
        })
        .eq("id", claimed.id);
    }
  }

  return {
    success: true,
    now: nowIso,
    due_count: (dueSchedules || []).length,
    processed,
    failed,
    delayed_due_count: (dueDelays || []).length,
    delayed_resumed: delayedResumed,
    delayed_failed: delayedFailed,
    details,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __flowforgeSchedulerInterval: ReturnType<typeof setInterval> | undefined;
}

function schedulerEnabled() {
  const value = process.env.INTERNAL_SCHEDULER_ENABLED;
  if (value === "true") return true;
  if (value === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function schedulerPollMs() {
  const raw = process.env.INTERNAL_SCHEDULER_POLL_MS;
  if (!raw) return 60_000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1_000) return 60_000;
  return Math.floor(parsed);
}

export function ensureInternalSchedulerStarted() {
  if (!schedulerEnabled()) return;
  if (global.__flowforgeSchedulerInterval) return;
  const intervalMs = schedulerPollMs();

  const run = async () => {
    try {
      await runSchedulerTick(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[scheduler] tick failed:", message);
    }
  };

  void run();
  global.__flowforgeSchedulerInterval = setInterval(() => {
    void run();
  }, intervalMs);
}
