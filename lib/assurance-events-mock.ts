// =====================================================================
// Mock Continuous Assurance backend for the All Events and event detail
// pages, shaped exactly like the real responses. Used while USE_MOCK is
// true in lib/assurance-events-api.ts.
//
// It is a small in-memory store, so the write calls behave like the API:
// a decision moves the event to the status its DECISION_TYPE lookup names,
// suppress / reopen change status, starting a workflow creates a run and
// an approval work item, and deciding that item completes the run. State
// lives until the page is reloaded.
//
// Every read returns a copy: React Query must see a new object to re-render
// after a write.
// =====================================================================

import type {
  AiInsight, ComplianceEvent, Decision, DecisionRequest, DefinitionCreateRequest, DefinitionSummary,
  DefinitionSchedule, DefinitionUsage, DefinitionValidation, DetectionTestResult, GovernanceRule, KillswitchState,
  NotificationsState, SlaPreviewResult, SlaRule,
  EventDefinition, EventListItem,
  EventPage, EventQuery, InstanceDetail, Lookup, Mitigation, Remediation, WorkflowDefinition,
  WorkflowInstance, WorkflowStepInstance, WorkItem,
} from "@/lib/assurance-events-api";
import {
  EXECUTORS, MITIGATION_CONTROLS, NOTIFICATION_PHASES, NOTIFICATION_TEMPLATES, SAMPLE_CATALOG,
  celCompile, celEval, durationMs,
} from "@/lib/assurance-governance-mock";
import { DEFAULT_SCHEDULE, scheduleErrors } from "@/lib/assurance-schedule";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const now = () => new Date().toISOString();
const copy = <T,>(v: T): T => structuredClone(v);
let seq = 1000;
const uuid = () => `00000000-0000-4000-9000-${String(++seq).padStart(12, "0")}`;
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

const REVIEWER_ID = "00000000-0000-4000-a000-000000000001";

// ---------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------

const lookup = (
  domain: string, code: string, displayName: string, sortOrder: number, uiColor: string,
  description?: string, extra: Record<string, unknown> = {},
): Lookup => ({
  lookupId: `${domain}-${code}`,
  tenantId: null,
  domain,
  code,
  locale: "en-US",
  displayName,
  description,
  sortOrder,
  isActive: true,
  isSystem: true,
  metadata: { ui_color: uiColor, ...extra },
});

const LOOKUPS: Record<string, Lookup[]> = {
  SEVERITY: [
    lookup("SEVERITY", "CRITICAL", "Critical", 1, "#DC2626"),
    lookup("SEVERITY", "HIGH", "High", 2, "#EA580C"),
    lookup("SEVERITY", "MEDIUM", "Medium", 3, "#CA8A04"),
    lookup("SEVERITY", "LOW", "Low", 4, "#2563EB"),
  ],
  REVIEWER_STRATEGY: [
    lookup("REVIEWER_STRATEGY", "MANAGER", "Line manager", 1, "#2563EB"),
    lookup("REVIEWER_STRATEGY", "ENTITLEMENT_OWNER", "Entitlement owner", 2, "#7C3AED"),
    lookup("REVIEWER_STRATEGY", "APP_OWNER", "Application owner", 3, "#0F766E"),
    lookup("REVIEWER_STRATEGY", "ROLE", "Role", 4, "#475569"),
    lookup("REVIEWER_STRATEGY", "EXPLICIT_USER", "Explicit user", 5, "#475569"),
  ],
  TIMEOUT_ACTION: [
    lookup("TIMEOUT_ACTION", "ESCALATE", "Escalate", 1, "#EA580C"),
    lookup("TIMEOUT_ACTION", "AUTO_REVOKE", "Auto-revoke", 2, "#DC2626"),
    lookup("TIMEOUT_ACTION", "AUTO_ACCEPT", "Auto-accept", 3, "#16A34A"),
    lookup("TIMEOUT_ACTION", "QUARANTINE", "Quarantine", 4, "#7C3AED"),
    lookup("TIMEOUT_ACTION", "NO_OP", "No action", 5, "#64748B"),
  ],
  DEFINITION_STATE: [
    lookup("DEFINITION_STATE", "DRAFT", "Draft", 1, "#CA8A04"),
    lookup("DEFINITION_STATE", "ACTIVE", "Active", 2, "#16A34A"),
    lookup("DEFINITION_STATE", "DEPRECATED", "Deprecated", 3, "#64748B"),
  ],
  EVENT_STATUS: [
    lookup("EVENT_STATUS", "OPEN", "Open", 1, "#2563EB"),
    lookup("EVENT_STATUS", "IN_REVIEW", "In review", 2, "#7C3AED"),
    lookup("EVENT_STATUS", "DECIDED", "Decided", 3, "#0891B2"),
    lookup("EVENT_STATUS", "MITIGATING", "Mitigating", 4, "#CA8A04"),
    lookup("EVENT_STATUS", "REMEDIATING", "Remediating", 5, "#EA580C"),
    lookup("EVENT_STATUS", "CLOSED", "Closed", 6, "#16A34A"),
    lookup("EVENT_STATUS", "SUPPRESSED", "Suppressed", 7, "#64748B"),
    lookup("EVENT_STATUS", "EXPIRED", "Expired", 8, "#64748B"),
  ],
  DECISION_TYPE: [
    lookup("DECISION_TYPE", "REVOKE", "Revoke", 1, "#DC2626",
      "Remove the access. A remediation is queued to the target system.",
      { moves_to_status: "REMEDIATING" }),
    lookup("DECISION_TYPE", "CERTIFY", "Certify", 2, "#16A34A",
      "The access is appropriate. The event closes.",
      { moves_to_status: "CLOSED" }),
    lookup("DECISION_TYPE", "MITIGATE", "Mitigate", 3, "#CA8A04",
      "Keep the access under one or more compensating controls.",
      { moves_to_status: "MITIGATING", requires_mitigation: true }),
    lookup("DECISION_TYPE", "REMEDIATE", "Remediate", 4, "#EA580C",
      "Fix the underlying condition (rotate, enroll, re-scope).",
      { moves_to_status: "REMEDIATING" }),
    lookup("DECISION_TYPE", "EXCEPTION", "Risk acceptance", 5, "#7C3AED",
      "Accept the risk until a fixed date, after which the event reopens.",
      { moves_to_status: "DECIDED", requires_expiry: true }),
    lookup("DECISION_TYPE", "AUTO_CLOSED", "Auto-closed", 6, "#64748B",
      "Closed by the platform when the condition cleared.",
      { moves_to_status: "CLOSED", system_only: true }),
  ],
  SUBJECT_KIND: [
    lookup("SUBJECT_KIND", "USER", "User", 1, "#2563EB"),
    lookup("SUBJECT_KIND", "SERVICE_ACCOUNT", "Service account", 2, "#7C3AED"),
    lookup("SUBJECT_KIND", "NHI", "Non-human identity", 3, "#7C3AED"),
    lookup("SUBJECT_KIND", "CREDENTIAL", "Credential", 4, "#0891B2"),
    lookup("SUBJECT_KIND", "APPLICATION", "Application", 5, "#0F766E"),
    lookup("SUBJECT_KIND", "ENTITLEMENT_ASSIGNMENT", "Entitlement assignment", 6, "#CA8A04"),
    lookup("SUBJECT_KIND", "ENTITLEMENT", "Entitlement", 7, "#CA8A04"),
    lookup("SUBJECT_KIND", "WORKGROUP", "Workgroup", 8, "#475569"),
    lookup("SUBJECT_KIND", "CERTIFICATION", "Certification", 9, "#475569"),
  ],
  MITIGATION_STATUS: [
    lookup("MITIGATION_STATUS", "PENDING", "Pending", 1, "#CA8A04"),
    lookup("MITIGATION_STATUS", "ACTIVE", "Active", 2, "#16A34A"),
    lookup("MITIGATION_STATUS", "EXPIRED", "Expired", 3, "#64748B"),
    lookup("MITIGATION_STATUS", "REVOKED", "Revoked", 4, "#DC2626"),
  ],
  REMEDIATION_STATUS: [
    lookup("REMEDIATION_STATUS", "QUEUED", "Queued", 1, "#64748B"),
    lookup("REMEDIATION_STATUS", "DISPATCHED", "Dispatched", 2, "#2563EB"),
    lookup("REMEDIATION_STATUS", "COMPLETED", "Completed", 3, "#16A34A"),
    lookup("REMEDIATION_STATUS", "FAILED", "Failed", 4, "#DC2626"),
  ],
  REMEDIATION_MODE: [
    lookup("REMEDIATION_MODE", "AUTO", "Automatic", 1, "#7C3AED"),
    lookup("REMEDIATION_MODE", "MANUAL", "Manual", 2, "#475569"),
    lookup("REMEDIATION_MODE", "TICKET", "Ticket", 3, "#0891B2"),
  ],
  WF_INSTANCE_STATUS: [
    lookup("WF_INSTANCE_STATUS", "RUNNING", "Running", 1, "#2563EB"),
    lookup("WF_INSTANCE_STATUS", "WAITING", "Waiting", 2, "#CA8A04"),
    lookup("WF_INSTANCE_STATUS", "COMPLETED", "Completed", 3, "#16A34A"),
    lookup("WF_INSTANCE_STATUS", "FAILED", "Failed", 4, "#DC2626"),
    lookup("WF_INSTANCE_STATUS", "CANCELLED", "Cancelled", 5, "#64748B"),
  ],
  WF_STEP_STATUS: [
    lookup("WF_STEP_STATUS", "PENDING", "Pending", 1, "#64748B"),
    lookup("WF_STEP_STATUS", "RUNNING", "Running", 2, "#2563EB"),
    lookup("WF_STEP_STATUS", "WAITING", "Waiting", 3, "#CA8A04"),
    lookup("WF_STEP_STATUS", "COMPLETED", "Completed", 4, "#16A34A"),
    lookup("WF_STEP_STATUS", "SKIPPED", "Skipped", 5, "#94A3B8"),
    lookup("WF_STEP_STATUS", "FAILED", "Failed", 6, "#DC2626"),
  ],
};

