"use client";

// The definition editor's tabs, ported from the deployed Continuous
// Assurance console (graph.keyforge.ai/cc/definitions/:id): General (with
// the SLA chosen from a dropdown), Detection, Governance policy, SLA,
// Scope, Notifications. SlaTab and ActionBindingsTab are kept in the codebase but
// are not shown in the editor's tab bar.

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Play, Plus, Trash2 } from "lucide-react";
import {
  useExecutors, useMitigationControls, useNotifications,
} from "@/hooks/useAssuranceEvents";
import { Definitions } from "@/lib/assurance-events-api";
import { Controls, ccRequest, type Control } from "@/lib/controls-api";
import { CC_DEFINITIONS_KEY, CcDefinitions } from "@/lib/cc-definitions-api";
import { ACTIONS_BASE, ACTIONS_KEY, Actions, type ActionType } from "@/lib/cc-actions-api";
import { SLA_POLICIES_KEY, Slas, applySlaPolicy, matchSlaPolicy } from "@/lib/assurance-sla";
import { NotificationBindings, listEmailTemplates } from "@/lib/assurance-notification-bindings";
import type {
  EventDefinition, GovernanceRule, SlaPreviewResult, SlaRule, UUID,
} from "@/lib/assurance-events-api";
import { formatAbsolute } from "@/lib/assurance-format";
import {
  BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, INPUT, INPUT_BASE, LABEL, LookupSelect, Modal, Spinner, TBODY, TD, TH, THEAD_ROW, cx,
} from "../ui";
import { EscalationChainEditor, JsonField, KeyValueList, Section, StateBadge } from "./fields";

export type TabProps = {
  dto: EventDefinition;
  patch: (p: Partial<EventDefinition>) => void;
  ro: boolean;
  id: UUID;
};

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
    <Section title="Fallback SLA"
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

// The console's Detector tab (graph.keyforge.ai/console#/definitions/{id}):
// the definition's detector — a family and the library controls linked to it
// (every control must hold) — plus the effective condition the service
// resolves on every read. Controls come from the Control Library
// (GET /compliance/controls?state=ACTIVE, GET /compliance/detection-families).

interface DetectorView {
  family?: string;
  controls?: Array<{
    code: string; name?: string; version?: number; pinned?: boolean; latestActiveVersion?: number;
    condition?: { expression?: string };
  }>;
  options?: Record<string, unknown>;
  // Resolved by the service on read:
  source?: string;
  combinator?: string;
  effectiveCondition?: string;
  effectiveExpression?: string;
  inlineExpression?: string;
  warnings?: string[];
}

