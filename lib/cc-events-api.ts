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

import { ccFetchRaw, ccRequest } from "@/lib/controls-api";
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
  evidence?: Record<string, unknown> & { reviewForm?: string; reviewFormVersion?: number };
  closedAt?: string | null;
  [key: string]: unknown;
}

/** Filters of the console's Events page, as sent to GET /compliance/events. */
export interface CcEventSearch {
  status?: string[];
  severity?: string[];
  definitionId?: string;
  eventTypeCodes?: string[];
  discoveredAfter?: string;
  discoveredBefore?: string;
  closedAfter?: string;
  closedBefore?: string;
  slaMet?: boolean;
  reviewerPrincipalId?: string;
  /** Due on or before (ISO). */
  dueBefore?: string;
  page: number;
  pageSize: number;
}

export interface CcEventPage { content: CcEvent[]; totalElements: number }

/** A definition as the Events page's Definition filter lists it. */
export interface CcDefinitionRef { definitionId: string; code: string; version: number; state: string; name: string }

/** Query string the console shows under its filters ("GET /compliance/events?…"). */
export function eventSearchQueryString(q: CcEventSearch): string {
  return Object.entries(q)
    .filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => (Array.isArray(v) ? v.map((x) => `${k}=${x}`).join("&") : `${k}=${v}`))
    .join("&");
}

/**
 * SLA elapsed % of an event (the console's own calculation): from the SLA
 * anchor (or discovery) to the due time, measured at close or now.
 */
export function slaPercent(e: CcEvent): number | null {
  const anchor = e.slaSnapshot?.anchorAt ?? e.discoveredAt;
  const due = e.slaSnapshot?.dueAt ?? e.dueAt;
  if (!anchor || !due) return null;
  const span = new Date(due).getTime() - new Date(anchor).getTime();
  const end = e.closedAt ? new Date(e.closedAt).getTime() : Date.now();
  return span > 0 ? Math.round(((end - new Date(anchor).getTime()) / span) * 100) : null;
}

