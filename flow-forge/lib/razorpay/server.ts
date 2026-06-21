function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return "http://localhost:3000";
}

export function getRazorpayKeyId() {
  return requiredEnv("RAZORPAY_KEY_ID");
}

export function getRazorpayKeySecret() {
  return requiredEnv("RAZORPAY_KEY_SECRET");
}

export function getRazorpayPublicKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || getRazorpayKeyId();
}

export function getDefaultRazorpayAmountPaise() {
  const raw = process.env.RAZORPAY_PRO_AMOUNT_PAISE || "49900";
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 100) {
    return 49900;
  }
  return Math.floor(amount);
}

export function razorpayAuthHeader() {
  const token = Buffer.from(`${getRazorpayKeyId()}:${getRazorpayKeySecret()}`).toString("base64");
  return `Basic ${token}`;
}

export async function createRazorpayOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  const body = await response.json().catch(() => null);

  if (response.status === 401 || response.status === 403) {
    throw new Error("Unauthorized Razorpay API credentials.");
  }

  if (!response.ok) {
    throw new Error(
      `Failed to create Razorpay order: ${JSON.stringify(body) || response.statusText}`
    );
  }

  if (!body?.id) {
    throw new Error("Razorpay did not return an order id.");
  }

  return body;
}
