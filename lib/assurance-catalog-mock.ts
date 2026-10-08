// =====================================================================
// Mock data for the detector catalog, shaped exactly like the Continuous
// Assurance responses (/assurance/catalog/summary, /signal-families,
// /detectors, /detectors/{id}). Swap back to the real API by restoring
// the assuranceApi calls in lib/assurance-catalog-api.ts.
//
// Only detectors, families and connectors are written out; every count
// (summary, per-family, per-detector sources) is derived from them so the
// numbers always agree.
// =====================================================================

import type { CatalogSummary, Detector, SignalFamily } from "@/lib/assurance-catalog-api";

type Connector = { code: string; name: string; vendor: string; category: string; status: string };

const CONNECTORS: Record<string, Connector> = {
  WORKDAY: { code: "WORKDAY", name: "Workday", vendor: "Workday", category: "HRIS", status: "CONFIGURED" },
  OKTA: { code: "OKTA", name: "Okta", vendor: "Okta", category: "IDP", status: "CONFIGURED" },
  ENTRA: { code: "ENTRA", name: "Microsoft Entra ID", vendor: "Microsoft", category: "IDP", status: "AVAILABLE" },
  SAILPOINT: { code: "SAILPOINT", name: "SailPoint IdentityNow", vendor: "SailPoint", category: "IGA", status: "PLANNED" },
  CYBERARK: { code: "CYBERARK", name: "CyberArk PAM", vendor: "CyberArk", category: "PAM", status: "AVAILABLE" },
  AWS: { code: "AWS", name: "AWS IAM", vendor: "Amazon", category: "CLOUD", status: "CONFIGURED" },
  OCI: { code: "OCI", name: "Oracle Cloud IAM", vendor: "Oracle", category: "CLOUD", status: "CONFIGURED" },
  SERVICENOW: { code: "SERVICENOW", name: "ServiceNow", vendor: "ServiceNow", category: "ITSM", status: "CONFIGURED" },
  ORACLE_EBS: { code: "ORACLE_EBS", name: "Oracle E-Business Suite", vendor: "Oracle", category: "SAAS", status: "CONFIGURED" },
  SNOWFLAKE: { code: "SNOWFLAKE", name: "Snowflake", vendor: "Snowflake", category: "DATA", status: "PLANNED" },
  GITHUB: { code: "GITHUB", name: "GitHub Enterprise", vendor: "GitHub", category: "DEVOPS", status: "AVAILABLE" },
  SPLUNK: { code: "SPLUNK", name: "Splunk", vendor: "Splunk", category: "SECURITY", status: "PLANNED" },
};

const FAMILIES: Array<{ code: string; name: string }> = [
  { code: "JML", name: "Joiner / Mover / Leaver" },
  { code: "PRIV", name: "Privileged access" },
  { code: "CERT", name: "Access certification" },
  { code: "SOD", name: "Segregation of duties" },
  { code: "NHI", name: "Non-human identities" },
  { code: "CLOUD", name: "Cloud entitlements" },
  { code: "AUTHN", name: "Authentication and MFA" },
  { code: "DATA", name: "Data access" },
];

const AGENTS: Record<string, string> = {
  LIFECYCLE: "Lifecycle Agent",
  PRIVILEGE: "Privilege Agent",
  REVIEW: "Review Agent",
  SOD: "SoD Agent",
  NHI: "Machine Identity Agent",
  CLOUD: "Cloud Posture Agent",
  AUTH: "Authentication Agent",
  DATA: "Data Access Agent",
};

type DetectorSeed = {
  id: string;
  family: string;
  name: string;
  condition: string;
  evidence: string;
  agent: string;
  response: string;
  owner: string;
  policy: string;
  closure: string;
  rollout: "Start" | "Expand" | "Validate later";
  reporter?: string;
  event?: string;
  sources: Array<[code: string, contribution: "PRIMARY" | "SUPPORTING"]>;
};

