"use client";

// =====================================================================
// Event detail — the Continuous Compliance Console's event page
// (graph.keyforge.ai/console#/events/{id}), read-only, on the same API:
//   GET /compliance/events/{id}            (EventDetailDto)
//   GET /compliance/events/{id}/decisions  (decisions currently allowed)
//   GET /compliance/events/{id}/timeline   (audit ledger)
// Tabs: Summary, SLA, Decisions, Remediations, Mitigations, Comments,
// Audit trail, Raw — laid out like ISPM's gateway pages.
// =====================================================================

import { Fragment, Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCcConnection } from "@/hooks/useCcConnection";
import { CcEvents, subjectLabel, type CcEventDetail } from "@/lib/cc-events-api";
import {
  BTN_LINK, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, PageSpinner,
  Spinner, TBODY, TD, TH, THEAD_ROW, TabBar, cx,
} from "@/components/assurance-events/ui";
import { KeyValueList, SeverityBadge, StateBadge } from "@/components/assurance-events/definition-editor/fields";

const LIST_HREF = "/assurance-events/all-events";
const DEFINITION_HREF = (id: string) => `/assurance-events/event-definitions/${id}`;

type Tab = "summary" | "sla" | "decisions" | "remediations" | "mitigations" | "comments" | "trail" | "raw";
const TABS: Array<[Tab, string]> = [
  ["summary", "Summary"], ["sla", "SLA"], ["decisions", "Decisions"], ["remediations", "Remediations"],
  ["mitigations", "Mitigations"], ["comments", "Comments"], ["trail", "Audit Trail"], ["raw", "Raw"],
];

const fmt = (t?: string | null) =>
  t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

/** A value as text: dates formatted, objects as compact JSON. */
function show(v: unknown): ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-gray-400">—</span>;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmt(v);
  if (typeof v === "object") return <span className="font-mono text-xs break-all">{JSON.stringify(v)}</span>;
  return String(v);
}

/** Key/value list of an object's fields (in `order` first, minus `skip`). */
function Fields({ o, order = [], skip = [] }: { o: Record<string, unknown>; order?: string[]; skip?: string[] }) {
  const keys = [...order.filter((k) => k in o), ...Object.keys(o).filter((k) => !order.includes(k))].filter((k) => !skip.includes(k));
  if (!keys.length) return <span className="text-sm text-gray-400">—</span>;
  return <KeyValueList rows={keys.map((k) => [k, show(o[k])] as [string, ReactNode])} />;
}

function Json({ v, max = 320 }: { v: unknown; max?: number }) {
  return (
    <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto text-gray-800" style={{ maxHeight: max }}>
      {JSON.stringify(v ?? {}, null, 2)}
    </pre>
  );
}

