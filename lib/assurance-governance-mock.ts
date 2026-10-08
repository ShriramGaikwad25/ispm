// =====================================================================
// Mock support for the definition editor: a small CEL-subset evaluator,
// ISO-8601 durations, the sample entitlement catalog the detection test
// runs against, executors, mitigation controls and notification templates.
// Used by lib/assurance-events-mock.ts while USE_MOCK is true.
//
// The CEL subset covers what the console's rules use: dotted paths,
// strings, numbers, true/false/null, ! && || == != < <= > >= and
// parentheses. It is a parser, not eval — rule text never runs as code.
// =====================================================================

import type { Executor, MitigationControl, NotificationTemplate } from "@/lib/assurance-events-api";

// ---------------------------------------------------------------------
// CEL subset
// ---------------------------------------------------------------------

type Tok = { t: "id" | "str" | "num" | "op" | "lp" | "rp"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(") { out.push({ t: "lp", v: c }); i++; continue; }
    if (c === ")") { out.push({ t: "rp", v: c }); i++; continue; }
    if (c === "'" || c === '"') {
      const end = src.indexOf(c, i + 1);
      if (end < 0) throw new Error(`unterminated string at ${i + 1}`);
      out.push({ t: "str", v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["&&", "||", "==", "!=", "<=", ">="].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    if ("!<>".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    const num = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (num) { out.push({ t: "num", v: num[0] }); i += num[0].length; continue; }
    const id = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)*/.exec(src.slice(i));
    if (id) { out.push({ t: "id", v: id[0] }); i += id[0].length; continue; }
    throw new Error(`unexpected '${c}' at ${i + 1}`);
  }
  return out;
}

type Node =
  | { k: "lit"; v: unknown }
  | { k: "path"; v: string }
  | { k: "not"; e: Node }
  | { k: "bin"; op: string; l: Node; r: Node };

function parse(src: string): Node {
  const toks = tokenize(src);
  if (toks.length === 0) throw new Error("expression is empty");
  let p = 0;
  const peek = () => toks[p];
  const take = () => toks[p++];

  const primary = (): Node => {
    const t = take();
    if (!t) throw new Error("expression ends unexpectedly");
    if (t.t === "lp") {
      const e = or();
      if (take()?.t !== "rp") throw new Error("missing ')'");
      return e;
    }
    if (t.t === "op" && t.v === "!") return { k: "not", e: primary() };
    if (t.t === "str") return { k: "lit", v: t.v };
    if (t.t === "num") return { k: "lit", v: Number(t.v) };
    if (t.t === "id") {
      if (t.v === "true") return { k: "lit", v: true };
      if (t.v === "false") return { k: "lit", v: false };
      if (t.v === "null") return { k: "lit", v: null };
      return { k: "path", v: t.v };
    }
    throw new Error(`unexpected '${t.v}'`);
  };
  const cmp = (): Node => {
    let l = primary();
    while (peek()?.t === "op" && ["==", "!=", "<", "<=", ">", ">="].includes(peek().v)) {
      const op = take().v;
      l = { k: "bin", op, l, r: primary() };
    }
    return l;
  };
  const and = (): Node => {
    let l = cmp();
    while (peek()?.v === "&&") { take(); l = { k: "bin", op: "&&", l, r: cmp() }; }
    return l;
  };
  const or = (): Node => {
    let l = and();
    while (peek()?.v === "||") { take(); l = { k: "bin", op: "||", l, r: and() }; }
    return l;
  };

  const tree = or();
  if (p < toks.length) throw new Error(`unexpected '${toks[p].v}'`);
  return tree;
}

function resolve(path: string, ctx: Record<string, unknown>): unknown {
  let cur: unknown = ctx;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !(part in (cur as object))) {
      throw new Error(`no such field '${path}'`);
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function evalNode(n: Node, ctx: Record<string, unknown>): unknown {
  switch (n.k) {
    case "lit": return n.v;
    case "path": return resolve(n.v, ctx);
    case "not": return !evalNode(n.e, ctx);
    case "bin": {
      if (n.op === "&&") return Boolean(evalNode(n.l, ctx)) && Boolean(evalNode(n.r, ctx));
      if (n.op === "||") return Boolean(evalNode(n.l, ctx)) || Boolean(evalNode(n.r, ctx));
      const l = evalNode(n.l, ctx);
      const r = evalNode(n.r, ctx);
      switch (n.op) {
        case "==": return l === r;
        case "!=": return l !== r;
        case "<": return (l as number) < (r as number);
        case "<=": return (l as number) <= (r as number);
        case ">": return (l as number) > (r as number);
        case ">=": return (l as number) >= (r as number);
      }
    }
  }
  return undefined;
}

/** Throws with a compile message when the expression is not valid CEL (subset). */
export function celCompile(expr: string): void {
  parse(expr);
}

/** Evaluates to a boolean; throws on a compile or runtime error (e.g. a missing field). */
export function celEval(expr: string, ctx: Record<string, unknown>): boolean {
  return Boolean(evalNode(parse(expr), ctx));
}

// ---------------------------------------------------------------------
// ISO-8601 durations (PnDTnHnM subset)
// ---------------------------------------------------------------------

export function durationMs(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso.trim());
  if (!m || iso.trim() === "P" || iso.trim().endsWith("T")) return null;
  const [, w, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return ((((w * 7 + d) * 24 + h) * 60 + min) * 60 + s) * 1000;
}

// ---------------------------------------------------------------------
// Sample catalog for "Test against the catalog"
// ---------------------------------------------------------------------

type Group = { configured: boolean; exists: boolean; memberCount: number; activeCount: number; invalidCount: number };
const group = (configured: boolean, members = 0, active = 0, invalid = 0): Group =>
  ({ configured, exists: configured, memberCount: members, activeCount: active, invalidCount: invalid });

export const SAMPLE_CATALOG: Array<{ entitlement: string; name: string; source: string; context: Record<string, unknown> }> = [
  ["AP_SUPPLIER_MAINT", "AP Supplier Maintenance", "Oracle EBS", true, "HIGH", group(true, 4, 4), group(true, 2, 2), 2, "Maintain supplier master records."],
  ["AP_PAYMENT_APPROVER", "AP Payment Approver", "Oracle EBS", true, "HIGH", group(true, 3, 2, 1), group(false), 2, "Approve payment batches."],
  ["GL_JOURNAL_ENTRY", "GL Journal Entry", "Oracle EBS", false, "MEDIUM", group(true, 12, 12), group(true, 3, 3), 1, ""],
  ["WD_HR_ADMIN", "Workday HR Administrator", "Workday", true, "HIGH", group(false), group(false), 0, "Workday HR Administrator"],
  ["WD_COMP_VIEW", "Compensation Viewer", "Workday", false, "MEDIUM", group(true, 6, 5, 1), group(true, 1, 1), 1, "View compensation data for direct reports."],
  ["AWS_PROD_ADMIN", "AWS Prod Administrator", "AWS", true, "HIGH", group(true, 2, 0, 2), group(true, 1, 1), 2, ""],
  ["AWS_READONLY", "AWS Read Only", "AWS", false, "LOW", group(true, 40, 38, 2), group(true, 2, 2), 1, "Read-only console access."],
  ["OCI_TENANCY_ADMIN", "OCI Tenancy Admin", "OCI", true, "HIGH", group(true, 1, 1), group(false), 2, "Access"],
  ["SN_ITIL", "ServiceNow ITIL", "ServiceNow", false, "LOW", group(true, 120, 117, 3), group(true, 4, 4), 1, "Work incidents and changes."],
  ["SF_DATA_EXPORT", "Snowflake Data Export", "Snowflake", true, "HIGH", group(false), group(false), 0, ""],
  ["GH_ORG_OWNER", "GitHub Org Owner", "GitHub", true, "HIGH", group(true, 3, 3), group(true, 2, 1, 1), 2, "Owns the GitHub organization."],
  ["OKTA_SUPER_ADMIN", "Okta Super Admin", "Okta", true, "HIGH", group(true, 2, 1, 1), group(true, 1, 1), 2, "Okta Super Admin"],
].map(([entitlement, name, application, privileged, riskTier, approvalGroup, fallbackGroup, level, descText], i) => {
  const text = String(descText);
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    entitlement: String(entitlement),
    name: String(name),
    source: i % 3 === 0 ? "CATALOG_FEED" : "INGESTED",
    context: {
      subject: {
        name, application, requestable: i % 4 !== 0, privileged, riskTier,
        approvalGroup: (approvalGroup as Group).configured ? `${application} approvers` : null,
        fallbackGroup: (fallbackGroup as Group).configured ? "Compliance queue" : null,
        approvalLevel: level,
      },
      approvalGroup,
      fallbackGroup,
      chain: { declaredLevel: level, levels: level, level2: Number(level) >= 2 },
      desc: { present: words > 0, wordCount: words, equalsName: text === name, generic: words > 0 && words < 3 },
    },
  };
});

// ---------------------------------------------------------------------
// Executors, mitigation controls, notifications
// ---------------------------------------------------------------------

export const EXECUTORS: Executor[] = [
  { executor_code: "okta-lifecycle", kind: "CONNECTOR", state: "ACTIVE", supports: ["DISABLE_ACCOUNT", "REVOKE_ACCESS", "RESET_MFA"] },
  { executor_code: "sailpoint-provisioning", kind: "CONNECTOR", state: "ACTIVE", supports: ["REVOKE_ACCESS", "DISABLE_ACCOUNT"] },
  { executor_code: "aws-iam-executor", kind: "CONNECTOR", state: "ACTIVE", supports: ["DISABLE_ACCOUNT", "ROTATE_CREDENTIAL", "DETACH_POLICY"] },
  { executor_code: "oci-iam-executor", kind: "CONNECTOR", state: "ACTIVE", paused: true, supports: ["DISABLE_ACCOUNT", "DETACH_POLICY"] },
  { executor_code: "servicenow-itsm", kind: "TICKET", state: "ACTIVE", supports: ["OPEN_TICKET"] },
  { executor_code: "iga", kind: "INTERNAL", state: "ACTIVE", supports: ["IGA_SET_OWNER", "IGA_UPDATE_DESCRIPTION", "IGA_SET_APPROVAL_GROUP"] },
  { executor_code: "cyberark-vault", kind: "CONNECTOR", state: "DRAFT", supports: ["ROTATE_CREDENTIAL"] },
  { executor_code: "legacy-ldap", kind: "CONNECTOR", state: "DEPRECATED", supports: ["DISABLE_ACCOUNT"] },
];

export const MITIGATION_CONTROLS: MitigationControl[] = [
  { code: "MC_MANAGER_ATTESTATION", description: "Manager attests quarterly that the access is still needed." },
  { code: "MC_ENHANCED_MONITORING", description: "Every use of the access is logged and reviewed weekly." },
  { code: "MC_TIME_BOUND_ACCESS", description: "Access expires automatically at a set date." },
  { code: "MC_DUAL_APPROVAL", description: "A second approver signs off every transaction above threshold." },
  { code: "MC_PAYMENT_REVIEW", description: "Finance reviews every payment the user approves." },
  { code: "MC_MONTHLY_RECON", description: "Monthly reconciliation of supplier and payment changes." },
  { code: "MC_IP_ALLOWLIST", description: "Credential only works from approved networks." },
  { code: "MC_SCP_GUARDRAIL", description: "An organization guardrail blocks the riskiest actions." },
];

export const NOTIFICATION_PHASES = ["DETECTED", "ASSIGNED", "SLA_WARNING", "ESCALATED", "DECIDED", "REMEDIATED", "CLOSED"];

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { template_id: "tpl-0001", code: "FINDING_ASSIGNED", channel_code: "EMAIL", bindings: [] },
  { template_id: "tpl-0002", code: "SLA_REMINDER", channel_code: "EMAIL", bindings: [] },
  { template_id: "tpl-0003", code: "ESCALATION_TEAMS", channel_code: "TEAMS", bindings: [] },
  { template_id: "tpl-0004", code: "DECISION_RECEIPT", channel_code: "EMAIL", bindings: [] },
  { template_id: "tpl-0005", code: "SOC_ALERT", channel_code: "SLACK", bindings: [] },
];
