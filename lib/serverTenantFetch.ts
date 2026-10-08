import { cookies, headers } from "next/headers";
import { REGISTERED_APP_COOKIE } from "@/lib/tenant";

const PATCHED = Symbol.for("kf.serverTenantFetchPatched");

function isKeyforgeRequest(input: RequestInfo | URL): boolean {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  return typeof url === "string" && url.includes("keyforge.ai");
}

/**
 * Tenant for the incoming request: the browser's X-Tenant-Id header (set by authFetch),
 * falling back to the registeredAppName cookie. Null outside a request scope.
 */
async function getRequestTenantId(): Promise<string | null> {
  try {
    const fromHeader = (await headers()).get("X-Tenant-Id")?.trim();
    if (fromHeader) return fromHeader;
    return (await cookies()).get(REGISTERED_APP_COOKIE)?.value?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Server-side counterpart of authFetch: forwards X-Tenant-Id on every outgoing
 * Keyforge request made from API routes / server code, unless already set.
 */
export function patchServerFetchWithTenant(): void {
  const g = globalThis as typeof globalThis & { [PATCHED]?: boolean };
  if (g[PATCHED]) return;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isKeyforgeRequest(input)) return originalFetch(input, init);

    const headerBag = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (headerBag.has("X-Tenant-Id")) return originalFetch(input, init);

    const tenantId = await getRequestTenantId();
    if (!tenantId) return originalFetch(input, init);

    headerBag.set("X-Tenant-Id", tenantId);
    return originalFetch(input, { ...init, headers: headerBag });
  }) as typeof globalThis.fetch;

  g[PATCHED] = true;
}
