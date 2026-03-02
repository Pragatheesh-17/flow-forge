export const RETRY_STRATEGIES = ["fixed", "exponential"] as const;

export type RetryStrategy = (typeof RETRY_STRATEGIES)[number];

export type RetryConfig = {
  max_retries: number;
  delay_ms: number;
  strategy: RetryStrategy;
};

export function validateRetryConfig(config: any): asserts config is RetryConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Retry config must be an object.");
  }

  if (!Number.isInteger(config.max_retries) || config.max_retries < 0 || config.max_retries > 10) {
    throw new Error("Retry config max_retries must be an integer between 0 and 10.");
  }

  if (!Number.isInteger(config.delay_ms) || config.delay_ms < 0 || config.delay_ms > 60_000) {
    throw new Error("Retry config delay_ms must be an integer between 0 and 60000.");
  }

  if (!RETRY_STRATEGIES.includes(config.strategy)) {
    throw new Error(
      `Retry config strategy must be one of: ${RETRY_STRATEGIES.join(", ")}.`
    );
  }
}

export function retryDelayMs(
  delayMs: number,
  strategy: RetryStrategy,
  failedAttemptNumber: number
) {
  if (strategy === "fixed") return delayMs;
  const value = delayMs * Math.pow(2, Math.max(0, failedAttemptNumber - 1));
  return Math.min(value, 300_000);
}
