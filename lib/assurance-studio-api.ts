// =====================================================================
// Continuous Assurance — Studio configuration API (Action library and
// CEL functions tabs).
//
// Action library lists the IGA UI's agent tasks (lib/agent-task-library.ts)
// with the event definitions that route findings to each task.
// CEL endpoints match the deployed console (graph.keyforge.ai/cc):
//   GET /assurance/agents                      (domains for the CEL picker)
//   GET /assurance/agents/{code}/cel-reference
// Served from sample data while USE_MOCK is true, like the rest of the
// Assurance Events pages (lib/assurance-events-api.ts); set it to false to
// call the real API through lib/assurance-api.ts.
// =====================================================================

import { assuranceApi } from "@/lib/assurance-api";
import { Definitions, type UUID } from "@/lib/assurance-events-api";

const USE_MOCK = true;

// ---------- Types ----------

/** An event definition that routes findings to an agent task. */
export interface TaskDefinitionRef {
  definitionId: UUID;
  code: string;
  name: string;
  version: number;
  state: string;
}

export interface StudioDomain { code: string; name: string }

export interface CelReference {
  domain_code: string;
  operators: Array<{ group: string; items: string[] }>;
  functions: Array<{ signature: string; description: string; example: string }>;
  facts: Array<{ fact_key: string; value_type: string; description?: string; ai_permitted: boolean }>;
  restrictions: string[];
}

// ---------- Sample data ----------

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 150));

/** Event definitions (by code) that use each agent task. */
const TASK_DEFINITION_CODES: Record<string, string[]> = {
  "AGT-APP-003": ["NHI_ORPHANED"],
  "AGT-APP-004": ["SOD_P2P_CONFLICT"],
  "AGT-USER-001": ["MOVER_STALE_ACCESS", "LEAVER_ACTIVE_ACCOUNT"],
  "AGT-USER-002": ["CERT_OVERDUE", "MOVER_STALE_ACCESS"],
  "AGT-USER-003": ["MOVER_STALE_ACCESS", "DORMANT_PRIVILEGED"],
  "AGT-ACC-001": ["NHI_ORPHANED", "CREDENTIAL_ROTATION"],
  "AGT-ACC-002": ["LEAVER_ACTIVE_ACCOUNT", "CONTRACTOR_EXPIRED"],
  "AGT-APP-005": ["SOD_P2P_CONFLICT"],
};

const DOMAINS: StudioDomain[] = [
  { code: "ACCESS_PATH", name: "Access path" },
  { code: "ACCOUNT", name: "Account" },
  { code: "ENTITLEMENT", name: "Entitlement" },
  { code: "WORKGROUP", name: "Workgroup" },
  { code: "NHI", name: "Non-human identity" },
];

const OPERATORS: CelReference["operators"] = [
  { group: "Logical", items: ["&&", "||", "!"] },
  { group: "Comparison", items: ["==", "!=", "<", "<=", ">", ">="] },
  { group: "Arithmetic", items: ["+", "-", "*", "/", "%"] },
  { group: "Membership", items: ["in"] },
  { group: "Conditional", items: ["? :"] },
];

const FUNCTIONS: CelReference["functions"] = [
  { signature: "size(x)", description: "Length of a string, list or map.", example: "size(workgroup.members) == 0" },
  { signature: "has(x.y)", description: "Whether a field is present.", example: "has(workgroup.owner)" },
  { signature: "x.contains(s)", description: "Substring test on a string.", example: 'workgroup.name.contains("APPR")' },
  { signature: "x.startsWith(s)", description: "String prefix test.", example: 'workgroup.name.startsWith("WG-")' },
  { signature: "x.endsWith(s)", description: "String suffix test.", example: 'workgroup.name.endsWith("-TEMP")' },
  { signature: "x.matches(re)", description: "Regular-expression match.", example: 'workgroup.name.matches("^WG-[A-Z]+$")' },
  { signature: "l.all(i, p)", description: "Every element satisfies the predicate.", example: "workgroup.entitlements.all(e, e.privileged == false)" },
  { signature: "l.exists(i, p)", description: "At least one element satisfies it.", example: "workgroup.entitlements.exists(e, e.privileged)" },
  { signature: "l.exists_one(i, p)", description: "Exactly one element satisfies it.", example: "workgroup.members.exists_one(m, m == workgroup.owner)" },
  { signature: "l.filter(i, p)", description: "The elements that satisfy it.", example: "size(workgroup.entitlements.filter(e, e.privileged)) > 2" },
  { signature: "timestamp(s)", description: "Parse an RFC3339 timestamp.", example: 'timestamp(workgroup.lastUsedDate) < timestamp("2026-01-01T00:00:00Z")' },
  { signature: "duration(s)", description: 'A duration such as "24h".', example: 'duration("720h")' },
  { signature: "int(x) / double(x) / string(x)", description: "Type conversion.", example: "int(workgroup.memberCount) > 0" },
];

