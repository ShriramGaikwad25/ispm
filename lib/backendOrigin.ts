/** Backend used when no origin is configured (ISPM calls the KeyForge services on preview.keyforge.ai). */
export const DEFAULT_BACKEND_ORIGIN = "https://preview.keyforge.ai";

/**
 * Optional build-time override, e.g. NEXT_PUBLIC_BACKEND_ORIGIN=https://graph.keyforge.ai.
 * Same setting as the First Solar build, where these pages come from.
 */
const CONFIGURED_BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "").trim().replace(/\/+$/, "");

/** Origin of the KeyForge backend services (/kfmailserver, /entities, ...). */
export function getBackendOrigin(): string {
  return CONFIGURED_BACKEND_ORIGIN || DEFAULT_BACKEND_ORIGIN;
}
