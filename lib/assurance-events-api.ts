// =====================================================================
// Continuous Assurance — events, lookups, definitions and workflows API
// (All Events list and event detail pages).
//
// Endpoints and types match the Continuous Assurance app (lib/api.ts,
// lib/types.ts). Served from mock data while USE_MOCK is true, because the
// service only accepts a Google ID token that ISPM does not have yet; set
// it to false to call the real API through lib/assurance-api.ts.
// =====================================================================

import { assuranceApi } from "@/lib/assurance-api";
import { mock } from "@/lib/assurance-events-mock";
import { Executors } from "@/lib/assurance-executors";

const USE_MOCK = true;

export type UUID = string;
export type ISODateTime = string;

// ---------- Lookup ----------
export interface Lookup {
  lookupId: UUID;
  tenantId: UUID | null;
  domain: string;
  code: string;
  locale: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  metadata: Record<string, unknown>;
}

// ---------- Event ----------
export interface ComplianceEvent {
  eventId: UUID;
  definitionId: UUID;
  definitionVersion: number;
  eventTypeCode: string;
  severity: string;          // lookup: SEVERITY
  status: string;            // lookup: EVENT_STATUS
  subjectKind: string;       // lookup: SUBJECT_KIND
  subjectUserId?: UUID;
  subjectAccountId?: UUID;
  subjectApplicationId?: UUID;
  subjectEntitlementId?: UUID;
  subjectNhiId?: UUID;
  subjectDescriptor: Record<string, unknown>;
  scopeSnapshot: Record<string, unknown>;
  discoveredAt: ISODateTime;
  dueAt: ISODateTime;
  closedAt?: ISODateTime;
  escalationLevel: number;
  reviewerPrincipalId?: UUID;
  reviewerResolvedVia?: string;
  reviewerAssignedAt?: ISODateTime;
  currentDecisionId?: UUID;
  riskScore?: number;
  aiRecommendedDecision?: string;
  correlationKey: string;
  reopenCount: number;
  evidence: Record<string, unknown>;
  detectorSource: string;
}

export interface EventListItem {
  eventId: UUID;
  severity: string;
  status: string;
  eventTypeCode: string;
  definitionCode: string;
  definitionName: string;
  subjectKind: string;
  subjectDescriptor: Record<string, unknown>;
  discoveredAt: ISODateTime;
  dueAt: ISODateTime;
  escalationLevel: number;
  reviewerPrincipalId?: UUID;
  riskScore?: number;
  aiRecommendedDecision?: string;
}

export interface EventQuery {
  status?: string[];
  severity?: string[];
  eventTypeCodes?: string[];
  reviewerPrincipalId?: UUID;
  definitionId?: UUID;
  subjectUserId?: UUID;
  subjectApplicationId?: UUID;
  subjectNhiId?: UUID;
  dueBefore?: ISODateTime;
  discoveredAfter?: ISODateTime;
  discoveredBefore?: ISODateTime;
  page?: number;
  pageSize?: number;
}

export type EventPage = { items: EventListItem[]; total: number };

// ---------- Decision / Mitigation / Remediation ----------
export interface Decision {
  decisionId: UUID;
  decisionType: string;      // lookup: DECISION_TYPE
  justification?: string;
  evidenceRefs: Array<Record<string, unknown>>;
  expiresAt?: ISODateTime;
  decidedByPrincipalId: UUID;
  decidedByRole?: string;
  decidedAt: ISODateTime;
  supersededBy?: UUID;
}

export interface DecisionRequest {
  decisionType: string;
  justification?: string;
  evidenceRefs?: Array<{ kind: string; system?: string; id?: string; url?: string }>;
  expiresAt?: ISODateTime;
  mitigations?: Array<{
    controlCode: string;
    parameters?: Record<string, unknown>;
    expiresAt?: ISODateTime;
  }>;
}

