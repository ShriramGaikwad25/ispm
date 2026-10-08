// =====================================================================
// Continuous Assurance — review forms.
//
// How each kind of finding is resolved: the summary and facts a reviewer
// sees, the fields they fill in, the recommendation, and what each outcome
// does (apply a change through an executor, record a change request, record
// a decision or start a workflow).
//
// Endpoints match the deployed console (graph.keyforge.ai/cc/studio/review-forms):
//   GET /review-forms           → { items, coverage }
//   GET /review-forms/{code}    → the form definition
// Served from sample data while USE_MOCK is true, like the rest of the
// Assurance Events pages.
// =====================================================================

import { assuranceApi } from "@/lib/assurance-api";

const USE_MOCK = true;

export const REVIEW_FORMS_BASE = "/assurance-events/review-forms";

/** Decision a form outcome records (labels as the deployed console shows them). */
export const DECISION_LABEL: Record<string, string> = {
  REMEDIATE: "Fix",
  REVOKE: "Remove access",
  APPROVE_WITH_MITIGATION: "Keep with control",
  ACCEPT_RISK: "Accept risk",
  FALSE_POSITIVE: "Not an issue",
  DEFER: "Defer",
};

export interface ReviewFormField {
  key: string;
  label: string;
  type: string;                                  // TEXT | SELECT | IDENTITY | DATE | …
  options?: { fact?: string; values?: string[] };
  recommend?: { recommender: string };
  default?: string | number | boolean;
  showFor?: string[];                            // outcome codes; empty = all outcomes
}

export interface ReviewFormOutcome {
  code: string;
  label: string;
  decision: string;                              // see DECISION_LABEL
  primary?: boolean;
  fields?: string[];                             // field keys the outcome needs
  action?: { type: string; when?: string };      // applied by its executor, else a change request
  change?: string;                               // change-request type
  workflow?: string;                             // workflow code
  justification?: "required" | "optional";
  expiry?: string;                               // "none" | ISO-8601 max, e.g. P30D
}

export interface ReviewForm {
  code: string;
  name: string;
  purpose?: string;
  eventTypes: string[];                          // "*" = default for any event type
  summary?: string;                              // template, ${…} CEL
  facts?: Array<{ fact: string; label: string }>;
  fields?: ReviewFormField[];
  outcomes: ReviewFormOutcome[];
  recommendation?: { rules: Array<{ when?: string; outcome: string; reason?: string }> };
  bulk?: boolean;
  isActive?: boolean;
  source: "shipped" | "tenant";
  version: number;
  hasShipped?: boolean;
  updatedAt?: string;
}

/** A row of GET /review-forms. */
export interface ReviewFormListItem {
  code: string;
  name: string;
  purpose?: string;
  eventTypes: string[];
  outcomes: string[];                            // outcome labels
  bulk: boolean;
  version: number;
  source: "shipped" | "tenant";
  isActive: boolean;
}

// ---------- Sample data ----------

const MITIGATION_FIELD: ReviewFormField = {
  key: "mitigation", label: "Compensating control", type: "SELECT",
  options: { fact: "definition.allowedMitigations" }, showFor: ["KEEP_WITH_CONTROL"],
};
const END_DATE_FIELD: ReviewFormField = {
  key: "endDate", label: "Review again by", type: "DATE", showFor: ["KEEP_WITH_CONTROL", "ACCEPT_RISK"],
};

