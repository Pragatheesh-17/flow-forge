import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { executeWorkflow } from "@/lib/worflow/engine";
import { nextRunAt } from "@/lib/worflow/schedule";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

function getAuthToken(req: Request) {
  const headerToken = req.headers.get("x-scheduler-secret");
  if (headerToken) return headerToken;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length);
  }

  return null;
}

export async function POST(req: Request) {
  const expected = process.env.SCHEDULER_SECRET;
  if (expected) {
    const received = getAuthToken(req);
    if (!received || received !== expected) {
      return unauthorized();
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const { data: dueSchedules, error } = await supabaseAdmin
    .from("workflow_schedules")
    .select("id, workflow_id, cron_expression, timezone, next_run_at, enabled")
    .eq("enabled", true)
    .not("next_run_at", "is", null)
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { success: false, error: `Failed to fetch due schedules: ${error.message}` },
      { status: 500 }
    );
  }

  let processed = 0;
  let failed = 0;
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

    // Claim schedule atomically by matching previously observed next_run_at.
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

  return NextResponse.json({
    success: true,
    now: nowIso,
    due_count: (dueSchedules || []).length,
    processed,
    failed,
    details,
  });
}
