"use client";

// ---------------------------------------------------------------------
// Effective config — the console's Effective config tab
// (graph.keyforge.ai/console#/definitions/{id}): the configuration the
// service actually runs for this definition, every default and link
// resolved (GET /compliance/definitions/{id}/effective-config). Read only;
// it reflects the saved definition, not unsaved edits.
// ---------------------------------------------------------------------

import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { CC_DEFINITIONS_KEY, CcDefinitionWrites } from "@/lib/cc-definitions-api";
import { BTN_SECONDARY, PageSpinner, TBODY, TD, TH, THEAD_ROW, cx } from "../ui";
import { Section } from "./fields";
import type { TabProps } from "./tabs";

export function EffectiveConfigTab({ id }: TabProps) {
  const q = useQuery({
    queryKey: [...CC_DEFINITIONS_KEY, "effective-config", id],
    queryFn: () => CcDefinitionWrites.effectiveConfig(id),
    enabled: !!id,
  });

  if (!id) {
    return (
      <Section title="Effective Config">
        <p className="text-sm text-gray-500">Available after the definition is created.</p>
      </Section>
    );
  }

  return (
    <Section
      title="Effective Config"
      hint="What the service runs for the saved definition: every default and link resolved. Save to see your edits here."
      actions={
        <button className={cx(BTN_SECONDARY, "text-xs")} onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      }
    >
      {q.isLoading ? <PageSpinner />
        : q.error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(q.error as Error).message}</div>
        : <ConfigView v={q.data} />}
    </Section>
  );
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isFilled = (v: unknown) => !!v && typeof v === "object" && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0);

/**
 * A JSON value laid out for reading, as the console does: scalars as a key/value list, nested
 * objects as titled sub-sections, arrays of objects as tables, arrays of scalars as chips.
 * Deeper than three levels, the raw JSON is shown.
 */
function ConfigView({ v, depth = 0 }: { v: unknown; depth?: number }) {
  if (v == null) return <span className="text-sm text-gray-400">—</span>;
  if (Array.isArray(v)) {
    if (!v.length) return <span className="text-sm text-gray-400">empty</span>;
    if (v.every(isObject)) return <RowsTable rows={v} />;
    return (
      <div className="flex flex-wrap gap-1.5">
        {v.map((x, i) => (
          <span key={i} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-700">
            {typeof x === "object" ? JSON.stringify(x) : String(x)}
          </span>
        ))}
      </div>
    );
  }
  if (isObject(v)) {
    if (depth > 2) {
      return <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto max-h-96">{JSON.stringify(v, null, 2)}</pre>;
    }
    const flat = Object.entries(v).filter(([, x]) => !isFilled(x));
    const nested = Object.entries(v).filter(([, x]) => isFilled(x));
    return (
      <div className={cx("space-y-5", depth > 0 && "pl-4 border-l-2 border-gray-100")}>
        {flat.length > 0 && (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
            {flat.map(([k, x]) => (
              <Fragment key={k}>
                <dt className="text-gray-500 font-mono text-xs pt-0.5">{k}</dt>
                <dd className="text-gray-900 min-w-0 [overflow-wrap:anywhere]"><Scalar v={x} /></dd>
              </Fragment>
            ))}
          </dl>
        )}
        {nested.map(([k, x]) => (
          <div key={k}>
            <div className={cx("font-semibold text-gray-900 mb-2", depth === 0 ? "text-sm" : "text-xs uppercase tracking-wide")}>{k}</div>
            <ConfigView v={x} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  return <Scalar v={v} />;
}

function Scalar({ v }: { v: unknown }) {
  if (v == null || v === "") return <span className="text-gray-400">—</span>;
  if (typeof v === "boolean") return <span className={v ? "text-green-700" : "text-red-600"}>{String(v)}</span>;
  if (Array.isArray(v)) return <span className="text-gray-400">empty</span>;
  if (typeof v === "object") return <span className="text-gray-400">{"{}"}</span>;
  return <>{String(v)}</>;
}

function RowsTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const cols = rows.reduce<string[]>((acc, r) => { Object.keys(r).forEach((k) => { if (!acc.includes(k)) acc.push(k); }); return acc; }, []);
  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead><tr className={THEAD_ROW}>{cols.map((c) => <th key={c} className={cx(TH, "whitespace-nowrap")}>{c}</th>)}</tr></thead>
        <tbody className={TBODY}>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} className={cx(TD, "text-xs")}>
                  {r[c] && typeof r[c] === "object"
                    ? <code className="text-gray-500 [overflow-wrap:anywhere]">{JSON.stringify(r[c])}</code>
                    : <Scalar v={r[c]} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
