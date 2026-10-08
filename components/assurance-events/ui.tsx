"use client";

// Shared UI for the Assurance Events pages, in ISPM's design (the same
// classes as Settings → Gateway → Agent Task Library and SLA & Escalation
// Policies): gray palette, text-2xl page titles, white rounded-lg cards with
// shadow-sm, uppercase gray table headers and rounded-full pills. Also the
// lookup-backed badge and selects (components/common/Lookup*.tsx in the
// Continuous Assurance app).

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useLookup, useLookupMap } from "@/hooks/useAssuranceEvents";

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

// ---------- Layout (ISPM page shell) ----------

/** Page shell: `<div className={PAGE}><div className={PAGE_INNER}>…` like the gateway pages. */
export const PAGE = "h-full";
export const PAGE_INNER = "w-full px-6 pb-6";

export const CARD = "bg-white border border-gray-200 rounded-lg shadow-sm";
export const CARD_HEADER = "px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3";
export const CARD_TITLE = "text-sm font-semibold text-gray-900";
export const CARD_SUBTITLE = "text-xs text-gray-500 mt-0.5";
export const CARD_BODY = "p-5";

// ---------- Tables ----------

export const TABLE = "w-full";
export const THEAD_ROW = "bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500";
export const TH = "px-4 py-3";
export const TBODY = "divide-y divide-gray-100";
export const TD = "px-4 py-3 align-top text-sm text-gray-700";
export const TR_CLICKABLE = "cursor-pointer hover:bg-gray-50";

// ---------- Pills, labels, inputs, buttons ----------

export const PILL = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";
/** @deprecated name kept for existing callers — same as PILL. */
export const BADGE = PILL;
export const LABEL = "block text-sm text-gray-700 mb-1";
/** Input styling without a width — pair with a width class (w-20, w-52, …). */
export const INPUT_BASE =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
  "disabled:bg-gray-50 disabled:text-gray-500";
/** Full-width input. Use INPUT_BASE instead when giving the input its own width. */
export const INPUT = `${INPUT_BASE} w-full`;

const BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";
export const BTN_PRIMARY = cx(BTN, "bg-blue-600 text-white shadow-sm hover:bg-blue-700");
export const BTN_SECONDARY = cx(BTN, "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50");
export const BTN_GHOST = cx(BTN, "text-gray-600 hover:bg-gray-100");
export const BTN_DANGER = cx(BTN, "bg-red-600 text-white shadow-sm hover:bg-red-700");
/** Text-style action, like the "Edit" link in the SLA policy table. */
export const BTN_LINK = "text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 className={cx("animate-spin text-gray-400", className)} size={size} />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64 gap-2 text-gray-500 text-sm">
      <Spinner size={20} />
      Loading…
    </div>
  );
}

// ---------- Page building blocks ----------

/** Title row of every page: title + description on the left, actions on the right. */
export function PageHeader({ title, subtitle, actions, children }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 flex-wrap">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-3xl">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Summary tile, as in the gateway pages' stat rows. */
export function StatCard({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

/** Underlined tab bar used by the editors (Studio configuration, definitions). */
export function TabBar<K extends string>({ tabs, active, onChange }: {
  tabs: Array<[K, string]>; active: K; onChange: (k: K) => void;
}) {
  return (
    <div className="border-b border-gray-200 flex gap-6 overflow-x-auto mb-6" role="tablist">
      {tabs.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={active === k} onClick={() => onChange(k)}
                className={cx("py-3 text-sm whitespace-nowrap border-b-2 -mb-px font-medium",
                  active === k ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Renders a code as its lookup display name, colored by metadata.ui_color.
 * Falls back to the raw code until the lookup row has loaded.
 */
export function LookupBadge({ domain, code, fallback, className }: {
  domain: string; code: string; fallback?: string; className?: string;
}) {
  const { map } = useLookupMap(domain);
  const entry = map.get(code);
  const color = (entry?.metadata as Record<string, string> | undefined)?.ui_color;
  return (
    <span
      className={cx(BADGE, "border", !color && "bg-gray-100 text-gray-700 border-gray-200", className)}
      style={color ? { backgroundColor: color + "1F", color, borderColor: color + "55" } : undefined}
    >
      {entry?.displayName ?? fallback ?? code}
    </span>
  );
}

/** Dropdown backed by a lookup domain. */
export function LookupSelect({
  domain, value, onChange, placeholder = "Select…", className, disabled, filter, includeEmptyLabel,
}: {
  domain: string;
  value: string | undefined;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Optional filter on the displayed codes (e.g. hide system-only ones). */
  filter?: (code: string, metadata: Record<string, unknown>) => boolean;
  /** Adds an "All" / empty option with this label. */
  includeEmptyLabel?: string;
}) {
  const { data, isLoading } = useLookup(domain);
  const options = (data ?? []).filter((l) => (filter ? filter(l.code, l.metadata) : true));

  return (
    <select
      className={cx(INPUT, className)}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || isLoading}
    >
      {includeEmptyLabel !== undefined ? (
        <option value="">{includeEmptyLabel}</option>
      ) : (
        !value && <option value="" disabled>{isLoading ? "Loading…" : placeholder}</option>
      )}
      {options.map((l) => (
        <option key={l.code} value={l.code}>{l.displayName}</option>
      ))}
    </select>
  );
}

/** Multi-select variant — checkbox list. */
export function LookupMultiSelect({ domain, values, onChange, className }: {
  domain: string; values: string[]; onChange: (codes: string[]) => void; className?: string;
}) {
  const { data, isLoading } = useLookup(domain);
  const set = new Set(values);
  const toggle = (code: string) => {
    const next = new Set(set);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next]);
  };
  return (
    <div className={cx("border border-gray-300 rounded-md bg-white p-2 max-h-56 overflow-auto", className)}>
      {isLoading && <div className="text-xs text-gray-500">Loading…</div>}
      {(data ?? []).map((l) => (
        <label key={l.code}
               className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer text-sm">
          <input type="checkbox" checked={set.has(l.code)} onChange={() => toggle(l.code)}
                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span>{l.displayName}</span>
        </label>
      ))}
    </div>
  );
}
