// Detection schedule helpers for the definition editor's Settings
// (Scheduler) tab: defaults, option lists, next-run preview in the chosen
// time zone, and Quartz cron syntax checks. Shared by the UI and the mock.

import type { DefinitionSchedule } from "@/lib/assurance-events-api";

export const FREQUENCIES: DefinitionSchedule["frequency"][] = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "ON_DEMAND"];

/** The console's agent-schedule time zones. */
export const TIME_ZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Dublin", "Asia/Kolkata", "Asia/Singapore",
];

/** Quartz misfire instructions, as offered by ISPM's scheduler (Settings → Gateway → Scheduler). */
export const MISFIRE_INSTRUCTIONS = [
  "RESCHEDULE NEXT WITH REMAINING COUNT",
  "RESCHEDULE NEXT WITH EXISTING COUNT",
  "RESCHEDULE NOW WITH REMAINING COUNT",
  "RESCHEDULE NOW WITH EXISTING COUNT",
  "DO NOTHING",
];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DEFAULT_SCHEDULE: DefinitionSchedule = {
  enabled: false,
  mode: "FREQUENCY",
  frequency: "DAILY",
  time: "02:00",
  dayOfWeek: 1,
  dayOfMonth: 1,
  timeZone: "UTC",
  cronExpression: "0 0 2 * * ?",
  misfireInstruction: "RESCHEDULE NEXT WITH REMAINING COUNT",
};

/** Problems that would stop the scheduler accepting this schedule. Empty when valid. */
export function scheduleErrors(s: DefinitionSchedule): string[] {
  const errors: string[] = [];
  if (s.mode === "CRON") {
    const fields = (s.cronExpression ?? "").trim().split(/\s+/).filter(Boolean);
    if (fields.length < 6 || fields.length > 7) {
      errors.push("Cron expression needs 6 or 7 fields: seconds minutes hours day-of-month month day-of-week [year].");
    } else if (fields[3] !== "?" && fields[5] !== "?") {
      errors.push("Quartz cron needs '?' in either day-of-month or day-of-week.");
    } else if (fields.some((f) => !/^[\d*?/,\-LW#A-Za-z]+$/.test(f))) {
      errors.push("Cron expression contains characters Quartz does not accept.");
    }
  } else if (s.frequency !== "ON_DEMAND" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time ?? "")) {
    errors.push("Time must be HH:mm (24-hour).");
  }
  if (s.frequency === "MONTHLY" && s.mode === "FREQUENCY" && !(Number(s.dayOfMonth) >= 1 && Number(s.dayOfMonth) <= 31)) {
    errors.push("Day of month must be between 1 and 31.");
  }
  if (s.startDate && s.endDate && s.endDate < s.startDate) errors.push("End date is before the start date.");
  if (!TIME_ZONES.includes(s.timeZone)) errors.push(`Unknown time zone ${s.timeZone}.`);
  return errors;
}

/** Minutes the zone is ahead of UTC at the given instant. */
function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** The instant at which the zone's wall clock shows the given local date and time. */
function zonedInstant(timeZone: string, y: number, m: number, d: number, h: number, min: number): Date {
  const guess = Date.UTC(y, m, d, h, min);
  const first = guess - zoneOffsetMinutes(timeZone, new Date(guess)) * 60_000;
  // Second pass settles DST boundaries.
  return new Date(guess - zoneOffsetMinutes(timeZone, new Date(first)) * 60_000);
}

/** Today's date (y, m, d) on the zone's wall clock. */
function zonedToday(timeZone: string, now: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now).map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month - 1, d: +p.day };
}

/**
 * The next `count` runs for a FREQUENCY schedule, respecting start/end dates.
 * Returns [] for ON_DEMAND, disabled or invalid schedules. CRON schedules are
 * computed by the scheduler itself, not previewed here.
 */
export function nextRuns(s: DefinitionSchedule, count = 5, now = new Date()): Date[] {
  if (!s.enabled || s.mode !== "FREQUENCY" || s.frequency === "ON_DEMAND" || scheduleErrors(s).length) return [];
  const [hh, mm] = s.time.split(":").map(Number);
  const start = s.startDate ? zonedInstant(s.timeZone, ...ymd(s.startDate), 0, 0) : null;
  const end = s.endDate ? zonedInstant(s.timeZone, ...ymd(s.endDate), 23, 59) : null;
  const floor = start && start > now ? start : now;
  const today = zonedToday(s.timeZone, floor);
  const runs: Date[] = [];

  const accept = (at: Date) => {
    if (at <= floor || (end && at > end)) return;
    runs.push(at);
  };

  for (let i = 0; runs.length < count && i < 800; i++) {
    switch (s.frequency) {
      case "HOURLY": {
        const day = Math.floor(i / 24);
        accept(zonedInstant(s.timeZone, today.y, today.m, today.d + day, i % 24, mm));
        break;
      }
      case "DAILY":
        accept(zonedInstant(s.timeZone, today.y, today.m, today.d + i, hh, mm));
        break;
      case "WEEKLY": {
        const at = zonedInstant(s.timeZone, today.y, today.m, today.d + i, hh, mm);
        const weekday = new Date(Date.UTC(today.y, today.m, today.d + i)).getUTCDay();
        if (weekday === (s.dayOfWeek ?? 1)) accept(at);
        break;
      }
      case "MONTHLY": {
        const monthLength = new Date(Date.UTC(today.y, today.m + i + 1, 0)).getUTCDate();
        const day = Math.min(s.dayOfMonth ?? 1, monthLength);
        accept(zonedInstant(s.timeZone, today.y, today.m + i, day, hh, mm));
        break;
      }
    }
  }
  return runs.slice(0, count);
}

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m - 1, d];
}

/** One-line summary, e.g. "Weekly on Monday at 02:00 (Asia/Kolkata)". */
export function describeSchedule(s: DefinitionSchedule | undefined): string {
  if (!s || !s.enabled) return "Not scheduled";
  if (s.mode === "CRON") return `Cron ${s.cronExpression} (${s.timeZone})`;
  switch (s.frequency) {
    case "ON_DEMAND": return "On demand only";
    case "HOURLY": return `Hourly at :${s.time.slice(3, 5)} (${s.timeZone})`;
    case "DAILY": return `Daily at ${s.time} (${s.timeZone})`;
    case "WEEKLY": return `Weekly on ${WEEKDAYS[s.dayOfWeek ?? 1]} at ${s.time} (${s.timeZone})`;
    case "MONTHLY": return `Monthly on day ${s.dayOfMonth ?? 1} at ${s.time} (${s.timeZone})`;
  }
}
