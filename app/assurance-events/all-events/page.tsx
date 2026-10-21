"use client";

// =====================================================================
// All Events — two tabs, from the Continuous Compliance Console
// (graph.keyforge.ai/console), on the same live API:
//   Events        the console's Events page (#/events):
//                 GET /compliance/events?status=…&severity=…&definitionId=…
//                     &discoveredAfter/Before=…&closedAfter/Before=…&dueBefore=…&page=…&pageSize=…
//   Review Queue  the console's Review queue (#/review):
//                 GET /compliance/events?status=IN_REVIEW&status=OPEN&pageSize=500,
//                 events routed to a reviewer, ordered by SLA pressure.
//   GET /compliance/definitions     (Definition filter and column)
//   GET /compliance/lookups/domains (connection check)
// Laid out like ISPM's gateway pages.
// =====================================================================

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  CcCatalog, CcEvents, slaPercent, subjectLabel, type CcDefinitionRef, type CcEvent, type CcEventSearch,
} from "@/lib/cc-events-api";
import {
  BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER_FLUSH, PILL, PageSpinner, Spinner, TBODY, TD, TH,
  THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";
import { SeverityBadge, StateBadge } from "@/components/assurance-events/definition-editor/fields";

const DETAIL_BASE = "/assurance-events/all-events";
const STORAGE_KEY = "ispm.assurance.events.filters";
const EVENTS_KEY = ["continuouscompliance", "events", "search"] as const;

const STATUSES = ["OPEN", "IN_REVIEW", "REMEDIATING", "MITIGATING", "CLOSED", "SUPPRESSED", "DECIDED", "EXPIRED"];
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PAGE_SIZES = [25, 50, 100, 200, 500];

type Tab = "events" | "review";
const TABS: Array<[Tab, string]> = [["events", "Events"], ["review", "Review Queue"]];

interface Filters {
  status: string[];
  severity: string[];
  definitionId: string;
  discoveredAfter: string;
  discoveredBefore: string;
  closedAfter: string;
  closedBefore: string;
  /** yyyy-mm-dd: due on or before the end of this day. */
  dueOnOrBefore: string;
  pageSize: number;
}

/** Same defaults as the console: the in-flight statuses, 50 per page. */
const DEFAULT_FILTERS: Filters = {
  status: ["OPEN", "IN_REVIEW", "REMEDIATING", "MITIGATING"],
  severity: [],
  definitionId: "",
  discoveredAfter: "",
  discoveredBefore: "",
  closedAfter: "",
  closedBefore: "",
  dueOnOrBefore: "",
  pageSize: 50,
};

const FIELD = "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const FIELD_LABEL = "block text-sm text-gray-700 mb-1";

const iso = (local: string) => (local ? new Date(local).toISOString() : undefined);
/** End of the chosen day (local time), so "on or before" includes the whole day. */
const endOfDay = (day: string) => (day ? new Date(`${day}T23:59:59.999`).toISOString() : undefined);
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

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AllEventsPage />
    </Suspense>
  );
}

function AllEventsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = sp.get("tab") === "review" ? "review" : "events";
  const connection = useCcConnection();
  const defsQ = useQuery({ queryKey: ["continuouscompliance", "events", "definitions"], queryFn: CcEvents.definitions, staleTime: 5 * 60_000 });
  const defs = useMemo(() => defsQ.data ?? [], [defsQ.data]);

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
        <TabBar tabs={TABS} active={tab} onChange={(k) => router.replace(`${pathname}?tab=${k}`, { scroll: false })} />
        {connection.error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {(connection.error as Error).message}
          </div>
        )}
        {tab === "events" ? <EventsTab defs={defs} /> : <ReviewQueueTab defs={defs} />}
      </div>
    </div>
  );
}

/* ================================================================ Events */

