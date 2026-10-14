// =====================================================================
// Continuous Compliance — control library API.
//
// The same calls the Continuous Compliance Console's Controls page makes
// (graph.keyforge.ai/console#/controls), against
//   https://graph.keyforge.ai/continuouscompliance/api/v1/{tenant}
// through ISPM's own proxy (/api/continuouscompliance, see
// app/api/continuouscompliance) because the service rejects cross-origin
// browser calls. The signed-in user's JWT is sent as the bearer token
// (authFetch adds it, the proxy falls back to the JWT cookie).
//
//   GET  /compliance/lookups/domains          (connection check, as the console's shell)
//   GET  /compliance/detection-families
//   GET  /compliance/control-categories
//   GET  /compliance/controls?family=&category=&state=&q=
//   POST /compliance/controls/{code}/clone   { code, name }
// =====================================================================

import { resolveTenantIdForHeader } from "@/lib/auth";
import { tenantId as defaultTenantId } from "@/lib/config";

const PROXY_BASE = "/api/continuouscompliance";

export interface ControlParameter {
  name: string;
  type?: string;
  default?: unknown;
  min?: number;
  max?: number;
  description?: string;
}

/** A row of GET /compliance/controls. */
export interface Control {
  controlId: string;
  code: string;
  name: string;
  description?: string;
  categoryCode: string;
  familyCode: string;
  objectKind: string;
  version: number;
  state: "DRAFT" | "ACTIVE" | "DEPRECATED" | string;
  system: boolean;                       // true = system library, false = tenant
  parameters?: ControlParameter[];
  severityHint?: string;
  condition?: { language?: string; expression?: string };
  [key: string]: unknown;
}

/** Body of POST /compliance/controls and PUT /compliance/controls/{code}. */
export interface ControlRequest {
  code: string;
  category: string;
  family: string;
  objectKind: string;
  name: string;
  description?: string;
  condition: { language: string; expression: string };
  parameters: ControlParameter[];
  evidenceFields: string[];
  severityHint?: string;
  tags: string[];
}

export interface ControlUsage {
  latestActiveVersion?: number | null;
  definitions?: number;
  byVersion?: Record<string, Array<{ definitionId: string; code: string; version: number; state: string; position: number; pinned: boolean }>>;
}

export interface ControlAuditRow {
  auditId: string;
  at: string;
  action: string;
  actor: { kind: string; ref?: string; principalId?: string };
  from?: string | null;
  to?: string | null;
  detail?: Record<string, unknown> & { version?: number };
  [key: string]: unknown;
}

export interface ControlTestResult {
  compiled: boolean;
  matched?: boolean | null;
  params?: unknown;
  evaluatedAt?: string;
  diagnostics?: string[];
  evidence?: Record<string, unknown>;
  context?: unknown;
}

export interface DetectionFamily {
  code: string;
  displayName?: string;
  evaluator?: string;
  objectKinds?: string[];
  /** Variables a control's condition can read: name → { object, fields: { field → type } }. */
  contextSchema?: Record<string, { object?: string; fields?: Record<string, unknown> }>;
  [key: string]: unknown;
}
export interface ControlCategory { code: string; displayName: string; [key: string]: unknown }

export interface ControlQuery {
  family?: string;
  category?: string;
  state?: string;
  q?: string;
}

/** HTTP error carrying the service's error code and message. */
export class ControlsApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function tenant(): string {
  return resolveTenantIdForHeader() || defaultTenantId?.trim() || "ACMECOM";
}

/** Query values: arrays are sent as repeated parameters (status=OPEN&status=IN_REVIEW), as the console does. */
export type CcQuery = Record<string, string | string[] | undefined>;

function buildUrl(path: string, query?: CcQuery): string {
  let url = `${PROXY_BASE}/${encodeURIComponent(tenant())}${path}`;
  const qs = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => { if (x !== "") qs.append(k, x); });
    else if (v !== undefined && v !== "") qs.append(k, v);
  });
  const s = qs.toString();
  if (s) url += `?${s}`;
  return url;
}

