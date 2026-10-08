// =====================================================================
// Continuous Assurance — API client for the Assurance Events pages.
//
// Deliberately separate from the rest of ISPM's API plumbing (lib/api.ts,
// lib/authFetch.ts): authFetch skips these requests entirely, so they carry
// no ISPM JWT and no ISPM token refresh / logout handling.
//
// Mirrors the Continuous Assurance app's client as-is: the service at
// https://graph.keyforge.ai/cc/api/v1/compliance, reached through the
// same-origin proxy app/api/assurance/[...path] (the service does not allow
// browser CORS from ISPM), the same bearer token read
// from localStorage under 'kf.cc.token', and an Idempotency-Key on every write
// so retries are safe. Every request also carries X-Tenant-Id: the active
// tenant, falling back to config.json's tenantId. For local dev you can paste
// a token in the browser console:
//   localStorage.setItem('kf.cc.token', '<jwt>')
// =====================================================================

import { getActiveTenantId } from "@/lib/tenant";
import { tenantId } from "@/lib/config";

export const ASSURANCE_API_BASE_URL =
  process.env.NEXT_PUBLIC_ASSURANCE_API_BASE_URL || "/api/assurance";

const TOKEN_KEY = "kf.cc.token";

/** True for requests to the Continuous Assurance service (used by authFetch to leave them alone). */
export function isAssuranceApiUrl(url: string): boolean {
  if (url.startsWith(ASSURANCE_API_BASE_URL)) return true;
  return typeof window !== "undefined" && url.startsWith(`${window.location.origin}${ASSURANCE_API_BASE_URL}`);
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

async function request<T>(method: string, path: string, params?: QueryParams, body?: unknown): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = `${ASSURANCE_API_BASE_URL}${path}${qs.toString() ? `?${qs}` : ""}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const tenant = getActiveTenantId() || tenantId;
  if (tenant) headers["X-Tenant-Id"] = tenant;
  if (method !== "GET") headers["Idempotency-Key"] = crypto.randomUUID();

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();

  if (!res.ok) {
    let message = `Request failed (${res.status} ${res.statusText})`;
    try {
      const err = JSON.parse(text) as { message?: string };
      if (err.message) message = err.message;
    } catch {
      // not JSON
    }
    throw new Error(message);
  }

  if (!text) return undefined as T;

  // A misconfigured proxy serves the app shell (HTML) for API paths; surface
  // that as a legible error instead of failing on the first array operation.
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("json")) {
    throw new Error(
      `The assurance API returned ${contentType} instead of JSON for ${url}. ` +
        `Check NEXT_PUBLIC_ASSURANCE_API_BASE_URL.`
    );
  }
  return JSON.parse(text) as T;
}

export const assuranceApi = {
  get: <T>(path: string, params?: QueryParams) => request<T>("GET", path, params),
  post: <T>(path: string, body?: unknown, params?: QueryParams) => request<T>("POST", path, params, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, undefined, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, undefined, body),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};
