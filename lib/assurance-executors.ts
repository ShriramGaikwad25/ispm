// =====================================================================
// Continuous Assurance — executors (who carries out an action).
//
// Endpoints match the deployed console (graph.keyforge.ai/cc/executors):
//   GET  /executors                 POST /executors
//   GET  /executors/{code}          PUT  /executors/{code}
//   POST /executors/{code}/activate | /deprecate | /pause | /resume | /test
// Served from sample data while USE_MOCK is true, like the rest of the
// Assurance Events pages. The same registry backs the Action bindings tab
// of an event definition (Governance.executors()).
// =====================================================================

import { assuranceApi } from "@/lib/assurance-api";

const USE_MOCK = true;

export const EXECUTORS_BASE = "/assurance-events/executors";
/** Same key as useExecutors(), so the Action bindings tab refreshes with the Executors page. */
export const EXECUTORS_KEY = ["assurance", "gov", "executors"] as const;

export type ExecutorKind = "INPROCESS" | "REST" | "AGENT";

export interface ExecutorDiagnose {
  ready: boolean;
  endpointAllowed: boolean;
  secrets: Record<string, boolean>;   // auth.secretRef → resolvable
  circuit: string;                    // CLOSED | OPEN | HALF_OPEN
  problems: string[];
}

/** An executor as GET /executors and GET /executors/{code} return it. */
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
  diagnose: ExecutorDiagnose;
  last_call_at?: string | null;
  last_status?: string | null;
}

/** Body of POST /executors and PUT /executors/{code} (the console's "request" view). */
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

// ---------- Sample data ----------

const ALLOWED_HOSTS = [
  "okta-adapter.acme.internal", "sailpoint-adapter.acme.internal", "aws-adapter.acme.internal",
  "oci-adapter.acme.internal", "acme.service-now.com", "ldap-adapter.acme.internal", "agents.acme.internal",
];
const RESOLVABLE_SECRETS = new Set([
  "env://OKTA_ADAPTER_TOKEN", "env://SAILPOINT_ADAPTER_TOKEN", "env://AWS_ADAPTER_TOKEN", "env://OCI_ADAPTER_TOKEN",
  "env://SERVICENOW_CLIENT_SECRET", "env://LDAP_ADAPTER_TOKEN", "env://AGENT_CLIENT_SECRET", "env://CC_ACTION_SIGNING_KEY",
]);

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const H = 3_600_000;

type Seed = Omit<ExecutorDetail, "diagnose"> & { circuit?: string };

const restProtocol = (extra: Record<string, unknown> = {}) => ({
  timeout: "PT20S", asyncDeadline: "PT30M", rollbackSupported: true,
  circuitBreaker: { failureThreshold: 5, openFor: "PT5M" }, ...extra,
});
const defaultContext = { include: ["event", "subject", "finding"], redact: ["subject.owner"] };