function EventsTab({ defs }: { defs: CcDefinitionRef[] }) {
  const qc = useQueryClient();
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  // Filters survive reloads, like the console.
  useEffect(() => { setFiltersState(loadFilters()); }, []);
  const setFilters = (f: Filters) => {
    setFiltersState(f);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); } catch { /* storage unavailable */ }
  };

  const search: CcEventSearch = useMemo(() => ({
    status: filters.status.length ? filters.status : undefined,
    severity: filters.severity.length ? filters.severity : undefined,
    definitionId: filters.definitionId || undefined,
    discoveredAfter: iso(filters.discoveredAfter),
    discoveredBefore: iso(filters.discoveredBefore),
    closedAfter: iso(filters.closedAfter),
    closedBefore: iso(filters.closedBefore),
    dueBefore: endOfDay(filters.dueOnOrBefore),
    page,
    pageSize: filters.pageSize,
  }), [filters, page]);

  const eventsQ = useQuery({ queryKey: [...EVENTS_KEY, search], queryFn: () => CcEvents.search(search) });
  const sortedDefs = useMemo(() => defs.filter((d) => d.state === "ACTIVE").sort((a, b) => a.code.localeCompare(b.code) || b.version - a.version), [defs]);

  // Also applied to the loaded page, so the filter holds even if the service ignores dueBefore.
  const rows = useMemo(() => {
    const all = eventsQ.data?.content ?? [];
    if (!search.dueBefore) return all;
    const limit = new Date(search.dueBefore).getTime();
    return all.filter((e) => {
      const due = e.dueAt ?? e.slaSnapshot?.dueAt;
      return due && new Date(due).getTime() <= limit;
    });
  }, [eventsQ.data, search.dueBefore]);
  const total = eventsQ.data?.totalElements ?? 0;
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));

  const toggle = (key: "status" | "severity", value: string) => {
    const cur = filters[key];
    setFilters({ ...filters, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
    setPage(0);
  };
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters({ ...filters, [key]: value });
    setPage(0);
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-5 mb-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Filter size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        </div>
        <ChipRow label="Status" values={STATUSES} selected={filters.status} onToggle={(v) => toggle("status", v)} />
        <ChipRow label="Severity" values={SEVERITIES} selected={filters.severity} onToggle={(v) => toggle("severity", v)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label>
            <span className={FIELD_LABEL}>Definition</span>
            <select className={FIELD} value={filters.definitionId} onChange={(e) => set("definitionId", e.target.value)}>
              <option value="">All</option>
              {sortedDefs.map((d) => (
                <option key={d.definitionId} value={d.definitionId}>{d.code} v{d.version}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={FIELD_LABEL}>Due On or Before</span>
            <input type="date" className={FIELD} value={filters.dueOnOrBefore} onChange={(e) => set("dueOnOrBefore", e.target.value)} />
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
            <select className={FIELD} value={filters.pageSize} onChange={(e) => set("pageSize", +e.target.value)}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => { setFilters(DEFAULT_FILTERS); setPage(0); }}>Reset</button>
            <button type="button" className={BTN_SECONDARY} onClick={() => qc.invalidateQueries({ queryKey: EVENTS_KEY })}>Refresh</button>
          </div>
        </div>
      </div>

      {eventsQ.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load events. {(eventsQ.error as Error).message}
        </div>
      )}

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
        <EventsTable rows={rows} defs={defs} loading={eventsQ.isLoading} empty={eventsQ.error ? null : "No events match."} />
      </div>
    </>
  );
}

/* ================================================================ Review queue */

type QueueFilters = {
  search: string;
  status: string[];
  severity: string[];
  definitionId: string;
  reviewForm: string;
  dueOnOrBefore: string;
  overdueOnly: boolean;
};
const DEFAULT_QUEUE_FILTERS: QueueFilters = {
  search: "", status: [], severity: [], definitionId: "", reviewForm: "", dueOnOrBefore: "", overdueOnly: false,
};
const QUEUE_STATUSES = ["OPEN", "IN_REVIEW"];

function ReviewQueueTab({ defs }: { defs: CcDefinitionRef[] }) {
  const q = useQuery({
    queryKey: ["continuouscompliance", "events", "review-queue"],
    queryFn: () => CcEvents.search({ status: ["IN_REVIEW", "OPEN"], page: 0, pageSize: 500 }),
  });
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_QUEUE_FILTERS);
  const set = <K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const toggle = (key: "status" | "severity", v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const defById = useMemo(() => new Map(defs.map((d) => [d.definitionId, d])), [defs]);

  // Routed to a reviewer: IN_REVIEW, or OPEN with a pinned review form — ordered by SLA pressure.
  const queue = useMemo(() => (q.data?.content ?? [])
    .filter((e) => e.status === "IN_REVIEW" || !!e.evidence?.reviewForm)
    .sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime()), [q.data]);
  // Choices offered by the filters: what is actually in the queue.
  const queueDefs = useMemo(() => [...new Set(queue.map((e) => e.definitionId))]
    .map((id) => defById.get(id) ?? { definitionId: id, code: id.slice(0, 8), version: 0, state: "", name: "" })
    .sort((a, b) => a.code.localeCompare(b.code)), [queue, defById]);
  const forms = useMemo(() => [...new Set(queue.map((e) => e.evidence?.reviewForm).filter(Boolean) as string[])].sort(), [queue]);

  const rows = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    const dueLimit = filters.dueOnOrBefore ? new Date(`${filters.dueOnOrBefore}T23:59:59.999`).getTime() : null;
    const now = Date.now();
    return queue.filter((e) => {
      if (filters.status.length && !filters.status.includes(e.status)) return false;
      if (filters.severity.length && !filters.severity.includes(e.severity)) return false;
      if (filters.definitionId && e.definitionId !== filters.definitionId) return false;
      if (filters.reviewForm && e.evidence?.reviewForm !== filters.reviewForm) return false;
      if (dueLimit != null && (!e.dueAt || new Date(e.dueAt).getTime() > dueLimit)) return false;
      if (filters.overdueOnly && (!e.dueAt || new Date(e.dueAt).getTime() >= now)) return false;
      if (needle) {
        const def = defById.get(e.definitionId);
        const hay = [subjectLabel(e), e.eventId, e.eventTypeCode, def?.code ?? "", def?.name ?? "", e.reviewerPrincipalId ?? "",
          e.correlationKey ?? "", String(e.evidence?.reviewForm ?? "")].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [queue, filters, defById]);
  const filtered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_QUEUE_FILTERS);

  return (
    <>
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-5 mb-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Filter size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        </div>
        <ChipRow label="Status" values={QUEUE_STATUSES} selected={filters.status} onToggle={(v) => toggle("status", v)} />
        <ChipRow label="Severity" values={SEVERITIES} selected={filters.severity} onToggle={(v) => toggle("severity", v)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="lg:col-span-2">
            <span className={FIELD_LABEL}>Search</span>
            <input className={FIELD} value={filters.search} placeholder="Subject, event ID, definition, reviewer…"
                   onChange={(e) => set("search", e.target.value)} />
          </label>
          <label>
            <span className={FIELD_LABEL}>Definition</span>
            <select className={FIELD} value={filters.definitionId} onChange={(e) => set("definitionId", e.target.value)}>
              <option value="">All</option>
              {queueDefs.map((d) => (
                <option key={d.definitionId} value={d.definitionId}>{d.code}{d.version ? ` v${d.version}` : ""}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={FIELD_LABEL}>Review Form</span>
            <select className={FIELD} value={filters.reviewForm} onChange={(e) => set("reviewForm", e.target.value)}>
              <option value="">All</option>
              {forms.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label>
            <span className={FIELD_LABEL}>Due On or Before</span>
            <input type="date" className={FIELD} value={filters.dueOnOrBefore} onChange={(e) => set("dueOnOrBefore", e.target.value)} />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
            <input type="checkbox" checked={filters.overdueOnly} onChange={(e) => set("overdueOnly", e.target.checked)} />
            Overdue only
          </label>
          <div className="flex items-end gap-2 lg:col-span-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setFilters(DEFAULT_QUEUE_FILTERS)} disabled={!filtered}>Reset</button>
            <button type="button" className={BTN_SECONDARY} onClick={() => q.refetch()}>Refresh</button>
          </div>
        </div>
      </div>

      {q.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load the review queue. {(q.error as Error).message}
        </div>
      )}
      <div className={cx(CARD, "overflow-hidden")}>
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={CARD_TITLE}>Review Queue ({filtered ? `${rows.length} of ${queue.length}` : rows.length})</div>
            <div className={CARD_SUBTITLE}>
              Events routed to a reviewer, ordered by SLA pressure. Opening one lands on the review form pinned when it was routed.
            </div>
          </div>
        </div>
        <EventsTable rows={rows} defs={defs} loading={q.isLoading} tab="form" from="review"
                     empty={q.error ? null : filtered ? "No events match the filters." : "Nothing is waiting for a reviewer."} />
      </div>
    </>
  );
}

/* ================================================================ Shared table */

/** Reviewer's name from the principals catalog; one cached lookup per id, the id until it loads or if none is found. */
function ReviewerName({ id }: { id?: string | null }) {
  const q = useQuery({
    queryKey: ["continuouscompliance", "catalog", "principal", id],
    queryFn: () => CcCatalog.principalName(id!),
    enabled: !!id, staleTime: 30 * 60_000, retry: false,
  });
  if (!id) return <>—</>;
  return q.data
    ? <span className="text-sm text-gray-900" title={id}>{q.data}</span>
    : <span className="font-mono text-gray-500" title={id}>{id}</span>;
}

function EventsTable({ rows, defs, loading, tab, from, empty }: {
  rows: CcEvent[]; defs: CcDefinitionRef[]; loading: boolean; tab?: string; empty: string | null;
  /** Which list opened the event ("review" = Review Queue), so its back link returns there. */
  from?: "review";
}) {
  const router = useRouter();
  const detailHref = (id: string) => {
    const qs = new URLSearchParams({ ...(tab ? { tab } : {}), ...(from ? { from } : {}) }).toString();
    return `${DETAIL_BASE}/${id}${qs ? `?${qs}` : ""}`;
  };
  const defById = useMemo(() => new Map(defs.map((d) => [d.definitionId, d])), [defs]);
  const defLabel = (id: string) => {
    const d = defById.get(id);
    return d ? `${d.code} v${d.version}` : id ? `${id.slice(0, 8)}…` : "—";
  };

  // Full width, no horizontal scroll: every cell wraps, long ids/keys break anywhere.
  const C = cx(TD, "px-3 [overflow-wrap:anywhere]");

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className={cx(THEAD_ROW, "[&>th]:px-3")}>
            <th className={TH}>Discovered</th>
            <th className={cx(TH, "w-[11%] min-w-[130px]")}>Definition</th>
            <th className={TH}>Subject</th>
            <th className={TH}>Severity</th>
            <th className={TH}>Status</th>
            <th className={TH}>SLA</th>
            <th className={TH}>Due</th>
            <th className={TH}>Reviewer</th>
            <th className={cx(TH, "w-[14%] min-w-[150px]")}>Form</th>
          </tr>
        </thead>
        <tbody className={TBODY}>
          {loading && (
            <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
              <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
            </td></tr>
          )}
          {rows.map((e) => {
            const pct = slaPercent(e);
            return (
              <tr key={e.eventId} className={TR_CLICKABLE}
                  onClick={() => router.push(detailHref(e.eventId))}>
                <td className={cx(C, "text-xs")}>{fmt(e.discoveredAt)}</td>
                <td className={C}>
                  <div className="text-sm font-semibold text-gray-900">{defLabel(e.definitionId)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{e.eventTypeCode}</div>
                </td>
                <td className={C}><div className="text-sm text-gray-900">{subjectLabel(e)}</div></td>
                <td className={C}><SeverityBadge value={e.severity} /></td>
                <td className={C}><StateBadge value={e.status} /></td>
                <td className={cx(C, "min-w-[90px]")}>
                  {pct === null ? "—" : (
                    <>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={cx("h-full rounded-full", pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500")}
                             style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{pct}%{e.slaSnapshot?.ruleId ? ` · ${e.slaSnapshot.ruleId}` : ""}</div>
                    </>
                  )}
                </td>
                <td className={cx(C, "text-xs")}>{fmt(e.dueAt ?? e.slaSnapshot?.dueAt)}</td>
                <td className={cx(C, "text-xs")}><ReviewerName id={e.reviewerPrincipalId} /></td>
                <td className={cx(C, "text-xs font-mono")}>
                  {e.evidence?.reviewForm ? `${e.evidence.reviewForm}@v${e.evidence.reviewFormVersion ?? "?"}` : "—"}
                </td>
              </tr>
            );
          })}
          {!loading && empty && rows.length === 0 && (
            <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">{empty}</td></tr>
          )}
        </tbody>
      </table>
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