const SEEDS: DetectorSeed[] = [
  // ---- Joiner / Mover / Leaver
  {
    id: "JML-001", family: "JML", name: "Leaver retains active account",
    condition: "Worker is terminated in HR but still has an enabled account in a connected system 24 hours after the termination date.",
    evidence: "HR termination date; account status and last login per target system",
    agent: "LIFECYCLE", response: "Disable account", owner: "Application owner",
    policy: "Auto-disable after manager is notified; no approval required", closure: "Account disabled timestamp from the target system",
    rollout: "Start", reporter: "SOX.ITGC.AC-03", event: "LEAVER_ACTIVE_ACCOUNT",
    sources: [["WORKDAY", "PRIMARY"], ["OKTA", "PRIMARY"], ["ORACLE_EBS", "SUPPORTING"]],
  },
  {
    id: "JML-002", family: "JML", name: "Mover keeps prior department access",
    condition: "Worker changed department or job code and still holds entitlements tied to the previous role 30 days later.",
    evidence: "HR job history; entitlement assignments with role origin",
    agent: "LIFECYCLE", response: "Open access review", owner: "New line manager",
    policy: "Manager confirms or revokes each carried-over entitlement", closure: "Review decision for every carried-over entitlement",
    rollout: "Start", reporter: "SOX.ITGC.AC-04", event: "MOVER_STALE_ACCESS",
    sources: [["WORKDAY", "PRIMARY"], ["SAILPOINT", "SUPPORTING"], ["ORACLE_EBS", "SUPPORTING"]],
  },
  {
    id: "JML-003", family: "JML", name: "Account created without HR record",
    condition: "An account exists in a target system with no matching active worker or approved contractor record.",
    evidence: "Account inventory; HR worker and contractor registry",
    agent: "LIFECYCLE", response: "Raise ticket", owner: "Identity operations",
    policy: "Ticket to identity ops; disable if unclaimed in 7 days", closure: "Account correlated to a worker or disabled",
    rollout: "Expand",
    sources: [["WORKDAY", "PRIMARY"], ["OKTA", "SUPPORTING"], ["SERVICENOW", "SUPPORTING"]],
  },
  {
    id: "JML-004", family: "JML", name: "Contractor past end date",
    condition: "Contractor's engagement end date has passed and the identity is still active.",
    evidence: "Contractor end date; identity status",
    agent: "LIFECYCLE", response: "Disable account", owner: "Sponsor",
    policy: "Sponsor may extend once; otherwise auto-disable", closure: "Identity disabled or end date extended with sponsor approval",
    rollout: "Start", event: "CONTRACTOR_EXPIRED",
    sources: [["WORKDAY", "PRIMARY"], ["OKTA", "PRIMARY"]],
  },

  // ---- Privileged access
  {
    id: "PRV-001", family: "PRIV", name: "Standing admin outside PAM vault",
    condition: "An account holds an administrative role on a production system but its credential is not vaulted.",
    evidence: "Privileged role assignments; PAM vault inventory",
    agent: "PRIVILEGE", response: "Onboard to vault", owner: "Platform owner",
    policy: "Vault within 14 days or convert to just-in-time access", closure: "Credential present in PAM vault with rotation enabled",
    rollout: "Start", reporter: "ISO27001.A.8.2",
    sources: [["CYBERARK", "PRIMARY"], ["AWS", "SUPPORTING"], ["OCI", "SUPPORTING"]],
  },
  {
    id: "PRV-002", family: "PRIV", name: "Privileged session without ticket",
    condition: "A privileged session was opened with no linked approved change or incident ticket.",
    evidence: "PAM session log; ITSM change and incident records",
    agent: "PRIVILEGE", response: "Notify security", owner: "Security operations",
    policy: "Security reviews the session recording within 48 hours", closure: "Session reviewed and justification recorded",
    rollout: "Expand",
    sources: [["CYBERARK", "PRIMARY"], ["SERVICENOW", "PRIMARY"]],
  },
  {
    id: "PRV-003", family: "PRIV", name: "Dormant privileged account",
    condition: "A privileged account has not been used in 90 days.",
    evidence: "Privileged account list; last authentication time",
    agent: "PRIVILEGE", response: "Disable account", owner: "Platform owner",
    policy: "Owner confirms need within 7 days or the account is disabled", closure: "Account disabled or owner attestation on file",
    rollout: "Start", event: "DORMANT_PRIVILEGED",
    sources: [["OKTA", "PRIMARY"], ["AWS", "PRIMARY"], ["OCI", "SUPPORTING"]],
  },

  // ---- Access certification
  {
    id: "CRT-001", family: "CERT", name: "Certification overdue",
    condition: "An access review campaign item is past its due date without a decision.",
    evidence: "Campaign items with due dates and decision status",
    agent: "REVIEW", response: "Escalate to manager", owner: "Reviewer",
    policy: "Escalate at due date; revoke by default 14 days after", closure: "Decision recorded on every item",
    rollout: "Start", reporter: "SOX.ITGC.AC-05", event: "CERT_OVERDUE",
    sources: [["SAILPOINT", "PRIMARY"]],
  },
  {
    id: "CRT-002", family: "CERT", name: "Rubber-stamp reviewer",
    condition: "A reviewer approved more than 95% of items in under 5 seconds each across a campaign.",
    evidence: "Review decisions with timestamps per reviewer",
    agent: "REVIEW", response: "Re-review", owner: "Compliance",
    policy: "Reassign the reviewer's items to their manager", closure: "Reassigned items decided by the new reviewer",
    rollout: "Validate later",
    sources: [["SAILPOINT", "PRIMARY"]],
  },
  {
    id: "CRT-003", family: "CERT", name: "Revocation not fulfilled",
    condition: "An entitlement revoked in a certification is still present in the target system 7 days later.",
    evidence: "Revoke decisions; current entitlement assignments",
    agent: "REVIEW", response: "Raise ticket", owner: "Application owner",
    policy: "Fulfilment ticket; escalate at 14 days", closure: "Entitlement absent from the target system",
    rollout: "Expand",
    sources: [["SAILPOINT", "PRIMARY"], ["ORACLE_EBS", "SUPPORTING"], ["SERVICENOW", "SUPPORTING"]],
  },

  // ---- Segregation of duties
  {
    id: "SOD-001", family: "SOD", name: "Create vendor and approve payment",
    condition: "One user can both create or edit suppliers and approve payments in the ERP.",
    evidence: "ERP responsibilities and functions per user; SoD rule set",
    agent: "SOD", response: "Apply mitigating control", owner: "Finance controller",
    policy: "Controller removes one side or documents a mitigating control", closure: "Conflict removed or mitigating control attached",
    rollout: "Start", reporter: "SOX.ITGC.SOD-01", event: "SOD_P2P_CONFLICT",
    sources: [["ORACLE_EBS", "PRIMARY"]],
  },
  {
    id: "SOD-002", family: "SOD", name: "Developer with production deploy rights",
    condition: "A user can merge code and deploy it to production without a second approver.",
    evidence: "Repository permissions; branch protection; deployment roles",
    agent: "SOD", response: "Open access review", owner: "Engineering manager",
    policy: "Require a second approver or remove deploy rights", closure: "Branch protection enforced or role removed",
    rollout: "Expand",
    sources: [["GITHUB", "PRIMARY"], ["AWS", "SUPPORTING"]],
  },
  {
    id: "SOD-003", family: "SOD", name: "Mitigating control expired",
    condition: "A documented SoD exception has passed its expiry date and the conflict still exists.",
    evidence: "Mitigating control register; current conflicts",
    agent: "SOD", response: "Escalate to manager", owner: "Finance controller",
    policy: "Renew the control or remove the conflict within 30 days", closure: "Control renewed or conflict resolved",
    rollout: "Validate later",
    sources: [["ORACLE_EBS", "PRIMARY"]],
  },

  // ---- Non-human identities
  {
    id: "NHI-001", family: "NHI", name: "Service account without owner",
    condition: "A service account or API key has no accountable human owner recorded.",
    evidence: "Service account inventory; ownership assignments",
    agent: "NHI", response: "Assign owner", owner: "Platform owner",
    policy: "Platform owner claims within 14 days or the account is disabled", closure: "Owner recorded on the account",
    rollout: "Start", event: "NHI_ORPHANED",
    sources: [["OKTA", "SUPPORTING"], ["AWS", "PRIMARY"], ["OCI", "PRIMARY"]],
  },
  {
    id: "NHI-002", family: "NHI", name: "Credential past rotation policy",
    condition: "A secret, key or token is older than its rotation policy allows.",
    evidence: "Credential creation dates; rotation policy per class",
    agent: "NHI", response: "Rotate credential", owner: "Service owner",
    policy: "Rotate automatically where supported; otherwise ticket the owner", closure: "New credential issued and old one revoked",
    rollout: "Start", reporter: "ISO27001.A.5.17",
    sources: [["AWS", "PRIMARY"], ["OCI", "PRIMARY"], ["CYBERARK", "SUPPORTING"]],
  },
  {
    id: "NHI-003", family: "NHI", name: "Secret committed to repository",
    condition: "A credential pattern is detected in a source repository's history.",
    evidence: "Secret scanning alerts",
    agent: "NHI", response: "Rotate credential", owner: "Repository owner",
    policy: "Rotate immediately and purge from history", closure: "Credential revoked and alert closed",
    rollout: "Expand",
    sources: [["GITHUB", "PRIMARY"], ["SPLUNK", "SUPPORTING"]],
  },

  // ---- Cloud entitlements
  {
    id: "CLD-001", family: "CLOUD", name: "Wildcard IAM policy",
    condition: "An IAM policy grants all actions on all resources outside the break-glass group.",
    evidence: "IAM policy documents and attachments",
    agent: "CLOUD", response: "Raise ticket", owner: "Cloud platform team",
    policy: "Replace with a scoped policy within 30 days", closure: "Policy scoped or detached",
    rollout: "Start", reporter: "CIS.AWS.1.16",
    sources: [["AWS", "PRIMARY"], ["OCI", "PRIMARY"]],
  },
  {
    id: "CLD-002", family: "CLOUD", name: "Unused cloud permission",
    condition: "A granted permission has not been exercised in 90 days.",
    evidence: "IAM grants; access activity logs",
    agent: "CLOUD", response: "Right-size access", owner: "Cloud platform team",
    policy: "Propose a reduced policy for owner approval", closure: "Reduced policy applied",
    rollout: "Expand",
    sources: [["AWS", "PRIMARY"], ["OCI", "PRIMARY"], ["SPLUNK", "SUPPORTING"]],
  },
  {
    id: "CLD-003", family: "CLOUD", name: "Cross-tenancy trust to unknown account",
    condition: "A role trust policy allows assumption from an account outside the approved list.",
    evidence: "Role trust policies; approved account registry",
    agent: "CLOUD", response: "Notify security", owner: "Security operations",
    policy: "Security validates the trust or removes it", closure: "Trust removed or account added to the registry",
    rollout: "Validate later",
    sources: [["AWS", "PRIMARY"]],
  },

  // ---- Authentication and MFA
  {
    id: "ATH-001", family: "AUTHN", name: "User without MFA",
    condition: "An active workforce identity has no MFA factor enrolled.",
    evidence: "Factor enrollment per user",
    agent: "AUTH", response: "Enforce enrollment", owner: "Identity operations",
    policy: "Force enrollment at next sign-in", closure: "At least one strong factor enrolled",
    rollout: "Start", reporter: "ISO27001.A.8.5", event: "MFA_NOT_ENROLLED",
    sources: [["OKTA", "PRIMARY"], ["ENTRA", "PRIMARY"]],
  },
  {
    id: "ATH-002", family: "AUTHN", name: "Legacy authentication in use",
    condition: "Sign-ins are succeeding over a protocol that bypasses MFA.",
    evidence: "Sign-in logs with protocol",
    agent: "AUTH", response: "Block protocol", owner: "Identity operations",
    policy: "Block after a 14-day notice to affected users", closure: "No legacy sign-ins in the last 14 days",
    rollout: "Expand",
    sources: [["ENTRA", "PRIMARY"], ["SPLUNK", "SUPPORTING"]],
  },
  {
    id: "ATH-003", family: "AUTHN", name: "Impossible travel sign-in",
    condition: "Two sign-ins for one user occur from locations too far apart for the time between them.",
    evidence: "Sign-in logs with geolocation",
    agent: "AUTH", response: "Notify security", owner: "Security operations",
    policy: "Revoke sessions and require re-authentication", closure: "Sessions revoked and user verified",
    rollout: "Validate later",
    sources: [["OKTA", "PRIMARY"], ["SPLUNK", "PRIMARY"]],
  },

  // ---- Data access
  {
    id: "DAT-001", family: "DATA", name: "Broad access to sensitive dataset",
    condition: "More than 50 users can read a dataset classified as restricted.",
    evidence: "Dataset classification; grants per dataset",
    agent: "DATA", response: "Open access review", owner: "Data owner",
    policy: "Data owner certifies each grant", closure: "Review complete and excess grants revoked",
    rollout: "Expand",
    sources: [["SNOWFLAKE", "PRIMARY"]],
  },
  {
    id: "DAT-002", family: "DATA", name: "Shared account on data platform",
    condition: "A data platform login is used from more than one person's device.",
    evidence: "Login history with client fingerprint",
    agent: "DATA", response: "Raise ticket", owner: "Data owner",
    policy: "Replace with named accounts within 30 days", closure: "Shared login disabled",
    rollout: "Validate later",
    sources: [["SNOWFLAKE", "PRIMARY"], ["SPLUNK", "SUPPORTING"]],
  },
];