const decisionMeta = (code: string) =>
  LOOKUPS.DECISION_TYPE.find((l) => l.code === code)?.metadata as Record<string, unknown> | undefined;

// ---------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------

const GENERIC_MITIGATIONS = ["MC_MANAGER_ATTESTATION", "MC_ENHANCED_MONITORING", "MC_TIME_BOUND_ACCESS"];

/** Action type → executor code, per definition (the "Executors" column). */
const ACTION_BINDINGS: Record<string, Record<string, string>> = {
  LEAVER_ACTIVE_ACCOUNT: { DISABLE_ACCOUNT: "okta-lifecycle", REVOKE_ACCESS: "sailpoint-provisioning" },
  CONTRACTOR_EXPIRED: { DISABLE_ACCOUNT: "okta-lifecycle" },
  DORMANT_PRIVILEGED: { DISABLE_ACCOUNT: "aws-iam-executor" },
  CREDENTIAL_ROTATION: { ROTATE_CREDENTIAL: "aws-iam-executor" },
  NHI_ORPHANED: { DISABLE_ACCOUNT: "oci-iam-executor", OPEN_TICKET: "servicenow-itsm" },
  MFA_NOT_ENROLLED: { OPEN_TICKET: "servicenow-itsm" },
};

const DEF_SEEDS: Array<[code: string, name: string, severity: string, description: string, sla: string, mitigations?: string[]]> = [
  ["LEAVER_ACTIVE_ACCOUNT", "Leaver retains active account", "CRITICAL", "A terminated worker still has an enabled account 24 hours after the termination date.", "PT24H"],
  ["MOVER_STALE_ACCESS", "Mover keeps prior department access", "HIGH", "A worker who changed role still holds entitlements from the previous role after 30 days.", "P7D"],
  ["CONTRACTOR_EXPIRED", "Contractor past end date", "HIGH", "A contractor's engagement has ended and the identity is still active.", "P2D"],
  ["DORMANT_PRIVILEGED", "Dormant privileged account", "HIGH", "A privileged account has not been used in 90 days.", "P7D"],
  ["CERT_OVERDUE", "Certification overdue", "MEDIUM", "An access review item is past its due date without a decision.", "P14D"],
  ["SOD_P2P_CONFLICT", "Create vendor and approve payment", "CRITICAL", "One user can both maintain suppliers and approve payments.", "P5D", ["MC_DUAL_APPROVAL", "MC_PAYMENT_REVIEW", "MC_MONTHLY_RECON"]],
  ["NHI_ORPHANED", "Service account without owner", "HIGH", "A service account or API key has no accountable human owner.", "P14D"],
  ["CREDENTIAL_ROTATION", "Credential past rotation policy", "HIGH", "A secret, key or token is older than its rotation policy allows.", "P7D", ["MC_ENHANCED_MONITORING", "MC_IP_ALLOWLIST"]],
  ["WILDCARD_IAM_POLICY", "Wildcard IAM policy", "CRITICAL", "An IAM policy grants all actions on all resources outside break-glass.", "P30D", ["MC_ENHANCED_MONITORING", "MC_SCP_GUARDRAIL"]],
  ["MFA_NOT_ENROLLED", "User without MFA", "HIGH", "An active workforce identity has no MFA factor enrolled.", "P2D"],
  ["PRIV_SESSION_NO_TICKET", "Privileged session without ticket", "MEDIUM", "A privileged session was opened with no linked approved change.", "P2D"],
];

/** Detection schedules, cycled across the seeded definitions. */
const SEED_SCHEDULES: DefinitionSchedule[] = [
  { ...DEFAULT_SCHEDULE, enabled: true, frequency: "DAILY", time: "02:00", timeZone: "UTC" },
  { ...DEFAULT_SCHEDULE, enabled: true, frequency: "WEEKLY", dayOfWeek: 1, time: "06:30", timeZone: "Asia/Kolkata" },
  { ...DEFAULT_SCHEDULE, enabled: true, frequency: "HOURLY", time: "00:15", timeZone: "UTC" },
  { ...DEFAULT_SCHEDULE, enabled: true, mode: "CRON", cronExpression: "0 0 6 ? * MON-FRI", timeZone: "America/New_York" },
  { ...DEFAULT_SCHEDULE, enabled: true, frequency: "MONTHLY", dayOfMonth: 1, time: "03:00", timeZone: "Europe/London" },
  { ...DEFAULT_SCHEDULE, enabled: true, frequency: "ON_DEMAND" },
  { ...DEFAULT_SCHEDULE, enabled: false },
];

/** CEL detection rules for the definitions detected by their own catalog scan. */
const SCAN_RULES: Record<string, string> = {
  LEAVER_ACTIVE_ACCOUNT: "subject.privileged && approvalGroup.activeCount == 0",
  CERT_OVERDUE: "!approvalGroup.configured || approvalGroup.invalidCount > 0",
  WILDCARD_IAM_POLICY: "subject.privileged && subject.riskTier == 'HIGH' && !desc.present",
};

const governanceRules = (code: string): GovernanceRule[] => [
  {
    id: "critical-to-ciso",
    point: "SEVERITY",
    when: "subject.privileged && event.severity == 'HIGH'",
    then: { severity: "CRITICAL" },
  },
  {
    id: "auto-revoke-unused",
    point: "AUTO_REMEDIATION_GATE",
    when: "finding.daysSinceLastUse > 90",
    then: { action: code === "CREDENTIAL_ROTATION" ? "ROTATE_CREDENTIAL" : "DISABLE_ACCOUNT", params: { reason: "${event.code} unused" } },
  },
];

