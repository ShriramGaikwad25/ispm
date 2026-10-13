// =====================================================================
// Continuous Assurance — executors (who carries out an action).
//
// Live data from the Continuous Compliance Console's API
// (graph.keyforge.ai/console#/executors), through ISPM's proxy:
//   GET  /compliance/executors              POST /compliance/executors
//   GET  /compliance/executors/{code}       PUT  /compliance/executors/{code}
//   GET  /compliance/executors/{code}/diagnose
//   POST /compliance/executors/{code}/activate | /deprecate | /pause | /resume | /test
// The same registry backs the Action bindings tab of an event definition
// (Governance.executors()).
// =====================================================================

import { ccRequest } from "@/lib/controls-api";

export const EXECUTORS_BASE = "/assurance-events/executors";
/** The executor list: Studio Configuration → Executors tab. */
export const EXECUTORS_LIST_HREF = "/assurance-events/studio-configuration?tab=executors";
/** Same key as useExecutors(), so the Action bindings tab refreshes with the Executors page. */
export const EXECUTORS_KEY = ["assurance", "gov", "executors"] as const;

export type ExecutorKind = "INPROCESS" | "REST" | "AGENT";

/** An executor as the pages use it (mapped from the API's camelCase row). */
export interface ExecutorDetail {
  executor_code: string;
  display_name: string;
  description?: string;
  kind: ExecutorKind;
  supports: string[];
  endpoint?: string | null;
  auth: Record<string, unknown> & { type?: string };
  protocol: Record<string, unknown>;
  agent: Record<string, unknown>;
  context: Record<string, unknown>;
  state: "DRAFT" | "ACTIVE" | "DEPRECATED";
  paused?: boolean;
  pause_reason?: string | null;
  version: number;
}

/** Body of POST /compliance/executors and PUT /compliance/executors/{code}. */
export interface ExecutorRequest {
  executorCode: string;
  kind: string;
  displayName: string;
  description?: string;
  supports: string[];
  endpoint?: string | null;
  auth?: Record<string, unknown>;
  protocol?: Record<string, unknown>;
  agent?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

// ---------- API ----------

/** An executor as the service returns it (camelCase). */
interface ApiExecutor {
  executorId?: string;
  executorCode: string;
  displayName?: string;
  description?: string;
  kind: ExecutorKind;
  supports?: string[];
  endpoint?: string | null;
  auth?: Record<string, unknown>;
  protocol?: Record<string, unknown>;
  agent?: Record<string, unknown>;
  context?: Record<string, unknown>;
  state: ExecutorDetail["state"];
  paused?: boolean;
  pauseReason?: string | null;
  version: number;
  [key: string]: unknown;
}

const fromApi = (e: ApiExecutor): ExecutorDetail => ({
  executor_code: e.executorCode,
  display_name: e.displayName ?? e.executorCode,
  description: e.description,
  kind: e.kind,
  supports: e.supports ?? [],
  endpoint: e.endpoint ?? null,
  auth: e.auth ?? {},
  protocol: e.protocol ?? {},
  agent: e.agent ?? {},
  context: e.context ?? {},
  state: e.state,
  paused: !!e.paused,
  pause_reason: e.pauseReason ?? null,
  version: e.version,
});

const path = (code: string) => `/compliance/executors/${encodeURIComponent(code)}`;

/** Defaults for "Register executor" (the console's sample REST adapter). */
export const NEW_EXECUTOR: ExecutorRequest = {
  executorCode: "my-adapter",
  kind: "REST",
  displayName: "New REST adapter",
  description: "",
  supports: [],
  endpoint: "https://adapter.example.internal/actions",
  auth: { type: "BEARER", secretRef: "env://ADAPTER_TOKEN", signingSecretRef: "env://CC_ACTION_SIGNING_KEY", callbackSecretRef: "env://CC_ACTION_SIGNING_KEY" },
  protocol: { timeout: "PT20S", asyncDeadline: "PT30M", estimateSupported: true, rollbackSupported: true, circuitBreaker: { failureThreshold: 5, openFor: "PT5M" } },
  agent: {},
  context: { include: ["event", "subject", "finding"], redact: [] },
};

// Same API as the Continuous Compliance Console's Executors page
// (graph.keyforge.ai/console#/executors), through ISPM's proxy.
export const Executors = {
  list: async (): Promise<ExecutorDetail[]> => {
    const rows = await ccRequest<ApiExecutor[]>("GET", "/compliance/executors");
    return (Array.isArray(rows) ? rows : []).map(fromApi);
  },
  get: async (code: string): Promise<ExecutorDetail> => fromApi(await ccRequest<ApiExecutor>("GET", path(code))),
  /** GET /compliance/executors/{code}/diagnose — readiness; secret values are never returned. */
  diagnose: (code: string) => ccRequest<Record<string, unknown>>("GET", `${path(code)}/diagnose`),
  create: async (req: ExecutorRequest): Promise<ExecutorDetail> =>
    fromApi(await ccRequest<ApiExecutor>("POST", "/compliance/executors", { body: req })),
  /** PUT on a DRAFT saves it; on an ACTIVE executor it cuts a new DRAFT version. */
  update: async (code: string, req: ExecutorRequest): Promise<ExecutorDetail> =>
    fromApi(await ccRequest<ApiExecutor>("PUT", path(code), { body: req })),
  activate: async (code: string): Promise<ExecutorDetail> => fromApi(await ccRequest<ApiExecutor>("POST", `${path(code)}/activate`)),
  deprecate: async (code: string): Promise<ExecutorDetail> => fromApi(await ccRequest<ApiExecutor>("POST", `${path(code)}/deprecate`)),
  pause: async (code: string, reason: string): Promise<ExecutorDetail> =>
    fromApi(await ccRequest<ApiExecutor>("POST", `${path(code)}/pause`, { body: reason ? { reason } : {} })),
  resume: async (code: string): Promise<ExecutorDetail> => fromApi(await ccRequest<ApiExecutor>("POST", `${path(code)}/resume`)),
  /** POST /compliance/executors/{code}/test — sends the operation (default DRY_RUN); nothing is persisted. */
  test: (code: string, body: unknown) => ccRequest<unknown>("POST", `${path(code)}/test`, { body }),
};
