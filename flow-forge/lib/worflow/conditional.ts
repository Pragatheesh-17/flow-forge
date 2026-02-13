export const CONDITIONAL_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "contains",
] as const;

export type ConditionalOperator = (typeof CONDITIONAL_OPERATORS)[number];

export type ConditionalConfig = {
  left_value: any;
  operator: ConditionalOperator;
  right_value: any;
};

function getPathValue(input: any, path: string) {
  if (!path.startsWith("$.")) return path;
  const parts = path
    .slice(2)
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  let current = input;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function resolveOperand(raw: any, input: any) {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("$.")) return getPathValue(input, trimmed);
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed === "null") return null;
    if (trimmed !== "" && Number.isFinite(Number(trimmed))) {
      return Number(trimmed);
    }
    return raw;
  }
  return raw;
}

function asNumber(value: any) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function validateConditionalConfig(config: any): asserts config is ConditionalConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Conditional config must be an object.");
  }

  if (!("left_value" in config)) {
    throw new Error("Conditional config is missing left_value.");
  }

  if (!("right_value" in config)) {
    throw new Error("Conditional config is missing right_value.");
  }

  if (typeof config.operator !== "string") {
    throw new Error("Conditional config is missing operator.");
  }

  if (!CONDITIONAL_OPERATORS.includes(config.operator as ConditionalOperator)) {
    throw new Error(
      `Unsupported conditional operator: ${config.operator}. Supported: ${CONDITIONAL_OPERATORS.join(", ")}`
    );
  }
}

export function evaluateConditional(config: ConditionalConfig, input: any) {
  validateConditionalConfig(config);

  const left = resolveOperand(config.left_value, input);
  const right = resolveOperand(config.right_value, input);

  switch (config.operator) {
    case "equals":
      return {
        result: left === right,
        left,
        right,
      };
    case "not_equals":
      return {
        result: left !== right,
        left,
        right,
      };
    case "greater_than": {
      const leftNum = asNumber(left);
      const rightNum = asNumber(right);
      if (leftNum === null || rightNum === null) {
        throw new Error("greater_than requires numeric left and right values.");
      }
      return {
        result: leftNum > rightNum,
        left,
        right,
      };
    }
    case "less_than": {
      const leftNum = asNumber(left);
      const rightNum = asNumber(right);
      if (leftNum === null || rightNum === null) {
        throw new Error("less_than requires numeric left and right values.");
      }
      return {
        result: leftNum < rightNum,
        left,
        right,
      };
    }
    case "contains": {
      if (typeof left === "string") {
        return {
          result: left.includes(String(right)),
          left,
          right,
        };
      }
      if (Array.isArray(left)) {
        return {
          result: left.includes(right),
          left,
          right,
        };
      }
      throw new Error("contains requires left_value to be a string or an array.");
    }
    default:
      throw new Error(`Unsupported conditional operator: ${(config as any).operator}`);
  }
}
