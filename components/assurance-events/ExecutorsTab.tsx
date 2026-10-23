"use client";

// Executors (Studio Configuration → Executors tab) — who runs an action:
// in-process connectors, REST adapters speaking the action protocol, or AI
// agents that propose plans. The Continuous Compliance Console's Executors
// page (graph.keyforge.ai/console#/executors) on the same API
// (GET /compliance/executors), laid out like ISPM's gateway registry pages.
// "Register executor" opens the registration form (executors/new).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { EXECUTORS_BASE, EXECUTORS_KEY, Executors } from "@/lib/assurance-executors";
import {
  BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, Spinner, StatCard, TBODY, TD, TH,
  THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { StateBadge } from "@/components/assurance-events/definition-editor/fields";

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export function ExecutorsTab() {
  const executors = useQuery({ queryKey: EXECUTORS_KEY, queryFn: Executors.list });
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const all = useMemo(() => executors.data ?? [], [executors.data]);
  const stats = useMemo(() => ({
    active: all.filter((e) => e.state === "ACTIVE" && !e.paused).length,
    paused: all.filter((e) => e.paused).length,
    drafts: all.filter((e) => e.state === "DRAFT").length,
    deprecated: all.filter((e) => e.state === "DEPRECATED").length,
  }), [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((e) =>
      (!q || [e.executor_code, e.display_name, e.endpoint ?? "", ...e.supports].join(" ").toLowerCase().includes(q)) &&
      (!kindFilter || e.kind === kindFilter) &&
      (!stateFilter || e.state === stateFilter));
  }, [all, search, kindFilter, stateFilter]);

  const register = () => router.push(`${EXECUTORS_BASE}/new`);

  return (
    <div>
      <div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Executors" value={stats.active} hint="Running and not paused" />
          <StatCard label="Paused" value={stats.paused} hint="Bound rules route to the owner" />
          <StatCard label="Drafts" value={stats.drafts} hint="Registered, not yet activated" />
          <StatCard label="Deprecated" value={stats.deprecated} hint="No longer bound to new rules" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          {/* Row 1: title + Register; row 2: search, filters, Refresh. */}
          <div className="border-b border-gray-200 px-5 py-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className={CARD_TITLE}>Executor Registry</div>
                <div className={CARD_SUBTITLE}>DRAFT → ACTIVE → DEPRECATED. An ACTIVE row overrides a built-in connector of the same code; re-registering a code cuts version N+1.</div>
              </div>
              <button type="button" className={cx(BTN_PRIMARY, "shrink-0 whitespace-nowrap")} onClick={register}>+ Register Executor</button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, action, endpoint..."
                     aria-label="Search executors" className={cx(FILTER_INPUT, "w-full min-w-0 sm:w-96")} />
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Kind" className={cx(FILTER_INPUT, "w-full sm:w-56")}>
                <option value="">All Kinds</option>
                <option value="INPROCESS">Built-in</option>
                <option value="REST">REST adapter</option>
                <option value="AGENT">AI agent</option>
              </select>
              <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} aria-label="State" className={cx(FILTER_INPUT, "w-full sm:w-56")}>
                <option value="">All States</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
              <button type="button" className={cx(BTN_SECONDARY, "sm:ml-auto")} onClick={() => executors.refetch()} disabled={executors.isFetching}>
                <RefreshCw size={14} className={executors.isFetching ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>Executor</th>
                  <th className={TH}>Kind</th>
                  <th className={TH}>Supports</th>
                  <th className={TH}>Endpoint</th>
                  <th className={TH}>Auth</th>
                  <th className={TH}>State</th>
                  <th className={TH}>Version</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {executors.isLoading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                  </td></tr>
                )}
                {executors.error && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-red-600">{(executors.error as Error).message}</td></tr>
                )}
                {rows.map((e) => (
                  <tr key={`${e.executor_code}-${e.version}`} className={TR_CLICKABLE} onClick={() => router.push(`${EXECUTORS_BASE}/${encodeURIComponent(e.executor_code)}`)}>
                    <td className={TD}>
                      <div className="text-sm font-semibold text-gray-900">{e.display_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">{e.executor_code}</div>
                    </td>
                    <td className={TD}><StateBadge value={e.kind} /></td>
                    <td className={cx(TD, "max-w-xs")}>
                      <div className="flex flex-wrap gap-1">
                        {e.supports.map((a) => (
                          <span key={a} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-mono text-gray-700">{a}</span>
                        ))}
                      </div>
                    </td>
                    <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>
                      {e.endpoint || "—"}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap text-xs")}>{e.auth?.type ?? "—"}</td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      <span className="inline-flex gap-1">
                        <StateBadge value={e.state} />
                        {e.paused && <StateBadge value="PAUSED" />}
                      </span>
                    </td>
                    <td className={cx(TD, "whitespace-nowrap")}>v{e.version}</td>
                  </tr>
                ))}
                {!executors.isLoading && !executors.error && rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">{all.length ? "No executors match the current filters." : "No executors registered — the in-process connectors run every action."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
