type JsonTransformMapping = {
  from: string;
  to: string;
};

type JsonTransformConfig = {
  mappings: JsonTransformMapping[];
};

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function splitPath(path: string) {
  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getByPath(root: unknown, path: string) {
  const parts = splitPath(path);
  let current: unknown = root;
  for (const part of parts) {
    if (BLOCKED_KEYS.has(part)) {
      throw new Error(`Unsafe path segment in mapping source: ${part}`);
    }
    if (!isObjectLike(current) || !(part in current)) {
      return null;
    }
    current = current[part];
  }
  return current ?? null;
}

function setByPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = splitPath(path);
  if (parts.length === 0) {
    throw new Error("Mapping destination path cannot be empty.");
  }

  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (BLOCKED_KEYS.has(key)) {
      throw new Error(`Unsafe path segment in mapping destination: ${key}`);
    }
    const existing = cursor[key];
    if (!isObjectLike(existing)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }

  const last = parts[parts.length - 1];
  if (BLOCKED_KEYS.has(last)) {
    throw new Error(`Unsafe path segment in mapping destination: ${last}`);
  }
  cursor[last] = value ?? null;
}

export function validateJsonTransformConfig(config: unknown): asserts config is JsonTransformConfig {
  if (!isObjectLike(config)) {
    throw new Error("JSON_TRANSFORM config must be an object.");
  }

  const mappings = (config as { mappings?: unknown }).mappings;
  if (!Array.isArray(mappings)) {
    throw new Error("JSON_TRANSFORM config must include mappings array.");
  }

  for (const mapping of mappings) {
    if (!isObjectLike(mapping)) {
      throw new Error("Each mapping must be an object.");
    }
    if (typeof mapping.from !== "string" || !mapping.from.trim()) {
      throw new Error("Each mapping must include non-empty from path.");
    }
    if (typeof mapping.to !== "string" || !mapping.to.trim()) {
      throw new Error("Each mapping must include non-empty to path.");
    }
  }
}

export function executeJsonTransform(config: unknown, input: unknown) {
  validateJsonTransformConfig(config);

  const out: Record<string, unknown> = {};
  const source = { input };

  for (const mapping of config.mappings) {
    const value = getByPath(source, mapping.from);
    setByPath(out, mapping.to, value);
  }

  return out;
}
