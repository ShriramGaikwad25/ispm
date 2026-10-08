"use client";

// Building blocks of the definition editor, ported from the deployed
// Continuous Assurance console (graph.keyforge.ai/cc): section card, JSON
// field, escalation chain editor, request ("wire") view, key/value list,
// state badge and banner.

import { useState } from "react";
import type { ReactNode } from "react";
import type { EscalationStep } from "@/lib/assurance-events-api";
import {
  BTN_GHOST, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, INPUT_BASE, LABEL, cx,
} from "../ui";

export type Banner = { tone: "ok" | "err" | "warn"; text: string } | null;

export function BannerBar({ banner, onClose }: { banner: Banner; onClose?: () => void }) {
  if (!banner) return null;
  return (
    <div className={cx("rounded-md border px-3 py-2 text-sm flex items-start justify-between gap-3",
      banner.tone === "ok" && "bg-emerald-50 border-emerald-200 text-emerald-800",
      banner.tone === "err" && "bg-red-50 border-red-200 text-red-700",
      banner.tone === "warn" && "bg-amber-50 border-amber-200 text-amber-800")}>
      <span>{banner.text}</span>
      {onClose && <button className="text-xs opacity-70 hover:opacity-100" onClick={onClose}>dismiss</button>}
    </div>
  );
}

const GREEN = "bg-green-100 text-green-700";
const AMBER = "bg-amber-100 text-amber-700";
const BLUE = "bg-blue-100 text-blue-700";
const RED = "bg-red-100 text-red-700";
const GRAY = "bg-gray-100 text-gray-600";

const STATE_STYLE: Record<string, string> = {
  ACTIVE: GREEN, CLOSED: GREEN, SUCCEEDED: GREEN,
  DRAFT: AMBER, OPEN: AMBER, DISPATCHED: AMBER,
  PROPOSED: BLUE, IN_REVIEW: BLUE, MITIGATING: BLUE, REMEDIATING: BLUE,
  DEPRECATED: GRAY,
  FAILED: RED, ROLLED_BACK: RED, PAUSED: RED,
  // Executor kinds
  INPROCESS: "bg-purple-100 text-purple-700", REST: BLUE, AGENT: "bg-purple-100 text-purple-700",
};

export function StateBadge({ value, className }: { value?: string; className?: string }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
      STATE_STYLE[value] ?? GRAY, className)}>
      {value}
    </span>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: RED,
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: GRAY,
};

export function SeverityBadge({ value }: { value?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
      SEVERITY_STYLE[value ?? ""] ?? GRAY)}>
      {value ?? "—"}
    </span>
  );
}

/** A titled card holding one group of settings. */
export function Section({ title, hint, actions, children }: {
  title: string; hint?: string; actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div>
          <div className={CARD_TITLE}>{title}</div>
          {hint && <div className={CARD_SUBTITLE}>{hint}</div>}
        </div>
        {actions}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

/** A JSON value edited as text; only valid JSON is passed up, errors show under the box. */
export function JsonField<T>({ label, value, onChange, readOnly, rows = 5, hint }: {
  label?: string;
  value: T;
  onChange?: (v: T) => void;
  readOnly?: boolean;
  rows?: number;
  hint?: string;
}) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      {label && <label className={LABEL}>{label}</label>}
      <textarea
        className={cx(INPUT, "font-mono text-xs", error && "border-red-400")}
        rows={rows}
        value={text}
        readOnly={readOnly}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange?.(JSON.parse(e.target.value) as T);
            setError(null);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
      {(error || hint) && (
        <div className={cx("text-[11px] mt-0.5", error ? "text-red-600" : "text-gray-500")}>{error ?? hint}</div>
      )}
    </div>
  );
}

const ESCALATION_ACTIONS = ["NUDGE", "NOTIFY_MANAGER", "NOTIFY_CISO", "REASSIGN"];

/** Steps fire once each, at a percentage of the SLA. */
export function EscalationChainEditor({ chain, onChange, readOnly }: {
  chain: EscalationStep[]; onChange: (c: EscalationStep[]) => void; readOnly?: boolean;
}) {
  const patch = (i: number, p: Partial<EscalationStep>) => onChange(chain.map((s, j) => (j === i ? { ...s, ...p } : s)));
  return (
    <div className="space-y-1.5">
      {chain.map((step, i) => (
        <div key={i} className="flex items-center gap-2 flex-wrap">
          <input type="number" min={1} max={100} className={cx(INPUT_BASE, "w-20")} value={step.atPercent}
                 disabled={readOnly} onChange={(e) => patch(i, { atPercent: Number(e.target.value) })} />
          <span className="text-xs text-gray-500">%</span>
          <select className={cx(INPUT_BASE, "w-44")} value={step.action} disabled={readOnly}
                  onChange={(e) => patch(i, { action: e.target.value })}>
            {ESCALATION_ACTIONS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <input
            className={cx(INPUT_BASE, "flex-1 min-w-[160px] font-mono text-xs")}
            placeholder='params e.g. {"strategy":"APP_OWNER"}'
            defaultValue={JSON.stringify(step.params ?? {})}
            disabled={readOnly}
            onBlur={(e) => {
              try {
                patch(i, { params: JSON.parse(e.target.value || "{}") });
              } catch {
                // keep the last valid params
              }
            }}
          />
          {!readOnly && (
            <button className={cx(BTN_GHOST, "text-xs")} onClick={() => onChange(chain.filter((_, j) => j !== i))}>
              Remove
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          className={cx(BTN_SECONDARY, "text-xs")}
          onClick={() => onChange([...chain, {
            atPercent: Math.min(100, (chain.at(-1)?.atPercent ?? 0) + 25), action: "NUDGE", params: {},
          }])}
        >
          Add step
        </button>
      )}
    </div>
  );
}

/** The request the editor would send, shown beside the form. */
export function WireView({ method, path, body }: { method: string; path: string; body: unknown }) {
  return (
    <div className={cx(CARD, "sticky top-4 overflow-hidden")}>
      <div className={CARD_HEADER}>
        <div>
          <div className={CARD_TITLE}>Request</div>
          <div className={cx(CARD_SUBTITLE, "font-mono")}>{method} {path}</div>
        </div>
      </div>
      <pre className="text-xs leading-snug p-4 max-h-[70vh] overflow-auto bg-gray-50 text-gray-800">
        {JSON.stringify(body, null, 2)}
      </pre>
    </div>
  );
}

export function KeyValueList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-gray-500">{k}</dt>
          <dd className="min-w-0 break-words text-gray-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
