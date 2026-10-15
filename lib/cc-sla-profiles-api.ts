// =====================================================================
// Continuous Assurance — SLA profiles (live API).
//
// Same API as the Continuous Compliance Console's SLA profiles page
// (graph.keyforge.ai/console#/sla-profiles), through ISPM's proxy
// (lib/controls-api.ts → /api/continuouscompliance):
//   GET  /compliance/sla-profiles?state=&q=
//   GET  /compliance/sla-profiles/{code}?version=
//   GET  /compliance/sla-profiles/{code}/versions | /usage
//   POST /compliance/sla-profiles                       (create, DRAFT)
//   PUT  /compliance/sla-profiles/{code}                (the tenant DRAFT)
//   POST /compliance/sla-profiles/{code}/clone | /versions | /activate | /deprecate
// An SLA profile is a reusable deadline rule: a duration (or absolute
// deadline), the action on timeout, the escalation chain and an optional
// applies-when condition. A definition links profiles on its SLA tab.
// =====================================================================

import { ccRequest } from "@/lib/controls-api";

export const SLA_BASE = "/assurance-events/sla";
export const slaHref = (code: string, version?: number) =>
  `${SLA_BASE}/${encodeURIComponent(code)}${version ? `?version=${version}` : ""}`;

export const TIMEOUT_ACTIONS = ["ESCALATE", "AUTO_REVOKE", "AUTO_ACCEPT", "QUARANTINE", "NO_OP"];
export const ESCALATION_ACTIONS = ["NUDGE", "NOTIFY_MANAGER", "NOTIFY_CISO", "REASSIGN"];
export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export type EscalationStep = { atPercent: number; action: string; params?: Record<string, unknown> };

export interface SlaProfile {
  profileId: string;
  code: string;
  name: string;
  description?: string;
  duration?: string;
  dueAt?: string;
  actionOnTimeout?: string | null;
  escalationChain?: EscalationStep[] | null;
  onReopen?: string;
  clock?: string;
  appliesWhen?: string;
  severityHint?: string | null;
  tags?: string[];
  version: number;
  state: string;
  system: boolean;
  activatedAt?: string | null;
  deprecatedAt?: string | null;
  [key: string]: unknown;
}

/** Body of POST /compliance/sla-profiles and PUT /compliance/sla-profiles/{code}. */
export interface SlaProfileRequest {
  code: string;
  name: string;
  description: string;
  duration: string;
  dueAt: string;
  actionOnTimeout: string;
  escalationChain: EscalationStep[] | null;
  onReopen: string;
  clock: string;
  appliesWhen: string;
  severityHint: string;
  tags: string[];
}

export interface SlaProfileUsage {
  latestActiveVersion?: number | null;
  definitions?: number;
  byVersion?: Record<string, Array<{
    definitionId: string; code: string; version: number; state: string; position: number; pinned: boolean; when?: string | null;
  }>>;
}

/** Starting point for "New SLA profile" (the console's sample). */
export const NEW_SLA_PROFILE: SlaProfileRequest = {
  code: "MY_SLA_2D",
  name: "New SLA profile",
  description: "",
  duration: "P2D",
  dueAt: "",
  actionOnTimeout: "ESCALATE",
  escalationChain: [{ atPercent: 50, action: "NUDGE", params: {} }, { atPercent: 80, action: "NOTIFY_MANAGER", params: {} }],
  onReopen: "RESET",
  clock: "CALENDAR",
  appliesWhen: "subject.riskTier == 'HIGH'",
  severityHint: "HIGH",
  tags: [],
};

export const toSlaProfileRequest = (p: SlaProfile): SlaProfileRequest => ({
  code: p.code,
  name: p.name,
  description: p.description ?? "",
  duration: p.duration ?? "",
  dueAt: p.dueAt ?? "",
  actionOnTimeout: p.actionOnTimeout ?? "",
  escalationChain: p.escalationChain ?? null,
  onReopen: p.onReopen ?? "RESET",
  clock: p.clock ?? "CALENDAR",
  appliesWhen: p.appliesWhen ?? "",
  severityHint: p.severityHint ?? "",
  tags: p.tags ?? [],
});

/** "50% NUDGE · 80% NOTIFY_MANAGER" — null means the definition's chain applies. */
export const chainText = (c?: EscalationStep[] | null) =>
  c == null ? "definition chain" : c.length ? c.map((s) => `${s.atPercent}% ${s.action}`).join(" · ") : "no steps";

/** ISO-8601 duration → "2d", "1d 12h" (templates are left as they are). */
export function humanDuration(d?: string): string {
  const m = d ? /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.\d+)?S)?)?$/.exec(d) : null;
  if (!m) return d ?? "";
  const parts = [m[1] && `${m[1]}d`, m[2] && `${m[2]}h`, m[3] && `${m[3]}m`, m[4] && `${m[4]}s`].filter(Boolean);
  return parts.join(" ") || "0s";
}

export const SLA_PROFILES_KEY = ["continuouscompliance", "sla-profiles"] as const;

const path = (code: string) => `/compliance/sla-profiles/${encodeURIComponent(code)}`;
const ver = (v?: number) => (v ? String(v) : undefined);
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const SlaProfiles = {
  list: async (q: { state?: string; q?: string } = {}) => list<SlaProfile>(await ccRequest("GET", "/compliance/sla-profiles", { query: q })),
  get: (code: string, version?: number) => ccRequest<SlaProfile>("GET", path(code), { query: { version: ver(version) } }),
  versions: async (code: string) => list<SlaProfile>(await ccRequest("GET", `${path(code)}/versions`)),
  usage: (code: string) => ccRequest<SlaProfileUsage>("GET", `${path(code)}/usage`),
  create: (body: SlaProfileRequest) => ccRequest<SlaProfile>("POST", "/compliance/sla-profiles", { body }),
  update: (code: string, body: SlaProfileRequest) => ccRequest<SlaProfile>("PUT", path(code), { body }),
  clone: (code: string, body: { code: string; name?: string }) => ccRequest<SlaProfile>("POST", `${path(code)}/clone`, { body }),
  newVersion: (code: string) => ccRequest<SlaProfile>("POST", `${path(code)}/versions`),
  activate: (code: string, version?: number) => ccRequest<SlaProfile>("POST", `${path(code)}/activate`, { query: { version: ver(version) } }),
  deprecate: (code: string, version?: number, force?: boolean) =>
    ccRequest<SlaProfile>("POST", `${path(code)}/deprecate`, { query: { version: ver(version), force: force ? "true" : undefined } }),
};