const slaRules = (i: number): SlaRule[] => [
  { id: "critical-24h", priority: 10, when: "event.severity == 'CRITICAL'", sla: { duration: "PT24H", actionOnTimeout: "ESCALATE", onReopen: "RESET" } },
  {
    id: "privileged-48h", priority: 20, when: "subject.privileged", sla: {
      duration: "PT48H", onReopen: i % 2 ? "KEEP" : "RESET",
      escalationChain: [{ atPercent: 50, action: "NUDGE", params: {} }, { atPercent: 90, action: "NOTIFY_CISO", params: {} }],
    },
  },
];

const DEFINITIONS: EventDefinition[] = DEF_SEEDS.map(([code, name, severity, description, sla, mitigations], i) => ({
  definitionId: `00000000-0000-4000-b000-${String(i + 1).padStart(12, "0")}`,
  code,
  eventTypeCode: code,
  name,
  description,
  severity,
  version: 1 + (i % 3),
  state: "ACTIVE",
  ownerPrincipalId: REVIEWER_ID,
  ownerRole: "Compliance",
  reviewerStrategy: i % 2 ? "ENTITLEMENT_OWNER" : "MANAGER",
  reviewerConfig: { fallback: ["APP_OWNER", "COMPLIANCE_QUEUE"] },
  slaDuration: sla,
  escalationChain: [
    { atPercent: 50, action: "NUDGE", params: {} },
    { atPercent: 80, action: "NOTIFY_MANAGER", params: {} },
  ],
  defaultActionOnTimeout: "ESCALATE",
  scope: i % 2 ? { applications: ["Oracle EBS", "Workday"], environments: ["prod"] } : {},
  allowedMitigationCodes: mitigations ?? GENERIC_MITIGATIONS,
  autoRemediationConfig: ACTION_BINDINGS[code]
    ? {
        enabled: i % 2 === 0,
        blastRadiusCap: { affectedPrincipalsLte: 5, affectedAccountsLte: 10 },
        requireChangeWindow: false,
        requireRollbackToken: true,
        actions: Object.keys(ACTION_BINDINGS[code]).map((c) => ({ code: c })),
      }
    : { enabled: false, actions: [] },
  aiInsightConfig: { enabled: true },
  riskAcceptanceConfig: { allowed: true, max_duration: "P30D" },
  evidenceRequirements: { required_fields: ["business_justification"], min_justification_length: 30 },
  createdAt: at(-120 * DAY),
  updatedAt: at(-10 * DAY),
  criteriaDsl: SCAN_RULES[code]
    ? { mode: "CATALOG_SCAN", language: "CEL", expression: SCAN_RULES[code] }
    : { mode: "ASSURANCE_CONTROL" },
  detectorCount: SCAN_RULES[code] ? 0 : 1 + (i % 3),
  governancePolicy: { rules: i % 3 === 1 ? governanceRules(code) : [] },
  slaPolicy: i % 3 === 2
    ? { resolution: i % 2 ? "STRICTEST" : "FIRST_MATCH", rules: slaRules(i) }
    : { resolution: "FIRST_MATCH", rules: [] },
  actionBindings: ACTION_BINDINGS[code] ?? {},
  schedule: SEED_SCHEDULES[i % SEED_SCHEDULES.length],
}));

// A DRAFT v(n+1) next to its ACTIVE version, as left behind by "New version".
DEFINITIONS.push({
  ...structuredClone(DEFINITIONS[0]),
  definitionId: "00000000-0000-4000-b000-000000000100",
  version: DEFINITIONS[0].version + 1,
  state: "DRAFT",
  createdAt: at(-9 * 3_600_000),
  updatedAt: at(-9 * 3_600_000),
});

const defByCode = (code: string) => DEFINITIONS.find((d) => d.code === code)!;

const findDefinition = (id: string) => {
  const d = DEFINITIONS.find((x) => x.definitionId === id);
  if (!d) throw new Error("Definition not found");
  return d;
};

/** Per-definition killswitch: false while automatic actions are paused. */
const KILLSWITCH = new Map<string, boolean>();

/** Domain agent that owns each definition's controls (Usage tab). */
const AGENT_DOMAIN: Record<string, string> = {
  LEAVER_ACTIVE_ACCOUNT: "LIFECYCLE", MOVER_STALE_ACCESS: "LIFECYCLE", CONTRACTOR_EXPIRED: "LIFECYCLE",
  DORMANT_PRIVILEGED: "PRIVILEGE", PRIV_SESSION_NO_TICKET: "PRIVILEGE", CERT_OVERDUE: "REVIEW",
  SOD_P2P_CONFLICT: "SOD", NHI_ORPHANED: "NHI", CREDENTIAL_ROTATION: "NHI",
  WILDCARD_IAM_POLICY: "CLOUD", MFA_NOT_ENROLLED: "AUTH",
};
const FAMILY_OF: Record<string, string> = {
  LIFECYCLE: "Joiner / mover / leaver", PRIVILEGE: "Privileged access", REVIEW: "Access certification",
  SOD: "Segregation of duties", NHI: "Machine identity", CLOUD: "Cloud entitlement", AUTH: "Authentication",
};

const GOVERNANCE_POINTS = ["SEVERITY", "AUTO_REMEDIATION_GATE", "AUTO_DECISION", "REVIEWER"];

/** The checks the server runs on write. Activation is refused while any error remains. */
function validate(d: EventDefinition): DefinitionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const compiles = (what: string, expr: string | undefined) => {
    try {
      celCompile(expr ?? "");
    } catch (e) {
      errors.push(`${what}: ${(e as Error).message}`);
    }
  };
  const checkExecutor = (where: string, action: string, code: string) => {
    const ex = EXECUTORS.find((x) => x.executor_code === code);
    if (!ex) return errors.push(`${where}: executor "${code}" does not exist`);
    if (ex.state !== "ACTIVE") return errors.push(`${where}: executor "${code}" is ${ex.state}, not ACTIVE`);
    if (action !== "*" && !ex.supports.includes(action)) return errors.push(`${where}: executor "${code}" does not support ${action}`);
    if (ex.paused) warnings.push(`${where}: executor "${code}" is paused; its actions queue until it resumes`);
  };

  if (durationMs(d.slaDuration) === null) errors.push(`Default SLA "${d.slaDuration}" is not an ISO-8601 duration`);
  (d.escalationChain ?? []).forEach((s, i) => {
    if (!(s.atPercent >= 1 && s.atPercent <= 100)) errors.push(`Escalation step ${i + 1}: percent must be 1–100`);
  });

  const mode = d.criteriaDsl?.mode ?? "ASSURANCE_CONTROL";
  if (mode === "CATALOG_SCAN") compiles("Detection rule", d.criteriaDsl?.expression);
  else if (!d.detectorCount) warnings.push(`No agent control raises ${d.code} yet, so no findings will be produced.`);

  const bindings = d.actionBindings ?? {};
  (d.governancePolicy?.rules ?? []).forEach((r, i) => {
    const where = `Governance rule ${r.id || i + 1}`;
    if (!GOVERNANCE_POINTS.includes(r.point)) errors.push(`${where}: unknown point ${r.point}`);
    compiles(where, r.when);
    const action = typeof r.then?.action === "string" ? r.then.action : undefined;
    if (action) {
      const exec = (r.then.executor as string | undefined) || bindings[action] || bindings["*"];
      if (exec) checkExecutor(where, action, exec);
      else if (!action.startsWith("IGA_")) warnings.push(`${where}: ${action} has no binding and uses the action type's default executor`);
    }
  });

  (d.slaPolicy?.rules ?? []).forEach((r, i) => {
    const where = `SLA condition ${r.id || i + 1}`;
    compiles(where, r.when);
    if (!r.sla?.duration && !r.sla?.dueAt) errors.push(`${where}: needs a duration or an absolute due`);
    if (r.sla?.duration && durationMs(r.sla.duration) === null) errors.push(`${where}: "${r.sla.duration}" is not an ISO-8601 duration`);
  });

  Object.entries(bindings).forEach(([action, code]) => {
    if (!code) warnings.push(`Binding ${action}: no executor chosen`);
    else checkExecutor(`Binding ${action}`, action, code);
  });

  if (d.schedule) scheduleErrors(d.schedule).forEach((e) => errors.push(`Schedule: ${e}`));

  if (!d.allowedMitigationCodes?.length) warnings.push("No mitigations allowed: APPROVE_WITH_MITIGATION is unavailable.");
  const auto = d.autoRemediationConfig as { enabled?: boolean; actions?: unknown[] };
  if (auto?.enabled && !auto.actions?.length) warnings.push("Auto-remediation is enabled but no actions are allowed.");
  return { errors, warnings };
}

