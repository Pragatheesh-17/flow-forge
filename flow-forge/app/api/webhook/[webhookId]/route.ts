import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { executeWorkflow } from "@/lib/worflow/engine";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;
    
    // 1️⃣ Find workflow (using admin client to bypass RLS)
    const { data: workflow, error } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("webhook_id", webhookId)
      .single();

    if (!workflow) {
      return NextResponse.json(
        { error: "Invalid webhook" },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Normalize input
    const input =
        body &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        "input" in body
            ? body.input
            : body;

    // 3️⃣ Execute workflow
    const output = await executeWorkflow({
      workflowId: workflow.id,
      userId: workflow.user_id,
      input,
    });

    // 4️⃣ Return output
    return NextResponse.json({
      success: true,
      output,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
