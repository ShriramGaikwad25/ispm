"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertOctagon, AppWindow, ChevronRight, ClipboardCheck, Clock, Database, Filter, Key, Layers,
  Server, User, Users, X,
} from "lucide-react";
import { useEventList } from "@/hooks/useAssuranceEvents";
import { formatAbsolute, formatRelative, msUntil } from "@/lib/assurance-format";
import type { EventListItem, EventQuery } from "@/lib/assurance-events-api";
import {
  BADGE, BTN_GHOST, BTN_SECONDARY, CARD, CARD_HEADER, INPUT, LABEL, LookupBadge, LookupMultiSelect, PageSpinner, cx,
} from "@/components/assurance-events/ui";

// =====================================================================
// Event list page shared by All Events and Reviewer Inbox — the same
// split as the Continuous Assurance app, where /events and /inbox both
// render InboxPage (EventFilters + EventList) with a different title and
// default status filter. Filters are mirrored into the URL so links
// survive reloads; rows open the event detail page.
// =====================================================================

const DETAIL_BASE = "/assurance-events/all-events";

// defaultStatuses is used only when the URL carries no status at all — a
// cleared filter is kept in the URL as "status=" so a reload shows everything.
const decodeQuery = (sp: URLSearchParams, defaultStatuses?: string[]): EventQuery => {
  const splitCsv = (k: string) => sp.get(k)?.split(",").filter(Boolean);
  return {
    status: sp.has("status") ? splitCsv("status") : defaultStatuses,
    severity: splitCsv("severity"),
    eventTypeCodes: splitCsv("eventTypeCodes"),
    dueBefore: sp.get("dueBefore") ?? undefined,
    page: 0,
    pageSize: 50,
  };
};

interface EventsListPageProps {
  title: string;
  subtitle: string;
  defaultStatuses?: string[];
}

export function EventsListPage(props: EventsListPageProps) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EventsListPageInner {...props} />
    </Suspense>
  );
}

function EventsListPageInner({ title, subtitle, defaultStatuses }: EventsListPageProps) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState<EventQuery>(() => decodeQuery(new URLSearchParams(sp.toString()), defaultStatuses));

  const handleChange = (q: EventQuery) => {
    setQuery(q);
    // Reflect in URL so links survive reloads
    const next = new URLSearchParams();
    next.set("status", (q.status ?? []).join(","));
    if (q.severity?.length) next.set("severity", q.severity.join(","));
    if (q.eventTypeCodes?.length) next.set("eventTypeCodes", q.eventTypeCodes.join(","));
    if (q.dueBefore) next.set("dueBefore", q.dueBefore);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const { data, isLoading, error } = useEventList(query);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="text-sm text-gray-500">
          {data?.total !== undefined && (
            <>
              <span className="font-semibold text-gray-800">{data.total}</span> matching events
            </>
          )}
        </div>
      </div>

      <EventFilters value={query} onChange={handleChange} />

      {error && (
        <div className={cx(CARD, "border-red-200 bg-red-50 text-red-700 p-3 text-sm")}>
          Failed to load events. {(error as Error).message}
        </div>
      )}

      <EventList items={data?.items} isLoading={isLoading} />
    </div>
  );
}

