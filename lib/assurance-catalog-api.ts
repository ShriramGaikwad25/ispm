// =====================================================================
// Continuous Assurance — detector catalog API.
//
// The library layer: what KeyForge could detect, and what it must be
// connected to in order to detect it. Served by the Continuous Assurance
// (compliance) Spring Boot service via the separate client in
// lib/assurance-api.ts — currently replaced by mock data, see Catalog below.
// =====================================================================

import { MOCK_DETECTORS, MOCK_SIGNAL_FAMILIES, MOCK_SUMMARY } from "@/lib/assurance-catalog-mock";

export type Detector = {
  detector_id: string;
  signal_family_code: string;
  signal_family: string;
  family_order: number;
  name: string;
  finding_condition?: string;
  evidence_inputs?: string;
  likely_source?: string;
  agent_code: string;
  agent_name?: string;
  agent_state?: string;
  default_response?: string;
  accountable_owner?: string;
  action_policy?: string;
  closure_evidence?: string;
  rollout_phase?: string;
  reporter_mapping?: string;
  implemented_event_code?: string | null;
  is_implemented: boolean;
  configured_sources: number;
  total_sources: number;
  sources?: Array<{
    code: string;
    name: string;
    vendor?: string;
    category: string;
    status: string;
    contribution: string;
  }>;
};

export type SignalFamily = {
  code: string;
  name: string;
  sort_order: number;
  detector_count: number;
  implemented_count: number;
  start_phase_count: number;
  configured_sources: number;
  agents: string[] | null;
};

export type CatalogSummary = {
  detectors: number;
  implemented: number;
  families: number;
  agents: number;
  phase_start: number;
};

export type DetectorQuery = {
  family?: string;
  agent?: string;
  rollout?: string;
  response?: string;
  implemented?: boolean;
  search?: string;
};

export const ROLLOUT_STYLE: Record<string, string> = {
  Start: "bg-emerald-50 text-emerald-700",
  Expand: "bg-amber-50 text-amber-700",
  "Validate later": "bg-slate-100 text-slate-600",
};

// Served from mock data for now (lib/assurance-catalog-mock.ts). The real
// endpoints are noted on each call; switch back with assuranceApi.get(...).
export const Catalog = {
  // GET /assurance/catalog/summary
  summary: async (): Promise<CatalogSummary> => MOCK_SUMMARY,

  // GET /assurance/catalog/signal-families
  signalFamilies: async (): Promise<SignalFamily[]> => MOCK_SIGNAL_FAMILIES,

  // GET /assurance/catalog/detectors
  detectors: async (params?: DetectorQuery): Promise<Detector[]> => {
    const q = params?.search?.trim().toLowerCase();
    return MOCK_DETECTORS
      .filter((d) => !params?.family || d.signal_family_code === params.family)
      .filter((d) => !params?.agent || d.agent_code === params.agent)
      .filter((d) => !params?.rollout || d.rollout_phase === params.rollout)
      .filter((d) => !params?.response || d.default_response === params.response)
      .filter((d) => params?.implemented === undefined || d.is_implemented === params.implemented)
      .filter((d) => !q || [d.detector_id, d.name, d.finding_condition ?? ""]
        .some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => a.family_order - b.family_order || a.detector_id.localeCompare(b.detector_id));
  },

  // GET /assurance/catalog/detectors/{id}
  detector: async (id: string): Promise<Detector> => {
    const d = MOCK_DETECTORS.find((x) => x.detector_id === id);
    if (!d) throw new Error(`Detector ${id} not found`);
    return d;
  },
};
