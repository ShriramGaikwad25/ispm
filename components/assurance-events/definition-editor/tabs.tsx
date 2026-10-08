"use client";

// The definition editor's tabs, ported from the deployed Continuous
// Assurance console (graph.keyforge.ai/cc/definitions/:id): General (with
// the SLA chosen from a dropdown), Detection, Governance policy, Scope &
// closure, Action bindings, Notifications. SlaTab is kept for the
// condition editor but is not shown in the editor's tab bar.

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Play, Plus, Trash2 } from "lucide-react";
import {
  useDefinitionUsage, useExecutors, useMitigationControls, useNotifications,
} from "@/hooks/useAssuranceEvents";
import { Definitions } from "@/lib/assurance-events-api";
import { SLA_POLICIES_KEY, Slas, applySlaPolicy, matchSlaPolicy } from "@/lib/assurance-sla";
import { NotificationBindings, listEmailTemplates } from "@/lib/assurance-notification-bindings";
import type {
  DetectionTestResult, EventDefinition, GovernanceRule, SlaPreviewResult, SlaRule, UUID,
} from "@/lib/assurance-events-api";
import { formatAbsolute } from "@/lib/assurance-format";
import {
  BTN_GHOST, BTN_SECONDARY, INPUT, INPUT_BASE, LABEL, LookupSelect, Spinner, TBODY, TD, TH, THEAD_ROW, cx,
} from "../ui";
import { EscalationChainEditor, JsonField, KeyValueList, Section, StateBadge } from "./fields";

export type TabProps = {
  dto: EventDefinition;
  patch: (p: Partial<EventDefinition>) => void;
  ro: boolean;
  id: UUID;
};

const GOVERNANCE_POINTS = ["SEVERITY", "AUTO_REMEDIATION_GATE", "AUTO_DECISION", "REVIEWER"];
const SLA_PAGE = "/assurance-events/sla";
const TIMEOUT_ACTIONS = ["ESCALATE", "AUTO_REVOKE", "AUTO_ACCEPT", "QUARANTINE", "NO_OP"];

// ---------------------------------------------------------------------
// General
// ---------------------------------------------------------------------