export interface Mitigation {
  mitigationId: UUID;
  decisionId: UUID;
  controlCode: string;
  parameters: Record<string, unknown>;
  status: string;            // lookup: MITIGATION_STATUS
  activatedAt?: ISODateTime;
  expiresAt?: ISODateTime;
  verifiedAt?: ISODateTime;
  revokedAt?: ISODateTime;
  externalReference?: string;
}

export interface Remediation {
  remediationId: UUID;
  actionTypeCode: string;
  mode: string;              // lookup: REMEDIATION_MODE
  targetConnector: string;
  targetDescriptor: Record<string, unknown>;
  status: string;            // lookup: REMEDIATION_STATUS
  queuedAt: ISODateTime;
  dispatchedAt?: ISODateTime;
  completedAt?: ISODateTime;
  failureReason?: string;
  attempts: number;
  blastRadiusEstimate?: number;
  rollbackAvailable: boolean;
}

// ---------- AI Insight ----------
export interface AiInsight {
  insightId: UUID;
  modelVersion: string;
  generatedAt: ISODateTime;
  riskScore?: number;
  confidence?: number;
  recommendedDecision?: string;
  recommendedMitigations?: string[];
  rationale?: string;
  rationaleStructured?: Record<string, unknown>;
  peerAnalysis?: { peerCount?: number; withEntitlementPct?: number; comparableRoles?: string[] };
  usageSignal?: { lastUsedAt?: ISODateTime; sessions12m?: number; anomalyScore?: number };
  blastRadius?: { transitivelyGrants?: string[]; affectedCount?: number };
  similarPastDecisions?: Array<{ eventId: UUID; decisionType: string; outcome?: string }>;
  toxicComboFindings?: Array<Record<string, unknown>>;
}

// ---------- Definition ----------
export interface EventDefinition {
  definitionId: UUID;
  code: string;
  eventTypeCode: string;
  name: string;
  description?: string;
  severity: string;
  version: number;
  state: string;             // lookup: DEFINITION_STATE
  ownerPrincipalId: UUID;
  ownerRole?: string;
  reviewerStrategy: string;
  reviewerConfig: Record<string, unknown>;
  slaDuration: string;       // ISO-8601 duration
  defaultActionOnTimeout: string;
  scope: Record<string, unknown>;
  allowedMitigationCodes: string[];
  autoRemediationConfig: Record<string, unknown>;
  aiInsightConfig: Record<string, unknown>;
  riskAcceptanceConfig: Record<string, unknown>;
  evidenceRequirements: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  // Governance fields edited in the definition editor
  escalationChain?: EscalationStep[];
  criteriaDsl?: { mode: string; language?: string; expression?: string };
  governancePolicy?: { rules: GovernanceRule[] };
  slaPolicy?: { resolution?: string; rules?: SlaRule[] };
  /** The named SLA chosen on the General tab (lib/assurance-sla.ts). */
  slaPolicyCode?: string;
  actionBindings?: Record<string, string>; // action type → executor code
  /** When the definition's detection runs (Settings (Scheduler) tab). Not part of the deployed console's API. */
  schedule?: DefinitionSchedule;
  // Mock-only bookkeeping: agent controls that raise this definition
  detectorCount?: number;
}

/**
 * Detection schedule. FREQUENCY mirrors the console's agent schedule
 * (frequency + time + time zone); CRON mirrors ISPM's Quartz scheduler
 * (cron expression + misfire instruction).
 */
export interface DefinitionSchedule {
  enabled: boolean;
  mode: "FREQUENCY" | "CRON";
  frequency: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ON_DEMAND";
  time: string;                      // HH:mm (minute past the hour for HOURLY)
  dayOfWeek?: number;                // 0 = Sunday … 6 = Saturday (WEEKLY)
  dayOfMonth?: number;               // 1–31, clamped to the month's length (MONTHLY)
  timeZone: string;                  // IANA, e.g. UTC, Asia/Kolkata
  cronExpression?: string;           // Quartz: sec min hour day-of-month month day-of-week [year]
  misfireInstruction: string;
  startDate?: string;                // YYYY-MM-DD, inclusive
  endDate?: string;                  // YYYY-MM-DD, inclusive
}