// ---------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------

const DETECTOR_SOURCE: Record<string, string> = {
  LEAVER_ACTIVE_ACCOUNT: "workday+okta",
  MOVER_STALE_ACCESS: "workday+oracle-ebs",
  CONTRACTOR_EXPIRED: "workday+okta",
  DORMANT_PRIVILEGED: "okta+aws-iam",
  CERT_OVERDUE: "sailpoint",
  SOD_P2P_CONFLICT: "oracle-ebs",
  NHI_ORPHANED: "oci-iam",
  CREDENTIAL_ROTATION: "aws-iam",
  WILDCARD_IAM_POLICY: "aws-iam",
  MFA_NOT_ENROLLED: "okta",
  PRIV_SESSION_NO_TICKET: "cyberark+servicenow",
};

function evidenceFor(code: string, subject: Record<string, string>, discoveredAt: string): Record<string, unknown> {
  switch (code) {
    case "LEAVER_ACTIVE_ACCOUNT":
      return { hr_termination_date: at(-3 * DAY).slice(0, 10), account_status: "ENABLED", target_system: "Okta", last_login: at(-2 * DAY) };
    case "MOVER_STALE_ACCESS":
      return { previous_department: "Accounts Payable", current_department: "Treasury", role_change_date: at(-35 * DAY).slice(0, 10), entitlement: subject.name };
    case "CONTRACTOR_EXPIRED":
      return { engagement_end_date: at(-1 * DAY).slice(0, 10), sponsor: "Laura Chen", identity_status: "ACTIVE" };
    case "DORMANT_PRIVILEGED":
      return { privileged_roles: ["Administrator"], last_authentication: at(-104 * DAY), threshold_days: 90 };
    case "CERT_OVERDUE":
      return { campaign: subject.name, items_pending: 14, items_total: 212, due_date: at(-3 * DAY).slice(0, 10) };
    case "SOD_P2P_CONFLICT":
      return { rule: "P2P-01 Supplier maintenance vs. payment approval", side_a: "AP Supplier Maintenance", side_b: "AP Payment Approver", ledger: "US Primary" };
    case "NHI_ORPHANED":
      return { created_by: "terraform", compartment: "analytics", owner: null, last_used: at(-6 * DAY) };
    case "CREDENTIAL_ROTATION":
      return { credential_age_days: 412, policy_max_days: 90, credential_type: "ACCESS_KEY" };
    case "WILDCARD_IAM_POLICY":
      return { policy: "DataLakeFullAccess", statement: { Effect: "Allow", Action: "*", Resource: "*" }, attached_to: ["role/etl-prod"] };
    case "MFA_NOT_ENROLLED":
      return { factors_enrolled: 0, last_login: at(-1 * DAY), grace_period_ends: at(1 * DAY).slice(0, 10) };
    case "PRIV_SESSION_NO_TICKET":
      return { session_id: "PSM-88213", target: "prod-db-01", started_at: discoveredAt, duration_minutes: 47, ticket: null };
    default:
      return {};
  }
}

type EventSeed = [
  code: string, severity: string, status: string, subjectKind: string, subject: Record<string, string>,
  discoveredAgo: number, dueIn: number, escalation: number, risk?: number, ai?: string,
];

const EVENT_SEEDS: EventSeed[] = [
  ["LEAVER_ACTIVE_ACCOUNT", "CRITICAL", "OPEN", "USER", { name: "Priya Raman", id: "E10482" }, 2 * HOUR, 22 * HOUR, 0, 92, "REVOKE"],
  ["LEAVER_ACTIVE_ACCOUNT", "CRITICAL", "IN_REVIEW", "USER", { name: "Marcus Lee", id: "E10377" }, 3 * DAY, -1 * DAY, 1, 88, "REVOKE"],
  ["MOVER_STALE_ACCESS", "HIGH", "OPEN", "ENTITLEMENT_ASSIGNMENT", { name: "AP Invoice Approver", account: "jdoe" }, 1 * DAY, 6 * DAY, 0, 71, "REVOKE"],
  ["MOVER_STALE_ACCESS", "MEDIUM", "DECIDED", "ENTITLEMENT_ASSIGNMENT", { name: "GL Journal Entry", account: "asmith" }, 9 * DAY, 2 * DAY, 0, 54, "EXCEPTION"],
  ["CONTRACTOR_EXPIRED", "HIGH", "OPEN", "USER", { name: "Daniel Ortiz", id: "C2291" }, 5 * HOUR, 2 * DAY, 0, 76, "REVOKE"],
  ["DORMANT_PRIVILEGED", "HIGH", "REMEDIATING", "SERVICE_ACCOUNT", { name: "svc-backup-admin" }, 6 * DAY, 1 * DAY, 0, 81, "REMEDIATE"],
  ["DORMANT_PRIVILEGED", "MEDIUM", "OPEN", "USER", { name: "Helen Zhao", id: "E09811" }, 12 * HOUR, 5 * DAY, 0, 58],
  ["CERT_OVERDUE", "MEDIUM", "IN_REVIEW", "CERTIFICATION", { name: "Q3 Finance Apps Review" }, 15 * DAY, -3 * DAY, 2, 62],
  ["CERT_OVERDUE", "LOW", "OPEN", "CERTIFICATION", { name: "Q3 Engineering Review" }, 4 * DAY, 3 * DAY, 0, 35],
  ["SOD_P2P_CONFLICT", "CRITICAL", "MITIGATING", "USER", { name: "Robert Kim", id: "E10022" }, 8 * DAY, 4 * DAY, 0, 95, "MITIGATE"],
  ["SOD_P2P_CONFLICT", "CRITICAL", "OPEN", "USER", { name: "Anita Desai", id: "E10561" }, 1 * HOUR, 2 * DAY, 0, 90, "MITIGATE"],
  ["NHI_ORPHANED", "HIGH", "OPEN", "NHI", { name: "oci-reporting-bot" }, 2 * DAY, 12 * DAY, 0, 67, "REMEDIATE"],
  ["NHI_ORPHANED", "MEDIUM", "IN_REVIEW", "NHI", { name: "aws-etl-runner" }, 10 * DAY, -2 * DAY, 1, 59],
  ["CREDENTIAL_ROTATION", "HIGH", "REMEDIATING", "CREDENTIAL", { name: "ebs-integration-key" }, 7 * DAY, 3 * DAY, 0, 73, "REMEDIATE"],
  ["WILDCARD_IAM_POLICY", "CRITICAL", "OPEN", "APPLICATION", { name: "prod-data-lake" }, 6 * HOUR, 29 * DAY, 0, 87, "REMEDIATE"],
  ["MFA_NOT_ENROLLED", "HIGH", "OPEN", "USER", { name: "Tomás García", id: "E10611" }, 20 * HOUR, 1 * DAY, 0, 70, "REMEDIATE"],
  ["MFA_NOT_ENROLLED", "HIGH", "DECIDED", "USER", { name: "Grace Okafor", id: "E10432" }, 4 * DAY, 2 * DAY, 0, 68, "EXCEPTION"],
  ["PRIV_SESSION_NO_TICKET", "MEDIUM", "IN_REVIEW", "WORKGROUP", { name: "DBA On-call" }, 2 * DAY, 18 * HOUR, 0, 55],
  ["LEAVER_ACTIVE_ACCOUNT", "CRITICAL", "CLOSED", "USER", { name: "Sam Patel", id: "E10199" }, 20 * DAY, -15 * DAY, 0, 90, "REVOKE"],
  ["CERT_OVERDUE", "LOW", "SUPPRESSED", "CERTIFICATION", { name: "Q2 HR Systems Review" }, 40 * DAY, -20 * DAY, 0, 30],
];