const FORMS: ReviewForm[] = [
  {
    code: "DEFAULT", name: "Default review",
    purpose: "Used for any event type without a form of its own: remove the access, keep it with a control, accept the risk, or close it as not an issue.",
    eventTypes: ["*"],
    summary: "${subject.name}: ${definition.name} (${event.severity}).",
    facts: [
      { fact: "subject.name", label: "Subject" },
      { fact: "subject.application", label: "Application" },
      { fact: "event.severity", label: "Severity" },
    ],
    fields: [MITIGATION_FIELD, END_DATE_FIELD],
    outcomes: [
      { code: "REMOVE", label: "Remove access", decision: "REVOKE", primary: true, action: { type: "REVOKE_ACCESS" }, justification: "optional", expiry: "none" },
      { code: "KEEP_WITH_CONTROL", label: "Keep with a control", decision: "APPROVE_WITH_MITIGATION", fields: ["mitigation", "endDate"], justification: "required", expiry: "P90D" },
      { code: "ACCEPT_RISK", label: "Accept the risk", decision: "ACCEPT_RISK", fields: ["endDate"], justification: "required", expiry: "P30D" },
      { code: "NOT_AN_ISSUE", label: "Not an issue", decision: "FALSE_POSITIVE", justification: "required", expiry: "none" },
    ],
    recommendation: { rules: [
      { when: "subject.privileged && finding.daysSinceLastUse > 90", outcome: "REMOVE", reason: "Privileged access unused for more than 90 days." },
      { outcome: "KEEP_WITH_CONTROL" },
    ] },
    bulk: true, isActive: true, source: "shipped", version: 3, hasShipped: true,
  },
  {
    code: "LEAVER_ACCOUNT", name: "Leaver or expired contractor account",
    purpose: "The identity has left (or the contract has ended) but an account is still enabled. Disable it, or record why it must stay.",
    eventTypes: ["LEAVER_ACTIVE_ACCOUNT", "CONTRACTOR_EXPIRED"],
    summary: "${subject.name} left on ${facts['hr.terminationDate']} and still has an enabled account in ${subject.application}.",
    facts: [
      { fact: "hr.status", label: "HR status" },
      { fact: "hr.terminationDate", label: "Termination date" },
      { fact: "account.lastLogin", label: "Last sign-in" },
      { fact: "account.privileged", label: "Privileged" },
    ],
    fields: [
      { key: "newEmployeeId", label: "New employee ID", type: "TEXT", showFor: ["REHIRED"] },
      { key: "endDate", label: "Keep until", type: "DATE", default: "P14D", showFor: ["KEEP_TEMPORARILY"] },
    ],
    outcomes: [
      { code: "DISABLE", label: "Disable the account", decision: "REMEDIATE", primary: true, action: { type: "DISABLE_ACCOUNT" }, justification: "optional", expiry: "none" },
      { code: "REHIRED", label: "Rehired or transferred", decision: "FALSE_POSITIVE", fields: ["newEmployeeId"], justification: "required", expiry: "none" },
      { code: "KEEP_TEMPORARILY", label: "Keep for hand-over", decision: "ACCEPT_RISK", fields: ["endDate"], justification: "required", expiry: "P14D" },
    ],
    recommendation: { rules: [
      { when: "facts['account.lastLogin'] > facts['hr.terminationDate']", outcome: "DISABLE", reason: "The account was used after the termination date." },
      { when: "facts['hr.status'] == 'REHIRED'", outcome: "REHIRED", reason: "HR shows a rehire for the same person." },
      { outcome: "DISABLE" },
    ] },
    bulk: true, isActive: true, source: "shipped", version: 2, hasShipped: true,
  },
  {
    code: "ACCESS_RECERTIFICATION", name: "Access recertification",
    purpose: "Access that may no longer be needed after a move, or a review item that is overdue: confirm it, remove it, or keep it with a control.",
    eventTypes: ["MOVER_STALE_ACCESS", "CERT_OVERDUE", "DORMANT_PRIVILEGED"],
    summary: "${subject.name} still holds ${subject.entitlement} in ${subject.application}; last used ${facts['entitlement.daysSinceLastUse']} days ago.",
    facts: [
      { fact: "entitlement.name", label: "Entitlement" },
      { fact: "entitlement.daysSinceLastUse", label: "Days since last use" },
      { fact: "hr.department", label: "Department" },
      { fact: "hr.previousDepartment", label: "Previous department" },
    ],
    fields: [MITIGATION_FIELD, END_DATE_FIELD],
    outcomes: [
      { code: "REMOVE", label: "Remove access", decision: "REVOKE", primary: true, action: { type: "REVOKE_ACCESS" }, justification: "optional", expiry: "none" },
      { code: "KEEP_WITH_CONTROL", label: "Keep with a control", decision: "APPROVE_WITH_MITIGATION", fields: ["mitigation", "endDate"], justification: "required", expiry: "P180D" },
      { code: "STILL_NEEDED", label: "Still needed", decision: "FALSE_POSITIVE", justification: "required", expiry: "none" },
    ],
    recommendation: { rules: [
      { when: "facts['entitlement.daysSinceLastUse'] > 60", outcome: "REMOVE", reason: "Not used since the move." },
      { when: "facts['hr.department'] == facts['hr.previousDepartment']", outcome: "STILL_NEEDED", reason: "The department did not change." },
      { outcome: "KEEP_WITH_CONTROL" },
    ] },
    bulk: true, isActive: true, source: "shipped", version: 4, hasShipped: true,
  },
  {
    code: "ASSIGN_OWNER", name: "Assign an owner",
    purpose: "A service account or API key has no accountable owner. Assign one, decommission it, or defer while the owner is found.",
    eventTypes: ["NHI_ORPHANED"],
    summary: "${subject.name} (${facts['nhi.kind']}) has no owner; last used ${facts['nhi.lastUsed']}.",
    facts: [
      { fact: "nhi.kind", label: "Kind" },
      { fact: "nhi.lastUsed", label: "Last used" },
      { fact: "nhi.createdBy", label: "Created by" },
    ],
    fields: [
      { key: "owner", label: "New owner", type: "IDENTITY", recommend: { recommender: "nhi-owner-resolver" }, showFor: ["ASSIGN"] },
      { key: "endDate", label: "Find an owner by", type: "DATE", default: "P30D", showFor: ["DEFER"] },
    ],
    outcomes: [
      { code: "ASSIGN", label: "Assign the owner", decision: "REMEDIATE", primary: true, fields: ["owner"], action: { type: "IGA_SET_OWNER" }, justification: "optional", expiry: "none" },
      { code: "DECOMMISSION", label: "Decommission", decision: "REVOKE", action: { type: "DISABLE_ACCOUNT", when: "facts['nhi.lastUsed'] < now - duration('720h')" }, change: "NHI_DECOMMISSION", justification: "required", expiry: "none" },
      { code: "DEFER", label: "Defer", decision: "DEFER", fields: ["endDate"], justification: "required", expiry: "P30D" },
    ],
    recommendation: { rules: [
      { when: "has(facts['nhi.createdBy'])", outcome: "ASSIGN", reason: "The creator is a likely owner." },
      { outcome: "DEFER" },
    ] },
    bulk: false, isActive: true, source: "shipped", version: 1, hasShipped: true,
  },
  {
    code: "ROTATE_CREDENTIAL", name: "Rotate a credential",
    purpose: "A secret, key or token is older than its rotation policy allows.",
    eventTypes: ["CREDENTIAL_ROTATION"],
    summary: "${subject.name} is ${facts['nhi.credentialAgeDays']} days old; policy allows ${facts['nhi.rotationPolicyDays']}.",
    facts: [
      { fact: "nhi.credentialAgeDays", label: "Credential age (days)" },
      { fact: "nhi.rotationPolicyDays", label: "Policy maximum (days)" },
      { fact: "nhi.rotationSupported", label: "Automatic rotation" },
    ],
    fields: [{ key: "endDate", label: "Rotate by", type: "DATE", default: "P7D", showFor: ["ACCEPT_RISK"] }],
    outcomes: [
      { code: "ROTATE", label: "Rotate now", decision: "REMEDIATE", primary: true, action: { type: "ROTATE_CREDENTIAL", when: "facts['nhi.rotationSupported']" }, change: "SECRET_ROTATION", justification: "optional", expiry: "none" },
      { code: "ACCEPT_RISK", label: "Rotate later", decision: "ACCEPT_RISK", fields: ["endDate"], justification: "required", expiry: "P30D" },
    ],
    recommendation: { rules: [{ outcome: "ROTATE", reason: "Every credential past policy should be rotated." }] },
    bulk: true, isActive: true, source: "shipped", version: 1, hasShipped: true,
  },
  {
    code: "SOD_CONFLICT", name: "Segregation-of-duties conflict",
    purpose: "One person can complete both halves of a sensitive process. Remove one role, or keep both with a compensating control approved through a workflow.",
    eventTypes: ["SOD_P2P_CONFLICT"],
    summary: "${subject.name} holds ${facts['sod.roleA']} and ${facts['sod.roleB']}, which conflict under ${facts['sod.rule']}.",
    facts: [
      { fact: "sod.rule", label: "SoD rule" },
      { fact: "sod.roleA", label: "Role A" },
      { fact: "sod.roleB", label: "Role B" },
    ],
    fields: [
      { key: "roleToRemove", label: "Role to remove", type: "SELECT", options: { values: ["Role A", "Role B"] }, showFor: ["REMOVE_ONE"] },
      MITIGATION_FIELD,
      END_DATE_FIELD,
    ],
    outcomes: [
      { code: "REMOVE_ONE", label: "Remove one role", decision: "REVOKE", primary: true, fields: ["roleToRemove"], action: { type: "REVOKE_ACCESS" }, justification: "optional", expiry: "none" },
      { code: "KEEP_WITH_CONTROL", label: "Keep with a control", decision: "APPROVE_WITH_MITIGATION", fields: ["mitigation", "endDate"], workflow: "WF_SOD_EXCEPTION", justification: "required", expiry: "P90D" },
      { code: "NOT_AN_ISSUE", label: "Not an issue", decision: "FALSE_POSITIVE", justification: "required", expiry: "none" },
    ],
    recommendation: { rules: [
      { when: "subject.privileged", outcome: "REMOVE_ONE", reason: "Privileged users should not hold both roles." },
      { outcome: "KEEP_WITH_CONTROL" },
    ] },
    bulk: false, isActive: true, source: "tenant", version: 2, hasShipped: true,
  },
  {
    code: "MFA_ENROLLMENT", name: "MFA enrollment",
    purpose: "An active identity has no MFA factor. Open a ticket for enrollment or record an exemption.",
    eventTypes: ["MFA_NOT_ENROLLED"],
    summary: "${subject.name} has no MFA factor enrolled in ${subject.application}.",
    facts: [{ fact: "account.mfaEnrolled", label: "MFA enrolled" }, { fact: "hr.workerType", label: "Worker type" }],
    fields: [{ key: "endDate", label: "Exempt until", type: "DATE", showFor: ["EXEMPT"] }],
    outcomes: [
      { code: "TICKET", label: "Open an enrollment ticket", decision: "REMEDIATE", primary: true, action: { type: "OPEN_TICKET" }, justification: "optional", expiry: "none" },
      { code: "EXEMPT", label: "Exempt", decision: "ACCEPT_RISK", fields: ["endDate"], justification: "required", expiry: "P90D" },
    ],
    recommendation: { rules: [{ outcome: "TICKET" }] },
    bulk: true, isActive: false, source: "tenant", version: 1, hasShipped: false,
  },
];

const copy = <T,>(v: T): T => structuredClone(v);
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(copy(v)), 150));

const toItem = (f: ReviewForm): ReviewFormListItem => ({
  code: f.code, name: f.name, purpose: f.purpose, eventTypes: f.eventTypes, outcomes: f.outcomes.map((o) => o.label),
  bulk: !!f.bulk, version: f.version, source: f.source, isActive: f.isActive !== false,
});

const mock = {
  list: () => delay({ items: FORMS.map(toItem) }),
  get: async (code: string) => {
    const f = FORMS.find((x) => x.code === code);
    if (!f) throw new Error(`Review form ${code} not found`);
    return delay(f);
  },
};

// ---------- API ----------

export const ReviewForms = {
  list: async (): Promise<{ items: ReviewFormListItem[] }> =>
    USE_MOCK ? mock.list() : assuranceApi.get<{ items: ReviewFormListItem[] }>("/review-forms"),
  get: async (code: string): Promise<ReviewForm> =>
    USE_MOCK ? mock.get(code) : assuranceApi.get<ReviewForm>(`/review-forms/${encodeURIComponent(code)}`),
};