export interface EscalationStep {
  atPercent: number;
  action: string;                    // NUDGE | NOTIFY_MANAGER | NOTIFY_CISO | REASSIGN
  params: Record<string, unknown>;
}

/** Evaluated in order; SEVERITY rules first, then the first true rule picks the branch. */
export interface GovernanceRule {
  id: string;
  point: string;                     // SEVERITY | AUTO_REMEDIATION_GATE | AUTO_DECISION | REVIEWER
  when: string;                      // CEL
  then: {
    action?: string;
    executor?: string;
    params?: Record<string, unknown>;
    [k: string]: unknown;
  };
}

export interface SlaRule {
  id: string;
  priority?: number | null;
  when: string;                      // CEL
  sla: {
    duration?: string;
    dueAt?: string;
    actionOnTimeout?: string;
    onReopen?: string;               // RESET | KEEP
    escalationChain?: EscalationStep[];
  };
}

// ---------- Definition editor support (deployed console) ----------

export interface DefinitionValidation { errors: string[]; warnings: string[] }

export interface DefinitionUsage {
  detectionMode?: string;
  controls?: Array<{ code: string; name: string; domain_code: string }>;
  useCases?: Array<{ name: string; state: string }>;
  findingsByStatus?: Array<{ status: string; n: number }>;
  warning?: string;
}

export interface DetectionTestResult {
  valid?: boolean;
  error?: string;
  evaluated?: number;
  matched?: number;
  errors?: number;
  samples?: Array<{ entitlement: string; name?: string; source: string; context: Record<string, unknown> }>;
}

export interface SlaPreviewResult {
  error?: string;
  ruleId?: string;
  priority?: number | null;
  dueAt?: string;
  duration?: string;
  actionOnTimeout?: string;
  escalationChain?: EscalationStep[];
  matchedRules?: Array<{ ruleId: string }>;
  notes?: string[];
  evaluated?: Array<{ ruleId: string; result: string; error?: string }>;
}

export interface Executor {
  executor_code: string;
  kind: string;
  state: string;
  paused?: boolean;
  supports: string[];
}

export interface MitigationControl { code: string; description?: string }

export interface KillswitchState {
  global?: { running: boolean };
  definitions: Array<{ definition_id: string; running: boolean }>;
}

export interface NotificationTemplate {
  template_id: string;
  code: string;
  channel_code: string;
  bindings?: Array<{ definitionId: string; phase: string }>;
}

export interface NotificationsState { phases: string[]; templates: NotificationTemplate[] }

/** A row of GET /definitions, as the deployed console's Event definitions list reads it. */
export interface DefinitionSummary {
  definitionId: UUID;
  code: string;
  name: string;
  eventTypeCode: string;
  severity: string;
  version: number;
  state: string;                     // DRAFT | ACTIVE | DEPRECATED
  detectionMode: string;             // ASSURANCE_CONTROL | CATALOG_SCAN
  controls: number;                  // agent controls that raise this definition
  governanceRules: number;           // 0 → built-in branching
  slaConditions: number;
  slaResolution: string;             // FIRST_MATCH | STRICTEST
  slaDuration: string;               // ISO-8601 default SLA
  executors: string[];
  openFindings: number;
  updatedAt: ISODateTime;
}

