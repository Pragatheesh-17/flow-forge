import { NextResponse } from "next/server";
import { runSchedulerTick } from "@/lib/worflow/scheduler";

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

  try {
    const result = await runSchedulerTick(new Date());
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scheduler tick failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
