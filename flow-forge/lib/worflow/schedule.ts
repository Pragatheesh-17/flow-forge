type ParsedField = {
  values: Set<number>;
};

const FIELD_RANGES = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12 }, // month
  { min: 0, max: 7 }, // day of week (0/7 Sunday)
] as const;

function assertValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

function parsePart(part: string, min: number, max: number) {
  if (part === "*") {
    const values = new Set<number>();
    for (let i = min; i <= max; i++) values.add(i);
    return values;
  }

  const stepSplit = part.split("/");
  if (stepSplit.length > 2) {
    throw new Error(`Invalid cron token: ${part}`);
  }

  const base = stepSplit[0];
  const step = stepSplit.length === 2 ? Number(stepSplit[1]) : 1;
  if (!Number.isInteger(step) || step <= 0) {
    throw new Error(`Invalid step value in cron token: ${part}`);
  }

  const values = new Set<number>();
  const segments = base.split(",");
  for (const segment of segments) {
    if (!segment) throw new Error(`Invalid cron token: ${part}`);

    let start: number;
    let end: number;

    if (segment === "*") {
      start = min;
      end = max;
    } else if (segment.includes("-")) {
      const [rawStart, rawEnd] = segment.split("-");
      start = Number(rawStart);
      end = Number(rawEnd);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new Error(`Invalid range in cron token: ${part}`);
      }
    } else {
      const value = Number(segment);
      if (!Number.isInteger(value)) {
        throw new Error(`Invalid number in cron token: ${part}`);
      }
      start = value;
      end = value;
    }

    if (start < min || end > max) {
      throw new Error(`Value out of range in cron token: ${part}`);
    }

    for (let v = start; v <= end; v += step) {
      values.add(v);
    }
  }

  if (values.size === 0) {
    throw new Error(`Empty cron field in token: ${part}`);
  }

  return values;
}

function normalizeDow(values: Set<number>) {
  if (values.has(7)) {
    values.add(0);
    values.delete(7);
  }
}

function parseCron(expression: string): ParsedField[] {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error("Cron expression must have exactly 5 fields.");
  }

  const parsed = fields.map((field, index) => {
    const range = FIELD_RANGES[index];
    const values = parsePart(field, range.min, range.max);
    if (index === 4) normalizeDow(values);
    return { values };
  });

  return parsed;
}

function zonedDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const weekday = get("weekday");
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    minute: Number(get("minute")),
    hour: Number(get("hour")),
    day: Number(get("day")),
    month: Number(get("month")),
    dow: weekday ? dowMap[weekday] : NaN,
  };
}

function matchesCron(date: Date, timezone: string, parsed: ParsedField[]) {
  const parts = zonedDateParts(date, timezone);
  return (
    parsed[0].values.has(parts.minute) &&
    parsed[1].values.has(parts.hour) &&
    parsed[2].values.has(parts.day) &&
    parsed[3].values.has(parts.month) &&
    parsed[4].values.has(parts.dow)
  );
}

function nextMinute(date: Date) {
  const d = new Date(date);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1);
  return d;
}

export function validateSchedule(cronExpression: string, timezone: string) {
  assertValidTimeZone(timezone);
  parseCron(cronExpression);
}

export function nextRunAt(
  cronExpression: string,
  timezone: string,
  fromDate: Date = new Date()
) {
  validateSchedule(cronExpression, timezone);
  const parsed = parseCron(cronExpression);

  let cursor = nextMinute(fromDate);
  const maxIterations = 60 * 24 * 366; // 1 year search window

  for (let i = 0; i < maxIterations; i++) {
    if (matchesCron(cursor, timezone, parsed)) {
      return cursor.toISOString();
    }
    cursor = new Date(cursor.getTime() + 60_000);
  }

  throw new Error("Unable to find next run for the cron expression within 1 year.");
}
