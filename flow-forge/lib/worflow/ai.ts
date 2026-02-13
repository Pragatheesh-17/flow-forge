const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_FALLBACK =
  "AI is temporarily unavailable due to rate limits. Please try again in a moment.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfter: string | null) {
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.round(seconds * 1000);
}

function getFallbackMessage(config: any) {
  if (typeof config?.fallback_message === "string" && config.fallback_message.trim()) {
    return config.fallback_message;
  }
  if (typeof process.env.AI_FALLBACK_MESSAGE === "string" && process.env.AI_FALLBACK_MESSAGE.trim()) {
    return process.env.AI_FALLBACK_MESSAGE;
  }
  return DEFAULT_FALLBACK;
}

export async function executeAI(config: any, input: any) {
  if (!config?.prompt_template) {
    throw new Error("AI_TRANSFORM node missing prompt_template");
  }

  if (!process.env.GEMINI_API_KEY) {
    return getFallbackMessage(config);
  }

  const prompt = config.prompt_template.replace(
    "{{input}}",
    typeof input === "string" ? input : JSON.stringify(input)
  );

  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        "AI returned no content."
      );
    }

    const isRetriable = res.status === 429 || res.status >= 500;
    const errorText = await res.text();
    lastError = `Gemini API failed (${res.status}): ${errorText}`;

    if (!isRetriable || attempt === MAX_RETRIES) {
      break;
    }

    const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
    const backoffMs = retryAfterMs ?? BASE_DELAY_MS * Math.pow(2, attempt);
    await sleep(backoffMs);
  }

  return `${getFallbackMessage(config)} (${lastError ?? "unknown error"})`;
}