const eventId = (i: number) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
const subjectId = (prefix: string, i: number) => `00000000-0000-4000-${prefix}-${String(i + 1).padStart(12, "0")}`;

const EVENTS: ComplianceEvent[] = EVENT_SEEDS.map(
  ([code, severity, status, subjectKind, subject, discoveredAgo, dueIn, escalation, risk, ai], i) => {
    const def = defByCode(code);
    const discoveredAt = at(-discoveredAgo);
    const isUser = subjectKind === "USER";
    const isNhi = ["NHI", "SERVICE_ACCOUNT", "CREDENTIAL"].includes(subjectKind);
    return {
      eventId: eventId(i),
      definitionId: def.definitionId,
      definitionVersion: def.version,
      eventTypeCode: code,
      severity,
      status,
      subjectKind,
      subjectUserId: isUser ? subjectId("c001", i) : undefined,
      subjectAccountId: isUser || subjectKind === "ENTITLEMENT_ASSIGNMENT" ? subjectId("c002", i) : undefined,
      subjectApplicationId: subjectKind === "APPLICATION" ? subjectId("c003", i) : undefined,
      subjectEntitlementId: subjectKind === "ENTITLEMENT_ASSIGNMENT" ? subjectId("c004", i) : undefined,
      subjectNhiId: isNhi ? subjectId("c005", i) : undefined,
      subjectDescriptor: subject,
      scopeSnapshot: {},
      discoveredAt,
      dueAt: at(dueIn),
      closedAt: status === "CLOSED" ? at(-16 * DAY) : undefined,
      escalationLevel: escalation,
      reviewerPrincipalId: REVIEWER_ID,
      reviewerResolvedVia: "MANAGER",
      reviewerAssignedAt: discoveredAt,
      riskScore: risk,
      aiRecommendedDecision: ai,
      correlationKey: `${code}:${subject.id ?? subject.account ?? subject.name}`,
      reopenCount: 0,
      evidence: evidenceFor(code, subject, discoveredAt),
      detectorSource: DETECTOR_SOURCE[code] ?? "detector",
    };
  }
);

const findEvent = (id: string) => {
  const e = EVENTS.find((x) => x.eventId === id);
  if (!e) throw new Error("Event not found");
  return e;
};

// ---------------------------------------------------------------------
// Decisions, mitigations, remediations (seeded for events already past review)
// ---------------------------------------------------------------------

const DECISIONS = new Map<string, Decision[]>();
const MITIGATIONS = new Map<string, Mitigation[]>();
const REMEDIATIONS = new Map<string, Remediation[]>();

const push = <T,>(m: Map<string, T[]>, k: string, v: T) => m.set(k, [...(m.get(k) ?? []), v]);

function seedDecision(i: number, decisionType: string, justification: string, decidedAgo: number, expiresIn?: number) {
  const d: Decision = {
    decisionId: uuid(),
    decisionType,
    justification,
    evidenceRefs: [],
    expiresAt: expiresIn ? at(expiresIn) : undefined,
    decidedByPrincipalId: REVIEWER_ID,
    decidedByRole: "Line manager",
    decidedAt: at(-decidedAgo),
  };
  push(DECISIONS, eventId(i), d);
  EVENTS[i].currentDecisionId = d.decisionId;
  return d;
}

function remediation(decisionAgo: number, actionTypeCode: string, connector: string, status: string,
                     extra: Partial<Remediation> = {}): Remediation {
  return {
    remediationId: uuid(),
    actionTypeCode,
    mode: "AUTO",
    targetConnector: connector,
    targetDescriptor: {},
    status,
    queuedAt: at(-decisionAgo),
    dispatchedAt: status === "QUEUED" ? undefined : at(-decisionAgo + HOUR),
    completedAt: status === "COMPLETED" ? at(-decisionAgo + 2 * HOUR) : undefined,
    attempts: 1,
    rollbackAvailable: true,
    ...extra,
  };
}

seedDecision(3, "EXCEPTION", "Covering Treasury close until the replacement starts. Reviewed with the controller.", 2 * DAY, 30 * DAY);
seedDecision(16, "EXCEPTION", "Hardware token on order; enrolling as soon as it arrives.", 3 * DAY, 14 * DAY);
{
  const d = seedDecision(9, "MITIGATE", "Needed for quarter-end vendor onboarding. Dual approval applied to all payments.", 6 * DAY);
  push(MITIGATIONS, eventId(9), {
    mitigationId: uuid(), decisionId: d.decisionId, controlCode: "MC_DUAL_APPROVAL", parameters: { threshold_usd: 10000 },
    status: "ACTIVE", activatedAt: at(-6 * DAY), expiresAt: at(84 * DAY), verifiedAt: at(-5 * DAY),
  });
  push(MITIGATIONS, eventId(9), {
    mitigationId: uuid(), decisionId: d.decisionId, controlCode: "MC_MONTHLY_RECON", parameters: {},
    status: "PENDING", expiresAt: at(84 * DAY),
  });
}
seedDecision(5, "REMEDIATE", "No longer needed after the backup migration.", 1 * DAY);
push(REMEDIATIONS, eventId(5), remediation(DAY, "DISABLE_ACCOUNT", "aws-iam", "DISPATCHED", { blastRadiusEstimate: 3 }));
seedDecision(13, "REMEDIATE", "Rotate the key and update the EBS integration.", 5 * DAY);
push(REMEDIATIONS, eventId(13), remediation(5 * DAY, "ROTATE_CREDENTIAL", "aws-iam", "FAILED", {
  attempts: 3, failureReason: "Key is in use by 2 running jobs", blastRadiusEstimate: 2,
}));
seedDecision(18, "REVOKE", "Confirmed termination with HR.", 17 * DAY);
push(REMEDIATIONS, eventId(18), remediation(17 * DAY, "DISABLE_ACCOUNT", "okta", "COMPLETED", { blastRadiusEstimate: 1 }));

// ---------------------------------------------------------------------
// AI insight
// ---------------------------------------------------------------------

const RATIONALE: Record<string, string> = {
  REVOKE: "The access no longer matches the subject's current role and has had no legitimate use since the triggering change. Peers in the current role do not hold it.",
  MITIGATE: "The access is needed for an active business process, but the conflict is material. A compensating control keeps the process running while limiting exposure.",
  REMEDIATE: "The condition can be fixed at the source without removing the access, and the fix has a small, known blast radius.",
  EXCEPTION: "The risk is real but time-bound, and the owner has a dated plan to close it. A risk acceptance with an expiry is proportionate.",
  CERTIFY: "Usage, peers and role all support the access.",
};

const INSIGHTS = new Map<string, AiInsight>();

function buildInsight(e: ComplianceEvent, version: string): AiInsight {
  const decision = e.aiRecommendedDecision ?? "REVOKE";
  const n = parseInt(e.eventId.slice(-2), 10);
  const def = DEFINITIONS.find((d) => d.definitionId === e.definitionId);
  return {
    insightId: uuid(),
    modelVersion: version,
    generatedAt: now(),
    riskScore: e.riskScore,
    confidence: 0.7 + (n % 5) * 0.05,
    recommendedDecision: decision,
    recommendedMitigations: decision === "MITIGATE" ? def?.allowedMitigationCodes.slice(0, 2) : undefined,
    rationale: RATIONALE[decision],
    peerAnalysis: e.subjectKind === "USER" || e.subjectKind === "ENTITLEMENT_ASSIGNMENT"
      ? { peerCount: 20 + n * 3, withEntitlementPct: (n * 7) % 30, comparableRoles: ["Financial Analyst", "Treasury Analyst"] }
      : undefined,
    usageSignal: { lastUsedAt: at(-(n + 3) * DAY), sessions12m: (n * 11) % 60, anomalyScore: (n % 7) / 10 },
    blastRadius: { affectedCount: 1 + (n % 4), transitivelyGrants: ["AP_SUPPLIER_MAINT", "AP_PAYMENTS", "GL_READ", "PO_APPROVE"].slice(0, 1 + (n % 4)) },
    similarPastDecisions: [
      { eventId: uuid(), decisionType: decision, outcome: "Closed within SLA" },
      { eventId: uuid(), decisionType: decision, outcome: "No recurrence in 90 days" },
    ],
    toxicComboFindings: e.eventTypeCode === "SOD_P2P_CONFLICT"
      ? [{ rule: "P2P-01 Supplier maintenance vs. payment approval" }, { rule: "P2P-04 Bank details change vs. payment release" }]
      : undefined,
  };
}