const SEEDS: Seed[] = [
  {
    executor_code: "iga", display_name: "Reference IGA connector", kind: "INPROCESS",
    description: "Built-in connector for catalog metadata changes in the IGA.",
    supports: ["IGA_SET_OWNER", "IGA_UPDATE_DESCRIPTION", "IGA_SET_APPROVAL_GROUP"],
    endpoint: null, auth: { type: "NONE" }, protocol: {}, agent: {}, context: {},
    state: "ACTIVE", version: 1, last_call_at: ago(2 * H), last_status: "SUCCEEDED",
  },
  {
    executor_code: "okta-lifecycle", display_name: "Okta lifecycle adapter", kind: "REST",
    supports: ["DISABLE_ACCOUNT", "REVOKE_ACCESS", "RESET_MFA"],
    endpoint: "https://okta-adapter.acme.internal/actions",
    auth: { type: "BEARER", secretRef: "env://OKTA_ADAPTER_TOKEN", signingSecretRef: "env://CC_ACTION_SIGNING_KEY", callbackSecretRef: "env://CC_ACTION_SIGNING_KEY" },
    protocol: restProtocol(), agent: {}, context: defaultContext,
    state: "ACTIVE", version: 2, last_call_at: ago(0.5 * H), last_status: "SUCCEEDED",
  },
  {
    executor_code: "sailpoint-provisioning", display_name: "SailPoint IdentityNow adapter", kind: "REST",
    supports: ["REVOKE_ACCESS", "DISABLE_ACCOUNT"],
    endpoint: "https://sailpoint-adapter.acme.internal/actions",
    auth: { type: "BEARER", secretRef: "env://SAILPOINT_ADAPTER_TOKEN", signingSecretRef: "env://CC_ACTION_SIGNING_KEY" },
    protocol: restProtocol(), agent: {}, context: defaultContext,
    state: "ACTIVE", version: 3, last_call_at: ago(5 * H), last_status: "SUCCEEDED",
  },
  {
    executor_code: "aws-iam-executor", display_name: "AWS IAM adapter", kind: "REST",
    supports: ["DISABLE_ACCOUNT", "ROTATE_CREDENTIAL", "DETACH_POLICY"],
    endpoint: "https://aws-adapter.acme.internal/actions",
    auth: { type: "BEARER", secretRef: "env://AWS_ADAPTER_TOKEN", signingSecretRef: "env://CC_ACTION_SIGNING_KEY" },
    protocol: restProtocol({ rollbackSupported: false }), agent: {}, context: defaultContext,
    state: "ACTIVE", version: 1, last_call_at: ago(26 * H), last_status: "SUCCEEDED",
  },
  {
    executor_code: "oci-iam-executor", display_name: "OCI IAM adapter", kind: "REST",
    supports: ["DISABLE_ACCOUNT", "DETACH_POLICY"],
    endpoint: "https://oci-adapter.acme.internal/actions",
    auth: { type: "BEARER", secretRef: "env://OCI_ADAPTER_TOKEN", signingSecretRef: "env://CC_ACTION_SIGNING_KEY" },
    protocol: restProtocol(), agent: {}, context: defaultContext,
    state: "ACTIVE", paused: true, pause_reason: "Tenancy migration in progress", version: 1,
    last_call_at: ago(72 * H), last_status: "FAILED", circuit: "OPEN",
  },
  {
    executor_code: "servicenow-itsm", display_name: "ServiceNow ticketing", kind: "REST",
    description: "Opens an incident for a human to act on; nothing changes in the target system.",
    supports: ["OPEN_TICKET"],
    endpoint: "https://acme.service-now.com/api/x_kf/actions",
    auth: { type: "OAUTH2_CLIENT_CREDENTIALS", tokenUrl: "https://acme.service-now.com/oauth_token.do", clientId: "keyforge-cc", clientSecretRef: "env://SERVICENOW_CLIENT_SECRET" },
    protocol: restProtocol({ rollbackSupported: false, asyncDeadline: "P2D" }), agent: {}, context: { include: ["event", "subject"], redact: [] },
    state: "ACTIVE", version: 1, last_call_at: ago(3 * H), last_status: "DISPATCHED",
  },
  {
    executor_code: "approver-agent", display_name: "Approval-group resolver agent", kind: "AGENT",
    supports: ["IGA_SET_APPROVAL_GROUP"],
    endpoint: "https://agents.acme.internal/approver",
    auth: { type: "OAUTH2_CLIENT_CREDENTIALS", tokenUrl: "https://login.acme.internal/oauth/token", clientId: "cc-agent", clientSecretRef: "env://AGENT_CLIENT_SECRET" },
    protocol: { timeout: "PT60S", asyncDeadline: "PT2H" },
    agent: { defaultMode: "PROPOSE", allowedActions: ["IGA_SET_APPROVAL_GROUP"], maxSteps: 3, toolsExecutor: "iga" },
    context: { include: ["event", "subject", "finding"], redact: ["finding.invalidPrincipalIds"] },
    state: "ACTIVE", version: 1, last_call_at: ago(50 * H), last_status: "PROPOSED",
  },
  {
    executor_code: "cyberark-vault", display_name: "CyberArk vault rotation", kind: "REST",
    supports: ["ROTATE_CREDENTIAL"],
    endpoint: "https://cyberark-adapter.acme.internal/actions",
    auth: { type: "API_KEY", header: "X-API-Key", secretRef: "env://CYBERARK_API_KEY" },
    protocol: restProtocol({ rollbackSupported: false }), agent: {}, context: defaultContext,
    state: "DRAFT", version: 1, last_call_at: null, last_status: null,
  },
  {
    executor_code: "legacy-ldap", display_name: "Legacy LDAP adapter", kind: "REST",
    supports: ["DISABLE_ACCOUNT"],
    endpoint: "https://ldap-adapter.acme.internal/actions",
    auth: { type: "BASIC", secretRef: "env://LDAP_ADAPTER_TOKEN" },
    protocol: restProtocol(), agent: {}, context: defaultContext,
    state: "DEPRECATED", version: 4, last_call_at: ago(24 * 30 * H), last_status: "SUCCEEDED",
  },
];

