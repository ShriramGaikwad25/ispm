"use client";

// Executors — who carries out an action, with health and the last call,
// and "Register executor" to add a REST adapter draft. Same behaviour as the
// deployed Continuous Assurance console (graph.keyforge.ai/cc/executors),
// laid out like ISPM's gateway registry pages (stat cards, registry card
// with filters, ISPM table and pills).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EXECUTORS_BASE, EXECUTORS_KEY, Executors } from "@/lib/assurance-executors";
import { formatRelative } from "@/lib/assurance-format";
import {
  BTN_PRIMARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, Spinner, StatCard, TBODY, TD, TH,
  THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function ExecutorsPage() {
  const executors = useQuery({ queryKey: EXECUTORS_KEY, queryFn: Executors.list });
  const router = useRouter();
  const qc = useQueryClient();
  const [banner, setBanner] = useState<Banner>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const all = useMemo(() => executors.data ?? [], [executors.data]);
  const stats = useMemo(() => ({
    active: all.filter((e) => e.state === "ACTIVE" && !e.paused).length,
    paused: all.filter((e) => e.paused).length,
    misconfigured: all.filter((e) => e.state !== "DEPRECATED" && !e.diagnose.ready).length,
    drafts: all.filter((e) => e.state === "DRAFT").length,
  }), [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((e) =>
      (!q || [e.executor_code, e.display_name, e.endpoint ?? "", ...e.supports].join(" ").toLowerCase().includes(q)) &&
      (!kindFilter || e.kind === kindFilter) &&
      (!stateFilter || e.state === stateFilter));
  }, [all, search, kindFilter, stateFilter]);

  const register = async () => {
    try {
      const code = `new-adapter-${Math.floor(Math.random() * 900 + 100)}`;
      await Executors.create({
        executorCode: code,
        kind: "REST",
        displayName: "New REST adapter",
        supports: ["IGA_SET_APPROVAL_GROUP"],
        endpoint: "https://adapter.example.internal/actions",
        auth: { type: "BEARER", secretRef: "env://ADAPTER_TOKEN", signingSecretRef: "env://CC_ACTION_SIGNING_KEY" },
        protocol: { timeout: "PT20S", asyncDeadline: "PT30M", rollbackSupported: true, circuitBreaker: { failureThreshold: 5, openFor: "PT5M" } },
        context: { include: ["event", "subject", "finding"], redact: [] },
      });
      await qc.invalidateQueries({ queryKey: EXECUTORS_KEY });
      router.push(`${EXECUTORS_BASE}/${code}`);
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    }
  };

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Executors"
          subtitle="Who carries out an action: a built-in connector, a REST adapter that speaks the action protocol, or an AI agent that proposes a plan for approval."
          actions={<button type="button" className={BTN_PRIMARY} onClick={register}>+ Register Executor</button>}
        />

        {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Executors" value={stats.active} hint="Running and not paused" />
          <StatCard label="Paused" value={stats.paused} hint="Bound rules route to the owner" />
          <StatCard label="Misconfigured" value={stats.misconfigured} hint="Endpoint or secrets not resolvable" />
          <StatCard label="Drafts" value={stats.drafts} hint="Registered, not yet activated" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className={CARD_TITLE}>Executor Registry</div>
              <div className={CARD_SUBTITLE}>Built-in connectors, REST adapters and AI agents that response policies bind actions to.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, action, endpoint..."
                     aria-label="Search executors" className={cx(FILTER_INPUT, "w-56")} />
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Kind" className={FILTER_INPUT}>
                <option value="">All Kinds</option>
                <option value="INPROCESS">Built-in</option>
                <option value="REST">REST adapter</option>
                <option value="AGENT">AI agent</option>
              </select>
              <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} aria-label="State" className={FILTER_INPUT}>
                <option value="">All States</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>Executor</th>
                  <th className={TH}>Kind</th>
                  <th className={TH}>Supports</th>
                  <th className={TH}>Endpoint</th>
                  <th className={TH}>Auth</th>
                  <th className={TH}>State</th>
                  <th className={TH}>Version</th>
                  <th className={TH}>Health</th>
                  <th className={TH}>Last Call</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {executors.isLoading && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                  </td></tr>
                )}
                {executors.error && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-red-600">{(executors.error as Error).message}</td></tr>
                )}
                {rows.map((e) => (
                  <tr key={e.executor_code} className={TR_CLICKABLE} onClick={() => router.push(`${EXECUTORS_BASE}/${e.executor_code}`)}>
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
                    <td className={cx(TD, "max-w-[220px] truncate text-xs")} title={e.endpoint ?? undefined}>
                      {e.kind === "INPROCESS" ? "Built in" : e.endpoint}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap text-xs")}>{e.auth?.type ?? "NONE"}</td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      <span className="inline-flex gap-1">
                        <StateBadge value={e.state} />
                        {e.paused && <StateBadge value="PAUSED" />}
                      </span>
                    </td>
                    <td className={cx(TD, "whitespace-nowrap")}>v{e.version}</td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      {e.diagnose.ready
                        ? <span className={cx(PILL, "bg-green-100 text-green-700")}>Ready</span>
                        : <span className={cx(PILL, "bg-red-100 text-red-700")}>Misconfigured</span>}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap text-xs")}>
                      {e.last_call_at ? `${formatRelative(e.last_call_at)} · ${e.last_status}` : "—"}
                    </td>
                  </tr>
                ))}
                {!executors.isLoading && !executors.error && rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">No executors match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