export function DetectionTab({ dto, patch, ro }: TabProps) {
  const controlsQ = useQuery({ queryKey: ["continuouscompliance", "controls", "list", { state: "ACTIVE" }], queryFn: () => Controls.list({ state: "ACTIVE" }) });
  const familiesQ = useQuery({ queryKey: ["continuouscompliance", "controls", "families"], queryFn: Controls.families });
  const [pick, setPick] = useState("");

  const detector = ((dto as unknown as { detector?: DetectorView }).detector ?? {}) as DetectorView;
  const resolved = "effectiveCondition" in detector || "source" in detector ? detector : undefined;
  const family = detector.family || (String(dto.eventTypeCode || "").startsWith("IGA_DQ") ? "APPROVAL_DQ" : "PUSH");
  const codes = (detector.controls ?? []).map((c) => String(c.code));

  // The library: a tenant control overrides a system control of the same code.
  const library = new Map<string, Control>();
  for (const c of (Array.isArray(controlsQ.data) ? controlsQ.data : [])) {
    if (!library.has(c.code) || !c.system) library.set(c.code, c);
  }
  const available = [...library.values()].filter((c) => c.familyCode === family && !codes.includes(c.code));

  const setControls = (next: string[], fam = family) =>
    patch({
      detector: {
        family: fam,
        controls: next.map((code) => ({ code })),
        ...(fam === family && detector.options && Object.keys(detector.options).length ? { options: detector.options } : {}),
      },
    } as unknown as Partial<EventDefinition>);
  const move = (i: number, by: number) => {
    const next = [...codes];
    const [c] = next.splice(i, 1);
    next.splice(i + by, 0, c);
    setControls(next);
  };

  return (
    <>
      {resolved?.source === "INLINE" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <b>Legacy inline expression:</b> <code>{resolved.inlineExpression}</code> is still evaluated as-is, but a definition can no
          longer be saved with an expression. Link the equivalent library controls below and save: the links replace it.
        </div>
      )}

      <Section
        title="Linked Controls"
        hint="Every linked control must hold (ALL). All controls must belong to the detection family."
        actions={<Link href="/assurance-events/control-library" className={cx(BTN_SECONDARY, "text-xs")}>Open Control Library</Link>}
      >
        <div className="max-w-md">
          <label className={LABEL}>Detection family</label>
          <select className={INPUT} value={family} disabled={ro}
                  onChange={(e) => (!codes.length || confirm("Changing the family clears the linked controls. Continue?")) && setControls([], e.target.value)}>
            {(familiesQ.data?.families?.length ? familiesQ.data.families : [{ code: family }]).map((f) => (
              <option key={f.code} value={f.code}>
                {f.code}{typeof f.displayName === "string" && f.displayName ? ` — ${f.displayName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>#</th><th className={TH}>Control</th><th className={TH}>Name</th>
                <th className={TH}>Version</th><th className={TH}>Condition</th>{!ro && <th className={TH}></th>}
              </tr>
            </thead>
            <tbody className={TBODY}>
              {codes.map((code, i) => {
                const lib = library.get(code);
                const linked = resolved?.controls?.find((c) => c.code === code);
                return (
                  <tr key={code}>
                    <td className={TD}>{i + 1}</td>
                    <td className={TD}>
                      <span className="font-mono text-xs font-semibold text-gray-900">{code}</span>
                      {lib && (
                        <span className={cx("ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          lib.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                          {lib.system ? "System" : "Tenant"}
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      {lib?.name || linked?.name || <span className="text-red-600">Not in the library (ACTIVE)</span>}
                    </td>
                    <td className={cx(TD, "text-xs text-gray-500")}>
                      {linked?.pinned ? (
                        <>
                          pinned v{linked.version}
                          {linked.latestActiveVersion && linked.latestActiveVersion !== linked.version && (
                            <span className="text-amber-700"> · v{linked.latestActiveVersion} available</span>
                          )}
                        </>
                      ) : lib ? `latest ACTIVE v${lib.version} (pinned on activation)` : "—"}
                    </td>
                    <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>
                      {lib?.condition?.expression || linked?.condition?.expression || "—"}
                      {!!lib?.parameters?.length && (
                        <div className="text-gray-500 mt-1">
                          params: {lib.parameters.map((p) => `${p.name}=${JSON.stringify(p.default)}`).join(", ")}
                        </div>
                      )}
                    </td>
                    {!ro && (
                      <td className={cx(TD, "whitespace-nowrap")}>
                        <button className={BTN_GHOST} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
                        <button className={BTN_GHOST} disabled={i === codes.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
                        <button className={cx(BTN_GHOST, "text-red-600")} onClick={() => setControls(codes.filter((c) => c !== code))} aria-label="Remove">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!codes.length && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No controls linked — the scanner skips a definition without controls.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!ro && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={cx(INPUT_BASE, "w-96 max-w-full")} value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Add a {family} control…</option>
              {available.map((c) => (
                <option key={c.controlId} value={c.code}>{c.code} — {c.name}{c.system ? "" : " (tenant)"}</option>
              ))}
            </select>
            <button className={cx(BTN_SECONDARY, "text-xs")} disabled={!pick} onClick={() => { setControls([...codes, pick]); setPick(""); }}>
              <Plus size={12} /> Add
            </button>
            <span className="text-xs text-gray-500">
              {controlsQ.isLoading ? "Loading controls…" : `${available.length} ACTIVE control(s) of family ${family} available`}
            </span>
          </div>
        )}
      </Section>

      <Section title="Effective Condition" hint="Read-only; resolved by the service on every read.">
        {resolved ? (
          <KeyValueList rows={[
            ["Source", <StateBadge key="s" value={resolved.source} />],
            ["Family", `${resolved.family ?? family}${resolved.combinator ? ` · combinator ${resolved.combinator}` : ""}`],
            ["Condition", <b key="c">{resolved.effectiveCondition || "—"}</b>],
            ["Expression", <span key="e" className="font-mono text-xs [overflow-wrap:anywhere]">{resolved.effectiveExpression || "—"}</span>],
            ["Warnings", resolved.warnings?.length
              ? <span key="w" className="text-amber-700">{resolved.warnings.map((w) => `△ ${w}`).join(" · ")}</span>
              : <span key="w" className="text-green-700">None</span>],
          ]} />
        ) : (
          <div className="text-sm text-gray-500">Saved definitions show the resolved condition here.</div>
        )}
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------
// Governance policy
// ---------------------------------------------------------------------

// Governance policy — one row per rule of governancePolicy.rules: Rule Name
// (the rule's id), When (its CEL condition), Then (the action it runs and its
// parameters, or what else the rule decides), the action's Target and
// Auto-Execution (from the action library), and the rule's Justification.
// "Add Rule" builds rules: a name, a When condition, one or more actions from
// the ACTIVE action library with their parameter values, and a justification.
// A service rule runs one action, so a rule with several actions is saved as
// one rule per action (name, name-2, …) sharing the When and Justification.
// Changes are kept in the editor until the definition is saved.

/** GET /compliance/definitions/{id} → actions: the actions the definition names (derived on save, pinned on activation). */
interface ActionsUsedView {
  items?: Array<{ code: string; version?: number; name?: string; state?: string; targetKind?: string; autoExecution?: string }>;
}

const asText = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

/** ACTIVE action library, a tenant action overriding a system action of the same code. */
function useActiveActions() {
  const q = useQuery({ queryKey: [...ACTIONS_KEY, "list", { state: "ACTIVE" }], queryFn: () => Actions.list({ state: "ACTIVE" }) });
  const byCode = new Map<string, ActionType>();
  for (const a of q.data ?? []) if (!byCode.has(a.code) || !a.system) byCode.set(a.code, a);
  return { ...q, actions: [...byCode.values()].sort((x, y) => x.code.localeCompare(y.code)), byCode };
}

export function GovernanceTab({ dto, patch, ro }: TabProps) {
  const rules = dto.governancePolicy?.rules ?? [];
  const used = (dto as unknown as { actions?: ActionsUsedView }).actions?.items ?? [];
  const library = useActiveActions();
  const [adding, setAdding] = useState(false);
  const actionFor = (code?: string) => (code ? used.find((a) => a.code === code) ?? library.byCode.get(code) : undefined);
  const setRules = (next: GovernanceRule[]) => patch({ governancePolicy: { ...dto.governancePolicy, rules: next } });

  return (
    <Section
      title="Governance Policy"
      hint="Rules in order: the first rule whose When holds decides what happens to the finding. New rules are kept until you save the definition."
      actions={!ro && (
        <button className={cx(BTN_SECONDARY, "text-xs")} onClick={() => setAdding(true)}>
          <Plus size={12} /> Add Rule
        </button>
      )}
    >
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Rule Name</th>
              <th className={TH}>When</th>
              <th className={TH}>Then (Action)</th>
              <th className={TH}>Target</th>
              <th className={TH}>Justification</th>
              <th className={TH}>Auto-Execution</th>
              {!ro && <th className={TH}></th>}
            </tr>
          </thead>
          <tbody className={TBODY}>
            {rules.map((rule, i) => {
              const then = (rule.then ?? {}) as Record<string, unknown> & { action?: string; params?: Record<string, unknown> };
              const action = actionFor(then.action);
              const params = Object.entries(then.params ?? {});
              // What a rule without an action decides (decision type, review form, severity …).
              const other = Object.entries(then).filter(([k]) => !["action", "params", "justification", "executor"].includes(k));
              return (
                <tr key={`${rule.id}-${i}`}>
                  <td className={cx(TD, "font-mono text-xs font-semibold text-gray-900 [overflow-wrap:anywhere]")}>{rule.id || "—"}</td>
                  <td className={cx(TD, "font-mono text-xs [overflow-wrap:anywhere]")}>{rule.when || "(always)"}</td>
                  <td className={cx(TD, "text-xs")}>
                    {then.action ? (
                      <>
                        <Link href={`${ACTIONS_BASE}/${encodeURIComponent(then.action)}${action?.version ? `?version=${action.version}` : ""}`}
                              className="font-semibold text-blue-600 hover:text-blue-700">
                          {action?.name || then.action}
                        </Link>
                        <div className="font-mono text-gray-500">{then.action}{action?.version ? ` v${action.version}` : ""}</div>
                        {params.length > 0 && (
                          <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 mt-1.5">
                            {params.map(([k, v]) => (
                              <div key={k} className="contents">
                                <dt className="text-gray-500">{k}</dt>
                                <dd className="font-mono text-gray-900 [overflow-wrap:anywhere]">{asText(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </>
                    ) : other.length ? (
                      <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5">
                        {other.map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-gray-500">{k}</dt>
                            <dd className="font-mono text-gray-900 [overflow-wrap:anywhere]">{asText(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className={cx(TD, "text-xs")}>{action?.targetKind || <span className="text-gray-400">—</span>}</td>
                  <td className={cx(TD, "text-xs [overflow-wrap:anywhere]")}>
                    {then.justification ? asText(then.justification) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className={TD}>
                    {action?.autoExecution ? (
                      <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold",
                        action.autoExecution === "REVIEW_ONLY" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                        {action.autoExecution}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  {!ro && (
                    <td className={TD}>
                      <button className={cx(BTN_GHOST, "px-2 text-red-600")} aria-label={`Remove rule ${rule.id}`}
                              onClick={() => setRules(rules.filter((_, j) => j !== i))}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {!rules.length && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                No rules: findings go to the definition&apos;s reviewer.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <RuleBuilder
          existingIds={rules.map((r) => r.id)}
          library={library}
          onClose={() => setAdding(false)}
          onAdd={(rule) => { setRules([...rules, rule]); setAdding(false); }}
        />
      )}
    </Section>
  );
}

/** A parameter value as typed by the user → the value sent (templates such as ${subject.x} stay strings). */
function paramValue(type: string, raw: string): unknown {
  const v = raw.trim();
  if (v.includes("${")) return v;
  if (type === "integer" || type === "number") return Number.isNaN(Number(v)) ? v : Number(v);
  if (type === "boolean") return v === "true";
  if (type === "string[]" || type === "json") { try { return JSON.parse(v); } catch { return v; } }
  return v;
}

type ActionPick = { code: string; params: Record<string, string> };

const GOVERNANCE_POINTS = ["SEVERITY", "AUTO_REMEDIATION_GATE", "AUTO_DECISION", "REVIEWER"];

function RuleBuilder({ existingIds, library, onClose, onAdd }: {
  existingIds: string[];
  library: ReturnType<typeof useActiveActions>;
  onClose: () => void;
  onAdd: (rule: GovernanceRule) => void;
}) {
  const [name, setName] = useState("");
  const [point, setPoint] = useState("AUTO_REMEDIATION_GATE");
  const [when, setWhen] = useState("");
  const [pick, setPick] = useState<ActionPick>({ code: "", params: {} });
  const [justification, setJustification] = useState("");

  const choose = (code: string) => {
    const a = library.byCode.get(code);
    // Pre-fill each parameter with its suggested template or default.
    const params = Object.fromEntries((a?.parameters ?? []).map((p) => [
      p.name, p.suggested ?? (p.default == null ? "" : typeof p.default === "string" ? p.default : JSON.stringify(p.default)),
    ]));
    setPick({ code, params });
  };
  const setParam = (param: string, value: string) =>
    setPick({ ...pick, params: { ...pick.params, [param]: value } });

  const ruleId = name.trim();
  const a = library.byCode.get(pick.code);
  const problems: string[] = [];
  if (!ruleId) problems.push("Give the rule a name.");
  if (existingIds.includes(ruleId)) problems.push(`A rule named ${ruleId} already exists.`);
  if (!when.trim()) problems.push("Provide the When condition.");
  if (!pick.code) problems.push("Select an action.");
  const missing = (a?.parameters ?? []).filter((x) => x.required && x.default == null && !(pick.params[x.name] ?? "").trim()).map((x) => x.name);
  if (missing.length) problems.push(`${pick.code} needs ${missing.join(", ")}.`);
  if (!justification.trim()) problems.push("Provide the justification.");

  const build = (): GovernanceRule => {
    const params: Record<string, unknown> = {};
    for (const x of a?.parameters ?? []) {
      const raw = pick.params[x.name] ?? "";
      if (raw.trim() !== "") params[x.name] = paramValue(x.type, raw);
    }
    return {
      id: ruleId,
      point,
      when: when.trim(),
      then: { action: pick.code, params, justification: justification.trim() },
    };
  };

  return (
    <Modal title="Add Rule" onClose={onClose} widthClass="max-w-3xl">
      <div className="space-y-5">
        <div>
          <label className={LABEL}>Rule name</label>
          <input className={cx(INPUT, "font-mono")} value={name} placeholder="e.g. assign-fallback" onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Point</label>
          <select className={INPUT} value={point} onChange={(e) => setPoint(e.target.value)}>
            {GOVERNANCE_POINTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>When (CEL condition)</label>
          <input className={cx(INPUT, "font-mono text-xs")} value={when} placeholder="!finding.fallbackAvailable && subject.riskTier == 'HIGH'"
                 onChange={(e) => setWhen(e.target.value)} />
        </div>

        <div className="space-y-3">
          <span className="block text-sm font-semibold text-gray-900">Then — action</span>
          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <div className="flex gap-2 items-start">
              <select className={INPUT} value={pick.code} onChange={(e) => choose(e.target.value)}>
                <option value="">{library.isLoading ? "Loading actions…" : "— Select an action —"}</option>
                {library.actions.map((x) => (
                  <option key={x.code} value={x.code} disabled={x.autoExecution === "REVIEW_ONLY"}>
                    {x.name} ({x.code} v{x.version}){x.autoExecution === "REVIEW_ONLY" ? " — review only" : ""}
                  </option>
                ))}
              </select>
            </div>
            {a?.description && <p className="text-xs text-gray-500">{a.description}</p>}
            {a && (a.parameters ?? []).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(a.parameters ?? []).map((x) => (
                  <div key={x.name}>
                    <label className={LABEL}>
                      {x.label || x.name}{x.required && <span className="text-red-600"> *</span>}
                      <span className="text-xs text-gray-400"> {x.type}</span>
                    </label>
                    {x.enum?.length ? (
                      <select className={INPUT} value={pick.params[x.name] ?? ""} onChange={(e) => setParam(x.name, e.target.value)}>
                        <option value="">—</option>
                        {x.enum.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : x.type === "boolean" ? (
                      <select className={INPUT} value={pick.params[x.name] ?? ""} onChange={(e) => setParam(x.name, e.target.value)}>
                        <option value="">—</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input className={cx(INPUT, "font-mono text-xs")} value={pick.params[x.name] ?? ""}
                             placeholder={x.default != null ? `default ${JSON.stringify(x.default)}` : x.example != null ? String(x.example) : ""}
                             onChange={(e) => setParam(x.name, e.target.value)} />
                    )}
                    {x.help && <p className="text-[11px] text-gray-500 mt-0.5">{x.help}</p>}
                  </div>
                ))}
              </div>
            )}
            {a && !(a.parameters ?? []).length && <p className="text-xs text-gray-500">This action takes no parameters.</p>}
          </div>
          <p className="text-xs text-gray-500">
            Values may be literals or templates such as <code>{"${subject.entitlementId}"}</code>. Review-only actions cannot run from a rule.
          </p>
        </div>

        <div>
          <label className={LABEL}>Justification</label>
          <textarea className={INPUT} rows={2} value={justification} placeholder="Why this rule acts — recorded with the decision"
                    onChange={(e) => setJustification(e.target.value)} />
        </div>

        {problems.length > 0 && (name || when || pick.code || justification) ? (
          <ul className="text-xs text-red-600 list-disc ml-5 space-y-0.5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        ) : null}

        <div className="flex justify-end gap-2">
          <button className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
          <button className={BTN_PRIMARY} disabled={problems.length > 0} onClick={() => onAdd(build())}>
            Add Rule
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// SLA — the console's SLA tab (graph.keyforge.ai/console#/definitions/{id}):
// SLA profiles linked from the SLA library (GET /compliance/sla-profiles),
// the definition's own fallback SLA, and the SLA the service resolves.
// ---------------------------------------------------------------------

interface SlaProfile {
  profileId: string; code: string; name: string; version: number; system: boolean;
  duration?: string; dueAt?: string; appliesWhen?: string; actionOnTimeout?: string;
  escalationChain?: Array<{ atPercent: number; action: string }>;
}
interface ResolvedSlaItem {
  position: number; code: string; name?: string; version?: number; pinned?: boolean; latestActiveVersion?: number;
  duration?: string; dueAt?: string; actionOnTimeout?: string; effectiveWhen?: string;
  escalationChain?: Array<{ atPercent: number; action: string }>;
}
interface ResolvedSla {
  source?: string; resolution?: string; text?: string; items?: ResolvedSlaItem[]; inlineRules?: number; warnings?: string[];
  fallback?: { duration?: string; actionOnTimeout?: string; escalationChain?: Array<{ atPercent: number; action: string }> };
}
type SlaLink = { code: string; when?: string | null };

const chainText = (c?: Array<{ atPercent: number; action: string }>) =>
  c?.length ? c.map((s) => `${s.atPercent}% ${s.action}`).join(" → ") : "no escalation";

export function SlaProfilesTab({ dto, patch, ro, id }: TabProps) {
  const profilesQ = useQuery({
    queryKey: ["continuouscompliance", "sla-profiles", { state: "ACTIVE" }],
    queryFn: async () => {
      const rows = await ccRequest<SlaProfile[]>("GET", "/compliance/sla-profiles", { query: { state: "ACTIVE" } });
      return Array.isArray(rows) ? rows : [];
    },
  });
  // The saved definition (same query as the editor) carries the resolved SLA view.
  const savedQ = useQuery({ queryKey: [...CC_DEFINITIONS_KEY, "detail", id], queryFn: () => CcDefinitions.get(id) });
  const savedSla = (savedQ.data as unknown as { sla?: ResolvedSla & { items?: Array<ResolvedSlaItem & { when?: string }> } } | undefined)?.sla;
  const resolved = savedSla && "text" in savedSla ? savedSla : undefined;
  const [pick, setPick] = useState("");

  const sla = (dto as unknown as { sla?: { resolution?: string; items?: Array<{ code: string; when?: string | null }> } }).sla;
  const resolution = sla?.resolution || resolved?.resolution || "FIRST_MATCH";
  const links: SlaLink[] = (sla?.items ?? []).map((i) => ({ code: String(i.code), when: i.when || null }));
  const setLinks = (next: SlaLink[], res = resolution) =>
    patch({ sla: { resolution: res, items: next.map((l) => ({ code: l.code, ...(l.when ? { when: l.when } : {}) })) } } as unknown as Partial<EventDefinition>);
  const move = (i: number, by: number) => {
    const next = [...links];
    const [l] = next.splice(i, 1);
    next.splice(i + by, 0, l);
    setLinks(next);
  };

  // The library: a tenant profile overrides a system profile of the same code.
  const library = new Map<string, SlaProfile>();
  for (const p of profilesQ.data ?? []) if (!library.has(p.code) || !p.system) library.set(p.code, p);
  const available = [...library.values()].filter((p) => !links.some((l) => l.code === p.code));
  const savedLinks = (resolved?.items ?? []).map((i) => i.code).join(",");
  const unsaved = !!resolved && (links.map((l) => l.code).join(",") !== savedLinks || resolution !== resolved.resolution);

  return (
    <>
      {resolved?.source === "INLINE" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <b>Legacy inline SLA rules:</b> {resolved.inlineRules} rule(s) are still evaluated as-is, but a definition can no longer be
          saved with inline rules. Link the equivalent SLA profiles below and save: the links replace the rules.
        </div>
      )}

      <Section
        title="Linked SLA Profiles"
        hint="In priority order: the first applicable profile wins (or the earliest deadline under STRICTEST)."
        actions={<Link href={SLA_PAGE} className={cx(BTN_SECONDARY, "text-xs")}>Open SLA library</Link>}
      >
        <div className="max-w-md">
          <label className={LABEL}>Resolution</label>
          <select className={INPUT} value={resolution} disabled={ro} onChange={(e) => setLinks(links, e.target.value)}>
            <option value="FIRST_MATCH">FIRST_MATCH — the first applicable profile sets the SLA</option>
            <option value="STRICTEST">STRICTEST — the earliest deadline of all applicable profiles wins</option>
          </select>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>#</th>
                <th className={TH}>Profile · Condition</th>
                <th className={TH}>Deadline · Timeout · Escalation</th>
                <th className={TH}>Version</th>
                {!ro && <th className={TH}></th>}
              </tr>
            </thead>
            <tbody className={TBODY}>
              {links.map((l, i) => {
                const lib = library.get(l.code);
                const saved = resolved?.items?.find((x) => x.code === l.code);
                return (
                  <tr key={l.code}>
                    <td className={TD}>{i + 1}</td>
                    <td className={cx(TD, "min-w-[320px]")}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-gray-900">{l.code}</span>
                        {lib && (
                          <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            lib.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                            {lib.system ? "System" : "Tenant"}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {lib?.name || saved?.name || <span className="text-red-600">Not in the library (ACTIVE)</span>}
                        </span>
                      </div>
                      <input className={cx(INPUT, "font-mono text-xs mt-2")} value={l.when ?? ""} readOnly={ro}
                             placeholder={lib?.appliesWhen || (lib ? "true (unconditional)" : "")}
                             title="Leave empty to use the profile's own condition"
                             onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, when: e.target.value || null } : x)))} />
                      {l.when && lib?.appliesWhen && (
                        <div className="text-xs text-gray-500 mt-1">overrides: <span className="font-mono">{lib.appliesWhen}</span></div>
                      )}
                    </td>
                    <td className={cx(TD, "text-xs text-gray-600")}>
                      <span className="font-mono">{lib ? (lib.dueAt ? "dueAt expression" : lib.duration) : saved?.duration || "—"}</span>
                      {" · "}{lib?.actionOnTimeout || saved?.actionOnTimeout || "definition default"}
                      <div className="mt-0.5">{chainText(lib?.escalationChain ?? saved?.escalationChain)}</div>
                    </td>
                    <td className={cx(TD, "text-xs text-gray-500 whitespace-nowrap")}>
                      {saved?.pinned ? (
                        <>
                          pinned v{saved.version}
                          {saved.latestActiveVersion && saved.latestActiveVersion !== saved.version && (
                            <div className="text-amber-700">v{saved.latestActiveVersion} available</div>
                          )}
                        </>
                      ) : lib ? `latest v${lib.version}` : "—"}
                    </td>
                    {!ro && (
                      <td className={cx(TD, "whitespace-nowrap")}>
                        <button className={BTN_GHOST} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
                        <button className={BTN_GHOST} disabled={i === links.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
                        <button className={cx(BTN_GHOST, "text-red-600")} onClick={() => setLinks(links.filter((x) => x.code !== l.code))} aria-label="Remove">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!links.length && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  No profiles linked — every event gets the fallback SLA below.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          DRAFT links follow the latest ACTIVE version of each code (the tenant&apos;s own before the system one); activation pins them.
        </p>

        {!ro && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={cx(INPUT_BASE, "w-[28rem] max-w-full")} value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Add an ACTIVE SLA profile…</option>
              {available.map((p) => (
                <option key={p.profileId} value={p.code}>
                  {p.code} — {p.name} ({p.dueAt ? "dueAt" : p.duration}{p.appliesWhen ? "" : ", unconditional"}){p.system ? "" : " (tenant)"}
                </option>
              ))}
            </select>
            <button className={cx(BTN_SECONDARY, "text-xs")} disabled={!pick} onClick={() => { setLinks([...links, { code: pick }]); setPick(""); }}>
              <Plus size={12} /> Add
            </button>
            <span className="text-xs text-gray-500">
              {profilesQ.isLoading ? "Loading profiles…" : `${available.length} ACTIVE profile(s) available · link an unconditional profile last as the effective default`}
            </span>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Fallback SLA" hint="The definition's own SLA, used when no profile applies.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Duration (ISO-8601)</label>
              <input className={cx(INPUT, "font-mono")} value={dto.slaDuration ?? ""} readOnly={ro}
                     onChange={(e) => patch({ slaDuration: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Action on timeout</label>
              <select className={INPUT} value={dto.defaultActionOnTimeout ?? ""} disabled={ro}
                      onChange={(e) => patch({ defaultActionOnTimeout: e.target.value })}>
                {[...new Set([...TIMEOUT_ACTIONS, dto.defaultActionOnTimeout].filter(Boolean))].map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Escalation chain (also used by a profile that does not override the chain)</label>
            <EscalationChainEditor chain={dto.escalationChain ?? []} readOnly={ro} onChange={(c) => patch({ escalationChain: c })} />
          </div>
        </Section>

        <Section title="Resolved SLA" hint="Read-only; resolved by the service on every read.">
          {resolved ? (
            <KeyValueList rows={[
              ["Source", <StateBadge key="s" value={resolved.source} />],
              ["Resolution", resolved.resolution ?? "—"],
              ["Order", <b key="o">{resolved.text || "—"}</b>],
              ["Items", resolved.items?.length ? (
                <div key="i" className="space-y-1">
                  {resolved.items.map((it) => (
                    <div key={it.position}>
                      {it.position}. <b>{it.code}</b>{it.version ? ` v${it.version}` : ""}{" "}
                      <span className="text-xs text-gray-500">
                        ({it.pinned ? "pinned" : "latest"}) · {it.duration || it.dueAt} · {it.actionOnTimeout || "definition default"} · {chainText(it.escalationChain)}
                      </span>
                      <div className="font-mono text-xs text-gray-500">when {it.effectiveWhen}</div>
                    </div>
                  ))}
                </div>
              ) : "None"],
              ["Fallback", resolved.fallback
                ? `${resolved.fallback.duration} · ${resolved.fallback.actionOnTimeout} · ${chainText(resolved.fallback.escalationChain)}` : "—"],
              ["Warnings", resolved.warnings?.length
                ? <span key="w" className="text-amber-700">{resolved.warnings.map((w) => `△ ${w}`).join(" · ")}</span>
                : <span key="w" className="text-green-700">None</span>],
            ]} />
          ) : (
            <div className="text-sm text-gray-500">Saved definitions show the resolved SLA here.</div>
          )}
          {unsaved && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Unsaved links. After save: <b>{links.map((l) => l.code).join(" → ") || "—"} · {dto.slaDuration} fallback</b> ({resolution})
            </div>
          )}
        </Section>
      </div>
    </>
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
