"use client";

import { useState } from "react";

type RazorpayCheckoutButtonProps = {
  amountPaise: number;
  currency?: string;
  userEmail?: string | null;
  userName?: string | null;
  keyId?: string | null;
};

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const SCRIPT_ID = "razorpay-checkout-js";

function loadCheckoutScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      existing.addEventListener(
        "load",
        () => resolve(true),
        { once: true }
      );
      existing.addEventListener(
        "error",
        () => resolve(false),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayCheckoutButton({
  amountPaise,
  currency = "INR",
  userEmail,
  userName,
  keyId,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const openCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus("Starting checkout...");

      const receipt = `flowforge_${Date.now()}`;
      setStatus("Creating Razorpay order...");
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt,
        }),
      });

      const orderData = await orderResponse.json().catch(() => null);
      if (!orderResponse.ok) {
        throw new Error(orderData?.error || "Failed to create Razorpay order.");
      }

      setStatus("Loading checkout...");
      const scriptLoaded = await loadCheckoutScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout script.");
      }

      if (!keyId) {
        throw new Error("Missing Razorpay public key id.");
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "FlowForge",
        description: "Pro Plan Upgrade",
        order_id: orderData.order_id,
        prefill: {
          email: userEmail ?? undefined,
          name: userName ?? undefined,
        },
        theme: {
          color: "#0f766e",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setStatus("Verifying payment...");
          const verifyResponse = await fetch("/api/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(response),
          });

          const verifyData = await verifyResponse.json().catch(() => null);
          if (!verifyResponse.ok || !verifyData?.success) {
            throw new Error(verifyData?.error || "Payment verification failed.");
          }

          setStatus("Payment verified.");
          window.location.href = "/workflows?payment=success";
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment canceled.");
            setStatus("Checkout closed.");
          },
        },
      });

      razorpay.on("payment.failed", (response: any) => {
        setLoading(false);
        setError(response?.error?.description || "Payment failed.");
        setStatus("Payment failed.");
      });

      setStatus("Opening checkout modal...");
      razorpay.open();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed.";
      setError(message);
      setLoading(false);
      setStatus("Checkout failed.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openCheckout}
        disabled={loading}
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          border: "1px solid #164e63",
          background: loading ? "#134e4a" : "#0f766e",
          color: "#f8fafc",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Opening..." : "Upgrade to Pro"}
      </button>
      {error ? (
        <div style={{ marginTop: 8, color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      ) : null}
      {status ? (
        <div style={{ marginTop: 6, color: "#a5b4fc", fontSize: 13 }}>
          {status}
        </div>
      ) : null}
    </>
  );
}
