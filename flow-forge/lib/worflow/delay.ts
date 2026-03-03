export type DelayConfig = {
  delay_ms: number;
};

export function validateDelayConfig(config: any): asserts config is DelayConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Delay config must be an object.");
  }

  if (!Number.isInteger(config.delay_ms) || config.delay_ms < 0 || config.delay_ms > 86_400_000) {
    throw new Error("Delay config delay_ms must be an integer between 0 and 86400000.");
  }
}