EVENTS.filter((e) => e.aiRecommendedDecision).forEach((e) => {
  const i = buildInsight(e, "kf-risk-2026.09");
  i.generatedAt = e.discoveredAt;
  INSIGHTS.set(e.eventId, i);
});

// ---------------------------------------------------------------------
// Workflows, instances, work items
// ---------------------------------------------------------------------

const WF_STEPS = {
  start: "notify_owner",
  steps: [
    { key: "notify_owner", name: "Notify owner", type: "NOTIFY", config: {} },
    { key: "manager_approval", name: "Manager approval", type: "APPROVAL", config: {} },
    { key: "apply_decision", name: "Apply decision", type: "ACTION", config: {} },
  ],
};

const WORKFLOWS: WorkflowDefinition[] = [
  ["WF_CRITICAL_APPROVAL", "Critical event approval", "ACTIVE"],
  ["WF_LEAVER_REVOKE", "Leaver auto-revoke", "ACTIVE"],
  ["WF_SOD_EXCEPTION", "SoD exception review", "DRAFT"],
].map(([code, name, state], i) => ({
  workflowId: `00000000-0000-4000-d000-${String(i + 1).padStart(12, "0")}`,
  code,
  name,
  version: 1,
  state,
  triggerType: "MANUAL",
  triggerConfig: {},
  steps: WF_STEPS,
  createdAt: at(-60 * DAY),
  updatedAt: at(-30 * DAY),
}));

const INSTANCES: WorkflowInstance[] = [];
const STEPS = new Map<string, WorkflowStepInstance[]>();
const WORK_ITEMS: WorkItem[] = [];

function startInstance(wf: WorkflowDefinition, evId: string, startedAgo: number, finished: boolean): WorkflowInstance {
  const instanceId = uuid();
  const startedAt = at(-startedAgo);
  const inst: WorkflowInstance = {
    instanceId,
    workflowId: wf.workflowId,
    workflowCode: wf.code,
    workflowVersion: wf.version,
    eventId: evId,
    status: finished ? "COMPLETED" : "WAITING",
    currentStepKey: finished ? undefined : "manager_approval",
    context: {},
    startedAt,
    completedAt: finished ? at(-startedAgo + DAY) : undefined,
  };
  const step = (stepKey: string, stepType: string, status: string, outcome?: string): WorkflowStepInstance => ({
    stepInstanceId: uuid(), instanceId, stepKey, stepType, status, outcome, output: {}, startedAt,
    completedAt: status === "COMPLETED" ? startedAt : undefined,
  });
  const steps = [
    step("notify_owner", "NOTIFY", "COMPLETED", "SENT"),
    step("manager_approval", "APPROVAL", finished ? "COMPLETED" : "WAITING", finished ? "APPROVED" : undefined),
    step("apply_decision", "ACTION", finished ? "COMPLETED" : "PENDING", finished ? "APPLIED" : undefined),
  ];
  INSTANCES.push(inst);
  STEPS.set(instanceId, steps);
  if (!finished) {
    const ev = findEvent(evId);
    WORK_ITEMS.push({
      workItemId: uuid(),
      instanceId,
      stepInstanceId: steps[1].stepInstanceId,
      eventId: evId,
      title: `Approve: ${defByCode(ev.eventTypeCode).name} — ${String(ev.subjectDescriptor.name ?? "")}`,
      assigneePrincipalId: REVIEWER_ID,
      assigneeResolvedVia: "manager",
      dueAt: ev.dueAt,
      status: "OPEN",
      createdAt: startedAt,
    });
  }
  return inst;
}

startInstance(WORKFLOWS[1], eventId(1), 2 * DAY, false);  // Marcus Lee — pending approval
startInstance(WORKFLOWS[0], eventId(9), 7 * DAY, true);   // Robert Kim — completed
startInstance(WORKFLOWS[0], eventId(12), 3 * DAY, false); // aws-etl-runner — pending approval

// ---------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------

function toListItem(e: ComplianceEvent): EventListItem {
  const def = DEFINITIONS.find((d) => d.definitionId === e.definitionId);
  return {
    eventId: e.eventId,
    severity: e.severity,
    status: e.status,
    eventTypeCode: e.eventTypeCode,
    definitionCode: def?.code ?? e.eventTypeCode,
    definitionName: def?.name ?? e.eventTypeCode,
    subjectKind: e.subjectKind,
    subjectDescriptor: e.subjectDescriptor,
    discoveredAt: e.discoveredAt,
    dueAt: e.dueAt,
    escalationLevel: e.escalationLevel,
    reviewerPrincipalId: e.reviewerPrincipalId,
    riskScore: e.riskScore,
    aiRecommendedDecision: e.aiRecommendedDecision,
  };
}

const CLOSED = ["CLOSED", "SUPPRESSED", "MERGED", "EXPIRED"];

