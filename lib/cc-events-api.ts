// =====================================================================
// Continuous Compliance — events (live API).
//
// The same calls as the Continuous Compliance Console's Events page
// (graph.keyforge.ai/console#/events), through ISPM's proxy
// (lib/controls-api.ts → /api/continuouscompliance):
//   GET /compliance/events?status=…&status=…&severity=…&eventTypeCodes=…&page=&pageSize=
//       → { content: CcEvent[], totalElements }
//   GET /compliance/definitions   (once, to show each event's definition by name)
// Events are mapped onto the rows the All Events table renders
// (EventListItem), so the page layout does not change.
// =====================================================================

import { ccRequest } from "@/lib/controls-api";
import type { EventListItem, EventQuery } from "@/lib/assurance-events-api";

/** An event as GET /compliance/events returns it (fields the list reads). */
export interface CcEvent {
  eventId: string;
  definitionId: string;
  definitionVersion?: number;
  eventTypeCode: string;
  severity: string;
  status: string;
  discoveredAt: string;
  dueAt?: string;
  escalationLevel?: number;
  reopenCount?: number;
  reviewerPrincipalId?: string | null;
  subjectKind?: string;
  subjectDescriptor?: Record<string, unknown> & { name?: string; humanReadable?: { name?: string } };
  correlationKey?: string;
  slaSnapshot?: { anchorAt?: string; dueAt?: string; ruleId?: string | null };
  evidence?: Record<string, unknown>;
  [key: string]: unknown;
}

export const CC_EVENTS_KEY = ["continuouscompliance", "events"] as const;

// Definition names, fetched once and reused (like the console's definition cache).
let definitionsCache: { at: number; byId: Map<string, { code: string; name: string }> } | null = null;
const DEFINITIONS_TTL_MS = 5 * 60_000;

async function definitionsById() {
  if (definitionsCache && Date.now() - definitionsCache.at < DEFINITIONS_TTL_MS) return definitionsCache.byId;
  const defs = await ccRequest<Array<{ definitionId: string; code: string; name: string }>>("GET", "/compliance/definitions");
  const byId = new Map((Array.isArray(defs) ? defs : []).map((d) => [d.definitionId, { code: d.code, name: d.name }]));
  definitionsCache = { at: Date.now(), byId };
  return byId;
}

function toListItem(e: CcEvent, defs: Map<string, { code: string; name: string }>): EventListItem {
  const def = defs.get(e.definitionId);
  const sd = e.subjectDescriptor ?? {};
  return {
    eventId: e.eventId,
    severity: e.severity,
    status: e.status,
    eventTypeCode: e.eventTypeCode,
    definitionCode: def ? `${def.code}${e.definitionVersion ? ` v${e.definitionVersion}` : ""}` : e.definitionId.slice(0, 8),
    definitionName: def?.name ?? e.eventTypeCode,
    subjectKind: e.subjectKind ?? "—",
    subjectDescriptor: { ...sd, name: sd.name ?? sd.humanReadable?.name ?? e.correlationKey },
    discoveredAt: e.discoveredAt,
    dueAt: e.slaSnapshot?.dueAt ?? e.dueAt ?? "",
    escalationLevel: e.escalationLevel ?? 0,
    reviewerPrincipalId: e.reviewerPrincipalId ?? undefined,
  };
}

export const CcEvents = {
  /** GET /compliance/events with the All Events filters. */
  list: async (q: EventQuery): Promise<{ items: EventListItem[]; total: number }> => {
    const [page, defs] = await Promise.all([
      ccRequest<{ content?: CcEvent[]; totalElements?: number }>("GET", "/compliance/events", {
        query: {
          status: q.status?.length ? q.status : undefined,
          severity: q.severity?.length ? q.severity : undefined,
          eventTypeCodes: q.eventTypeCodes?.length ? q.eventTypeCodes : undefined,
          definitionId: q.definitionId,
          reviewerPrincipalId: q.reviewerPrincipalId,
          discoveredAfter: q.discoveredAfter,
          discoveredBefore: q.discoveredBefore,
          page: q.page !== undefined ? String(q.page) : undefined,
          pageSize: q.pageSize !== undefined ? String(q.pageSize) : undefined,
        },
      }),
      definitionsById().catch(() => new Map<string, { code: string; name: string }>()),
    ]);
    let items = (page?.content ?? []).map((e) => toListItem(e, defs));
    // The events API has no due-date filter; the "Due before" filter applies to the loaded page.
    if (q.dueBefore) {
      const limit = new Date(q.dueBefore).getTime();
      items = items.filter((e) => e.dueAt && new Date(e.dueAt).getTime() < limit);
    }
    return { items, total: q.dueBefore ? items.length : page?.totalElements ?? items.length };
  },
};