const FAMILY_ORDER = new Map(FAMILIES.map((f, i) => [f.code, i + 1]));
const FAMILY_NAME = new Map(FAMILIES.map((f) => [f.code, f.name]));

export const MOCK_DETECTORS: Detector[] = SEEDS.map((s) => {
  const sources = s.sources.map(([code, contribution]) => {
    const c = CONNECTORS[code];
    return { code: c.code, name: c.name, vendor: c.vendor, category: c.category, status: c.status, contribution };
  });
  return {
    detector_id: s.id,
    signal_family_code: s.family,
    signal_family: FAMILY_NAME.get(s.family)!,
    family_order: FAMILY_ORDER.get(s.family)!,
    name: s.name,
    finding_condition: s.condition,
    evidence_inputs: s.evidence,
    likely_source: sources.filter((x) => x.contribution === "PRIMARY").map((x) => x.name).join(", "),
    agent_code: s.agent,
    agent_name: AGENTS[s.agent],
    agent_state: "ACTIVE",
    default_response: s.response,
    accountable_owner: s.owner,
    action_policy: s.policy,
    closure_evidence: s.closure,
    rollout_phase: s.rollout,
    reporter_mapping: s.reporter,
    implemented_event_code: s.event ?? null,
    is_implemented: !!s.event,
    configured_sources: sources.filter((x) => x.status === "CONFIGURED").length,
    total_sources: sources.length,
    sources,
  };
});

export const MOCK_SIGNAL_FAMILIES: SignalFamily[] = FAMILIES.map((f, i) => {
  const ds = MOCK_DETECTORS.filter((d) => d.signal_family_code === f.code);
  const configured = new Set(
    ds.flatMap((d) => d.sources ?? []).filter((x) => x.status === "CONFIGURED").map((x) => x.code)
  );
  return {
    code: f.code,
    name: f.name,
    sort_order: i + 1,
    detector_count: ds.length,
    implemented_count: ds.filter((d) => d.is_implemented).length,
    start_phase_count: ds.filter((d) => d.rollout_phase === "Start").length,
    configured_sources: configured.size,
    agents: [...new Set(ds.map((d) => d.agent_code))],
  };
});

export const MOCK_SUMMARY: CatalogSummary = {
  detectors: MOCK_DETECTORS.length,
  implemented: MOCK_DETECTORS.filter((d) => d.is_implemented).length,
  families: MOCK_SIGNAL_FAMILIES.length,
  agents: new Set(MOCK_DETECTORS.map((d) => d.agent_code)).size,
  phase_start: MOCK_DETECTORS.filter((d) => d.rollout_phase === "Start").length,
};