function diagnose(e: Omit<ExecutorDetail, "diagnose">, circuit = "CLOSED"): ExecutorDiagnose {
  if (e.kind === "INPROCESS") return { ready: true, endpointAllowed: true, secrets: {}, circuit, problems: [] };
  const problems: string[] = [];
  let host = "";
  try { host = new URL(e.endpoint ?? "").host; } catch { /* invalid URL */ }
  const endpointAllowed = !!host && ALLOWED_HOSTS.includes(host);
  if (!e.endpoint) problems.push("No endpoint configured.");
  else if (!endpointAllowed) problems.push(`Endpoint host ${host || e.endpoint} is not on the allow-list.`);
  const secrets: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(e.auth ?? {})) {
    if (!/Ref$/.test(k) || typeof v !== "string") continue;
    secrets[`auth.${k}`] = RESOLVABLE_SECRETS.has(v);
    if (!RESOLVABLE_SECRETS.has(v)) problems.push(`auth.${k} (${v}) is not set for the service.`);
  }
  return { ready: problems.length === 0, endpointAllowed, secrets, circuit, problems };
}

let registry: ExecutorDetail[] = SEEDS.map(({ circuit, ...e }) => ({ ...e, diagnose: diagnose(e, circuit) }));

const copy = <T,>(v: T): T => structuredClone(v);
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(copy(v)), 150));

const find = (code: string) => {
  const e = registry.find((x) => x.executor_code === code);
  if (!e) throw new Error(`Executor ${code} not found`);
  return e;
};
const refresh = (e: ExecutorDetail) => { e.diagnose = diagnose(e, e.diagnose?.circuit); };

