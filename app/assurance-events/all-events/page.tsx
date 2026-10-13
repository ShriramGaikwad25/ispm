"use client";

// =====================================================================
// All Events — the Continuous Compliance Console's Events page
// (graph.keyforge.ai/console#/events), on the same live API:
//   GET /compliance/events?status=…&severity=…&definitionId=…&eventTypeCodes=…
//       &discoveredAfter=…&discoveredBefore=…&closedAfter=…&closedBefore=…
//       &slaMet=…&reviewerPrincipalId=…&page=…&pageSize=…
//   GET /compliance/definitions   (Definition filter and column)
//   GET /compliance/lookups/domains (connection check)
// Same filters (kept in the browser like the console), columns and paging,
// laid out like ISPM's gateway pages.
// =====================================================================

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  CcEvents, eventSearchQueryString, slaPercent, subjectLabel, type CcEventSearch,
} from "@/lib/cc-events-api";
import {
  BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, Spinner, TBODY, TD, TH, THEAD_ROW,
  TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { SeverityBadge, StateBadge } from "@/components/assurance-events/definition-editor/fields";

const DETAIL_BASE = "/assurance-events/all-events";
const STORAGE_KEY = "cc-console.events.filters";

const STATUSES = ["OPEN", "IN_REVIEW", "REMEDIATING", "MITIGATING", "CLOSED", "SUPPRESSED", "DECIDED", "EXPIRED"];
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PAGE_SIZES = [25, 50, 100, 200, 500];

interface Filters {
  status: string[];
  severity: string[];
  definitionId: string;
  eventTypeCodes: string;
  discoveredAfter: string;
  discoveredBefore: string;
  closedAfter: string;
  closedBefore: string;
  slaMet: "" | "true" | "false";
  reviewerPrincipalId: string;
  pageSize: number;
}

/** Same defaults as the console: the in-flight statuses, 50 per page. */
const DEFAULT_FILTERS: Filters = {
  status: ["OPEN", "IN_REVIEW", "REMEDIATING", "MITIGATING"],
  severity: [],
  definitionId: "",
  eventTypeCodes: "",
  discoveredAfter: "",
  discoveredBefore: "",
  closedAfter: "",
  closedBefore: "",
  slaMet: "",
  reviewerPrincipalId: "",
  pageSize: 50,
};

const FIELD = "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const FIELD_LABEL = "block text-sm text-gray-700 mb-1";

const iso = (local: string) => (local ? new Date(local).toISOString() : undefined);
const fmt = (t?: string | null) =>
  t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

function loadFilters(): Filters {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

export default function AllEventsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const connection = useCcConnection();
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  // Filters survive reloads, like the console (localStorage "cc-console.events.filters").
  useEffect(() => { setFiltersState(loadFilters()); }, []);
  const setFilters = (f: Filters) => {
    setFiltersState(f);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); } catch { /* storage unavailable */ }
  };

  const search: CcEventSearch = useMemo(() => ({
    status: filters.status.length ? filters.status : undefined,
    severity: filters.severity.length ? filters.severity : undefined,
    definitionId: filters.definitionId || undefined,
    eventTypeCodes: filters.eventTypeCodes ? filters.eventTypeCodes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    discoveredAfter: iso(filters.discoveredAfter),
    discoveredBefore: iso(filters.discoveredBefore),
    closedAfter: iso(filters.closedAfter),
    closedBefore: iso(filters.closedBefore),
    slaMet: filters.slaMet === "" ? undefined : filters.slaMet === "true",
    reviewerPrincipalId: filters.reviewerPrincipalId || undefined,
    page,
    pageSize: filters.pageSize,
  }), [filters, page]);

  const eventsQ = useQuery({ queryKey: ["continuouscompliance", "events", "search", search], queryFn: () => CcEvents.search(search) });
  const defsQ = useQuery({ queryKey: ["continuouscompliance", "events", "definitions"], queryFn: CcEvents.definitions, staleTime: 5 * 60_000 });

  const defs = useMemo(() => defsQ.data ?? [], [defsQ.data]);
  const defById = useMemo(() => new Map(defs.map((d) => [d.definitionId, d])), [defs]);
  const sortedDefs = useMemo(
    () => [...defs].sort((a, b) => a.code.localeCompare(b.code) || b.version - a.version), [defs]);

  const rows = eventsQ.data?.content ?? [];
  const total = eventsQ.data?.totalElements ?? 0;
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const error = connection.error ?? eventsQ.error;

  const toggle = (key: "status" | "severity", value: string) => {
    const cur = filters[key];
    setFilters({ ...filters, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
    setPage(0);
  };
  const set = <K extends keyof Filters>(key: K, value: Filters[K], resetPage = false) => {
    setFilters({ ...filters, [key]: value });
    if (resetPage) setPage(0);
  };
  const defLabel = (id: string) => {
    const d = defById.get(id);
    return d ? `${d.code} v${d.version}` : id ? `${id.slice(0, 8)}…` : "—";
  };

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="All Events"
          subtitle="Every event raised for this tenant: filter by status, severity, definition, dates, SLA and reviewer, then open one to see its detail."
        />

        {/* Filters */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-5 mb-6 space-y-4">
          <ChipRow label="Status" values={STATUSES} selected={filters.status} onToggle={(v) => toggle("status", v)} />
          <ChipRow label="Severity" values={SEVERITIES} selected={filters.severity} onToggle={(v) => toggle("severity", v)} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label>
              <span className={FIELD_LABEL}>Definition</span>
              <select className={FIELD} value={filters.definitionId} onChange={(e) => set("definitionId", e.target.value, true)}>
                <option value="">All</option>
                {sortedDefs.map((d) => (
                  <option key={d.definitionId} value={d.definitionId}>{d.code} v{d.version} ({d.state})</option>
                ))}
              </select>
            </label>
            <label>
              <span className={FIELD_LABEL}>Event Type Codes (comma-separated)</span>
              <input className={FIELD} value={filters.eventTypeCodes} onChange={(e) => set("eventTypeCodes", e.target.value)} />
            </label>
            <label>
              <span className={FIELD_LABEL}>SLA Met</span>
              <select className={FIELD} value={filters.slaMet} onChange={(e) => set("slaMet", e.target.value as Filters["slaMet"])}>
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label>
              <span className={FIELD_LABEL}>Reviewer Principal</span>
              <input className={cx(FIELD, "font-mono")} value={filters.reviewerPrincipalId}
                     onChange={(e) => set("reviewerPrincipalId", e.target.value)} />
            </label>
            <label>
              <span className={FIELD_LABEL}>Discovered After</span>
              <input type="datetime-local" className={FIELD} value={filters.discoveredAfter} onChange={(e) => set("discoveredAfter", e.target.value)} />
            </label>
            <label>
              <span className={FIELD_LABEL}>Discovered Before</span>
              <input type="datetime-local" className={FIELD} value={filters.discoveredBefore} onChange={(e) => set("discoveredBefore", e.target.value)} />
            </label>
            <label>
              <span className={FIELD_LABEL}>Closed After</span>
              <input type="datetime-local" className={FIELD} value={filters.closedAfter} onChange={(e) => set("closedAfter", e.target.value)} />
            </label>
            <label>
              <span className={FIELD_LABEL}>Closed Before</span>
              <input type="datetime-local" className={FIELD} value={filters.closedBefore} onChange={(e) => set("closedBefore", e.target.value)} />
            </label>
            <label>
              <span className={FIELD_LABEL}>Page Size</span>
              <select className={FIELD} value={filters.pageSize} onChange={(e) => set("pageSize", +e.target.value, true)}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button type="button" className={BTN_SECONDARY} onClick={() => { setFilters(DEFAULT_FILTERS); setPage(0); }}>Reset</button>
              <button type="button" className={BTN_SECONDARY}
                      onClick={() => qc.invalidateQueries({ queryKey: ["continuouscompliance", "events", "search"] })}>
                Refresh
              </button>
            </div>
          </div>

          <div className="text-xs font-mono text-gray-500 break-all">GET /compliance/events?{eventSearchQueryString(search)}</div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to load events. {(error as Error).message}
          </div>
        )}

        {/* Events */}
        <div className={cx(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className={CARD_TITLE}>Events ({total})</div>
              <div className={CARD_SUBTITLE}>Click an event to open it.</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={cx(BTN_SECONDARY, "px-3")} disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                      aria-label="Previous page">‹</button>
              <span className="text-sm text-gray-600">Page {page + 1} / {pages}</span>
              <button type="button" className={cx(BTN_SECONDARY, "px-3")} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}
                      aria-label="Next page">›</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px]">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>Discovered</th>
                  <th className={TH}>Definition</th>
                  <th className={TH}>Subject</th>
                  <th className={TH}>Severity</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>SLA</th>
                  <th className={TH}>Due</th>
                  <th className={TH}>Reviewer</th>
                  <th className={TH}>Form</th>
                  <th className={TH}>Esc</th>
                  <th className={TH}>Event ID</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {eventsQ.isLoading && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                  </td></tr>
                )}
                {rows.map((e) => {
                  const pct = slaPercent(e);
                  return (
                    <tr key={e.eventId} className={TR_CLICKABLE} onClick={() => router.push(`${DETAIL_BASE}/${e.eventId}`)}>
                      <td className={cx(TD, "whitespace-nowrap text-xs")}>{fmt(e.discoveredAt)}</td>
                      <td className={TD}>
                        <div className="text-sm font-semibold text-gray-900">{defLabel(e.definitionId)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{e.eventTypeCode}</div>
                      </td>
                      <td className={cx(TD, "max-w-[260px]")}>
                        <div className="text-sm text-gray-900">{subjectLabel(e)}</div>
                        {e.correlationKey && <div className="text-xs text-gray-500 mt-0.5 font-mono truncate" title={e.correlationKey}>{e.correlationKey}</div>}
                      </td>
                      <td className={TD}><SeverityBadge value={e.severity} /></td>
                      <td className={TD}><StateBadge value={e.status} /></td>
                      <td className={cx(TD, "min-w-[120px]")}>
                        {pct === null ? "—" : (
                          <>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className={cx("h-full rounded-full", pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500")}
                                   style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {pct}%{e.slaSnapshot?.ruleId ? ` · ${e.slaSnapshot.ruleId}` : ""}
                            </div>
                          </>
                        )}
                      </td>
                      <td className={cx(TD, "whitespace-nowrap text-xs")}>{fmt(e.dueAt ?? e.slaSnapshot?.dueAt)}</td>
                      <td className={cx(TD, "text-xs font-mono")} title={e.reviewerPrincipalId ?? undefined}>
                        {e.reviewerPrincipalId ? `${e.reviewerPrincipalId.slice(0, 13)}…` : "—"}
                      </td>
                      <td className={cx(TD, "text-xs font-mono whitespace-nowrap")}>
                        {e.evidence?.reviewForm ? `${e.evidence.reviewForm}@v${e.evidence.reviewFormVersion ?? "?"}` : "—"}
                      </td>
                      <td className={cx(TD, "whitespace-nowrap")}>
                        L{e.escalationLevel ?? 0}{e.reopenCount ? ` · ↺${e.reopenCount}` : ""}
                      </td>
                      <td className={cx(TD, "text-xs font-mono")} title={e.eventId}>{e.eventId.slice(0, 8)}…</td>
                    </tr>
                  );
                })}
                {!eventsQ.isLoading && !error && rows.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">No events match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChipRow({ label, values, selected, onToggle }: {
  label: string; values: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="text-sm font-medium text-gray-700 w-20 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const on = selected.includes(v);
          return (
            <button key={v} type="button" onClick={() => onToggle(v)} aria-pressed={on}
                    className={cx(PILL, "border cursor-pointer",
                      on ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
