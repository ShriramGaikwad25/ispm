// =====================================================================
// Continuous Compliance — event definitions (live API).
//
//   GET {baseUrl}/{tenant}/compliance/definitions?state=DRAFT|ACTIVE|DEPRECATED
//   GET {baseUrl}/{tenant}/compliance/definitions/{id}   (the definition editor)
//   GET /compliance/definitions/summary, POST /compliance/definitions,
//   PUT /compliance/definitions/{id}, POST …/{id}/versions | /activate | /deprecate
//
// through ISPM's proxy (lib/controls-api.ts → /api/continuouscompliance).
// Each definition is mapped onto the row the Event Definitions table renders
// (DefinitionSummary), so the page layout does not change.
// =====================================================================

import { ccRequest } from "@/lib/controls-api";
import type { DefinitionSummary, EventDefinition } from "@/lib/assurance-events-api";

/** A definition as GET /compliance/definitions returns it (fields the list reads). */
export interface CcDefinition {
  definitionId: string;
  code: string;
  name: string;
  eventTypeCode: string;
  severity: string;
  version: number;
  state: string;
  slaDuration?: string;
  criteriaDsl?: { mode?: string; language?: string; expression?: string };
  detector?: { family?: string; controls?: Array<{ code: string; version?: number }> };
  governancePolicy?: { rules?: unknown[] };
  slaPolicy?: { resolution?: string; rules?: unknown[] };
  actionBindings?: Record<string, string>;
  openFindings?: number;
  updatedAt: string;
  [key: string]: unknown;
}

export const CC_DEFINITIONS_KEY = ["continuouscompliance", "definitions"] as const;

function toSummary(d: CcDefinition): DefinitionSummary {
  const controls = d.detector?.controls?.length ?? 0;
  const mode = controls > 0 ? "ASSURANCE_CONTROL" : d.criteriaDsl?.mode ?? "";
  return {
    definitionId: d.definitionId,
    code: d.code,
    name: d.name,
    eventTypeCode: d.eventTypeCode,
    severity: d.severity,
    version: d.version,
    state: d.state,
    detectionMode: mode,
    controls,
    governanceRules: d.governancePolicy?.rules?.length ?? 0,
    slaConditions: d.slaPolicy?.rules?.length ?? 0,
    slaResolution: d.slaPolicy?.resolution ?? "FIRST_MATCH",
    slaDuration: d.slaDuration ?? "—",
    executors: [...new Set(Object.values(d.actionBindings ?? {}).filter(Boolean))],
    openFindings: d.openFindings ?? 0,
    updatedAt: d.updatedAt,
  };
}

export const CcDefinitions = {
  /** GET /compliance/definitions — `state` filters server-side (empty = every state). */
  list: async (state?: string): Promise<DefinitionSummary[]> => {
    const rows = await ccRequest<CcDefinition[]>("GET", "/compliance/definitions", { query: { state: state || undefined } });
    return (Array.isArray(rows) ? rows : []).map(toSummary);
  },
  /** GET /compliance/definitions/{id} — one definition, as the editor edits it. */
  get: (id: string): Promise<EventDefinition> =>
    ccRequest<EventDefinition>("GET", `/compliance/definitions/${encodeURIComponent(id)}`),
};

// ---------- Console Definitions page (graph.keyforge.ai/console#/definitions) ----------

/** A row of GET /compliance/definitions/summary — each policy part pre-rendered as text. */
export interface CcDefinitionSummary {
  definitionId: string;
  code: string;
  name: string;
  eventTypeCode: string;
  severity: string;
  version: number;
  state: string;
  detector: { text: string; controls: Array<{ code: string; version?: number }> };
  sla: { text: string; items?: Array<{ code: string; version?: number; when?: string }> };
  reviewer: { text: string };
  policy: { text: string };
  updatedAt: string;
  [key: string]: unknown;
}

const defPath = (id: string) => `/compliance/definitions/${encodeURIComponent(id)}`;

/** Body for "New definition" (the console's starter definition). */
export const NEW_DEFINITION = {
  code: "NEW001",
  eventTypeCode: "IGA_DQ_APPROVAL_CHAIN",
  name: "New definition",
  description: "",
  severity: "MEDIUM",
  ownerPrincipalId: "00000000-0000-0000-0000-100000000001",
  ownerRole: "IAM_GOVERNANCE",
  reviewerStrategy: "ENTITLEMENT_OWNER",
  reviewerConfig: {},
  slaDuration: "P5D",
  escalationChain: [{ atPercent: 50, action: "NUDGE", params: {} }, { atPercent: 80, action: "NOTIFY_MANAGER", params: {} }],
  defaultActionOnTimeout: "ESCALATE",
  criteriaDsl: { mode: "CATALOG_SCAN" },
  detector: { family: "APPROVAL_DQ", controls: [{ code: "APPROVAL_GROUP_MISSING" }] },
  scope: { applications: [], accountTypes: [], entitlementTags: [], nhiCategories: [], environments: [], dataClassifications: [], regulatory: [] },
  allowedMitigationCodes: ["PEER_REVIEW"],
  autoRemediationConfig: { enabled: false, actions: [] },
  aiInsightConfig: {},
  riskAcceptanceConfig: { allowed: true },
  evidenceRequirements: {},
  governancePolicy: { rules: [] },
  actionBindings: {},
  sla: { resolution: "FIRST_MATCH", items: [{ code: "PRIVILEGED_1D" }, { code: "STANDARD_5D" }] },
};

export const CcDefinitionWrites = {
  /** GET /compliance/definitions/summary?state=&eventTypeCode=&q= */
  summary: async (q: { state?: string; eventTypeCode?: string; q?: string }): Promise<CcDefinitionSummary[]> => {
    const rows = await ccRequest<CcDefinitionSummary[]>("GET", "/compliance/definitions/summary", { query: q });
    return Array.isArray(rows) ? rows : [];
  },
  create: (body: unknown) => ccRequest<EventDefinition>("POST", "/compliance/definitions", { body }),
  /** PUT a DRAFT (the server ignores tenantId / activatedAt / createdBy …). */
  update: (id: string, body: unknown) => ccRequest<EventDefinition>("PUT", defPath(id), { body }),
  newVersion: (id: string) => ccRequest<EventDefinition>("POST", `${defPath(id)}/versions`),
  activate: (id: string) => ccRequest<EventDefinition>("POST", `${defPath(id)}/activate`),
  deprecate: (id: string) => ccRequest<EventDefinition>("POST", `${defPath(id)}/deprecate`),
};