const mock = {
  list: () => delay(registry),
  get: async (code: string) => delay(find(code)),
  create: async (req: ExecutorRequest) => {
    if (registry.some((x) => x.executor_code === req.executorCode)) throw new Error(`Executor ${req.executorCode} already exists`);
    const e: ExecutorDetail = {
      executor_code: req.executorCode, display_name: req.displayName, description: req.description,
      kind: req.kind as ExecutorKind, supports: req.supports, endpoint: req.endpoint ?? null,
      auth: req.auth ?? { type: "NONE" }, protocol: req.protocol ?? {}, agent: req.agent ?? {}, context: req.context ?? {},
      state: "DRAFT", version: 1, last_call_at: null, last_status: null,
      diagnose: { ready: false, endpointAllowed: false, secrets: {}, circuit: "CLOSED", problems: [] },
    };
    refresh(e);
    registry = [...registry, e];
    return delay(e);
  },
  update: async (code: string, req: ExecutorRequest) => {
    const e = find(code);
    if (e.state !== "DRAFT") throw new Error(`${code} is ${e.state}; only DRAFT executors can be edited.`);
    Object.assign(e, {
      display_name: req.displayName, description: req.description, supports: req.supports, endpoint: req.endpoint ?? null,
      auth: req.auth ?? {}, protocol: req.protocol ?? {}, agent: req.agent ?? {}, context: req.context ?? {},
    });
    refresh(e);
    return delay(e);
  },
  activate: async (code: string) => {
    const e = find(code);
    if (e.state !== "DRAFT") throw new Error(`${code} is ${e.state}; only DRAFT executors can be activated.`);
    refresh(e);
    if (!e.diagnose.ready) throw new Error(`Cannot activate ${code}: ${e.diagnose.problems.join(" ")}`);
    e.state = "ACTIVE";
    return delay(e);
  },
  deprecate: async (code: string) => {
    const e = find(code);
    if (e.state !== "ACTIVE") throw new Error(`${code} is ${e.state}; only ACTIVE executors can be deprecated.`);
    e.state = "DEPRECATED";
    e.paused = false;
    return delay(e);
  },
  pause: async (code: string, reason: string) => {
    const e = find(code);
    e.paused = true;
    e.pause_reason = reason;
    return delay(e);
  },
  resume: async (code: string) => {
    const e = find(code);
    e.paused = false;
    e.pause_reason = null;
    return delay(e);
  },
  test: async (code: string) => {
    const e = find(code);
    refresh(e);
    const action = e.supports[0] ?? "NOOP";
    const request = {
      operation: "DRY_RUN",
      action: { type: action, params: { subjectId: "00000000-0000-4000-c000-000000000001" } },
      headers: { "X-CC-Request-Id": crypto.randomUUID(), "Idempotency-Key": `test-${Date.now()}`, "X-CC-Signature": "sha256=…" },
    };
    const result = e.diagnose.ready
      ? { status: e.kind === "AGENT" ? "PROPOSED" : "SUCCEEDED", externalRef: "DRYRUN-1", evidence: { echo: true, signature: "OK" } }
      : { status: "FAILED", failureReason: e.diagnose.problems.join(" ") };
    return delay({ executor: code, request, result });
  },
};

// ---------- API ----------

export const Executors = {
  list: async (): Promise<ExecutorDetail[]> =>
    USE_MOCK ? mock.list() : assuranceApi.get<ExecutorDetail[]>("/executors"),
  get: async (code: string): Promise<ExecutorDetail> =>
    USE_MOCK ? mock.get(code) : assuranceApi.get<ExecutorDetail>(`/executors/${encodeURIComponent(code)}`),
  create: async (req: ExecutorRequest): Promise<ExecutorDetail> =>
    USE_MOCK ? mock.create(req) : assuranceApi.post<ExecutorDetail>("/executors", req),
  update: async (code: string, req: ExecutorRequest): Promise<ExecutorDetail> =>
    USE_MOCK ? mock.update(code, req) : assuranceApi.put<ExecutorDetail>(`/executors/${encodeURIComponent(code)}`, req),
  activate: async (code: string): Promise<ExecutorDetail> =>
    USE_MOCK ? mock.activate(code) : assuranceApi.post<ExecutorDetail>(`/executors/${encodeURIComponent(code)}/activate`),
  deprecate: async (code: string): Promise<ExecutorDetail> =>
    USE_MOCK ? mock.deprecate(code) : assuranceApi.post<ExecutorDetail>(`/executors/${encodeURIComponent(code)}/deprecate`),
  pause: async (code: string, reason: string): Promise<ExecutorDetail> =>
    USE_MOCK ? mock.pause(code, reason) : assuranceApi.post<ExecutorDetail>(`/executors/${encodeURIComponent(code)}/pause`, { reason }),
  resume: async (code: string): Promise<ExecutorDetail> =>
    USE_MOCK ? mock.resume(code) : assuranceApi.post<ExecutorDetail>(`/executors/${encodeURIComponent(code)}/resume`),
  test: async (code: string, body?: unknown): Promise<unknown> =>
    USE_MOCK ? mock.test(code) : assuranceApi.post(`/executors/${encodeURIComponent(code)}/test`, body ?? {}),
};
