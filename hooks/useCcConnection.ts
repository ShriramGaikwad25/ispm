"use client";

import { useQuery } from "@tanstack/react-query";
import { CC_CONNECTION_KEY, Lookups } from "@/lib/controls-api";

/**
 * Continuous Compliance connection check: GET /compliance/lookups/domains,
 * called once per session (cached), the same call the Continuous Compliance
 * Console makes on load. `error` is set when the service cannot be reached or
 * does not accept the signed-in token.
 */
export function useCcConnection() {
  return useQuery({
    queryKey: CC_CONNECTION_KEY,
    queryFn: Lookups.domains,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
