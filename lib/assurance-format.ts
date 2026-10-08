// Date helpers for the Assurance Events pages — equivalents of the
// Continuous Assurance app's lib/format.ts (which used date-fns; ISPM
// doesn't depend on it, so these use Intl instead).

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 86_400_000], ["month", 30 * 86_400_000], ["day", 86_400_000],
  ["hour", 3_600_000], ["minute", 60_000],
];

/** Returns positive ms if a date is in the future, negative if past. */
export const msUntil = (iso?: string | null): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t - Date.now();
};

/** "in 3 days" / "2 hours ago". */
export function formatRelative(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = t - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/** "Oct 4, 2026, 14:05". */
export function formatAbsolute(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
