import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRazorpayKeySecret } from "@/lib/razorpay/server";

export const runtime = "nodejs";

type VerifyPaymentBody = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

function verifySignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", getRazorpayKeySecret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: VerifyPaymentBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const paymentId = body.razorpay_payment_id?.trim();
  const orderId = body.razorpay_order_id?.trim();
  const signature = body.razorpay_signature?.trim();

  if (!paymentId || !orderId || !signature) {
    return NextResponse.json(
      { success: false, error: "Missing Razorpay payment fields." },
      { status: 400 }
    );
  }

  if (!verifySignature(orderId, paymentId, signature)) {
    return NextResponse.json(
      { success: false, error: "Signature mismatch." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: user.id,
      plan: "pro",
      status: "active",
      current_period_end: null,
      provider_customer_id: paymentId,
      provider_subscription_id: orderId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json(
      { success: false, error: `Failed to persist payment state: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    order_id: orderId,
    payment_id: paymentId,
  });
}
