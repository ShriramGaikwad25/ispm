"use client";

// =====================================================================
// SLA — the Continuous Compliance Console's SLA profile library
// (graph.keyforge.ai/console#/sla-profiles) on the same API
// (GET /compliance/sla-profiles, lib/cc-sla-profiles-api.ts), laid out like
// ISPM's gateway registry pages: stat cards, filters, table, clone dialog.
// A row opens the profile page; "New SLA Profile" opens it as "new".
// =====================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  SLA_BASE, SLA_PROFILES_KEY, SlaProfiles, chainText, humanDuration, slaHref, type SlaProfile,
} from "@/lib/cc-sla-profiles-api";
import {
  BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER_FLUSH, PILL, PageHeader, Spinner, StatCard,
  TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { SeverityBadge, StateBadge } from "@/components/assurance-events/definition-editor/fields";
import { CloneSlaProfile } from "@/components/assurance-events/CloneSlaProfile";

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function SlaProfilesPage() {
  const router = useRouter();
  const connection = useCcConnection();
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const query = { state: state || undefined, q: search.trim() || undefined };
  const q = useQuery({ queryKey: [...SLA_PROFILES_KEY, "list", query], queryFn: () => SlaProfiles.list(query) });
  const allQ = useQuery({ queryKey: [...SLA_PROFILES_KEY, "list", {}], queryFn: () => SlaProfiles.list() });
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const all = useMemo(() => allQ.data ?? [], [allQ.data]);
  const error = connection.error ?? q.error;
  const [cloning, setCloning] = useState<SlaProfile | null>(null);

  const stats = useMemo(() => ({
    total: all.length,
    active: all.filter((p) => p.state === "ACTIVE").length,
    tenant: all.filter((p) => !p.system).length,
    unconditional: all.filter((p) => p.state === "ACTIVE" && !p.appliesWhen).length,
  }), [all]);

  return (
    <div className={PAGE}>
      {cloning && <CloneSlaProfile src={cloning} onClose={() => setCloning(null)} onDone={(c) => router.push(slaHref(c.code, c.version))} />}
      <div className={PAGE_INNER_FLUSH}>
        <PageHeader
          title="SLA"
          wideSubtitle
          subtitle="An SLA profile is a reusable deadline rule: a duration (or absolute deadline), the action on timeout, the escalation chain and an optional applies-when condition. A definition links profiles on its SLA tab in priority order; the versions are pinned when the definition is activated. System profiles are read only; you may clone an existing profile to build a new one."
          actions={<Link href={`${SLA_BASE}/new`} className={BTN_PRIMARY}>+ New SLA Profile</Link>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="SLA Profiles" value={stats.total} hint="In the library" />
          <StatCard label="Active" value={stats.active} hint="Linkable from a definition" />
          <StatCard label="Tenant Profiles" value={stats.tenant} hint="Cloned or created by you" />
          <StatCard label="Unconditional" value={stats.unconditional} hint="Active, applies to every event" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          <div className="border-b border-gray-200 px-5 py-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className={CARD_TITLE}>SLA Profile Library ({rows.length})</div>
                <div className={CARD_SUBTITLE}>Click a profile to open it.</div>
              </div>
              <button type="button" className={cx(BTN_SECONDARY, "shrink-0")} onClick={() => q.refetch()} disabled={q.isFetching}>
                <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, description..."
                     aria-label="Search SLA profiles" className={cx(FILTER_INPUT, "w-full min-w-0 sm:w-96")} />
              <select value={state} onChange={(e) => setState(e.target.value)} aria-label="State" className={cx(FILTER_INPUT, "w-full sm:w-56")}>
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
                <th className={cx(TH, "min-w-[240px]")}>Profile</th>
                <th className={TH}>Version</th>
                <th className={TH}>State</th>
                <th className={TH}>Owner</th>
                <th className={TH}>Deadline</th>
                <th className={TH}>On Timeout</th>
                <th className={TH}>Escalation</th>
                <th className={TH}>Applies When</th>
                <th className={TH}>Severity Hint</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {q.isLoading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                </td></tr>
              )}
              {error && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-red-600">{(error as Error).message}</td></tr>
              )}
              {rows.map((p) => (
                <tr key={p.profileId} className={TR_CLICKABLE} onClick={() => router.push(slaHref(p.code, p.version))}>
                  <td className={TD}>
                    <Link href={slaHref(p.code, p.version)} onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      {p.name}
                    </Link>
                    {p.description && <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>}
                  </td>
                  <td className={cx(TD, "font-semibold text-gray-900 whitespace-nowrap")}>v{p.version}</td>
                  <td className={TD}><StateBadge value={p.state} /></td>
                  <td className={TD}>
                    <span className={cx(PILL, p.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                      {p.system ? "System" : "Tenant"}
                    </span>
                  </td>
                  <td className={cx(TD, "text-xs font-mono whitespace-nowrap")}>
                    {p.dueAt ? <span title={p.dueAt}>dueAt expression</span> : (
                      <>
                        {p.duration || "—"}
                        {p.duration && !p.duration.includes("${") && <span className="text-gray-500"> ({humanDuration(p.duration)})</span>}
                      </>
                    )}
                  </td>
                  <td className={cx(TD, "text-xs")}>
                    {p.actionOnTimeout || <span className="text-gray-500" title="The definition's default action on timeout">definition default</span>}
                  </td>
                  <td className={cx(TD, "text-xs")}>{chainText(p.escalationChain)}</td>
                  <td className={cx(TD, "text-xs font-mono max-w-[280px] truncate")} title={p.appliesWhen || ""}>
                    {p.appliesWhen || <i className="text-gray-500 font-sans">unconditional</i>}
                  </td>
                  <td className={TD}>{p.severityHint ? <SeverityBadge value={p.severityHint} /> : <span className="text-gray-400">—</span>}</td>
                  <td className={TD}>
                    <button type="button" title="Clone" aria-label={`Clone ${p.code}`}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            onClick={(e) => { e.stopPropagation(); setCloning(p); }}>
                      <Copy size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!q.isLoading && !error && rows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">No SLA profiles match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
