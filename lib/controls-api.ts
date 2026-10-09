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

export interface DetectionFamily { code: string; [key: string]: unknown }
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

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  let url = `${PROXY_BASE}/${encodeURIComponent(tenant())}${path}`;
  const qs = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.append(k, v); });
  const s = qs.toString();
  if (s) url += `?${s}`;
  return url;
}

/** Calls the Continuous Compliance service (through ISPM's proxy) for the signed-in tenant. */
export async function ccRequest<T>(method: string, path: string, opts: { query?: Record<string, string | undefined>; body?: unknown } = {}): Promise<T> {
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

const controlPath = (code: string) => `/compliance/controls/${encodeURIComponent(code)}`;

export const Controls = {
  families: () => ccRequest<{ families?: DetectionFamily[] }>("GET", "/compliance/detection-families"),
  categories: () => ccRequest<ControlCategory[]>("GET", "/compliance/control-categories"),
  list: (q: ControlQuery = {}) =>
    ccRequest<Control[]>("GET", "/compliance/controls", {
      query: { family: q.family, category: q.category, state: q.state, q: q.q },
    }),
  clone: (code: string, body: { code: string; name: string }) =>
    ccRequest<Control>("POST", `${controlPath(code)}/clone`, { body }),
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
