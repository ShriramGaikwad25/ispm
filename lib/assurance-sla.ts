// =====================================================================
// Continuous Assurance — SLA & escalation policies.
//
// One registry shared by the SLA page (/assurance-events/sla, the same page
// as Settings → Gateway → SLA & Escalation Policies) and the SLA dropdown on
// an event definition's General tab: a policy created on the SLA page can be
// picked by a definition straight away.
//
// Seeded with the gateway page's policies and held in memory while USE_MOCK
// is true; GET/POST /sla-policies is the planned endpoint.
// =====================================================================

import { assuranceApi } from "@/lib/assurance-api";
import type { EscalationStep, EventDefinition } from "@/lib/assurance-events-api";
import { INITIAL_SLA_POLICIES, type SlaPolicy } from "@/components/continuous-compliance/slaEscalationPoliciesData";

export type { SlaPolicy };

const USE_MOCK = true;

let registry: SlaPolicy[] = structuredClone(INITIAL_SLA_POLICIES);

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 150));

export const Slas = {
  list: async (): Promise<SlaPolicy[]> =>
    USE_MOCK ? delay(registry) : assuranceApi.get<SlaPolicy[]>("/sla-policies"),
  /** Adds a policy to the top of the registry (the page lists newest first). */
  create: async (policy: SlaPolicy): Promise<SlaPolicy> => {
    if (!USE_MOCK) return assuranceApi.post<SlaPolicy>("/sla-policies", policy);
    registry = [structuredClone(policy), ...registry];
    return delay(policy);
  },
};

export const SLA_POLICIES_KEY = ["assurance", "sla-policies"] as const;

// ---------- Policy → definition fields ----------

/**
 * "5 business days" → P5D, "3 calendar days" → P3D, "8 business hours" → PT8H.
 * Business vs calendar time is kept on the policy; the definition stores the length.
 */
export function slaToIsoDuration(sla: string): string | null {
  const m = /^\s*(\d+)\s+(business|calendar)?\s*(day|days|hour|hours)\b/i.exec(sla);
  if (!m) return null;
  const n = Number(m[1]);
  return /^hour/i.test(m[3]) ? `PT${n}H` : `P${n}D`;
}

/** First reminder as an escalation step: "Day 3" of a 5-day SLA → 60 %, "50% elapsed" → 50 %. */
function reminderStep(policy: SlaPolicy): EscalationStep | null {
  const pct = /(\d+)\s*%/.exec(policy.reminder);
  if (pct) return { atPercent: Math.min(99, Number(pct[1])), action: "NUDGE", params: { notify: reminderTarget(policy) } };
  const day = /Day\s+(\d+)/i.exec(policy.reminder);
  const total = /(\d+)/.exec(policy.sla);
  if (day && total && Number(total[1]) > 0) {
    const atPercent = Math.max(1, Math.min(99, Math.round((Number(day[1]) / Number(total[1])) * 100)));
    return { atPercent, action: "NUDGE", params: { notify: reminderTarget(policy) } };
  }
  return null;
}

const reminderTarget = (policy: SlaPolicy) => policy.reminder.split("→")[1]?.trim() ?? "";

/** Breach action → the definition's timeout action. */
function timeoutAction(breach: string): string {
  if (/suppress requestability/i.test(breach)) return "QUARANTINE";
  return "ESCALATE";
}

/** The definition fields an SLA policy sets when it is chosen on the General tab. */
export function applySlaPolicy(p: SlaPolicy): Partial<EventDefinition> {
  const step = reminderStep(p);
  return {
    slaPolicyCode: p.id,
    slaDuration: slaToIsoDuration(p.sla) ?? p.sla,
    defaultActionOnTimeout: timeoutAction(p.breach),
    escalationChain: step ? [step] : [],
    slaPolicy: { resolution: "FIRST_MATCH", rules: [] },
  };
}

/** The SLA policy a definition uses (by slaPolicyCode), if any. */
export function matchSlaPolicy(dto: EventDefinition, policies: SlaPolicy[]): SlaPolicy | undefined {
  return dto.slaPolicyCode ? policies.find((p) => p.id === dto.slaPolicyCode) : undefined;
}
