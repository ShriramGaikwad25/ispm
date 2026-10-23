"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import { CC_DEFINITIONS_KEY, CcDefinitionWrites } from "@/lib/cc-definitions-api";
import { formatAbsolute, formatRelative } from "@/lib/assurance-format";
import {
  BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE,
  PAGE_INNER, PageHeader, Spinner, StatCard, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, SeverityBadge, StateBadge } from "@/components/assurance-events/definition-editor/fields";
import type { Banner } from "@/components/assurance-events/definition-editor/fields";
import { DEFINITIONS_BASE } from "@/components/assurance-events/definition-editor/DefinitionEditor";

// =====================================================================
// Response policies / event definitions — one policy per kind of finding.
// The Continuous Compliance Console's Definitions page
// (graph.keyforge.ai/console#/definitions) on the same API:
//   GET  /compliance/definitions/summary?state=&eventTypeCode=&q=
//   POST /compliance/definitions                 (create, DRAFT)
//   POST /compliance/definitions/{id}/versions   (new version)
// Laid out like ISPM's SLA & Escalation Policies page (stat cards, registry
// card with filters). "Create Definition" opens the editor's tabs on a new
// definition (./new); a row opens the definition editor.
// =====================================================================

/** The governance policy as a rule count (the summary's text stays available on hover). */
function ruleCount(policy?: { text?: string; [k: string]: unknown }): string {
  if (!policy) return "—";
  const p = policy as Record<string, unknown>;
  const n = typeof p.ruleCount === "number" ? p.ruleCount
    : typeof p.count === "number" ? p.count
      : Array.isArray(p.rules) ? p.rules.length
        : typeof p.rules === "number" ? p.rules
          : Number(/(d+)s*rule/i.exec(policy.text ?? "")?.[1] ?? NaN);
  if (Number.isFinite(n)) return `${n} rule${n === 1 ? "" : "s"}`;
  return /no rules|built-in|none/i.test(policy.text ?? "") ? "0 rules" : policy.text || "—";
}

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function EventDefinitionsPage() {
  const router = useRouter();
  const connection = useCcConnection();
  const [banner, setBanner] = useState<Banner>(null);
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const query = { state: state || undefined, q: search.trim() || undefined };
  const list = useQuery({ queryKey: [...CC_DEFINITIONS_KEY, "summary", query], queryFn: () => CcDefinitionWrites.summary(query) });
  // Unfiltered, for the stat cards and the event type filter.
  const allQ = useQuery({ queryKey: [...CC_DEFINITIONS_KEY, "summary", {}], queryFn: () => CcDefinitionWrites.summary({}) });
  const listError = connection.error ?? list.error;

  const open = (id: string) => router.push(`${DEFINITIONS_BASE}/${id}`);
  const rows = useMemo(() => list.data ?? [], [list.data]);
  const all = useMemo(() => allQ.data ?? [], [allQ.data]);

  const stats = useMemo(() => ({
    active: all.filter((d) => d.state === "ACTIVE").length,
    drafts: all.filter((d) => d.state === "DRAFT").length,
    deprecated: all.filter((d) => d.state === "DEPRECATED").length,
  }), [all]);

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Event Definitions"
          subtitle="One policy per kind of finding: how it is detected, who reviews it and by when, and what governance does with it."
          actions={<button type="button" className={BTN_PRIMARY} onClick={() => router.push(`${DEFINITIONS_BASE}/new`)}>+ Create Definition</button>}
        />

        <BannerBar banner={banner} onClose={() => setBanner(null)} />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Active Definitions" value={stats.active} hint="Raising events now" />
          <StatCard label="Drafts" value={stats.drafts} hint="Not yet activated" />
          <StatCard label="Deprecated" value={stats.deprecated} hint="Replaced by a newer version" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          <div className="border-b border-gray-200 px-5 py-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className={CARD_TITLE}>Definitions ({rows.length})</div>
                <div className={CARD_SUBTITLE}>Versioned: an ACTIVE version is immutable — cut a new DRAFT version to change it.</div>
              </div>
              <button type="button" className={cx(BTN_SECONDARY, "shrink-0")} onClick={() => list.refetch()} disabled={list.isFetching}>
                <RefreshCw size={14} className={list.isFetching ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, type..."
                     aria-label="Search definitions" className={cx(FILTER_INPUT, "w-full min-w-0 sm:w-96")} />
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
                <th className={cx(TH, "min-w-[220px]")}>Definition</th>
                <th className={TH}>State</th>
                <th className={cx(TH, "min-w-[240px] w-[20%]")}>Detector</th>
                <th className={cx(TH, "min-w-[300px] w-[28%]")}>SLA</th>
                <th className={cx(TH, "w-[14%]")}>Reviewer</th>
                <th className={cx(TH, "w-24")}>Policy</th>
                <th className={cx(TH, "w-24")}>Updated</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {list.isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                </td></tr>
              )}
              {listError && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-red-600">
                  Failed to load definitions. {(listError as Error).message}
                </td></tr>
              )}
              {rows.map((d) => (
                <tr key={d.definitionId} className={TR_CLICKABLE} onClick={() => open(d.definitionId)}>
                  <td className={TD}>
                    <div className="text-sm font-semibold text-gray-900" title={`Name: ${d.name}`}>{d.name}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 font-mono break-all cursor-help" title={`Code: ${d.code}`}>{d.code}</span>
                      <span className="text-xs font-semibold text-gray-700 cursor-help" title={`Version: ${d.version}`}>v{d.version}</span>
                      <span className="cursor-help" title={`Severity: ${d.severity}`}><SeverityBadge value={d.severity} /></span>
                    </div>
                  </td>
                  <td className={TD}><StateBadge value={d.state} /></td>
                  <td className={cx(TD, "text-xs [overflow-wrap:anywhere]")}
                      title={(d.detector?.controls ?? []).map((c) => `${c.code}${c.version ? `@v${c.version}` : ""}`).join(" + ")}>
                    {d.detector?.text || "—"}
                  </td>
                  <td className={cx(TD, "text-xs [overflow-wrap:anywhere]")}
                      title={(d.sla?.items ?? []).map((i) => `${i.code}${i.version ? `@v${i.version}` : ""}${i.when ? ` when ${i.when}` : ""}`).join(" → ")}>
                    {d.sla?.text || "—"}
                  </td>
                  <td className={cx(TD, "text-xs [overflow-wrap:anywhere]")}>{d.reviewer?.text || "—"}</td>
                  <td className={cx(TD, "text-xs whitespace-nowrap")} title={d.policy?.text || undefined}>{ruleCount(d.policy)}</td>
                  <td className={cx(TD, "text-xs")} title={formatAbsolute(d.updatedAt)}>{formatRelative(d.updatedAt)}</td>
                </tr>
              ))}
              {!list.isLoading && !listError && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No definitions match the current filters.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
