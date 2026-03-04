export type LoopConfig = {
  path: string;
};

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function validateLoopConfig(config: any): asserts config is LoopConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Loop config must be an object.");
  }

  if (typeof config.path !== "string" || !config.path.trim()) {
    throw new Error("Loop config path must be a non-empty string.");
  }
}

export function resolveLoopArray(path: string, nodeInput: any) {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  let current: any = { input: nodeInput };
  for (const part of parts) {
    if (BLOCKED_KEYS.has(part)) {
      throw new Error(`Unsafe loop path segment: ${part}`);
    }
    if (current == null || typeof current !== "object" || !(part in current)) {
      return null;
    }
    current = current[part];
  }

  return current;
}