/** Subject label (the console's own fallback chain). */
export function subjectLabel(e: CcEvent): string {
  const sd = e.subjectDescriptor ?? {};
  return String(sd.name || sd.humanReadable?.name || (sd as { displayName?: string }).displayName || e.correlationKey || "—");
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

/** GET /compliance/events/{id} — EventDetailDto (fields the detail page reads). */
export interface CcEventDetail {
  event: CcEvent & {
    subject?: {
      userId?: string; accountId?: string; applicationId?: string; entitlementId?: string; nhiId?: string;
      humanReadable?: Record<string, unknown>;
    };
    detectionPayload?: { controls?: Array<{ code: string; version?: number; matched?: boolean; evidence?: Record<string, unknown> }>; combinator?: string; criteria?: string };
    scopeSnapshot?: Record<string, unknown>;
    slaSnapshot?: CcEvent["slaSnapshot"] & {
      source?: string; priority?: number | null; resolution?: string; duration?: string;
      actionOnTimeout?: string; escalationChain?: Array<{ atPercent: number; action: string }>;
      firedSteps?: number[]; timeoutAppliedAt?: string | null; recomputedCount?: number;
      matchedRules?: Array<{ ruleId: string }>; basis?: unknown;
    };
    nextSlaCheckAt?: string | null;
    currentDecisionId?: string | null;
  };
  definitionSnapshot?: {
    definitionId: string; code: string; version: number; state: string; name: string; severity?: string;
    reviewerStrategy?: string; slaDuration?: string; defaultActionOnTimeout?: string;
    allowedMitigationCodes?: string[]; actionBindings?: Record<string, string>; governancePolicy?: unknown;
  } | null;
  decisions: Array<{
    decisionId: string; decisionType: string; decidedAt: string; decidedByPrincipalId?: string; decidedByRole?: string;
    expiresAt?: string | null; justification?: string; evidenceRefs?: unknown;
  }>;
  remediations: Array<{
    remediationId: string; actionTypeCode: string; mode?: string; executorCode?: string; executorVersion?: number;
    targetConnector?: string; status: string; externalRef?: string; attempts?: number; blastRadiusEstimate?: number | null;
    queuedAt?: string; completedAt?: string; deadlineAt?: string; failureReason?: string; resultPayload?: unknown;
  }>;
  mitigations: Array<{
    mitigationId: string; controlCode: string; status: string; enactKind?: string; targetConnector?: string;
    activatedAt?: string; expiresAt?: string; verifyDueAt?: string; verifiedAt?: string; lastVerifiedResult?: string;
    failureReason?: string; parameters?: unknown;
  }>;
  comments: Array<{ commentId: string; createdAt: string; visibility: string; authorPrincipalId?: string; body: string }>;
  /** Latest AI insight (recommendation, risk, …), if one was produced. */
  latestInsight?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/** GET /compliance/events/{id}/decisions — the decisions currently allowed. */
export interface CcDecisionOptions {
  currentStatus: string;
  decidable: boolean;
  options: Array<{
    decisionType: string; allowed: boolean; reason?: string; resultingStatus?: string;
    requirements?: { justificationRequired?: boolean; minJustificationLength?: number; expiresAtRequired?: boolean; mitigationRequired?: boolean; allowedMitigationCodes?: string[] };
  }>;
}

/** GET /compliance/events/{id}/timeline — the event's audit ledger. */
export interface CcLedgerRow {
  auditId: string; at: string; stage: string; action: string; source?: string;
  actor: { kind: string; ref?: string; principalId?: string; [k: string]: unknown };
  entity?: { kind?: string; id?: string; [k: string]: unknown };
  from?: string | null; to?: string | null;
  causationId?: string | null; correlationId?: string | null; requestId?: string | null;
  refs?: Record<string, unknown>; integrity?: { sealed?: boolean; [k: string]: unknown };
  detail?: unknown;
  [k: string]: unknown;
}

export interface CcTimeline {
  items: CcLedgerRow[];
  /** Lifecycle summary: automationPath, closeCause, slaMet, timeToClose/openFor, *At milestones, integrity, … */
  summary?: Record<string, unknown> & { integrity?: { status?: string; rows?: number; [k: string]: unknown } };
  /** Related records: decisions, remediations, mitigations, notifications, comments, aiInsights, evidencePacks, … */
  related?: Record<string, unknown>;
  event?: CcEventDetail["event"];
}

/** GET /compliance/events/{id}/review-form — the form pinned when the event was routed. */
export interface CcReviewFormView {
  formCode: string;
  formVersion: number;
  title: string;
  intent?: string;
  eventStatus: string;
  submittable: boolean;
  canSubmit: boolean;
  submitAuthority?: string;
  fields: Array<{
    name: string; label?: string; type: string; required?: boolean; help?: string; sensitive?: boolean;
    visible: boolean; value?: unknown; conditional?: boolean;
    options?: Array<{ value: unknown; label: string; meta?: { activeMembers?: number; [k: string]: unknown } }>;
    validate?: { minLength?: number; min?: number; max?: number; [k: string]: unknown };
  }>;
  outcomes: Array<{ id: string; when?: string; actions: string[]; decision?: string; then?: string }>;
  submission?: unknown;
  proposal?: Record<string, unknown> | null;
}

export interface CcReviewFormTest { valid: boolean; outcome?: string; diagnostics: string[]; plan?: unknown }
export interface CcReviewFormSubmission {
  result: string; outcome?: string; status?: string; decisionId?: string | null;
  remediationIds: string[]; submissionId?: string; failureReason?: string | null;
}

const eventPath = (id: string) => `/compliance/events/${encodeURIComponent(id)}`;

export const CcEvents = {
  /** GET /compliance/events/{id}/review-form */
  reviewForm: (id: string) => ccRequest<CcReviewFormView>("GET", `${eventPath(id)}/review-form`),
  /** POST /compliance/review-forms/{code}/render — re-evaluates visibility after a conditional field changes. */
  renderReviewForm: (code: string, eventId: string, version: number | undefined, values: Record<string, unknown>) =>
    ccRequest<CcReviewFormView>("POST", `/compliance/review-forms/${encodeURIComponent(code)}/render`, {
      body: { eventId, version: version || undefined, values },
    }),
  /** POST /compliance/review-forms/{code}/test — dry run: validates and plans, persists nothing. */
  testReviewForm: (code: string, eventId: string, values: Record<string, unknown>, version?: number) =>
    ccRequest<CcReviewFormTest>("POST", `/compliance/review-forms/${encodeURIComponent(code)}/test`, {
      body: { eventId, values, version: version || undefined },
    }),
  /** POST /compliance/events/{id}/review-form/submit */
  submitReviewForm: (id: string, values: Record<string, unknown>) =>
    ccRequest<CcReviewFormSubmission>("POST", `${eventPath(id)}/review-form/submit`, { body: { values } }),
  /** POST /compliance/events/{id}/insight/refresh */
  refreshInsight: (id: string) => ccRequest<unknown>("POST", `${eventPath(id)}/insight/refresh`),
  /** POST /compliance/events/{id}/evidence-pack?redaction= — JSON pack (writes an AUDIT_EXPORTED row). */
  evidencePack: (id: string, redaction: string) =>
    ccRequest<Record<string, unknown> & { manifest?: Record<string, unknown> & { packId?: string; contentHashes?: Record<string, string> } }>(
      "POST", `${eventPath(id)}/evidence-pack`, { query: { redaction } }),
  /** Same, as a ZIP download. */
  evidencePackZip: (id: string, redaction: string) =>
    ccFetchRaw("POST", `${eventPath(id)}/evidence-pack`, { query: { redaction }, accept: "application/zip" }),

  /** GET /compliance/events/{id} */
  get: (id: string) => ccRequest<CcEventDetail>("GET", `/compliance/events/${encodeURIComponent(id)}`),
  /** GET /compliance/events/{id}/decisions */
  decisionOptions: (id: string) => ccRequest<CcDecisionOptions>("GET", `/compliance/events/${encodeURIComponent(id)}/decisions`),
  /** GET /compliance/events/{id}/timeline */
  timeline: (id: string) => ccRequest<CcTimeline>("GET", `/compliance/events/${encodeURIComponent(id)}/timeline`),

  /** GET /compliance/events — the console's Events page query (arrays become repeated params). */
  search: (q: CcEventSearch): Promise<CcEventPage> =>
    ccRequest<CcEventPage>("GET", "/compliance/events", {
      query: {
        status: q.status?.length ? q.status : undefined,
        severity: q.severity?.length ? q.severity : undefined,
        definitionId: q.definitionId,
        eventTypeCodes: q.eventTypeCodes?.length ? q.eventTypeCodes : undefined,
        discoveredAfter: q.discoveredAfter,
        discoveredBefore: q.discoveredBefore,
        closedAfter: q.closedAfter,
        closedBefore: q.closedBefore,
        slaMet: q.slaMet === undefined ? undefined : String(q.slaMet),
        reviewerPrincipalId: q.reviewerPrincipalId,
        dueBefore: q.dueBefore,
        page: String(q.page),
        pageSize: String(q.pageSize),
      },
    }).then((p) => ({ content: p?.content ?? [], totalElements: p?.totalElements ?? 0 })),

  /** GET /compliance/definitions — for the Definition filter and the Definition column. */
  definitions: async (): Promise<CcDefinitionRef[]> => {
    const rows = await ccRequest<CcDefinitionRef[]>("GET", "/compliance/definitions");
    return Array.isArray(rows) ? rows : [];
  },

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
