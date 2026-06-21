import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createRazorpayOrder, getDefaultRazorpayAmountPaise } from "@/lib/razorpay/server";

export const runtime = "nodejs";

type CreateOrderBody = {
  amount?: number;
  currency?: string;
  receipt?: string;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateOrderBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const amount = Number(body.amount ?? getDefaultRazorpayAmountPaise());
  const currency = String(body.currency ?? "INR").toUpperCase();
  const receipt =
    typeof body.receipt === "string" && body.receipt.trim().length > 0
      ? body.receipt.trim()
      : `flowforge_${user.id}_${Date.now()}`;

  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json(
      { success: false, error: "Amount must be at least 100 paise." },
      { status: 400 }
    );
  }

  try {
    const order = await createRazorpayOrder({
      amount,
      currency,
      receipt,
      notes: {
        user_id: user.id,
        source: "flowforge",
        plan: "pro",
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create Razorpay order.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
