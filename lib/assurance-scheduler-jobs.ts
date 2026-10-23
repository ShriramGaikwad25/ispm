// Jobs on the Assurance Events scheduler (graph.keyforge.ai kfscheduler API),
// and which of them belong to an event definition. The definition editor shows
// its Scheduler tab on an ACTIVE definition when at least one job carries the
// definition's code (e.g. REP010) in its name or group.

import { resolveTenantIdForHeader } from "@/lib/auth";
import { assuranceRequest } from "@/lib/assurance-auth";

export const ASSURANCE_SCHEDULER_ORIGIN = "https://graph.keyforge.ai";

export const ASSURANCE_SCHEDULER_JOBS_KEY = ["assurance-scheduler", "jobs"] as const;

/** The tenant's jobs as "group:job" strings, as the scheduler returns them. */
export async function listAssuranceSchedulerJobs(): Promise<string[]> {
  const data = await assuranceRequest<string[] | { error?: string; message?: string }>(
    `${ASSURANCE_SCHEDULER_ORIGIN}/kfscheduler/api/v1/${encodeURIComponent(resolveTenantIdForHeader())}/jobs`,
  );
  if (!Array.isArray(data)) throw new Error(data?.message || data?.error || "Unexpected scheduler response");
  return data;
}

/**
 * Whether a job name or group carries the code as a whole token: REP010 matches
 * "REP010", "REP010_Daily" and "Reports-REP010", but not "REP0101" or "XREP010".
 */
export function jobMatchesCode(text: string, code: string): boolean {
  const c = code.trim();
  if (!c) return false;
  const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}(?![0-9])`, "i").test(text);
}