export function GeneralTab({ dto, patch, ro }: TabProps) {
  return (
    <>
      <Section title="Identity, ownership and reviewer">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Code</label>
            <input className={cx(INPUT, "font-mono")} value={dto.code} disabled />
          </div>
          <div>
            <label className={LABEL}>Event type</label>
            <input className={cx(INPUT, "font-mono")} value={dto.eventTypeCode} disabled={ro}
                   onChange={(e) => patch({ eventTypeCode: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className={LABEL}>Severity</label>
            <LookupSelect domain="SEVERITY" value={dto.severity} disabled={ro}
                          onChange={(v) => !ro && patch({ severity: v })} />
          </div>
          <div className="md:col-span-3">
            <label className={LABEL}>Name</label>
            <input className={INPUT} value={dto.name} disabled={ro} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className={LABEL}>Description</label>
            <textarea className={INPUT} rows={2} value={dto.description ?? ""} disabled={ro}
                      onChange={(e) => patch({ description: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Owner role</label>
            <input className={INPUT} value={dto.ownerRole ?? ""} disabled={ro}
                   onChange={(e) => patch({ ownerRole: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Reviewer strategy</label>
            <LookupSelect domain="REVIEWER_STRATEGY" value={dto.reviewerStrategy} disabled={ro}
                          onChange={(v) => !ro && patch({ reviewerStrategy: v })} />
          </div>
        </div>
        <JsonField label="Reviewer settings (e.g. fallback chain, role, explicit user)" value={dto.reviewerConfig}
                   readOnly={ro} rows={3} onChange={(v) => patch({ reviewerConfig: v })} />
      </Section>

      <SlaSection dto={dto} patch={patch} ro={ro} />
    </>
  );
}

/** SLA picked from the SLA & escalation policies (managed on the SLA page). */
function SlaSection({ dto, patch, ro }: Pick<TabProps, "dto" | "patch" | "ro">) {
  const slas = useQuery({ queryKey: SLA_POLICIES_KEY, queryFn: Slas.list });
  const policies = slas.data ?? [];
  const selected = matchSlaPolicy(dto, policies);
  const chain = dto.escalationChain ?? [];

  return (
    <Section title="SLA"
             hint="The SLA & escalation policy findings of this definition run under: response time, reminder, escalation and breach handling."
             actions={<Link href={SLA_PAGE} className="text-xs text-blue-700 hover:underline">Manage SLAs</Link>}>
      <div>
        <label className={LABEL} htmlFor="sla-policy">SLA policy</label>
        {slas.isLoading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2"><Spinner /> Loading SLA policies…</div>
        ) : (
          <select id="sla-policy" className={INPUT} disabled={ro} value={selected?.id ?? ""}
                  onChange={(e) => {
                    const p = policies.find((x) => x.id === e.target.value);
                    if (p) patch(applySlaPolicy(p));
                  }}>
            {!selected && <option value="">Custom — {dto.slaDuration}, {dto.defaultActionOnTimeout} on timeout</option>}
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sla} ({p.id}){p.status === "Active" ? "" : ` — ${p.status}`}
              </option>
            ))}
          </select>
        )}
        {slas.error && <div className="text-xs text-red-600 mt-1">Failed to load SLA policies. {(slas.error as Error).message}</div>}
      </div>

      {selected ? (
        <KeyValueList rows={[
          ["Applies to", selected.appliesTo],
          ["SLA", <span key="s" className="font-semibold">{selected.sla}</span>],
          ["Reminder", selected.reminder],
          ["Escalate to", selected.escalation],
          ["Breach action", selected.breach],
          ["Owner", selected.owner],
          ["Status", selected.status],
          ["Applied as", (
            <span key="a" className="text-xs text-gray-600">
              <span className="font-mono">{dto.slaDuration}</span> · <span className="font-mono">{dto.defaultActionOnTimeout}</span> on timeout
              {chain.map((s, i) => <span key={i}> · {s.atPercent}% {s.action}</span>)}
            </span>
          )],
        ]} />
      ) : (
        <KeyValueList rows={[
          ["Duration", <span key="d" className="font-mono">{dto.slaDuration}</span>],
          ["Action on timeout", <span key="t" className="font-mono">{dto.defaultActionOnTimeout}</span>],
          ["Escalation", chain.length === 0 ? <span key="e" className="text-gray-400">none</span> : (
            <span key="e" className="text-xs">{chain.map((s) => `${s.atPercent}% ${s.action}`).join(" · ")}</span>
          )],
        ]} />
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------

const DETECTION_MODES: Array<[string, string, string]> = [
  ["ASSURANCE_CONTROL", "Agent controls", "Domain agents raise this definition from their controls; the definition only governs the response."],
  ["CATALOG_SCAN", "Its own rule", "A CEL condition evaluated for every entitlement in the catalog, from both data feeds."],
];

export function DetectionTab({ dto, patch, ro, id }: TabProps) {
  const [result, setResult] = useState<DetectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const usage = useDefinitionUsage(id);
  const criteria = dto.criteriaDsl ?? { mode: "ASSURANCE_CONTROL" };
  const mode = criteria.mode ?? "ASSURANCE_CONTROL";

  const runTest = async () => {
    setTesting(true);
    try {
      setResult(await Definitions.detectionTest(id, { definition: dto }));
    } catch (e) {
      setResult({ error: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Section title="Who detects this finding">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DETECTION_MODES.map(([value, label, help]) => (
            <label key={value}
                   className={cx("rounded-md border p-3 cursor-pointer",
                     mode === value ? "border-blue-500 bg-blue-50" : "border-gray-200")}>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input type="radio" disabled={ro} checked={mode === value}
                       onChange={() => patch({
                         criteriaDsl: value === "CATALOG_SCAN"
                           ? { mode: value, language: "CEL", expression: criteria.expression ?? "false" }
                           : { mode: value },
                       })} />
                {" "}{label}
              </div>
              <div className="text-xs text-gray-500 mt-1">{help}</div>
            </label>
          ))}
        </div>
      </Section>

      {mode === "CATALOG_SCAN" ? (
        <Section
          title="Detection rule"
          hint="Compiled on save. A runtime error on one entitlement counts as “not matched”."
          actions={(
            <button className={cx(BTN_SECONDARY, "text-xs")} disabled={testing} onClick={runTest}>
              {testing ? <Spinner size={12} /> : <Play size={12} />} Test against the catalog
            </button>
          )}
        >
          <textarea className={cx(INPUT, "font-mono text-xs")} rows={4} value={criteria.expression ?? ""} disabled={ro}
                    onChange={(e) => patch({ criteriaDsl: { ...criteria, expression: e.target.value } })} />
          <div className="text-xs text-gray-500">
            Available: <code>subject</code> (entitlement: name, application, requestable, privileged, riskTier,
            approvalGroup, fallbackGroup, approvalLevel), <code>approvalGroup</code> / <code>fallbackGroup</code>{" "}
            (configured, exists, memberCount, activeCount, invalidCount), <code>chain</code> (declaredLevel, levels,
            level2), <code>desc</code> (present, wordCount, equalsName, generic).
          </div>
          {result && (result.error || result.valid === false ? (
            <div className="text-sm text-red-600">{result.error}</div>
          ) : (
            <div className="text-sm space-y-2">
              <div>
                <b>{result.matched}</b> of {result.evaluated} entitlements would raise a finding
                {result.errors ? ` · ${result.errors} evaluation errors` : ""}.
              </div>
              {(result.samples ?? []).map((s) => (
                <details key={s.entitlement} className="rounded border border-gray-200 px-2 py-1">
                  <summary className="cursor-pointer text-xs">
                    {s.name || s.entitlement}{" "}
                    <span className="text-gray-400">({s.source === "CATALOG_FEED" ? "catalog feed" : "ingested"})</span>
                  </summary>
                  <pre className="text-[11px] overflow-auto max-h-60">{JSON.stringify(s.context, null, 2)}</pre>
                </details>
              ))}
            </div>
          ))}
        </Section>
      ) : (
        <Section title="Agent controls that raise this definition">
          {usage.isLoading ? <Spinner /> : (usage.data?.controls ?? []).length === 0 ? (
            <div className="text-sm text-gray-500">
              No control raises {dto.code} yet. Pick it as the event type when authoring a control in Agent studio.
            </div>
          ) : (
            <ul className="text-sm divide-y divide-gray-100">
              {usage.data!.controls!.map((c) => (
                <li key={c.domain_code + c.code} className="py-1.5 flex items-center justify-between">
                  <span><span className="font-mono text-xs">{c.code}</span> — {c.name}</span>
                  <span className="text-xs text-gray-500">{c.domain_code} agent</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// Governance policy
// ---------------------------------------------------------------------

export function GovernanceTab({ dto, patch, ro }: TabProps) {
  const rules = dto.governancePolicy?.rules ?? [];
  const setRules = (r: GovernanceRule[]) => patch({ governancePolicy: { ...dto.governancePolicy, rules: r } });
  const update = (i: number, p: Partial<GovernanceRule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const move = (i: number, by: number) => {
    const next = [...rules];
    const [r] = next.splice(i, 1);
    next.splice(i + by, 0, r);
    setRules(next);
  };
  const executorFor = (action?: string) =>
    action
      ? dto.actionBindings?.[action] || dto.actionBindings?.["*"] ||
        (action.startsWith("IGA_") ? "iga (default)" : "action-type default")
      : null;

  return (
    <Section
      title="Governance policy — rules evaluated in order"
      hint="SEVERITY rules run first and may change the severity. Then the first true rule decides the branch: run an action, record an automatic decision, or route to a reviewer with a form. No rules (or none true) routes to the definition's reviewer."
      actions={!ro && (
        <button className={cx(BTN_SECONDARY, "text-xs")}
                onClick={() => setRules([...rules, {
                  id: `rule-${rules.length + 1}`, point: "REVIEWER", when: "true", then: { reviewForm: "ASSIGN_APPROVAL_GROUP" },
                }])}>
          <Plus size={12} /> Add rule
        </button>
      )}
    >
      {rules.length === 0 && (
        <div className="text-sm text-gray-500 border border-dashed rounded p-3">
          No rules: findings go to the reviewer named on the General tab.
        </div>
      )}
      {rules.map((rule, i) => (
        <div key={i} className="rounded-md border border-gray-200 p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <input className={cx(INPUT_BASE, "w-48 font-mono text-xs")} value={rule.id} disabled={ro}
                   onChange={(e) => update(i, { id: e.target.value })} />
            <select className={cx(INPUT_BASE, "w-56")} value={rule.point} disabled={ro}
                    onChange={(e) => update(i, { point: e.target.value })}>
              {GOVERNANCE_POINTS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <div className="flex-1" />
            {!ro && (
              <>
                <button className={cx(BTN_GHOST, "px-2")} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp size={13} />
                </button>
                <button className={cx(BTN_GHOST, "px-2")} disabled={i === rules.length - 1} onClick={() => move(i, 1)}
                        aria-label="Move down">
                  <ArrowDown size={13} />
                </button>
                <button className={cx(BTN_GHOST, "px-2 text-red-600")} onClick={() => setRules(rules.filter((_, j) => j !== i))}
                        aria-label="Remove rule">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
          <div>
            <label className={LABEL}>When (CEL)</label>
            <input className={cx(INPUT, "font-mono text-xs")} value={rule.when} disabled={ro}
                   onChange={(e) => update(i, { when: e.target.value })} />
          </div>
          <JsonField
            key={`${i}-${rule.id}`}
            label="Then — action, params (with ${…}), executor, decisionType, mitigations, reviewerStrategy, reviewForm, severity, justification"
            value={rule.then}
            readOnly={ro}
            rows={4}
            onChange={(v) => update(i, { then: v })}
          />
          {rule.then?.action && (
            <div className="text-xs text-gray-500">
              Runs <code>{rule.then.action}</code> on <b>{rule.then.executor ?? executorFor(rule.then.action)}</b>
            </div>
          )}
        </div>
      ))}
    </Section>
  );
}

// ---------------------------------------------------------------------
// SLA policy
// ---------------------------------------------------------------------

export function SlaTab({ dto, patch, ro, id }: TabProps) {
  const policy = dto.slaPolicy ?? { resolution: "FIRST_MATCH", rules: [] };
  const rules = policy.rules ?? [];
  const setPolicy = (p: Partial<typeof policy>) => patch({ slaPolicy: { ...policy, ...p } });
  const update = (i: number, p: Partial<SlaRule>) => setPolicy({ rules: rules.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const updateSla = (i: number, p: Partial<SlaRule["sla"]>) => update(i, { sla: { ...rules[i].sla, ...p } });
  const [context, setContext] = useState<unknown>({
    event: { severity: "HIGH", reopenCount: 0 },
    subject: { privileged: true, riskTier: "HIGH" },
    finding: {},
  });
  const [preview, setPreview] = useState<SlaPreviewResult | null>(null);

  return (
    <>
      <Section
        title="Condition-based SLA"
        hint="Each condition carries its own SLA, evaluated in priority order (lower first). FIRST_MATCH: the first true condition wins. STRICTEST: the shortest deadline wins. None true → the default SLA on the General tab. The chosen SLA is pinned on the finding."
        actions={(
          <div className="flex items-center gap-2">
            <select className={cx(INPUT_BASE, "w-36")} value={policy.resolution ?? "FIRST_MATCH"} disabled={ro}
                    onChange={(e) => setPolicy({ resolution: e.target.value })}>
              <option>FIRST_MATCH</option>
              <option>STRICTEST</option>
            </select>
            {!ro && (
              <button className={cx(BTN_SECONDARY, "text-xs")}
                      onClick={() => setPolicy({
                        rules: [...rules, {
                          id: `sla-rule-${rules.length + 1}`,
                          priority: (rules.at(-1)?.priority ?? 0) + 10,
                          when: "event.severity == 'CRITICAL'",
                          sla: { duration: "PT24H" },
                        }],
                      })}>
                <Plus size={12} /> Add condition
              </button>
            )}
          </div>
        )}
      >
        {rules.length === 0 && (
          <div className="text-sm text-gray-500 border border-dashed rounded p-3">
            No conditions: every finding gets the default SLA.
          </div>
        )}
        {rules.map((rule, i) => (
          <div key={i} className="rounded-md border border-gray-200 p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input className={cx(INPUT_BASE, "w-44 font-mono text-xs")} value={rule.id} disabled={ro}
                     onChange={(e) => update(i, { id: e.target.value })} />
              <label className="text-xs text-gray-500">priority</label>
              <input type="number" className={cx(INPUT_BASE, "w-20")} value={rule.priority ?? ""} disabled={ro}
                     onChange={(e) => update(i, { priority: e.target.value === "" ? null : Number(e.target.value) })} />
              <div className="flex-1" />
              {!ro && (
                <button className={cx(BTN_GHOST, "px-2 text-red-600")} aria-label="Remove condition"
                        onClick={() => setPolicy({ rules: rules.filter((_, j) => j !== i) })}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div>
              <label className={LABEL}>When (CEL)</label>
              <input className={cx(INPUT, "font-mono text-xs")} value={rule.when} disabled={ro}
                     onChange={(e) => update(i, { when: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className={LABEL}>Duration</label>
                <input className={cx(INPUT, "font-mono text-xs")} value={rule.sla.duration ?? ""} disabled={ro}
                       onChange={(e) => updateSla(i, { duration: e.target.value || undefined })} />
              </div>
              <div>
                <label className={LABEL}>Absolute due (wins)</label>
                <input className={cx(INPUT, "font-mono text-xs")} placeholder="${event.detectionPayload.endsAt}"
                       value={rule.sla.dueAt ?? ""} disabled={ro}
                       onChange={(e) => updateSla(i, { dueAt: e.target.value || undefined })} />
              </div>
              <div>
                <label className={LABEL}>On timeout</label>
                <select className={INPUT} value={rule.sla.actionOnTimeout ?? ""} disabled={ro}
                        onChange={(e) => updateSla(i, { actionOnTimeout: e.target.value || undefined })}>
                  <option value="">definition default</option>
                  {TIMEOUT_ACTIONS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>On reopen</label>
                <select className={INPUT} value={rule.sla.onReopen ?? "RESET"} disabled={ro}
                        onChange={(e) => updateSla(i, { onReopen: e.target.value })}>
                  <option>RESET</option>
                  <option>KEEP</option>
                </select>
              </div>
            </div>
            {rule.sla.escalationChain ? (
              <EscalationChainEditor chain={rule.sla.escalationChain} readOnly={ro}
                                     onChange={(c) => updateSla(i, { escalationChain: c })} />
            ) : (
              <div className="text-xs text-gray-500">
                Escalation: definition default{" "}
                {!ro && (
                  <button className={cx(BTN_GHOST, "text-xs px-2 py-1")}
                          onClick={() => updateSla(i, { escalationChain: [{ atPercent: 50, action: "NUDGE", params: {} }] })}>
                    Override
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section
        title="Preview"
        hint="Which SLA a finding with this context would get. Uses the draft as edited, without saving."
        actions={(
          <button className={cx(BTN_SECONDARY, "text-xs")}
                  onClick={async () => {
                    try {
                      setPreview(await Definitions.slaPreview(id, { definition: dto, context }));
                    } catch (e) {
                      setPreview({ error: (e as Error).message });
                    }
                  }}>
            <Play size={12} /> Preview
          </button>
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <JsonField label="Sample context (event / subject / finding)" value={context} onChange={setContext} rows={8} />
          {preview && (preview.error ? (
            <div className="text-sm text-red-600">{preview.error}</div>
          ) : (
            <div className="space-y-2">
              <KeyValueList rows={[
                ["Winning rule", preview.ruleId ? `${preview.ruleId} (priority ${preview.priority ?? "—"})` : "none → definition default"],
                ["Deadline", `${formatAbsolute(preview.dueAt)} (${preview.duration ?? "absolute"})`],
                ["On timeout", preview.actionOnTimeout],
                ["Escalation", (preview.escalationChain ?? []).map((s) => `${s.atPercent}% ${s.action}`).join(" · ") || "—"],
                ["Matched", (preview.matchedRules ?? []).map((m) => m.ruleId).join(", ") || "—"],
              ]} />
              {(preview.notes ?? []).map((n) => <div key={n} className="text-xs text-amber-700">{n}</div>)}
              <table className="text-xs w-full">
                <tbody>
                  {(preview.evaluated ?? []).map((ev) => (
                    <tr key={ev.ruleId}>
                      <td className="font-mono py-0.5">{ev.ruleId}</td>
                      <td>
                        <StateBadge value={ev.result === "TRUE" ? "ACTIVE" : ev.result === "ERROR" ? "FAILED" : ev.result} />
                      </td>
                      <td className="text-red-600">{ev.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------
// Scope & mitigations
// ---------------------------------------------------------------------

const SCOPE_FIELDS: Array<[string, string]> = [
  ["applications", "Applications"], ["accountTypes", "Account types"], ["environments", "Environments"],
  ["dataClassifications", "Data classifications"], ["entitlementTags", "Entitlement tags"], ["regulatory", "Regulatory"],
];

export function ScopeTab({ dto, patch, ro }: TabProps) {
  const mitigations = useMitigationControls();
  const scope = (dto.scope ?? {}) as Record<string, string[]>;
  const allowed = new Set(dto.allowedMitigationCodes ?? []);
  const risk = (dto.riskAcceptanceConfig ?? {}) as { allowed?: boolean; max_duration?: string };

  return (
    <>
      <Section title="Scope">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCOPE_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className={LABEL}>{label} (comma-separated, empty = any)</label>
              <input className={INPUT} disabled={ro} defaultValue={(scope[key] ?? []).join(", ")}
                     onBlur={(e) => patch({
                       scope: { ...scope, [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
                     })} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Allowed mitigations"
               hint="What an owner — or an automatic decision — may apply with APPROVE_WITH_MITIGATION.">
        <div className="flex flex-wrap gap-2">
          {(mitigations.data ?? []).map((m) => (
            <label key={m.code} title={m.description}
                   className={cx("text-xs rounded-full border px-2.5 py-1 cursor-pointer",
                     allowed.has(m.code) ? "border-blue-500 bg-blue-50" : "border-gray-200")}>
              <input type="checkbox" className="mr-1" disabled={ro} checked={allowed.has(m.code)}
                     onChange={(e) => {
                       const next = new Set(allowed);
                       if (e.target.checked) next.add(m.code);
                       else next.delete(m.code);
                       patch({ allowedMitigationCodes: [...next] });
                     }} />
              {m.code}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Closure"
               hint="What must be true before a finding can close: the evidence a reviewer supplies, and whether the risk may be accepted instead of fixed.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Risk acceptance allowed</label>
            <select className={INPUT} disabled={ro} value={String(risk.allowed ?? false)}
                    onChange={(e) => patch({ riskAcceptanceConfig: { ...risk, allowed: e.target.value === "true" } })}>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Maximum acceptance duration</label>
            <input className={cx(INPUT, "font-mono")} disabled={ro} value={risk.max_duration ?? ""}
                   onChange={(e) => patch({ riskAcceptanceConfig: { ...risk, max_duration: e.target.value } })} />
          </div>
        </div>
        <JsonField label="Evidence requirements" value={dto.evidenceRequirements} readOnly={ro} rows={3}
                   onChange={(v) => patch({ evidenceRequirements: v })} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------
// Action bindings
// ---------------------------------------------------------------------

export function ActionBindingsTab({ dto, patch, ro }: TabProps) {
  const executors = useExecutors();
  const bindings = dto.actionBindings ?? {};
  const [newAction, setNewAction] = useState("");

  // Every action this definition can run: the * default, governance rule
  // actions, auto-remediation actions, and anything already bound.
  const actions = (() => {
    const set = new Set<string>(["*"]);
    (dto.governancePolicy?.rules ?? []).forEach((r) => r.then?.action && set.add(r.then.action));
    const auto = (dto.autoRemediationConfig as { actions?: Array<{ code?: string }> } | undefined)?.actions ?? [];
    auto.forEach((a) => a.code && set.add(a.code));
    Object.keys(bindings).forEach((k) => set.add(k));
    return [...set];
  })();

  const setBinding = (action: string, executor: string) => {
    const next = { ...bindings };
    if (executor) next[action] = executor;
    else delete next[action];
    patch({ actionBindings: next });
  };

  return (
    <Section title="Action bindings — action type → executor"
             hint="Resolution order: the rule's own executor → this binding → the * default → the action type's default → iga for IGA_* actions. Only ACTIVE executors that support the action can be bound.">
      {executors.isLoading ? (
        <div className="text-sm text-gray-500 flex items-center gap-2"><Spinner /> Loading executors…</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Action Type</th>
              <th className={TH}>Executor</th>
              <th className={TH}>Kind · State</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {actions.map((action) => {
              const bound = executors.data?.find((e) => e.executor_code === bindings[action]);
              return (
                <tr key={action}>
                  <td className={cx(TD, "font-mono text-xs font-semibold text-gray-900 whitespace-nowrap")}>{action === "*" ? "* (every action)" : action}</td>
                  <td className={TD}>
                    <select className={INPUT} disabled={ro} value={bindings[action] ?? ""}
                            onChange={(e) => setBinding(action, e.target.value)}>
                      <option value="">(not bound)</option>
                      {(executors.data ?? [])
                        .filter((e) => action === "*" || e.supports.includes(action))
                        .map((e) => (
                          <option key={e.executor_code} value={e.executor_code} disabled={e.state !== "ACTIVE"}>
                            {e.executor_code}{e.state === "ACTIVE" ? "" : ` (${e.state})`}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className={TD}>
                    {bound ? (
                      <span className="inline-flex gap-1">
                        <StateBadge value={bound.kind} /> <StateBadge value={bound.state} />
                        {bound.paused && <StateBadge value="PAUSED" />}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
      {!ro && (
        <div className="flex gap-2">
          <input className={cx(INPUT, "w-72 font-mono text-xs")} placeholder="action type code" value={newAction}
                 onChange={(e) => setNewAction(e.target.value.toUpperCase())} />
          <button className={cx(BTN_SECONDARY, "text-xs")} disabled={!newAction}
                  onClick={() => { patch({ actionBindings: { ...bindings, [newAction]: "" } }); setNewAction(""); }}>
            Add action
          </button>
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------

const NOTIFICATIONS_PAGE = "/assurance-events/notifications";

export function NotificationsTab({ ro, id }: TabProps) {
  const qc = useQueryClient();
  const phasesQ = useNotifications();
  const templatesQ = useQuery({ queryKey: ["assurance", "email-templates"], queryFn: listEmailTemplates });
  const bindingsKey = ["assurance", "notification-bindings", id];
  const bindingsQ = useQuery({ queryKey: bindingsKey, queryFn: () => NotificationBindings.get(id) });
  const [error, setError] = useState<string | null>(null);

  if (phasesQ.isLoading || templatesQ.isLoading || bindingsQ.isLoading) {
    return <div className="text-sm text-gray-500 flex items-center gap-2"><Spinner /> Loading notifications…</div>;
  }
  const phases = phasesQ.data?.phases ?? [];
  const templates = (templatesQ.data ?? []).filter((t) => t.active);
  const bindings = bindingsQ.data ?? {};
  const loadError = (phasesQ.error ?? templatesQ.error ?? bindingsQ.error) as Error | null;

  // Saved straight away (not with the definition), so bindings can change on
  // any version. Only the bindings are refreshed: refetching the definition
  // would reset unsaved edits on the other tabs.
  const bind = async (phase: string, templateCode: string) => {
    setError(null);
    try {
      await NotificationBindings.set(id, phase, templateCode || null);
      await qc.invalidateQueries({ queryKey: bindingsKey });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Section title="Notifications per lifecycle phase"
             hint="A phase without a template is skipped silently (the audit still records it)."
             actions={<Link href={NOTIFICATIONS_PAGE} className="text-xs text-blue-700 hover:underline">Manage templates</Link>}>
      {loadError && <div className="text-sm text-red-600">Failed to load notifications. {loadError.message}</div>}
      {!loadError && templates.length === 0 && (
        <div className="text-sm text-amber-700">
          No templates exist yet — create one under <Link href={NOTIFICATIONS_PAGE} className="underline">Notifications</Link>.
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className={THEAD_ROW}>
            <th className={TH}>Lifecycle Phase</th>
            <th className={TH}>Email Template</th>
          </tr>
        </thead>
        <tbody className={TBODY}>
          {phases.map((phase) => {
            const code = bindings[phase] ?? "";
            const missing = code && !templates.some((t) => t.templateCode === code);
            return (
              <tr key={phase}>
                <td className={cx(TD, "font-mono text-xs font-semibold text-gray-900 w-56")}>{phase}</td>
                <td className={TD}>
                  <select className={INPUT} value={code} onChange={(e) => bind(phase, e.target.value)}>
                    <option value="">(no notification)</option>
                    {missing && <option value={code}>{code} (not found)</option>}
                    {templates.map((t) => (
                      <option key={t.id} value={t.templateCode}>{t.templateName} · {t.templateCode}</option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {ro && <div className="text-xs text-gray-500">Notification bindings can be changed on any version.</div>}
    </Section>
  );
}