export const mock = {
  lookups: (domain: string) => delay(copy(LOOKUPS[domain] ?? [])),

  /** Same filters and paging as GET /events, soonest due first. */
  eventList: (q: EventQuery): Promise<EventPage> => {
    const filtered = EVENTS
      .filter((e) => !q.status?.length || q.status.includes(e.status))
      .filter((e) => !q.severity?.length || q.severity.includes(e.severity))
      .filter((e) => !q.eventTypeCodes?.length || q.eventTypeCodes.includes(e.eventTypeCode))
      .filter((e) => !q.dueBefore || e.dueAt < q.dueBefore)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const page = q.page ?? 0;
    const size = q.pageSize ?? 50;
    return delay(copy({ items: filtered.slice(page * size, (page + 1) * size).map(toListItem), total: filtered.length }));
  },

  event: async (id: string) => delay(copy(findEvent(id))),
  decisions: async (id: string) =>
    delay(copy([...(DECISIONS.get(id) ?? [])].sort((a, b) => b.decidedAt.localeCompare(a.decidedAt)))),
  mitigations: async (id: string) => delay(copy(MITIGATIONS.get(id) ?? [])),
  remediations: async (id: string) => delay(copy(REMEDIATIONS.get(id) ?? [])),
  insight: async (id: string) => delay(copy(INSIGHTS.get(id) ?? null)),

  refreshInsight: async (id: string) => {
    const i = buildInsight(findEvent(id), "kf-risk-2026.10");
    INSIGHTS.set(id, i);
    return delay(copy(i));
  },

  decide: async (id: string, body: DecisionRequest): Promise<Decision> => {
    const e = findEvent(id);
    const meta = decisionMeta(body.decisionType);
    if (!meta) throw new Error(`Unknown decision type ${body.decisionType}`);
    if (CLOSED.includes(e.status)) throw new Error(`Event is ${e.status.toLowerCase()}; reopen it first.`);
    if (meta.system_only) throw new Error("This decision type is reserved for the platform.");
    if (meta.requires_mitigation && !body.mitigations?.length) throw new Error("At least one mitigation is required.");
    if (meta.requires_mitigation && body.mitigations?.some((m) => !m.controlCode)) throw new Error("Choose a control for every mitigation.");
    if (meta.requires_expiry && !body.expiresAt) throw new Error("An expiry date is required for a risk acceptance.");

    const prev = e.currentDecisionId;
    const d: Decision = {
      decisionId: uuid(),
      decisionType: body.decisionType,
      justification: body.justification,
      evidenceRefs: body.evidenceRefs ?? [],
      expiresAt: body.expiresAt,
      decidedByPrincipalId: REVIEWER_ID,
      decidedByRole: "reviewer",
      decidedAt: now(),
    };
    DECISIONS.get(id)?.forEach((x) => { if (x.decisionId === prev) x.supersededBy = d.decisionId; });
    push(DECISIONS, id, d);

    for (const m of body.mitigations ?? []) {
      push(MITIGATIONS, id, {
        mitigationId: uuid(), decisionId: d.decisionId, controlCode: m.controlCode, parameters: m.parameters ?? {},
        status: "PENDING", expiresAt: m.expiresAt,
      });
    }
    if (body.decisionType === "REVOKE" || body.decisionType === "REMEDIATE") {
      const action = body.decisionType === "REVOKE" ? "REVOKE_ACCESS"
        : e.subjectKind === "CREDENTIAL" ? "ROTATE_CREDENTIAL" : "REMEDIATE";
      push(REMEDIATIONS, id, remediation(0, action, e.detectorSource.split("+").pop()!, "QUEUED", { dispatchedAt: undefined }));
    }

    e.currentDecisionId = d.decisionId;
    e.status = String(meta.moves_to_status ?? "DECIDED");
    if (e.status === "CLOSED") e.closedAt = now();
    return delay(copy(d));
  },

  reopen: async (id: string) => {
    const e = findEvent(id);
    e.status = "OPEN";
    e.closedAt = undefined;
    e.reopenCount += 1;
    return delay(copy(e));
  },

  suppress: async (id: string) => {
    const e = findEvent(id);
    e.status = "SUPPRESSED";
    return delay(copy(e));
  },

  definition: async (id: string) => {
    const d = DEFINITIONS.find((x) => x.definitionId === id);
    if (!d) throw new Error("Definition not found");
    return delay(copy(d));
  },

  /** GET /definitions — summary rows, as the deployed console's list consumes them. */
  definitions: async (): Promise<DefinitionSummary[]> => {
    const open = (id: string) =>
      EVENTS.filter((e) => e.definitionId === id && !["CLOSED", "SUPPRESSED", "EXPIRED"].includes(e.status)).length;
    const rows = DEFINITIONS
      .map((d): DefinitionSummary => ({
        definitionId: d.definitionId,
        code: d.code,
        name: d.name,
        eventTypeCode: d.eventTypeCode,
        severity: d.severity,
        version: d.version,
        state: d.state,
        detectionMode: d.criteriaDsl?.mode ?? "ASSURANCE_CONTROL",
        controls: d.detectorCount ?? 0,
        governanceRules: d.governancePolicy?.rules.length ?? 0,
        slaConditions: d.slaPolicy?.rules?.length ?? 0,
        slaResolution: d.slaPolicy?.resolution ?? "FIRST_MATCH",
        slaDuration: d.slaDuration,
        executors: [...new Set(Object.values(d.actionBindings ?? {}))],
        openFindings: open(d.definitionId),
        updatedAt: d.updatedAt,
      }))
      .sort((a, b) => a.code.localeCompare(b.code) || b.version - a.version);
    return delay(rows);
  },

  /** POST /definitions — creates version 1 as a DRAFT. */
  createDefinition: async (req: DefinitionCreateRequest) => {
    if (DEFINITIONS.some((d) => d.code === req.code)) throw new Error(`A definition with code ${req.code} already exists.`);
    const ts = new Date().toISOString();
    const d: EventDefinition = {
      definitionId: crypto.randomUUID(),
      code: req.code,
      eventTypeCode: req.eventTypeCode,
      name: req.name,
      severity: req.severity,
      version: 1,
      state: "DRAFT",
      ownerPrincipalId: REVIEWER_ID,
      reviewerStrategy: req.reviewerStrategy,
      reviewerConfig: req.reviewerConfig,
      slaDuration: req.slaDuration,
      defaultActionOnTimeout: req.defaultActionOnTimeout,
      scope: req.scope,
      allowedMitigationCodes: req.allowedMitigationCodes,
      autoRemediationConfig: req.autoRemediationConfig,
      aiInsightConfig: req.aiInsightConfig,
      riskAcceptanceConfig: req.riskAcceptanceConfig,
      evidenceRequirements: req.evidenceRequirements,
      createdAt: ts,
      updatedAt: ts,
      escalationChain: req.escalationChain,
      criteriaDsl: req.criteriaDsl,
      detectorCount: 0,
      governancePolicy: req.governancePolicy,
      slaPolicy: req.slaPolicy,
      actionBindings: req.actionBindings,
    };
    DEFINITIONS.push(d);
    return delay(copy(d));
  },

  /** PUT /definitions/{id} — saves a DRAFT; identity, version and state are not editable. */
  updateDefinition: async (id: string, dto: EventDefinition) => {
    const d = findDefinition(id);
    if (d.state !== "DRAFT") throw new Error(`${d.code} v${d.version} is ${d.state}; cut a new version to change it.`);
    Object.assign(d, copy(dto), {
      definitionId: d.definitionId, code: d.code, version: d.version, state: d.state,
      createdAt: d.createdAt, detectorCount: d.detectorCount, updatedAt: now(),
    });
    return delay(copy(d));
  },

  /** POST /definitions/{id}/validate — what the server checks on write. */
  validateDefinition: async (dto: EventDefinition): Promise<DefinitionValidation> => delay(validate(dto)),

  /** GET /definitions/{id}/effective-config — the saved version, flattened. */
  effectiveConfig: async (id: string) => {
    const d = findDefinition(id);
    return delay({
      code: d.code,
      version: d.version,
      state: d.state,
      severity: d.severity,
      event_type: d.eventTypeCode,
      reviewer_strategy: d.reviewerStrategy,
      reviewer_config: d.reviewerConfig,
      detection_mode: d.criteriaDsl?.mode ?? "ASSURANCE_CONTROL",
      default_sla: d.slaDuration,
      action_on_timeout: d.defaultActionOnTimeout,
      escalation_chain: d.escalationChain ?? [],
      sla_resolution: d.slaPolicy?.resolution ?? "FIRST_MATCH",
      sla_conditions: d.slaPolicy?.rules?.length ?? 0,
      governance_rules: d.governancePolicy?.rules.length ?? 0,
      allowed_mitigations: d.allowedMitigationCodes,
      risk_acceptance: d.riskAcceptanceConfig,
      auto_remediation_enabled: Boolean((d.autoRemediationConfig as { enabled?: boolean }).enabled),
      action_bindings: d.actionBindings ?? {},
      killswitch_running: KILLSWITCH.get(d.definitionId) ?? true,
    });
  },

  /** POST /definitions/{id}/sla-preview — which SLA a finding with this context gets, from the unsaved draft. */
  slaPreview: async (def: EventDefinition, context: unknown): Promise<SlaPreviewResult> => {
    const ctx = (context ?? {}) as Record<string, unknown>;
    const policy = def.slaPolicy ?? { resolution: "FIRST_MATCH", rules: [] };
    const rules = [...(policy.rules ?? [])].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
    const notes: string[] = [];
    const evaluated = rules.map((r) => {
      try {
        return { rule: r, ruleId: r.id, result: celEval(r.when, ctx) ? "TRUE" : "FALSE" };
      } catch (e) {
        return { rule: r, ruleId: r.id, result: "ERROR", error: (e as Error).message };
      }
    });
    const matched = evaluated.filter((e) => e.result === "TRUE").map((e) => e.rule);
    const deadline = (r: SlaRule) => (r.sla.dueAt ? -1 : durationMs(r.sla.duration) ?? Infinity);
    const winner = policy.resolution === "STRICTEST"
      ? [...matched].sort((a, b) => deadline(a) - deadline(b))[0]
      : matched[0];
    if (winner?.sla.dueAt) notes.push(`Absolute due "${winner.sla.dueAt}" is resolved from the finding at detection time.`);
    const duration = winner ? (winner.sla.dueAt ? undefined : winner.sla.duration) : def.slaDuration;
    const ms = durationMs(duration);
    if (duration && ms === null) notes.push(`"${duration}" is not a valid ISO-8601 duration.`);
    return delay({
      ruleId: winner?.id,
      priority: winner?.priority,
      dueAt: ms !== null ? new Date(Date.now() + ms).toISOString() : undefined,
      duration,
      actionOnTimeout: winner?.sla.actionOnTimeout ?? def.defaultActionOnTimeout,
      escalationChain: winner?.sla.escalationChain ?? def.escalationChain ?? [],
      matchedRules: matched.map((r) => ({ ruleId: r.id })),
      notes,
      evaluated: evaluated.map(({ ruleId, result, error }) => ({ ruleId, result, error })),
    });
  },

  /** POST /definitions/{id}/detection-test — runs the draft's CEL rule over the sample catalog. */
  detectionTest: async (def: EventDefinition): Promise<DetectionTestResult> => {
    const expr = def.criteriaDsl?.expression ?? "";
    try {
      celCompile(expr);
    } catch (e) {
      return delay({ valid: false, error: `Detection rule does not compile: ${(e as Error).message}` });
    }
    let errors = 0;
    const matched = SAMPLE_CATALOG.filter((s) => {
      try {
        return celEval(expr, s.context);
      } catch {
        errors++;
        return false; // a runtime error on one entitlement counts as "not matched"
      }
    });
    return delay({ valid: true, evaluated: SAMPLE_CATALOG.length, matched: matched.length, errors, samples: copy(matched.slice(0, 5)) });
  },

  /** GET /definitions/{id}/usage */
  definitionUsage: async (id: string): Promise<DefinitionUsage> => {
    const d = findDefinition(id);
    const mode = d.criteriaDsl?.mode ?? "ASSURANCE_CONTROL";
    const domain = AGENT_DOMAIN[d.code] ?? "LIFECYCLE";
    const controls = mode === "ASSURANCE_CONTROL"
      ? Array.from({ length: d.detectorCount ?? 0 }, (_, n) => ({
          code: `${d.code.split("_")[0]}-C${String(n + 1).padStart(2, "0")}`,
          name: `${d.name}${n ? ` (${["variant", "batch", "real-time"][n % 3]})` : ""}`,
          domain_code: domain,
        }))
      : [];
    const byStatus = new Map<string, number>();
    EVENTS.filter((e) => DEFINITIONS.find((x) => x.definitionId === e.definitionId)?.code === d.code)
      .forEach((e) => byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1));
    const active = DEFINITIONS.find((x) => x.code === d.code && x.state === "ACTIVE" && x.definitionId !== d.definitionId);
    return delay({
      detectionMode: mode,
      controls,
      useCases: controls.length ? [{ name: `${FAMILY_OF[domain] ?? "Identity"} hygiene`, state: "ACTIVE" }] : [],
      findingsByStatus: [...byStatus].map(([status, n]) => ({ status, n })),
      warning: d.state === "DRAFT" && active
        ? `v${active.version} is ACTIVE. Activating this draft deprecates it; open findings keep the version they were raised under.`
        : undefined,
    });
  },

  bindNotification: async (id: string, phase: string, templateId: string | null) => {
    for (const t of NOTIFICATION_TEMPLATES) {
      t.bindings = (t.bindings ?? []).filter((b) => !(b.definitionId === id && b.phase === phase));
    }
    if (templateId) {
      const t = NOTIFICATION_TEMPLATES.find((x) => x.template_id === templateId);
      if (!t) throw new Error("Template not found");
      t.bindings!.push({ definitionId: id, phase });
    }
    return delay({ definitionId: id, phase, templateId });
  },

  executors: async () => delay(copy(EXECUTORS)),
  mitigationControls: async () => delay(copy(MITIGATION_CONTROLS)),
  killswitch: async (): Promise<KillswitchState> => delay({
    global: { running: true },
    definitions: DEFINITIONS.map((d) => ({ definition_id: d.definitionId, running: KILLSWITCH.get(d.definitionId) ?? true })),
  }),
  toggleDefinitionKillswitch: async (id: string, enabled: boolean) => {
    findDefinition(id);
    KILLSWITCH.set(id, enabled);
    return delay({ definition_id: id, running: enabled });
  },
  notifications: async (): Promise<NotificationsState> =>
    delay(copy({ phases: NOTIFICATION_PHASES, templates: NOTIFICATION_TEMPLATES })),

  newDefinitionVersion: async (id: string) => {
    const src = DEFINITIONS.find((x) => x.definitionId === id);
    if (!src) throw new Error("Definition not found");
    const now = new Date().toISOString();
    const next: EventDefinition = {
      ...copy(src),
      definitionId: crypto.randomUUID(),
      version: Math.max(...DEFINITIONS.filter((x) => x.code === src.code).map((x) => x.version)) + 1,
      state: "DRAFT",
      createdAt: now,
      updatedAt: now,
    };
    DEFINITIONS.push(next);
    return delay(copy(next));
  },

  /** Activates a DRAFT and deprecates every other version of the same code. Refused while validation errors remain. */
  activateDefinition: async (id: string) => {
    const d = findDefinition(id);
    if (d.state !== "DRAFT") throw new Error("Only DRAFT definitions can be activated.");
    const { errors } = validate(d);
    if (errors.length) throw new Error(`Activation refused: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`);
    const ts = now();
    DEFINITIONS.filter((x) => x.code === d.code && x.state === "ACTIVE").forEach((x) => {
      x.state = "DEPRECATED";
      x.updatedAt = ts;
    });
    d.state = "ACTIVE";
    d.updatedAt = ts;
    return delay(copy(d));
  },

  deprecateDefinition: async (id: string) => {
    const d = DEFINITIONS.find((x) => x.definitionId === id);
    if (!d) throw new Error("Definition not found");
    if (d.state !== "ACTIVE") throw new Error("Only ACTIVE definitions can be deprecated.");
    d.state = "DEPRECATED";
    d.updatedAt = new Date().toISOString();
    return delay(copy(d));
  },

  workflows: async () => delay(copy(WORKFLOWS)),

  startWorkflow: async (workflowId: string, evId: string) => {
    const wf = WORKFLOWS.find((w) => w.workflowId === workflowId);
    if (!wf) throw new Error("Workflow not found");
    if (wf.state !== "ACTIVE") throw new Error("Only active workflows can be started.");
    return delay(copy(startInstance(wf, evId, 0, false)));
  },

  instancesByEvent: async (evId: string) =>
    delay(copy(INSTANCES.filter((i) => i.eventId === evId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)))),

  instanceDetail: async (id: string): Promise<InstanceDetail> => {
    const instance = INSTANCES.find((i) => i.instanceId === id);
    if (!instance) throw new Error("Workflow run not found");
    return delay(copy({ instance, steps: STEPS.get(id) ?? [] }));
  },

  workItems: async () => delay(copy(WORK_ITEMS)),

  decideWorkItem: async (id: string, outcome: "APPROVED" | "REJECTED", comment?: string) => {
    const wi = WORK_ITEMS.find((w) => w.workItemId === id);
    if (!wi) throw new Error("Work item not found");
    if (wi.status !== "OPEN") throw new Error("This work item has already been decided.");
    wi.status = "DECIDED";
    wi.outcome = outcome;
    wi.comment = comment;
    wi.decidedAt = now();

    const steps = STEPS.get(wi.instanceId) ?? [];
    const inst = INSTANCES.find((i) => i.instanceId === wi.instanceId)!;
    for (const s of steps) {
      if (s.stepInstanceId === wi.stepInstanceId) {
        s.status = "COMPLETED";
        s.outcome = outcome;
        s.completedAt = now();
      } else if (s.status === "PENDING") {
        s.status = outcome === "APPROVED" ? "COMPLETED" : "SKIPPED";
        s.outcome = outcome === "APPROVED" ? "APPLIED" : undefined;
      }
    }
    inst.status = "COMPLETED";
    inst.currentStepKey = undefined;
    inst.completedAt = now();
    return delay(copy(wi));
  },
};
