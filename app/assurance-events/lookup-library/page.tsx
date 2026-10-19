"use client";

// =====================================================================
// Lookup Library — the Continuous Compliance Console's Lookup library
// (graph.keyforge.ai/console#/lookup-tables) on the same API
// (GET /compliance/lookup-tables, lib/cc-lookup-tables-api.ts), laid out like
// the SLA page: stat cards, filters, table, clone dialog.
// A row opens the lookup page; "New Lookup" opens it as "new".
// =====================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  LOOKUPS_BASE, LOOKUPS_KEY, LookupTables, keyColumns, lookupHref, valueColumns, type LookupTable,
} from "@/lib/cc-lookup-tables-api";
import {
  BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER_FLUSH, PageHeader, Spinner, StatCard,
  TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { StateBadge } from "@/components/assurance-events/definition-editor/fields";
import { CloneLookup } from "@/components/assurance-events/CloneLookup";

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function LookupLibraryPage() {
  const router = useRouter();
  const connection = useCcConnection();
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const query = { state: state || undefined, q: search.trim() || undefined };
  const q = useQuery({ queryKey: [...LOOKUPS_KEY, "list", query], queryFn: () => LookupTables.list(query) });
  const allQ = useQuery({ queryKey: [...LOOKUPS_KEY, "list", {}], queryFn: () => LookupTables.list() });
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const all = useMemo(() => allQ.data ?? [], [allQ.data]);
  const error = connection.error ?? q.error;
  const [cloning, setCloning] = useState<LookupTable | null>(null);

  const stats = useMemo(() => ({
    total: all.length,
    active: all.filter((l) => l.state === "ACTIVE").length,
    draft: all.filter((l) => l.state === "DRAFT").length,
    views: all.filter((l) => l.sourceKind === "VIEW").length,
  }), [all]);

  return (
    <div className={PAGE}>
      {cloning && <CloneLookup src={cloning} onClose={() => setCloning(null)} onDone={(c) => router.push(lookupHref(c.code, c.version))} />}
      <div className={PAGE_INNER_FLUSH}>
        <PageHeader
          title="Lookup Library"
          wideSubtitle
          subtitle={<>A lookup describes a decision table or view you maintain in the database (an allow-listed schema): the columns it exposes
            (KEY columns match the event, VALUE columns are copied) and the match — which column equals which <code>subject.*</code> /{" "}
            <code>finding.*</code> value, with an optional <code>*</code> wildcard row. A definition binds lookups on its Lookups tab; before
            the governance rules run, the selected row lands on the event as <code>finding.lookup.&lt;column&gt;</code>.</>}
          actions={<Link href={`${LOOKUPS_BASE}/new`} className={BTN_PRIMARY}>+ New Lookup</Link>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Lookups" value={stats.total} hint="In the library" />
          <StatCard label="Active" value={stats.active} hint="Bindable from a definition" />
          <StatCard label="Draft" value={stats.draft} hint="Editable, not yet activated" />
          <StatCard label="View Sources" value={stats.views} hint="Backed by a database view" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          <div className="border-b border-gray-200 px-5 py-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className={CARD_TITLE}>Lookup Library ({rows.length})</div>
                <div className={CARD_SUBTITLE}>Click a lookup to open it.</div>
              </div>
              <button type="button" className={cx(BTN_SECONDARY, "shrink-0")} onClick={() => q.refetch()} disabled={q.isFetching}>
                <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, source..."
                     aria-label="Search lookups" className={cx(FILTER_INPUT, "flex-1 min-w-0")} />
              <select value={state} onChange={(e) => setState(e.target.value)} aria-label="State" className={FILTER_INPUT}>
                <option value="">All States</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={cx(TH, "min-w-[240px]")}>Lookup</th>
                <th className={TH}>Source</th>
                <th className={TH}>Key Columns</th>
                <th className={TH}>Value Columns</th>
                <th className={TH}>Select</th>
                <th className={TH}>Version</th>
                <th className={TH}>State</th>
                <th className={TH}>Owner</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {q.isLoading && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                </td></tr>
              )}
              {error && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-red-600">{(error as Error).message}</td></tr>
              )}
              {rows.map((l) => (
                <tr key={l.lookupId} className={TR_CLICKABLE} onClick={() => router.push(lookupHref(l.code, l.version))}>
                  <td className={TD}>
                    <Link href={lookupHref(l.code, l.version)} onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      {l.name}
                    </Link>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{l.code}</div>
                  </td>
                  <td className={cx(TD, "text-xs font-mono")}>
                    {l.sourceSchema ? `${l.sourceSchema}.` : ""}{l.sourceName} <span className="text-gray-500">({l.sourceKind})</span>
                  </td>
                  <td className={cx(TD, "text-xs font-mono")}>{keyColumns(l.columns).join(", ") || "—"}</td>
                  <td className={cx(TD, "text-xs font-mono")}>{valueColumns(l.columns).join(", ") || "—"}</td>
                  <td className={cx(TD, "text-xs")}>{l.selectMode}</td>
                  <td className={cx(TD, "font-semibold text-gray-900 whitespace-nowrap")}>v{l.version}</td>
                  <td className={TD}><StateBadge value={l.state} /></td>
                  <td className={cx(TD, "text-xs")}>{l.owner || <span className="text-gray-400">—</span>}</td>
                  <td className={TD}>
                    <button type="button" title="Clone" aria-label={`Clone ${l.code}`}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            onClick={(e) => { e.stopPropagation(); setCloning(l); }}>
                      <Copy size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!q.isLoading && !error && rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">No lookups match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