const RESTRICTIONS = [
  "Only facts registered for this domain resolve as identifiers — there is no way to reach a source system, the network or the filesystem.",
  "Expressions must return a boolean.",
  "Evaluation is bounded by a timeout and an expression-size limit; exceeding either fails validation rather than the run.",
  "A published expression is immutable — changing it creates a new version.",
];

type Fact = CelReference["facts"][number];
const f = (fact_key: string, value_type: string, description: string, ai_permitted = true): Fact =>
  ({ fact_key, value_type, description, ai_permitted });

const FACTS: Record<string, Fact[]> = {
  ACCESS_PATH: [],
  ACCOUNT: [
    f("account.enabled", "BOOLEAN", "The account can sign in."),
    f("account.privileged", "BOOLEAN", "The account holds at least one privileged entitlement."),
    f("account.lastLogin", "TIMESTAMP", "Most recent successful sign-in."),
    f("account.daysSinceLastUse", "INT", "Whole days since the account was last used."),
    f("account.ownerStatus", "STRING", "HR status of the owning identity (ACTIVE, TERMINATED, LEAVE)."),
    f("account.mfaEnrolled", "BOOLEAN", "At least one MFA factor is enrolled."),
    f("account.email", "STRING", "Primary e-mail of the account.", false),
  ],
  ENTITLEMENT: [
    f("entitlement.name", "STRING", "Display name in the catalog."),
    f("entitlement.privileged", "BOOLEAN", "Marked privileged in the catalog."),
    f("entitlement.requestable", "BOOLEAN", "Can be requested through access request."),
    f("entitlement.approvalGroup", "STRING", "Approval workgroup id, if configured."),
    f("entitlement.owner", "STRING", "Accountable owner.", false),
    f("entitlement.assignmentCount", "INT", "Number of accounts holding it."),
  ],
  WORKGROUP: [
    f("workgroup.name", "STRING", "Workgroup name."),
    f("workgroup.owner", "STRING", "Owning identity.", false),
    f("workgroup.members", "LIST", "Member identity ids.", false),
    f("workgroup.memberCount", "INT", "Number of members."),
    f("workgroup.entitlements", "LIST", "Entitlements the workgroup approves."),
    f("workgroup.lastUsedDate", "TIMESTAMP", "Last time the workgroup approved a request."),
  ],
  NHI: [
    f("nhi.kind", "STRING", "SERVICE_ACCOUNT, API_KEY, OAUTH_CLIENT or CERTIFICATE."),
    f("nhi.owner", "STRING", "Accountable human owner.", false),
    f("nhi.credentialAgeDays", "INT", "Age of the current credential in days."),
    f("nhi.rotationPolicyDays", "INT", "Maximum credential age allowed by policy."),
    f("nhi.lastUsed", "TIMESTAMP", "Most recent authentication."),
  ],
};

const mock = {
  taskDefinitionCodes: () => delay(TASK_DEFINITION_CODES),
  domains: () => delay(DOMAINS),
  celReference: (code: string): Promise<CelReference> => {
    if (!DOMAINS.some((d) => d.code === code)) return Promise.reject(new Error(`Unknown domain ${code}`));
    return delay({ domain_code: code, operators: OPERATORS, functions: FUNCTIONS, facts: FACTS[code] ?? [], restrictions: RESTRICTIONS });
  },
};

// ---------- API ----------

export const Studio = {
  domains: async (): Promise<StudioDomain[]> =>
    USE_MOCK ? mock.domains() : assuranceApi.get<StudioDomain[]>("/assurance/agents"),
  celReference: async (code: string): Promise<CelReference> =>
    USE_MOCK
      ? mock.celReference(code)
      : assuranceApi.get<CelReference>(`/assurance/agents/${encodeURIComponent(code)}/cel-reference`),
};

/**
 * Event definitions per agent task id. Definition codes are resolved against
 * the definition list; where a code has several versions the ACTIVE one wins,
 * otherwise the newest.
 */
export async function agentTaskDefinitions(): Promise<Record<string, TaskDefinitionRef[]>> {
  // The task → definition link has no backend endpoint yet; sample data only.
  const [codesByTask, definitions] = await Promise.all([mock.taskDefinitionCodes(), Definitions.list()]);
  const pick = (code: string) => {
    const versions = definitions.filter((d) => d.code === code);
    return versions.find((d) => d.state === "ACTIVE") ?? versions.sort((x, y) => y.version - x.version)[0];
  };
  const out: Record<string, TaskDefinitionRef[]> = {};
  for (const [taskId, codes] of Object.entries(codesByTask)) {
    out[taskId] = codes
      .map(pick)
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((d) => ({ definitionId: d.definitionId, code: d.code, name: d.name, version: d.version, state: d.state }));
  }
  return out;
}