/** Calls the Continuous Compliance service (through ISPM's proxy) for the signed-in tenant. */
export async function ccRequest<T>(method: string, path: string, opts: { query?: CcQuery; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Request-Id": `ispm-${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-4)}`,
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(buildUrl(path, opts.query), { method, headers, body });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const o = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const code = String(o.error_code ?? o.error ?? res.status);
    const message = String(o.message ?? (typeof data === "string" && data) ?? res.statusText ?? `HTTP ${res.status}`);
    throw new ControlsApiError(res.status, code, message);
  }
  return data as T;
}

/** Like ccRequest, but returns the raw Response (binary downloads, e.g. the evidence-pack ZIP). */
export async function ccFetchRaw(method: string, path: string, opts: { query?: CcQuery; accept?: string } = {}): Promise<Response> {
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers: { Accept: opts.accept ?? "application/octet-stream" },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText || `HTTP ${res.status}`;
    try { message = String((JSON.parse(text) as { message?: string }).message ?? message); } catch { /* not JSON */ }
    throw new ControlsApiError(res.status, String(res.status), message);
  }
  return res;
}

const controlPath = (code: string) => `/compliance/controls/${encodeURIComponent(code)}`;

export const Controls = {
  families: () => ccRequest<{ families?: DetectionFamily[] }>("GET", "/compliance/detection-families"),
  categories: () => ccRequest<ControlCategory[]>("GET", "/compliance/control-categories"),
  list: (q: ControlQuery = {}) =>
    ccRequest<Control[]>("GET", "/compliance/controls", {
      query: { family: q.family, category: q.category, state: q.state, q: q.q },
    }),
  clone: (code: string, body: { code: string; name?: string }) =>
    ccRequest<Control>("POST", `${controlPath(code)}/clone`, { body }),
  // The console's control page (graph.keyforge.ai/console#/controls/{code}):
  get: (code: string, version?: number) =>
    ccRequest<Control>("GET", controlPath(code), { query: { version: version ? String(version) : undefined } }),
  versions: (code: string) => ccRequest<Control[]>("GET", `${controlPath(code)}/versions`),
  usage: (code: string) => ccRequest<ControlUsage>("GET", `${controlPath(code)}/usage`),
  audit: (code: string) => ccRequest<ControlAuditRow[]>("GET", `${controlPath(code)}/audit`),
  create: (body: ControlRequest) => ccRequest<Control>("POST", "/compliance/controls", { body }),
  /** PUT the tenant DRAFT of a code. */
  update: (code: string, body: ControlRequest) => ccRequest<Control>("PUT", controlPath(code), { body }),
  newVersion: (code: string) => ccRequest<Control>("POST", `${controlPath(code)}/versions`),
  activate: (code: string, version?: number) =>
    ccRequest<Control>("POST", `${controlPath(code)}/activate`, { query: { version: version ? String(version) : undefined } }),
  deprecate: (code: string, version?: number, force?: boolean) =>
    ccRequest<Control>("POST", `${controlPath(code)}/deprecate`, {
      query: { version: version ? String(version) : undefined, force: force ? "true" : undefined },
    }),
  /** POST …/test — evaluates one version on a catalog row (sample) or a hand-written context; persists nothing. */
  test: (code: string, body: { version?: number; sample?: { entitlementId: string }; context?: unknown }) =>
    ccRequest<ControlTestResult>("POST", `${controlPath(code)}/test`, { body }),
};

/**
 * Connection check — the console's app shell calls GET /compliance/lookups/domains
 * on load (and whenever the token or tenant changes) to tell whether the
 * Continuous Compliance service is reachable with the current token.
 */
export const Lookups = {
  domains: () => ccRequest<string[]>("GET", "/compliance/lookups/domains"),
};

/** React Query key for the connection check, shared by every page that shows it. */
export const CC_CONNECTION_KEY = ["continuouscompliance", "lookups", "domains"] as const;