/** POST /definitions — the body the deployed console sends from "New definition". */
export interface DefinitionCreateRequest {
  code: string;
  name: string;
  eventTypeCode: string;
  severity: string;
  reviewerStrategy: string;
  reviewerConfig: Record<string, unknown>;
  slaDuration: string;
  escalationChain: Array<{ atPercent: number; action: string; params: Record<string, unknown> }>;
  defaultActionOnTimeout: string;
  criteriaDsl: { mode: string; language?: string; expression?: string };
  scope: Record<string, unknown>;
  allowedMitigationCodes: string[];
  autoRemediationConfig: Record<string, unknown>;
  aiInsightConfig: Record<string, unknown>;
  riskAcceptanceConfig: Record<string, unknown>;
  evidenceRequirements: Record<string, unknown>;
  governancePolicy: { rules: GovernanceRule[] };
  actionBindings: Record<string, string>;
  slaPolicy: { resolution: string; rules: SlaRule[] };
}

// ---------- Workflow ----------
export interface WorkflowDefinition {
  workflowId: UUID;
  code: string;
  name: string;
  description?: string;
  version: number;
  state: string;             // lookup: DEFINITION_STATE
  triggerType: string;       // lookup: WF_TRIGGER
  triggerConfig: { severities?: string[]; definition_codes?: string[]; decision_types?: string[] };
  steps: { start: string; steps: Array<{ key: string; name?: string; type: string; config: Record<string, unknown> }> };
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface WorkflowInstance {
  instanceId: UUID;
  workflowId: UUID;
  workflowCode: string;
  workflowVersion: number;
  eventId?: UUID;
  status: string;            // lookup: WF_INSTANCE_STATUS
  currentStepKey?: string;
  context: Record<string, unknown>;
  failureReason?: string;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface WorkflowStepInstance {
  stepInstanceId: UUID;
  instanceId: UUID;
  stepKey: string;
  stepType: string;
  status: string;            // lookup: WF_STEP_STATUS
  outcome?: string;
  output: Record<string, unknown>;
  error?: string;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface WorkItem {
  workItemId: UUID;
  instanceId: UUID;
  stepInstanceId: UUID;
  eventId?: UUID;
  title: string;
  description?: string;
  assigneePrincipalId?: UUID;
  assigneeResolvedVia?: string;
  dueAt?: ISODateTime;
  status: string;            // lookup: WORK_ITEM_STATUS
  outcome?: string;
  comment?: string;
  decidedAt?: ISODateTime;
  createdAt: ISODateTime;
}

export type InstanceDetail = { instance: WorkflowInstance; steps: WorkflowStepInstance[] };

function serializeQuery(q: EventQuery): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (q.status?.length) out.status = q.status.join(",");
  if (q.severity?.length) out.severity = q.severity.join(",");
  if (q.eventTypeCodes?.length) out.eventTypeCodes = q.eventTypeCodes.join(",");
  if (q.reviewerPrincipalId) out.reviewerPrincipalId = q.reviewerPrincipalId;
  if (q.definitionId) out.definitionId = q.definitionId;
  if (q.subjectUserId) out.subjectUserId = q.subjectUserId;
  if (q.subjectApplicationId) out.subjectApplicationId = q.subjectApplicationId;
  if (q.subjectNhiId) out.subjectNhiId = q.subjectNhiId;
  if (q.dueBefore) out.dueBefore = q.dueBefore;
  if (q.discoveredAfter) out.discoveredAfter = q.discoveredAfter;
  if (q.discoveredBefore) out.discoveredBefore = q.discoveredBefore;
  if (q.page !== undefined) out.page = String(q.page);
  if (q.pageSize !== undefined) out.pageSize = String(q.pageSize);
  return out;
}

// ---------- Lookups ----------
export const Lookups = {
  list: async (domain: string, locale?: string): Promise<Lookup[]> =>
    USE_MOCK
      ? mock.lookups(domain)
      : assuranceApi.get<Lookup[]>(`/lookups/${encodeURIComponent(domain)}`, { locale }),
};

// ---------- Events ----------
export const Events = {
  list: async (q: EventQuery): Promise<EventPage> =>
    USE_MOCK ? mock.eventList(q) : assuranceApi.get<EventPage>("/events", serializeQuery(q)),
  get: async (id: UUID): Promise<ComplianceEvent> =>
    USE_MOCK ? mock.event(id) : assuranceApi.get<ComplianceEvent>(`/events/${id}`),
  decisions: async (id: UUID): Promise<Decision[]> =>
    USE_MOCK ? mock.decisions(id) : assuranceApi.get<Decision[]>(`/events/${id}/decisions`),
  mitigations: async (id: UUID): Promise<Mitigation[]> =>
    USE_MOCK ? mock.mitigations(id) : assuranceApi.get<Mitigation[]>(`/events/${id}/mitigations`),
  remediations: async (id: UUID): Promise<Remediation[]> =>
    USE_MOCK ? mock.remediations(id) : assuranceApi.get<Remediation[]>(`/events/${id}/remediations`),
  // The API answers 200 with an empty body when no insight exists yet.
  insight: async (id: UUID): Promise<AiInsight | null> =>
    USE_MOCK
      ? mock.insight(id)
      : ((await assuranceApi.get<AiInsight | "">(`/events/${id}/insight`)) || null) as AiInsight | null,
  refreshInsight: async (id: UUID): Promise<AiInsight> =>
    USE_MOCK ? mock.refreshInsight(id) : assuranceApi.post<AiInsight>(`/events/${id}/insight/refresh`),
  decide: async (id: UUID, body: DecisionRequest): Promise<Decision> =>
    USE_MOCK ? mock.decide(id, body) : assuranceApi.post<Decision>(`/events/${id}/decide`, body),
  reopen: async (id: UUID, reason?: string): Promise<ComplianceEvent> =>
    USE_MOCK ? mock.reopen(id) : assuranceApi.post<ComplianceEvent>(`/events/${id}/reopen`, { reason }),
  suppress: async (id: UUID, reason?: string, until?: string): Promise<ComplianceEvent> =>
    USE_MOCK
      ? mock.suppress(id)
      : assuranceApi.post<ComplianceEvent>(`/events/${id}/suppress`, { reason, until }),
};

// ---------- Definitions ----------
export const Definitions = {
  list: async (): Promise<DefinitionSummary[]> =>
    USE_MOCK ? mock.definitions() : assuranceApi.get<DefinitionSummary[]>("/definitions"),
  create: async (req: DefinitionCreateRequest): Promise<EventDefinition> =>
    USE_MOCK ? mock.createDefinition(req) : assuranceApi.post<EventDefinition>("/definitions", req),
  get: async (id: UUID): Promise<EventDefinition> =>
    USE_MOCK ? mock.definition(id) : assuranceApi.get<EventDefinition>(`/definitions/${id}`),
  activate: async (id: UUID): Promise<EventDefinition> =>
    USE_MOCK
      ? mock.activateDefinition(id)
      : assuranceApi.post<EventDefinition>(`/definitions/${id}/activate`),
  deprecate: async (id: UUID): Promise<EventDefinition> =>
    USE_MOCK
      ? mock.deprecateDefinition(id)
      : assuranceApi.post<EventDefinition>(`/definitions/${id}/deprecate`),
  /** Cuts a new DRAFT version from an existing one. */
  newVersion: async (id: UUID): Promise<EventDefinition> =>
    USE_MOCK
      ? mock.newDefinitionVersion(id)
      : assuranceApi.post<EventDefinition>(`/definitions/${id}/versions`),
  /** Saves a DRAFT. ACTIVE and DEPRECATED versions are immutable. */
  update: async (id: UUID, dto: EventDefinition): Promise<EventDefinition> =>
    USE_MOCK ? mock.updateDefinition(id, dto) : assuranceApi.put<EventDefinition>(`/definitions/${id}`, dto),
  validate: async (id: UUID, dto?: EventDefinition): Promise<DefinitionValidation> =>
    USE_MOCK
      ? mock.validateDefinition(dto ?? (await mock.definition(id)))
      : assuranceApi.post<DefinitionValidation>(`/definitions/${id}/validate`, dto ?? {}),
  effectiveConfig: async (id: UUID): Promise<Record<string, unknown>> =>
    USE_MOCK ? mock.effectiveConfig(id) : assuranceApi.get<Record<string, unknown>>(`/definitions/${id}/effective-config`),
  slaPreview: async (id: UUID, body: { definition: EventDefinition; context: unknown }): Promise<SlaPreviewResult> =>
    USE_MOCK ? mock.slaPreview(body.definition, body.context) : assuranceApi.post<SlaPreviewResult>(`/definitions/${id}/sla-preview`, body),
  detectionTest: async (id: UUID, body: { definition: EventDefinition }): Promise<DetectionTestResult> =>
    USE_MOCK ? mock.detectionTest(body.definition) : assuranceApi.post<DetectionTestResult>(`/definitions/${id}/detection-test`, body),
  usage: async (id: UUID): Promise<DefinitionUsage> =>
    USE_MOCK ? mock.definitionUsage(id) : assuranceApi.get<DefinitionUsage>(`/definitions/${id}/usage`),
  bindNotification: async (id: UUID, phase: string, templateId: string | null): Promise<unknown> =>
    USE_MOCK
      ? mock.bindNotification(id, phase, templateId)
      : assuranceApi.put(`/definitions/${id}/notifications/${phase}`, { templateId }),
};

// ---------- Governance (executors, mitigations, killswitch, notifications) ----------
export const Governance = {
  executors: async (): Promise<Executor[]> =>
    // Same registry as the Executors page (lib/assurance-executors.ts).
    USE_MOCK ? Executors.list() : assuranceApi.get<Executor[]>("/executors"),
  mitigations: async (): Promise<MitigationControl[]> =>
    USE_MOCK ? mock.mitigationControls() : assuranceApi.get<MitigationControl[]>("/mitigation-controls"),
  killswitch: async (): Promise<KillswitchState> =>
    USE_MOCK ? mock.killswitch() : assuranceApi.get<KillswitchState>("/killswitch"),
  toggleDefinition: async (id: UUID, enabled: boolean, reason: string): Promise<unknown> =>
    USE_MOCK
      ? mock.toggleDefinitionKillswitch(id, enabled)
      : assuranceApi.post(`/killswitch/definitions/${id}`, { enabled, reason }),
  notifications: async (): Promise<NotificationsState> =>
    USE_MOCK ? mock.notifications() : assuranceApi.get<NotificationsState>("/notifications"),
};

// ---------- Workflows ----------
export const Workflows = {
  list: async (): Promise<WorkflowDefinition[]> =>
    USE_MOCK ? mock.workflows() : assuranceApi.get<WorkflowDefinition[]>("/workflows"),
  start: async (id: UUID, eventId: UUID): Promise<WorkflowInstance> =>
    USE_MOCK
      ? mock.startWorkflow(id, eventId)
      : assuranceApi.post<WorkflowInstance>(`/workflows/${id}/start`, { event_id: eventId }),
  instancesByEvent: async (eventId: UUID): Promise<WorkflowInstance[]> =>
    USE_MOCK
      ? mock.instancesByEvent(eventId)
      : assuranceApi.get<WorkflowInstance[]>("/workflow-instances", { eventId }),
  instanceDetail: async (id: UUID): Promise<InstanceDetail> =>
    USE_MOCK ? mock.instanceDetail(id) : assuranceApi.get<InstanceDetail>(`/workflow-instances/${id}`),
};

export const WorkItems = {
  mine: async (includeUnassigned = true): Promise<WorkItem[]> =>
    USE_MOCK ? mock.workItems() : assuranceApi.get<WorkItem[]>("/work-items", { includeUnassigned }),
  decide: async (id: UUID, outcome: "APPROVED" | "REJECTED", comment?: string): Promise<WorkItem> =>
    USE_MOCK
      ? mock.decideWorkItem(id, outcome, comment)
      : assuranceApi.post<WorkItem>(`/work-items/${id}/decide`, { outcome, comment }),
};