function Card({ title, subtitle, right, children, flush }: {
  title: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode; flush?: boolean;
}) {
  return (
    <div className={cx(CARD, "overflow-hidden")}>
      <div className={CARD_HEADER}>
        <div>
          <div className={CARD_TITLE}>{title}</div>
          {subtitle && <div className={CARD_SUBTITLE}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className={flush ? "" : "p-5"}>{children}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-8 text-center text-sm text-gray-500">{children}</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EventDetailPage />
    </Suspense>
  );
}

function EventDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const connection = useCcConnection();
  const tab: Tab = TABS.some(([k]) => k === sp.get("tab")) ? (sp.get("tab") as Tab) : "summary";
  const detailQ = useQuery({ queryKey: ["continuouscompliance", "event", id], queryFn: () => CcEvents.get(id) });
  const d = detailQ.data;
  const ev = d?.event;
  const error = connection.error ?? detailQ.error;

  const setTab = (t: Tab) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <Link href={LIST_HREF} className={cx(BTN_LINK, "inline-block mb-3")}>← All events</Link>

        {detailQ.isLoading && <PageSpinner />}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to load the event. {(error as Error).message}
          </div>
        )}

        {d && ev && (
          <>
            <PageHeader
              title={
                <>
                  {d.definitionSnapshot ? `${d.definitionSnapshot.code} v${d.definitionSnapshot.version}` : ev.eventTypeCode}
                  <SeverityBadge value={ev.severity} />
                  <StateBadge value={ev.status} />
                </>
              }
              subtitle={
                <>
                  {subjectLabel({ ...ev, subjectDescriptor: (ev.subject?.humanReadable as CcEventDetail["event"]["subjectDescriptor"]) ?? ev.subjectDescriptor })}
                  {" · "}<span className="font-mono">{ev.eventId}</span>
                </>
              }
              actions={
                <button type="button" className={BTN_SECONDARY}
                        onClick={() => qc.invalidateQueries({ queryKey: ["continuouscompliance", "event", id] })}>
                  Refresh
                </button>
              }
            />

            <TabBar tabs={TABS} active={tab} onChange={setTab} />

            {tab === "summary" && <SummaryTab d={d} />}
            {tab === "sla" && <SlaTab d={d} />}
            {tab === "decisions" && <DecisionsTab d={d} />}
            {tab === "remediations" && <RemediationsTab d={d} />}
            {tab === "mitigations" && <MitigationsTab d={d} />}
            {tab === "comments" && <CommentsTab d={d} />}
            {tab === "trail" && <TrailTab eventId={ev.eventId} />}
            {tab === "raw" && <Card title="Event Detail" subtitle="GET /compliance/events/{id}"><Json v={d} max={700} /></Card>}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Summary */

function SummaryTab({ d }: { d: CcEventDetail }) {
  const ev = d.event;
  const def = d.definitionSnapshot;
  const controls = ev.detectionPayload?.controls ?? [];
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card title="Event">
        <Fields
          o={ev as Record<string, unknown>}
          skip={["subject", "scopeSnapshot", "evidence", "slaSnapshot", "detectionPayload", "subjectDescriptor"]}
          order={["eventId", "status", "severity", "eventTypeCode", "definitionId", "definitionVersion", "discoveredAt", "dueAt",
            "slaRuleId", "slaElapsedPercent", "nextSlaCheckAt", "escalationLevel", "reopenCount", "reviewerPrincipalId",
            "reviewerResolvedVia", "correlationKey", "detectorSource", "subjectKind", "riskScore", "aiRecommendedDecision", "currentDecisionId"]}
        />
      </Card>

      <div className="space-y-6">
        <Card title="Subject">
          {ev.subject ? (
            <div className="space-y-4">
              <Fields o={{
                userId: ev.subject.userId, accountId: ev.subject.accountId, applicationId: ev.subject.applicationId,
                entitlementId: ev.subject.entitlementId, nhiId: ev.subject.nhiId,
              }} />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Human Readable</h3>
                <Fields o={ev.subject.humanReadable ?? {}} />
              </div>
            </div>
          ) : <span className="text-sm text-gray-400">—</span>}
        </Card>

        <Card title="Detected By" subtitle="The pinned Control Library controls that held.">
          {controls.length ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                Combinator <b>{String(ev.detectionPayload?.combinator ?? "ALL")}</b>
                {ev.detectionPayload?.criteria && <> · criteria <code>{String(ev.detectionPayload.criteria)}</code></>}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead><tr className={THEAD_ROW}><th className={TH}>Control</th><th className={TH}>Matched</th><th className={TH}>Evidence</th></tr></thead>
                  <tbody className={TBODY}>
                    {controls.map((c, i) => (
                      <tr key={i}>
                        <td className={TD}><span className="font-semibold text-gray-900">{c.code}</span> <span className="text-xs text-gray-500">v{c.version ?? "—"}</span></td>
                        <td className={TD}>
                          <span className={cx(PILL, c.matched ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{String(c.matched)}</span>
                        </td>
                        <td className={cx(TD, "text-xs font-mono break-all")}>
                          {Object.entries(c.evidence ?? {}).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-500">
              {ev.detectionPayload?.criteria ? <>criteria <code>{String(ev.detectionPayload.criteria)}</code> (no library controls recorded)</> : "—"}
            </span>
          )}
        </Card>

        <Card title="Evidence" subtitle="Governance outcome, remediation references."><Json v={ev.evidence ?? {}} max={260} /></Card>
        {ev.scopeSnapshot && Object.keys(ev.scopeSnapshot).length > 0 && (
          <Card title="Scope Snapshot"><Json v={ev.scopeSnapshot} max={200} /></Card>
        )}
      </div>

      <Card
        title={<span className="inline-flex items-center gap-2">Definition Snapshot{def && <> · {def.code} v{def.version} <StateBadge value={def.state} /></>}</span>}
      >
        {def ? (
          <div className="space-y-4">
            <Fields o={{
              name: def.name, severity: def.severity, reviewerStrategy: def.reviewerStrategy, slaDuration: def.slaDuration,
              defaultActionOnTimeout: def.defaultActionOnTimeout, allowedMitigationCodes: def.allowedMitigationCodes, actionBindings: def.actionBindings,
            }} />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Governance Policy</h3>
              <Json v={def.governancePolicy ?? {}} max={300} />
            </div>
            <Link href={DEFINITION_HREF(def.definitionId)} className={BTN_LINK}>Open definition</Link>
          </div>
        ) : <span className="text-sm text-gray-400">No snapshot.</span>}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- SLA */

function SlaTab({ d }: { d: CcEventDetail }) {
  const ev = d.event;
  const s = ev.slaSnapshot ?? {};
  const anchor = s.anchorAt ?? ev.discoveredAt;
  const due = s.dueAt ?? ev.dueAt;
  const span = due && anchor ? new Date(due).getTime() - new Date(anchor).getTime() : 0;
  const pct = span > 0 ? Math.max(0, Math.round(((Date.now() - new Date(anchor).getTime()) / span) * 100)) : null;
  const fired = s.firedSteps ?? [];
  const chain = s.escalationChain ?? [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card title="Pinned SLA">
        {pct !== null && (
          <div className="mb-8">
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className={cx("h-full rounded-full", pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500")}
                   style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <div className="relative h-5 mt-1 text-[11px] text-gray-500">
              {chain.map((c, i) => (
                <span key={i} className={cx("absolute -translate-x-1/2 whitespace-nowrap", fired.includes(i) && "text-green-700 font-medium")}
                      style={{ left: `${c.atPercent}%` }}>
                  ▲ {c.atPercent}% {c.action}
                </span>
              ))}
              <span className="absolute -translate-x-full whitespace-nowrap" style={{ left: "100%" }}>⏱ {s.actionOnTimeout ?? "—"}</span>
            </div>
          </div>
        )}
        <KeyValueList rows={[
          ["Elapsed", <span key="e"><b>{pct === null ? "—" : `${pct}%`}</b>{pct !== null && pct > 100 && <span className="text-red-600"> breached</span>}</span>],
          ["Source", <span key="s">{s.source ?? "—"}{s.ruleId ? <> · rule <b>{s.ruleId}</b> (priority {s.priority ?? "—"})</> : " · definition default"}{s.resolution ? ` · ${s.resolution}` : ""}</span>],
          ["Anchor → due", <span key="a">{fmt(anchor)} → <b>{fmt(due)}</b>{s.duration ? ` (${s.duration})` : ""}</span>],
          ["Steps fired", chain.length ? (
            <span key="f" className="flex flex-wrap gap-1">
              {chain.map((c, i) => (
                <span key={i} className={cx(PILL, fired.includes(i) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                  {c.atPercent}% {c.action}{fired.includes(i) ? " ✓" : ""}
                </span>
              ))}
            </span>
          ) : "—"],
          ["Timeout", `${s.actionOnTimeout ?? "—"} · ${s.timeoutAppliedAt ? `applied ${fmt(s.timeoutAppliedAt)}` : "pending"}`],
          ["Next sweep check", ev.nextSlaCheckAt ? fmt(ev.nextSlaCheckAt) : "nothing left to do"],
          ["Recomputed", `${s.recomputedCount ?? 0}×`],
          ["Matched rules", (s.matchedRules ?? []).map((r) => r.ruleId).join(", ") || "—"],
          ["Basis", show(s.basis)],
        ]} />
      </Card>
      <Card title="SLA Snapshot" subtitle="As stored on the event."><Json v={s} max={520} /></Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Decisions */

function DecisionsTab({ d }: { d: CcEventDetail }) {
  const optionsQ = useQuery({
    queryKey: ["continuouscompliance", "event", d.event.eventId, "decisions", d.event.status],
    queryFn: () => CcEvents.decisionOptions(d.event.eventId),
  });
  return (
    <div className="space-y-6">
      <Card title="Decision History" flush>
        {d.decisions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr className={THEAD_ROW}>
                <th className={TH}>When</th><th className={TH}>Type</th><th className={TH}>By</th><th className={TH}>Role</th>
                <th className={TH}>Expires</th><th className={TH}>Justification</th><th className={TH}>Evidence Refs</th>
              </tr></thead>
              <tbody className={TBODY}>
                {d.decisions.map((r) => (
                  <tr key={r.decisionId}>
                    <td className={cx(TD, "whitespace-nowrap text-xs")}>{fmt(r.decidedAt)}</td>
                    <td className={TD}><span className={cx(PILL, "bg-gray-100 text-gray-700")}>{r.decisionType}</span></td>
                    <td className={cx(TD, "font-mono text-xs")}>{r.decidedByPrincipalId ? `${r.decidedByPrincipalId.slice(0, 13)}…` : "—"}</td>
                    <td className={TD}>{r.decidedByRole ?? "—"}</td>
                    <td className={cx(TD, "whitespace-nowrap text-xs")}>{fmt(r.expiresAt)}</td>
                    <td className={TD}>{r.justification ?? "—"}</td>
                    <td className={TD}>{show(r.evidenceRefs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No decision yet.</Empty>}
      </Card>

      <Card title="Available Decisions" subtitle="GET /compliance/events/{id}/decisions" flush>
        {optionsQ.isLoading && <Empty><span className="inline-flex items-center gap-2"><Spinner /> Loading…</span></Empty>}
        {optionsQ.error && <div className="px-5 py-4 text-sm text-red-600">{(optionsQ.error as Error).message}</div>}
        {optionsQ.data && (
          <>
            <div className="px-5 pt-4 text-xs text-gray-500">
              Status {optionsQ.data.currentStatus} · {optionsQ.data.decidable ? "decidable" : "not decidable"}
            </div>
            <div className="overflow-x-auto mt-2">
              <table className="w-full min-w-[800px]">
                <thead><tr className={THEAD_ROW}>
                  <th className={TH}>Decision</th><th className={TH}>Allowed</th><th className={TH}>Reason</th><th className={TH}>Resulting Status</th>
                  <th className={TH}>Justification</th><th className={TH}>Expiry Required</th><th className={TH}>Mitigation</th>
                </tr></thead>
                <tbody className={TBODY}>
                  {optionsQ.data.options.map((o) => (
                    <tr key={o.decisionType}>
                      <td className={cx(TD, "font-semibold text-gray-900")}>{o.decisionType}</td>
                      <td className={TD}>
                        <span className={cx(PILL, o.allowed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{o.allowed ? "Yes" : "No"}</span>
                      </td>
                      <td className={TD}>{o.reason ?? "—"}</td>
                      <td className={TD}>{o.resultingStatus ? <StateBadge value={o.resultingStatus} /> : "—"}</td>
                      <td className={TD}>
                        {o.requirements?.justificationRequired ? `Required (≥ ${o.requirements.minJustificationLength ?? 0})` : "Optional"}
                      </td>
                      <td className={TD}>{o.requirements?.expiresAtRequired ? "Yes" : "No"}</td>
                      <td className={TD}>
                        {o.requirements?.mitigationRequired ? (o.requirements.allowedMitigationCodes ?? []).join(", ") || "Required" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Remediations / Mitigations / Comments */

function RemediationsTab({ d }: { d: CcEventDetail }) {
  return (
    <div className="space-y-6">
      <Card title="Remediation Actions" subtitle="Asynchronous runs stay DISPATCHED until the adapter posts its result or the deadline passes." flush>
        {d.remediations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead><tr className={THEAD_ROW}>
                <th className={TH}>Action</th><th className={TH}>Mode</th><th className={TH}>Executor</th><th className={TH}>Status</th>
                <th className={TH}>External Ref</th><th className={TH}>Attempts</th><th className={TH}>Queued / Completed</th>
                <th className={TH}>Deadline</th><th className={TH}>Failure</th>
              </tr></thead>
              <tbody className={TBODY}>
                {d.remediations.map((r) => (
                  <tr key={r.remediationId}>
                    <td className={TD}>
                      <div className="font-mono text-xs font-semibold text-gray-900">{r.actionTypeCode}</div>
                      <div className="text-xs text-gray-500 font-mono">{r.remediationId.slice(0, 13)}…</div>
                    </td>
                    <td className={TD}>{r.mode ?? "—"}</td>
                    <td className={TD}>{r.executorCode ? `${r.executorCode} v${r.executorVersion ?? ""}` : r.targetConnector ?? "—"}</td>
                    <td className={TD}><StateBadge value={r.status} /></td>
                    <td className={cx(TD, "font-mono text-xs")}>{r.externalRef ?? "—"}</td>
                    <td className={TD}>
                      {r.attempts ?? "—"}
                      {r.blastRadiusEstimate != null && <div className="text-xs text-gray-500">blast {r.blastRadiusEstimate}</div>}
                    </td>
                    <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(r.queuedAt)}<br />{fmt(r.completedAt)}</td>
                    <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(r.deadlineAt)}</td>
                    <td className={cx(TD, "text-xs text-red-600")}>{r.failureReason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No action was run for this event.</Empty>}
      </Card>
      {d.remediations.some((r) => r.resultPayload) && (
        <Card title="Result Payloads">
          <Json v={d.remediations.filter((r) => r.resultPayload).map((r) => ({ remediationId: r.remediationId, status: r.status, resultPayload: r.resultPayload }))} />
        </Card>
      )}
    </div>
  );
}

function MitigationsTab({ d }: { d: CcEventDetail }) {
  return (
    <Card title="Mitigations" subtitle="Compensating controls on this event." flush>
      {d.mitigations.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead><tr className={THEAD_ROW}>
              <th className={TH}>Control</th><th className={TH}>Status</th><th className={TH}>Enact</th><th className={TH}>Activated</th>
              <th className={TH}>Expires</th><th className={TH}>Verify</th><th className={TH}>Last Result</th><th className={TH}>Params</th>
            </tr></thead>
            <tbody className={TBODY}>
              {d.mitigations.map((m) => (
                <tr key={m.mitigationId}>
                  <td className={TD}>
                    <div className="font-mono text-xs font-semibold text-gray-900">{m.controlCode}</div>
                    <div className="text-xs text-gray-500 font-mono">{m.mitigationId.slice(0, 13)}…</div>
                  </td>
                  <td className={TD}><StateBadge value={m.status} /></td>
                  <td className={TD}>{m.enactKind ?? "—"}{m.targetConnector ? ` · ${m.targetConnector}` : ""}</td>
                  <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(m.activatedAt)}</td>
                  <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(m.expiresAt)}</td>
                  <td className={cx(TD, "text-xs")}>
                    {m.verifyDueAt ? `due ${fmt(m.verifyDueAt)}` : "—"}
                    {m.verifiedAt && <><br />verified {fmt(m.verifiedAt)}</>}
                  </td>
                  <td className={TD}>
                    {m.lastVerifiedResult ?? "—"}
                    {m.failureReason && <div className="text-xs text-red-600">{m.failureReason}</div>}
                  </td>
                  <td className={TD}>{show(m.parameters)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>No compensating control on this event.</Empty>}
    </Card>
  );
}

function CommentsTab({ d }: { d: CcEventDetail }) {
  return (
    <Card title={`Comments (${d.comments.length})`}>
      {d.comments.length ? (
        <ol className="space-y-4">
          {d.comments.map((c) => (
            <li key={c.commentId} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{fmt(c.createdAt)}</span>
                <span className={cx(PILL, "bg-gray-100 text-gray-600")}>{c.visibility}</span>
                {c.authorPrincipalId && <span className="font-mono">{c.authorPrincipalId.slice(0, 13)}…</span>}
              </div>
              <div className="text-sm text-gray-900 mt-1">{c.body}</div>
            </li>
          ))}
        </ol>
      ) : <span className="text-sm text-gray-500">No comments.</span>}
    </Card>
  );
}

/* ---------------------------------------------------------------- Audit trail */

function TrailTab({ eventId }: { eventId: string }) {
  const q = useQuery({ queryKey: ["continuouscompliance", "event", eventId, "timeline"], queryFn: () => CcEvents.timeline(eventId) });
  const [open, setOpen] = useState<string | null>(null);
  const items = q.data?.items ?? [];
  const integrity = q.data?.summary?.integrity?.status;

  return (
    <Card
      title="Audit Trail"
      subtitle={`GET /compliance/events/${eventId}/timeline · ${items.length} rows`}
      right={integrity ? <span className={cx(PILL, /VERIFIED|OK/i.test(integrity) ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{integrity}</span> : undefined}
      flush
    >
      {q.isLoading && <Empty><span className="inline-flex items-center gap-2"><Spinner /> Loading…</span></Empty>}
      {q.error && <div className="px-5 py-4 text-sm text-red-600">{(q.error as Error).message}</div>}
      {q.data && (items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr className={THEAD_ROW}>
              <th className={TH}>#</th><th className={TH}>When</th><th className={TH}>Stage</th><th className={TH}>Action</th>
              <th className={TH}>Actor</th><th className={TH}>Source</th><th className={TH}></th>
            </tr></thead>
            <tbody className={TBODY}>
              {items.map((it, i) => (
                <Fragment key={it.auditId}>
                  <tr className="hover:bg-gray-50">
                    <td className={cx(TD, "text-xs text-gray-500")}>{i + 1}</td>
                    <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(it.at)}</td>
                    <td className={TD}><span className={cx(PILL, "bg-blue-100 text-blue-700")}>{it.stage}</span></td>
                    <td className={cx(TD, "font-semibold text-gray-900")}>{it.action}</td>
                    <td className={cx(TD, "text-xs")}>
                      {it.actor?.kind}
                      {(it.actor?.principalId || it.actor?.id) && (
                        <span className="font-mono text-gray-500"> {String(it.actor.principalId ?? it.actor.id).slice(0, 13)}…</span>
                      )}
                    </td>
                    <td className={cx(TD, "text-xs")}>{it.source ?? "—"}</td>
                    <td className={TD}>
                      <button type="button" className={BTN_LINK} onClick={() => setOpen(open === it.auditId ? null : it.auditId)}>
                        {open === it.auditId ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {open === it.auditId && (
                    <tr>
                      <td colSpan={7} className="px-4 pb-4"><Json v={it} max={360} /></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>No audit rows.</Empty>)}
    </Card>
  );
}
