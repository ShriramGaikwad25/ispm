export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { patchServerFetchWithTenant } = await import("@/lib/serverTenantFetch");
  patchServerFetchWithTenant();
}