function EventFilters({ value, onChange }: { value: EventQuery; onChange: (q: EventQuery) => void }) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<EventQuery>) => onChange({ ...value, ...patch, page: 0 });
  const clearAll = () => onChange({ page: 0, pageSize: value.pageSize ?? 50 });

  const activeCount =
    (value.status?.length ?? 0) + (value.severity?.length ?? 0) + (value.eventTypeCodes?.length ?? 0);

  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <div className="flex items-center gap-2 text-gray-700">
          <Filter size={16} />
          <span className="font-medium">Filters</span>
          {activeCount > 0 && (
            <span className={cx(BADGE, "bg-blue-50 text-blue-700 border border-blue-100")}>{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button className={cx(BTN_GHOST, "text-xs")} onClick={clearAll}>
              <X size={14} /> Clear
            </button>
          )}
          <button className={cx(BTN_SECONDARY, "text-xs")} onClick={() => setOpen((s) => !s)}>
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
      {open && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className={LABEL}>Status</div>
            <LookupMultiSelect domain="EVENT_STATUS" values={value.status ?? []}
                               onChange={(codes) => update({ status: codes })} />
          </div>
          <div>
            <div className={LABEL}>Severity</div>
            <LookupMultiSelect domain="SEVERITY" values={value.severity ?? []}
                               onChange={(codes) => update({ severity: codes })} />
          </div>
          <div>
            <div className={LABEL}>Due before</div>
            <input
              type="datetime-local"
              className={INPUT}
              value={value.dueBefore?.slice(0, 16) ?? ""}
              onChange={(e) =>
                update({ dueBefore: e.target.value ? new Date(e.target.value).toISOString() : undefined })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

const subjectIcon = (kind: string) => {
  switch (kind) {
    case "NHI":
    case "SERVICE_ACCOUNT": return Server;
    case "CREDENTIAL": return Key;
    case "APPLICATION": return AppWindow;
    case "ENTITLEMENT_ASSIGNMENT": return Database;
    case "ENTITLEMENT": return Layers;
    case "WORKGROUP": return Users;
    case "CERTIFICATION": return ClipboardCheck;
    default: return User;
  }
};

function EventList({ items, isLoading }: { items?: EventListItem[]; isLoading: boolean }) {
  if (isLoading) return <PageSpinner />;
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="text-gray-300 mb-3"><AlertOctagon size={48} /></div>
        <div className="text-gray-700 font-medium">No events</div>
        <div className="text-gray-500 text-sm mt-1 max-w-md">
          Nothing matches the current filters. Adjust filters or wait for detectors to produce new findings.
        </div>
      </div>
    );
  }

  return (
    <div className={cx(CARD, "overflow-hidden")}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2 font-medium">Event</th>
            <th className="px-4 py-2 font-medium">Severity</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Subject</th>
            <th className="px-4 py-2 font-medium">Due</th>
            <th className="px-4 py-2 font-medium">AI</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((e) => {
            const Icon = subjectIcon(e.subjectKind);
            const overdue = msUntil(e.dueAt) < 0;
            const subject = e.subjectDescriptor as Record<string, string>;
            const href = `${DETAIL_BASE}/${e.eventId}`;
            return (
              <tr key={e.eventId} className="hover:bg-gray-50/70">
                <td className="px-4 py-3">
                  <Link href={href} className="font-medium text-gray-800 hover:text-blue-700">
                    {e.definitionName || e.eventTypeCode}
                  </Link>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {e.definitionCode} · {formatRelative(e.discoveredAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <LookupBadge domain="SEVERITY" code={e.severity} />
                </td>
                <td className="px-4 py-3">
                  <LookupBadge domain="EVENT_STATUS" code={e.status} />
                  {e.escalationLevel > 0 && (
                    <span className={cx(BADGE, "ml-1 bg-orange-50 text-orange-700 border border-orange-200")}>
                      L{e.escalationLevel}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Icon size={14} className="text-gray-400" />
                    <span className="truncate max-w-[18ch]">
                      {String(subject?.name ?? subject?.id ?? subject?.account ?? "—")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{e.subjectKind}</div>
                </td>
                <td className="px-4 py-3">
                  <div className={cx("flex items-center gap-1.5 text-sm",
                    overdue ? "text-red-600 font-medium" : "text-gray-700")}>
                    <Clock size={14} />
                    {formatRelative(e.dueAt)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatAbsolute(e.dueAt)}</div>
                </td>
                <td className="px-4 py-3">
                  {e.aiRecommendedDecision ? (
                    <LookupBadge domain="DECISION_TYPE" code={e.aiRecommendedDecision} />
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                  {typeof e.riskScore === "number" && (
                    <div className="text-xs text-gray-500 mt-0.5">risk {e.riskScore.toFixed(0)}</div>
                  )}
                </td>
                <td className="px-2 py-3 text-right">
                  <Link href={href} className="text-gray-400 hover:text-blue-700" aria-label="Open event">
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
