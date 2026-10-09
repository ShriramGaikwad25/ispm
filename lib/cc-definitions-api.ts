// =====================================================================
// Continuous Compliance — event definitions (live API).
//
//   GET {baseUrl}/{tenant}/compliance/definitions?state=DRAFT|ACTIVE|DEPRECATED
//   GET {baseUrl}/{tenant}/compliance/definitions/{id}   (the definition editor)
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
