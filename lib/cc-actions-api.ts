// =====================================================================
// Continuous Assurance — action library (action types).
//
// Same API as the Continuous Compliance Console's Action library page
// (graph.keyforge.ai/console#/actions), through ISPM's proxy
// (lib/controls-api.ts → /api/continuouscompliance):
//   GET  /compliance/action-types?state=&category=&q=
//   GET  /compliance/action-types/{code}?version=
//   GET  /compliance/action-types/{code}/versions
//   GET  /compliance/action-types/{code}/usage
//   GET  /compliance/action-types/{code}/contract?version=
//   POST /compliance/action-types/{code}/test
//   POST /compliance/action-types/{code}/clone | /versions | /activate | /deprecate
// An action is what a governance rule, a review-form outcome, an agent step
// or an operator asks an executor to do, with its parameter contract.
// =====================================================================

import { ccRequest } from "@/lib/controls-api";
import { resolveTenantIdForHeader } from "@/lib/auth";

export const ACTIONS_BASE = "/assurance-events/studio-configuration/actions";
export const actionHref = (code: string, version: number) =>
  `${ACTIONS_BASE}/${encodeURIComponent(code)}?version=${version}`;

/** Lookup ACTION_CATEGORY, in the console's display order. */
export const ACTION_CATEGORIES = [
  "IGA_ADMIN", "ACCOUNT_LIFECYCLE", "ENTITLEMENT", "CREDENTIAL", "NHI", "CLOUD_RESOURCE", "SAAS", "TICKETING", "AGENT", "OTHER",
];

export interface ActionParameter {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  enum?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  suggested?: string;
  example?: unknown;
  sensitive?: boolean;
  help?: string;
}

export interface ActionType {
  actionId: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  targetKind: string;
  reversible: boolean;
  autoExecution: string;
  defaultExecutor?: string | null;
  parameters?: ActionParameter[];
  resultFields?: Array<{ name: string; description?: string }>;
  tags?: string[];
  version: number;
  state: string;
  system: boolean;
  activatedAt?: string | null;
  deprecatedAt?: string | null;
  warnings?: string[];
  [key: string]: unknown;
}

export interface ActionUsage {
  latestActiveVersion?: number | null;
  definitions?: number;
  byVersion?: Record<string, Array<{
    definitionId: string; code: string; version: number; state: string; pinned: boolean; sources: string[];
  }>>;
  executors?: Array<{ executorCode: string; version: number; state: string; kind: string; via?: string }>;
  inProcessConnectors?: string[];
  reviewForms?: Array<{ formCode: string; version: number; state: string; system: boolean; outcome: string }>;
}

export interface ActionContract {
  envelopes?: { EXECUTE?: unknown; ROLLBACK?: unknown };
  result?: unknown;
  notes?: string[];
  [key: string]: unknown;
}

export interface ActionTestResult {
  violations: string[];
  executor?: { code?: string; kind?: string; supportsAction?: boolean };
  operation?: string;
  answer?: { status?: string; [k: string]: unknown };
  [key: string]: unknown;
}

export const ACTIONS_KEY = ["continuouscompliance", "action-types"] as const;

const path = (code: string) => `/compliance/action-types/${encodeURIComponent(code)}`;
const ver = (v?: number) => (v ? String(v) : undefined);
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const Actions = {
  list: async (q: { state?: string; category?: string; q?: string }) =>
    list<ActionType>(await ccRequest("GET", "/compliance/action-types", { query: q })),
  get: (code: string, version?: number) => ccRequest<ActionType>("GET", path(code), { query: { version: ver(version) } }),
  versions: async (code: string) => list<ActionType>(await ccRequest("GET", `${path(code)}/versions`)),
  usage: (code: string) => ccRequest<ActionUsage>("GET", `${path(code)}/usage`),
  contract: (code: string, version?: number) =>
    ccRequest<ActionContract>("GET", `${path(code)}/contract`, { query: { version: ver(version) } }),
  test: (code: string, body: { params: Record<string, unknown>; version?: number; executor?: string; eventId?: string; context?: unknown }) =>
    ccRequest<ActionTestResult>("POST", `${path(code)}/test`, { body }),
  clone: (code: string, body: { code: string; name?: string }) => ccRequest<ActionType>("POST", `${path(code)}/clone`, { body }),
  /** PUT /compliance/action-types/{code} — saves the tenant DRAFT of the code. */
  update: (code: string, body: ActionRequest) => ccRequest<ActionType>("PUT", path(code), { body }),
  newVersion: (code: string) => ccRequest<ActionType>("POST", `${path(code)}/versions`),
  activate: (code: string, version?: number) =>
    ccRequest<ActionType>("POST", `${path(code)}/activate`, { query: { version: ver(version) } }),
  deprecate: (code: string, version?: number, force?: boolean) =>
    ccRequest<ActionType>("POST", `${path(code)}/deprecate`, { query: { version: ver(version), force: force ? "true" : undefined } }),
};

/** "a*, b, c*" — parameter names, * = required (the console's parameter summary). */
export const paramSummary = (ps: ActionParameter[] = []) => ps.map((p) => p.name + (p.required ? "*" : "")).join(", ");

/** Body of PUT /compliance/action-types/{code} (the console's editable part of an action). */
export interface ActionRequest {
  code: string;
  name: string;
  description?: string;
  category: string;
  targetKind: string;
  reversible: boolean;
  parameters: ActionParameter[];
  resultFields: Array<{ name: string; description?: string }>;
  defaultExecutor: string | null;
  autoExecution: string;
  sortOrder?: number;
  tags: string[];
}

export const toActionRequest = (a: ActionType): ActionRequest => ({
  code: a.code,
  name: a.name,
  description: a.description ?? "",
  category: a.category,
  targetKind: a.targetKind,
  reversible: a.reversible,
  parameters: a.parameters ?? [],
  resultFields: a.resultFields ?? [],
  defaultExecutor: a.defaultExecutor ?? null,
  autoExecution: a.autoExecution,
  sortOrder: a.sortOrder as number | undefined,
  tags: a.tags ?? [],
});

/** What an action changes (the console's target kinds). */
export const TARGET_KINDS = ["ACCOUNT", "ENTITLEMENT", "NHI", "CREDENTIAL", "GROUP", "SESSION", "RESOURCE"];

/** Default code for a clone: tenant prefix; system codes lose the reserved IGA_/AGENT_ prefix. */
export const cloneCode = (a: ActionType, tenant = resolveTenantIdForHeader() || "ACME") =>
  a.system ? `${tenant.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${a.code.replace(/^(IGA|AGENT)_/, "")}` : `${a.code}_COPY`;
