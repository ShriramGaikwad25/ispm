"use client";

// =====================================================================
// Event detail — the Continuous Compliance Console's event page
// (graph.keyforge.ai/console#/events/{id}) on the same API, laid out like
// ISPM's gateway pages. Tabs:
//   Summary      GET /compliance/events/{id}
//   SLA          (same response — the pinned SLA)
//   Decisions    (same response — decision history)
//   Review Form  GET  /compliance/events/{id}/review-form
//                POST /compliance/review-forms/{code}/render   (conditional fields)
//                POST /compliance/review-forms/{code}/test     (dry run, persists nothing)
//                POST /compliance/events/{id}/review-form/submit
//   AI Insight   (same response — latestInsight) · POST /compliance/events/{id}/insight/refresh
//   Audit Trail  GET  /compliance/events/{id}/timeline — Summary, Ledger rows, Related records,
//                POST /compliance/events/{id}/evidence-pack (Evidence pack, JSON or ZIP)
// =====================================================================

import { Fragment, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  CcEvents, type CcEventDetail, type CcLedgerRow, type CcReviewFormSubmission, type CcReviewFormTest,
  type CcReviewFormView, type CcTimeline,
} from "@/lib/cc-events-api";
import {
  BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, PAGE, PAGE_INNER_FLUSH, PILL,
  PageHeader, PageSpinner, Spinner, TBODY, TD, TH, THEAD_ROW, TabBar, cx,
} from "@/components/assurance-events/ui";
import { KeyValueList, SeverityBadge, StateBadge } from "@/components/assurance-events/definition-editor/fields";
import { ReviewFormDisplay, ReviewFormFields as FormFields, type FormValues as Values } from "@/components/assurance-events/ReviewFormFields";

const LIST_HREF = "/assurance-events/all-events";
const DEFINITION_HREF = (id: string) => `/assurance-events/event-definitions/${id}`;

type Tab = "summary" | "sla" | "decisions" | "form" | "insight" | "trail";
const TABS: Array<[Tab, string]> = [
  ["summary", "Summary"], ["sla", "SLA"], ["decisions", "Decisions"], ["form", "Review Form"],
  ["insight", "AI Insight"], ["trail", "Audit Trail"],
];

/* ---------------------------------------------------------------- display helpers */

const fmt = (t?: string | null) =>
  t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const isIsoDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** One value as text: dates formatted, objects as compact JSON. */
function show(v: unknown): ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-gray-400">—</span>;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (isIsoDate(v)) return fmt(v as string);
  if (typeof v === "object") return <span className="font-mono text-xs break-all">{JSON.stringify(v)}</span>;
  return String(v);
}

/** Key/value list of an object's fields (`order` first, minus `skip`; optionally only non-empty ones; `nowrap` values on one line). */
function Fields({ o, order = [], skip = [], nowrap = [], valuesOnly }: {
  o: Record<string, unknown>; order?: string[]; skip?: string[]; nowrap?: string[]; valuesOnly?: boolean;
}) {
  const keys = [...order.filter((k) => k in o), ...Object.keys(o).filter((k) => !order.includes(k))]
    .filter((k) => !skip.includes(k))
    .filter((k) => !valuesOnly || !isEmpty(o[k]));
  if (!keys.length) return <span className="text-sm text-gray-400">—</span>;
  return <KeyValueList rows={keys.map((k) => [
    k, nowrap.includes(k) ? <span className="whitespace-nowrap font-mono text-xs">{show(o[k])}</span> : show(o[k]),
  ] as [string, ReactNode])} />;
}

/** An array of objects as a table (columns = union of keys). */
function ObjTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r ?? {})))];
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full">
        <thead><tr className={THEAD_ROW}>{cols.map((c) => <th key={c} className={TH}>{c}</th>)}</tr></thead>
        <tbody className={TBODY}>
          {rows.map((r, i) => (
            <tr key={i}>{cols.map((c) => <td key={c} className={cx(TD, "text-xs")}>{show(r?.[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Any value: scalars as fields, nested objects/arrays as sub-sections (the console's object view). */
function ObjView({ v, depth = 0 }: { v: unknown; depth?: number }): ReactNode {
  if (v === null || v === undefined) return <span className="text-sm text-gray-400">—</span>;
  if (Array.isArray(v)) {
    if (!v.length) return <span className="text-sm text-gray-400">Empty</span>;
    if (v.every((x) => x && typeof x === "object" && !Array.isArray(x))) return <ObjTable rows={v as Array<Record<string, unknown>>} />;
    return (
      <div className="flex flex-wrap gap-1.5">
        {v.map((x, i) => <span key={i} className={cx(PILL, "bg-gray-100 text-gray-700")}>{typeof x === "object" ? JSON.stringify(x) : String(x)}</span>)}
      </div>
    );
  }
  if (typeof v !== "object") return <span className="text-sm">{show(v)}</span>;
  if (depth > 2) return <Json v={v} max={260} />;
  const scalars: Record<string, unknown> = {};
  const nested: Array<[string, unknown]> = [];
  Object.entries(v as Record<string, unknown>).forEach(([k, x]) => {
    if (x && typeof x === "object" && (Array.isArray(x) ? x.length : Object.keys(x).length)) nested.push([k, x]);
    else scalars[k] = x;
  });
  return (
    <div className="space-y-4">
      {Object.keys(scalars).length > 0 && <Fields o={scalars} />}
      {nested.map(([k, x]) => (
        <div key={k}>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{k}</h3>
          <ObjView v={x} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
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

const Empty = ({ children }: { children: ReactNode }) => (
  <div className="px-4 py-8 text-center text-sm text-gray-500">{children}</div>
);
const ErrorLine = ({ error }: { error: unknown }) => (
  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(error as Error).message}</div>
);

/** Downloads a Blob as a file. */
function saveBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------------------------------------------------------------- page */

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
  const detailKey = ["continuouscompliance", "event", id];
  const detailQ = useQuery({ queryKey: detailKey, queryFn: () => CcEvents.get(id) });
  const d = detailQ.data;
  const ev = d?.event;
  const error = connection.error ?? detailQ.error;
  const reload = () => qc.invalidateQueries({ queryKey: ["continuouscompliance", "event", id] });

  // Opened from the Review Queue: the back link (and the tabs) keep that, so Back returns to the queue.
  const fromReview = sp.get("from") === "review";
  const setTab = (t: Tab) => router.replace(`${pathname}?tab=${t}${fromReview ? "&from=review" : ""}`, { scroll: false });

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
        <Link href={fromReview ? `${LIST_HREF}?tab=review` : LIST_HREF} className={cx(BTN_LINK, "inline-block mb-3")}>
          {fromReview ? "← Review queue" : "← All events"}
        </Link>

        {detailQ.isLoading && <PageSpinner />}
        {error && <div className="mb-4"><ErrorLine error={new Error(`Failed to load the event. ${(error as Error).message}`)} /></div>}

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
              actions={<button type="button" className={BTN_SECONDARY} onClick={reload}>Refresh</button>}
              tight
            />

            <TabBar tabs={TABS} active={tab} onChange={setTab} flushTop />

            {tab === "summary" && <SummaryTab d={d} />}
            {tab === "sla" && <SlaTab d={d} />}
            {tab === "decisions" && <DecisionsTab d={d} />}
            {tab === "form" && <ReviewFormTab eventId={ev.eventId} onSubmitted={reload} />}
            {tab === "insight" && <InsightTab d={d} onRefreshed={reload} />}
            {tab === "trail" && <TrailTab eventId={ev.eventId} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Summary */

const EVENT_HIDDEN = [
  "subject", "scopeSnapshot", "evidence", "slaSnapshot", "detectionPayload", "subjectDescriptor",
  "eventTypeCode", "definitionId", "definitionVersion", "reviewerResolvedVia", "correlationKey", "riskScore", "currentDecisionId",
  "reviewerPrincipalId",
];
const EVENT_ORDER = [
  "eventId", "status", "severity", "discoveredAt", "dueAt", "slaRuleId", "slaElapsedPercent", "nextSlaCheckAt",
  "escalationLevel", "reopenCount", "detectorSource", "subjectKind", "aiRecommendedDecision",
];

function SummaryTab({ d }: { d: CcEventDetail }) {
  const ev = d.event;
  const def = d.definitionSnapshot;
  const controls = ev.detectionPayload?.controls ?? [];
  const subject = ev.subject
    ? {
        userId: ev.subject.userId, accountId: ev.subject.accountId, applicationId: ev.subject.applicationId,
        nhiId: ev.subject.nhiId, ...(ev.subject.humanReadable ?? {}),
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Event">
          <Fields o={ev as Record<string, unknown>} skip={EVENT_HIDDEN} order={EVENT_ORDER} nowrap={["eventId"]} />
        </Card>

        <div className="space-y-6">
          <Card title="Subject">
            {subject ? <Fields o={subject} valuesOnly /> : <span className="text-sm text-gray-400">—</span>}
          </Card>
          {ev.scopeSnapshot && Object.keys(ev.scopeSnapshot).length > 0 && (
            <Card title="Scope Snapshot"><Json v={ev.scopeSnapshot} max={240} /></Card>
          )}
        </div>

        <Card
          title={<span className="inline-flex items-center gap-2">Event Definition Snapshot{def && <> · {def.code} v{def.version} <StateBadge value={def.state} /></>}</span>}
        >
          {def ? (
            <div className="space-y-4">
              <Fields o={{
                name: def.name, severity: def.severity, reviewerStrategy: def.reviewerStrategy, slaDuration: def.slaDuration,
                defaultActionOnTimeout: def.defaultActionOnTimeout, allowedMitigationCodes: def.allowedMitigationCodes,
              }} />
              <Link href={DEFINITION_HREF(def.definitionId)} className={BTN_LINK}>Open definition</Link>
            </div>
          ) : <span className="text-sm text-gray-400">No snapshot.</span>}
        </Card>
      </div>

      <Card title="Governance Action" subtitle="Remediation actions run for this event." flush>
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
                        <span className={cx(PILL, c.matched ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{c.matched ? "Yes" : "No"}</span>
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
      ]} />
    </Card>
  );
}

/* ---------------------------------------------------------------- Decisions */

function DecisionsTab({ d }: { d: CcEventDetail }) {
  return (
    <Card title="Decision History" flush>
      {d.decisions.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr className={THEAD_ROW}>
              <th className={TH}>When</th><th className={TH}>Type</th><th className={cx(TH, "min-w-[300px]")}>By</th><th className={TH}>Role</th>
              <th className={TH}>Expires</th><th className={TH}>Justification</th>
            </tr></thead>
            <tbody className={TBODY}>
              {d.decisions.map((r) => (
                <tr key={r.decisionId}>
                  <td className={cx(TD, "whitespace-nowrap text-xs")}>{fmt(r.decidedAt)}</td>
                  <td className={TD}><span className={cx(PILL, "bg-gray-100 text-gray-700")}>{r.decisionType}</span></td>
                  <td className={cx(TD, "font-mono text-xs [overflow-wrap:anywhere]")}>{r.decidedByPrincipalId ?? "—"}</td>
                  <td className={TD}>{r.decidedByRole ?? "—"}</td>
                  <td className={cx(TD, "whitespace-nowrap text-xs")}>{fmt(r.expiresAt)}</td>
                  <td className={TD}>{r.justification ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>No decision yet.</Empty>}
    </Card>
  );
}

/* ---------------------------------------------------------------- Review form */

const initialValues = (v: CcReviewFormView): Values =>
  Object.fromEntries(v.fields.filter((f) => f.value !== null && f.value !== undefined).map((f) => [f.name, f.value]));

const isNoReviewForm = (e: Error & { status?: number }) => e.status === 404 || /^no review form/i.test(e.message);

function ReviewFormTab({ eventId, onSubmitted }: { eventId: string; onSubmitted: () => void }) {
  const q = useQuery({
    queryKey: ["continuouscompliance", "event", eventId, "review-form"], queryFn: () => CcEvents.reviewForm(eventId),
    // "No review form" is an answer, not a transient failure: don't retry it (the default backoff took ~7s).
    retry: (n, e) => !isNoReviewForm(e) && n < 3,
  });
  const [view, setView] = useState<CcReviewFormView | undefined>(undefined);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<CcReviewFormTest | null>(null);
  const [submission, setSubmission] = useState<CcReviewFormSubmission | null>(null);
  const renderTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (q.data) { setView(q.data); setValues(initialValues(q.data)); setTest(null); setError(null); }
  }, [q.data]);

  if (q.isLoading) return <PageSpinner />;
  if (q.error) {
    // An event that was never routed to a reviewer has no form; that's not an error.
    if (isNoReviewForm(q.error)) return <p className="text-sm text-gray-500">No review form for this event.</p>;
    return <ErrorLine error={q.error} />;
  }
  if (!view) return null;

  const readOnly = !view.submittable || !view.canSubmit;

  // Conditional fields: re-render the form (visibility) shortly after a change, keeping the typed values.
  const change = (next: Values) => {
    setValues(next);
    if (!view.fields.some((f) => f.conditional)) return;
    clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(() => {
      CcEvents.renderReviewForm(view.formCode, eventId, view.formVersion, next)
        .then((r) => setView({ ...r, fields: r.fields.map((f) => ({ ...f, value: next[f.name] ?? f.value })) }))
        .catch(() => { /* keep the current view */ });
    }, 400);
  };

  const run = async <T,>(action: () => Promise<T>, done: (r: T) => void) => {
    setBusy(true);
    setError(null);
    try { done(await action()); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card
        title={`${view.title}`}
      >
        <div className="space-y-6">
          {view.intent && <p className="text-sm text-gray-700">{view.intent}</p>}

          {view.display && <ReviewFormDisplay d={view.display} />}

          <FormFields fields={view.fields} values={values} onChange={change} readOnly={readOnly} />

          {error && <ErrorLine error={new Error(error)} />}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BTN_PRIMARY} disabled={readOnly || busy}
                    onClick={() => run(() => CcEvents.submitReviewForm(eventId, values), (r) => { setSubmission(r); q.refetch(); onSubmitted(); })}>
              {busy && <Spinner size={14} className="text-white" />} Submit
            </button>
            <button type="button" className={BTN_SECONDARY} disabled={busy}
                    onClick={() => run(() => CcEvents.testReviewForm(view.formCode, eventId, values, view.formVersion), setTest)}>
              Dry Run
            </button>
            <span className="text-xs text-gray-500">
              {readOnly && <>Read-only{view.submittable && view.submitAuthority ? ` (${view.submitAuthority} only)` : ""}. </>}
              Validates the values, picks the first outcome whose <span className="font-mono">when</span> holds, runs its actions and records its decision.
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Outcomes</h3>
            <ObjTable rows={view.outcomes.map((o) => ({
              id: o.id, when: o.when || "(default)", actions: o.actions.join(", ") || "—", decision: o.decision || "—", then: o.then,
            }))} />
          </div>

          {test && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Dry Run · {test.valid ? "valid" : "invalid"} · outcome {test.outcome || "—"}
              </h3>
              {test.diagnostics.length > 0 && (
                <ul className="list-disc ml-5 text-sm text-red-600 space-y-1 mb-2">
                  {test.diagnostics.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              )}
              {test.plan != null && <Json v={test.plan} max={400} />}
            </div>
          )}

          {submission && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Submission · {submission.result}</h3>
              <Fields o={{
                outcome: submission.outcome, eventStatus: submission.status, decisionId: submission.decisionId || "—",
                remediationIds: submission.remediationIds.join(", ") || "—", submissionId: submission.submissionId,
                failureReason: submission.failureReason || "—",
              }} />
            </div>
          )}

          {view.submission != null && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Last Submission</h3>
              <ObjView v={view.submission} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- AI insight */

function InsightTab({ d, onRefreshed }: { d: CcEventDetail; onRefreshed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insight = d.latestInsight;
  const refresh = async () => {
    setBusy(true);
    setError(null);
    try { await CcEvents.refreshInsight(d.event.eventId); onRefreshed(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Card
      title="AI Insight"
      right={<button type="button" className={BTN_SECONDARY} disabled={busy} onClick={refresh}>{busy && <Spinner size={14} />} Refresh Insight</button>}
    >
      {error && <div className="mb-4"><ErrorLine error={new Error(error)} /></div>}
      {insight && Object.keys(insight).length
        ? <ObjView v={insight} />
        : <span className="text-sm text-gray-500">No insight yet.</span>}
    </Card>
  );
}

/* ---------------------------------------------------------------- Audit trail */

type TrailTabKey = "summary" | "items" | "related" | "pack";

function TrailTab({ eventId }: { eventId: string }) {
  const q = useQuery({ queryKey: ["continuouscompliance", "event", eventId, "timeline"], queryFn: () => CcEvents.timeline(eventId) });
  const [sub, setSub] = useState<TrailTabKey>("summary");
  if (q.isLoading) return <PageSpinner />;
  if (q.error) return <ErrorLine error={q.error} />;
  const t = q.data;
  if (!t) return null;
  const tabs: Array<[TrailTabKey, string]> = [
    ["summary", "Summary"], ["items", `Ledger Rows (${t.items.length})`], ["related", "Related Records"], ["pack", "Evidence Pack"],
  ];
  return (
    <div>
      <TabBar tabs={tabs} active={sub} onChange={setSub} />
      {sub === "summary" && <TrailSummary t={t} />}
      {sub === "items" && <LedgerRows t={t} />}
      {sub === "related" && <RelatedRecords t={t} />}
      {sub === "pack" && <EvidencePack eventId={eventId} />}
    </div>
  );
}

function TrailSummary({ t }: { t: CcTimeline }) {
  const summary = (t.summary ?? {}) as Record<string, unknown>;
  const scalars: Record<string, unknown> = {};
  const groups: Record<string, Record<string, unknown>> = {};
  Object.entries(summary).forEach(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) groups[k] = v as Record<string, unknown>;
    else scalars[k] = v;
  });
  const integrity = (groups.integrity ?? {}) as Record<string, unknown>;
  delete groups.integrity;
  const milestones = Object.entries(summary)
    .filter(([k, v]) => /At$/.test(k) && isIsoDate(v))
    .sort((a, b) => new Date(a[1] as string).getTime() - new Date(b[1] as string).getTime());
  const sla = t.event?.slaSnapshot ?? {};
  const fired = sla.firedSteps ?? [];
  const tiles: Array<[string, unknown]> = [
    ["Automation Path", summary.automationPath],
    ["Close Cause", summary.closeCause ?? "open"],
    ["SLA Met", summary.slaMet],
    [summary.timeToClose ? "Time to Close" : "Open For", summary.timeToClose ?? summary.openFor],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(([k, v]) => (
          <div key={k} className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500">{k}</div>
            <div className="mt-2 text-lg font-bold text-gray-900">{show(v)}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Lifecycle Summary">
          <div className="space-y-4">
            <Fields o={scalars} />
            {Object.entries(groups).map(([k, g]) => (
              <div key={k}>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{k} <span className="text-xs font-normal text-gray-500">{Object.keys(g).length} fields</span></h3>
                <Fields o={g} />
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Milestones">
            {milestones.length ? (
              <ol className="space-y-2">
                {milestones.map(([k, v]) => (
                  <li key={k} className="flex gap-4 text-sm">
                    <span className="text-gray-500 w-44 shrink-0">{fmt(v as string)}</span>
                    <span className="font-semibold text-gray-900">{k.replace(/At$/, "")}</span>
                  </li>
                ))}
              </ol>
            ) : <span className="text-sm text-gray-500">None.</span>}
          </Card>
          <Card title="Integrity">
            <Fields o={{ status: integrity.status, rows: integrity.rows ?? t.items.length, ...Object.fromEntries(Object.entries(integrity).filter(([k]) => !["status", "rows"].includes(k))) }} />
            <p className="text-xs text-gray-500 mt-3">
              row_hash = sha256(canonical row), chain_hash = sha256(prev_hash ‖ row_hash); rows are sealed each scheduler tick, so
              UNSEALED / PARTIALLY_SEALED is normal right after a write.
            </p>
          </Card>
          <Card title="Pinned SLA">
            <KeyValueList rows={[
              ["Rule", sla.ruleId ? <span key="r"><b>{sla.ruleId}</b> (priority {sla.priority ?? "—"}, {sla.source})</span> : sla.source ?? "—"],
              ["Anchor → due", <span key="a">{fmt(sla.anchorAt)} → <b>{fmt(sla.dueAt)}</b>{sla.duration ? ` (${sla.duration})` : ""}</span>],
              ["Timeout", `${sla.actionOnTimeout ?? "—"} · ${sla.timeoutAppliedAt ? `applied ${fmt(sla.timeoutAppliedAt)}` : "not applied"}`],
              ["Steps", (sla.escalationChain ?? []).length ? (
                <span key="s" className="flex flex-wrap gap-1">
                  {(sla.escalationChain ?? []).map((c, i) => (
                    <span key={i} className={cx(PILL, fired.includes(i) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                      {c.atPercent}% {c.action}{fired.includes(i) ? " ✓" : ""}
                    </span>
                  ))}
                </span>
              ) : "—"],
              ["Recomputed", `${sla.recomputedCount ?? 0}×`],
            ]} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function LedgerRows({ t }: { t: CcTimeline }) {
  const [filter, setFilter] = useState({ stage: "", actor: "", source: "", action: "" });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const distinct = (pick: (r: CcLedgerRow) => string | undefined) => [...new Set(t.items.map(pick).filter(Boolean) as string[])].sort();
  const rows = t.items.filter((r) =>
    (!filter.stage || r.stage === filter.stage) && (!filter.actor || r.actor?.kind === filter.actor) &&
    (!filter.source || r.source === filter.source) && (!filter.action || r.action === filter.action));
  const byId = useMemo(() => new Map(t.items.map((r) => [r.auditId, r])), [t.items]);
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const select = (key: keyof typeof filter, label: string, opts: string[]) => (
    <label>
      <span className="block text-sm text-gray-700 mb-1">{label}</span>
      <select className={INPUT} value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}>
        <option value="">All</option>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
  const tone = (action: string) =>
    /FAILED|REJECTED|REFUSED|ERROR|EXCEEDED|BLOCKED|DEAD/.test(action) ? "text-red-600"
      : /CLOSED|SUCCEEDED|VERIFIED|RESOLVED/.test(action) ? "text-green-700" : "text-gray-900";

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {select("stage", "Stage", distinct((r) => r.stage))}
          {select("actor", "Actor Kind", distinct((r) => r.actor?.kind))}
          {select("source", "Source", distinct((r) => r.source))}
          {select("action", "Action", distinct((r) => r.action))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-500">
          <span>{rows.length} of {t.items.length} rows · click a row for its envelope and payload</span>
          <span className="flex-1" />
          <button type="button" className={BTN_LINK} onClick={() => setOpen(new Set(rows.map((r) => r.auditId)))}>Expand all</button>
          <button type="button" className={BTN_LINK} onClick={() => setOpen(new Set())}>Collapse all</button>
        </div>
      </div>

      <div className={cx(CARD, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead><tr className={THEAD_ROW}>
              <th className={TH}>#</th><th className={TH}>When</th><th className={TH}>Stage</th><th className={TH}>Action</th>
              <th className={TH}>Actor</th><th className={TH}>Source</th><th className={TH}>From → To</th><th className={TH}>Caused By</th>
            </tr></thead>
            <tbody className={TBODY}>
              {rows.map((r) => {
                const cause = r.causationId ? byId.get(r.causationId) : undefined;
                const isOpen = open.has(r.auditId);
                return (
                  <Fragment key={r.auditId}>
                    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggle(r.auditId)}>
                      <td className={cx(TD, "text-xs text-gray-500")}>{t.items.indexOf(r) + 1}</td>
                      <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(r.at)}</td>
                      <td className={TD}><span className={cx(PILL, "bg-blue-100 text-blue-700")}>{r.stage}</span></td>
                      <td className={cx(TD, "font-semibold", tone(r.action))}>
                        {r.action}
                        {r.integrity?.sealed === false && <span className={cx(PILL, "ml-2 bg-amber-100 text-amber-700")}>Unsealed</span>}
                      </td>
                      <td className={cx(TD, "text-xs")}>{r.actor?.kind}{r.actor?.ref ? ` · ${r.actor.ref}` : ""}</td>
                      <td className={cx(TD, "text-xs")}>{r.source ?? "—"}</td>
                      <td className={cx(TD, "text-xs font-mono")}>{r.from || r.to ? `${r.from ?? "∅"} → ${r.to ?? "∅"}` : "—"}</td>
                      <td className={cx(TD, "text-xs")}>{cause ? `↑ ${cause.action}` : r.causationId ? "outside this event" : "root"}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="px-4 pb-4 bg-gray-50">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-3">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">Envelope</h3>
                              <Fields o={{
                                audit_id: r.auditId, correlation_id: r.correlationId, causation_id: r.causationId ? `${r.causationId}${cause ? ` (${cause.action})` : ""}` : "null — root",
                                request_id: r.requestId, actor: `${r.actor?.kind ?? ""} ${r.actor?.ref ?? ""} ${r.actor?.principalId ?? ""}`.trim(),
                                "source / stage": `${r.source ?? "—"} / ${r.stage}`, entity: r.entity ?? "EVENT",
                                "from → to": `${r.from ?? "null"} → ${r.to ?? "null"}`, refs: r.refs, integrity: r.integrity,
                              }} />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">Detail (Payload)</h3>
                              <Json v={r.detail ?? {}} max={320} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8}><Empty>No rows match.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const RELATED_ORDER = ["decisions", "remediations", "mitigations", "notifications", "comments", "aiInsights", "evidencePacks", "admin", "domainEvents"];

/** Fields not shown in Related records. */
const RELATED_HIDDEN = ["resultPayload"];
const withoutHidden = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(withoutHidden);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => !RELATED_HIDDEN.includes(k)));
  }
  return v;
};

function RelatedRecords({ t }: { t: CcTimeline }) {
  const related = Object.fromEntries(Object.entries(t.related ?? {}).map(([k, v]) => [k, withoutHidden(v)]));
  const keys = [...RELATED_ORDER.filter((k) => k in related), ...Object.keys(related).filter((k) => !RELATED_ORDER.includes(k))];
  const empty = keys.filter((k) => (Array.isArray(related[k]) ? !(related[k] as unknown[]).length : related[k] == null));
  const filled = keys.filter((k) => !empty.includes(k));
  return (
    <div className="space-y-6">
      {filled.map((k) => (
        <Card key={k} title={<>{k} <span className="text-xs font-normal text-gray-500">{Array.isArray(related[k]) ? (related[k] as unknown[]).length : 1}</span></>}>
          {Array.isArray(related[k])
            ? <ObjTable rows={related[k] as Array<Record<string, unknown>>} />
            : <ObjView v={related[k]} />}
        </Card>
      ))}
      {!filled.length && <div className={cx(CARD)}><Empty>No related records.</Empty></div>}
      {empty.length > 0 && filled.length > 0 && (
        <div className="text-sm text-gray-500">Empty for this event: {empty.join(", ")}</div>
      )}
    </div>
  );
}

function EvidencePack({ eventId }: { eventId: string }) {
  const [redaction, setRedaction] = useState("STANDARD");
  const [pack, setPack] = useState<Awaited<ReturnType<typeof CcEvents.evidencePack>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showFull, setShowFull] = useState(false);
  const manifest = (pack?.manifest ?? {}) as Record<string, unknown> & { packId?: string; contentHashes?: Record<string, string> };

  const build = async () => {
    setBusy(true);
    setMessage(null);
    try {
      setPack(await CcEvents.evidencePack(eventId, redaction));
      setMessage({ ok: true, text: "Evidence pack built (an AUDIT_EXPORTED row was written)." });
    } catch (e) { setMessage({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const downloadZip = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await CcEvents.evidencePackZip(eventId, redaction);
      const name = res.headers.get("X-Pack-Id") || "evidence-pack";
      saveBlob(await res.blob(), `${name}.zip`);
      setMessage({ ok: true, text: `Downloaded ${name}.zip${res.headers.get("X-Pack-Hash") ? ` · hash ${res.headers.get("X-Pack-Hash")}` : ""}` });
    } catch (e) { setMessage({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Evidence Pack"
        subtitle="Every export writes an AUDIT_EXPORTED row. STANDARD redaction drops rollback tokens and comment bodies (their hashes stay)."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white" value={redaction} onChange={(e) => setRedaction(e.target.value)} aria-label="Redaction">
              <option>STANDARD</option>
              <option>NONE</option>
            </select>
            <button type="button" className={BTN_PRIMARY} disabled={busy} onClick={build}>Build (JSON)</button>
            <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={downloadZip}>Download ZIP</button>
          </div>
        }
      >
        {message && (
          <div className={cx("mb-4 rounded-md border px-3 py-2 text-sm",
            message.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700")}>
            {message.text}
          </div>
        )}
        {pack ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Manifest</h3>
            <Json v={manifest} max={420} />
            <div className="flex gap-4">
              <button type="button" className={BTN_LINK} onClick={() => setShowFull((v) => !v)}>{showFull ? "Hide full pack JSON" : "View full pack JSON"}</button>
              <button type="button" className={BTN_LINK}
                      onClick={() => saveBlob(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }), `${manifest.packId || "evidence-pack"}.json`)}>
                Save JSON
              </button>
            </div>
            {showFull && <Json v={pack} max={600} />}
          </div>
        ) : <span className="text-sm text-gray-500">Build the pack to see its manifest and section hashes.</span>}
      </Card>

      {pack && (
        <Card title="Sections" flush>
          <table className="w-full">
            <thead><tr className={THEAD_ROW}><th className={TH}>Section</th><th className={TH}>Size</th><th className={TH}>Content Hash</th></tr></thead>
            <tbody className={TBODY}>
              {Object.keys(pack).filter((k) => k !== "manifest").map((k) => {
                const v = (pack as Record<string, unknown>)[k];
                const size = Array.isArray(v) ? `${v.length} rows`
                  : v && typeof v === "object" ? ((v as { items?: unknown[] }).items ? `${(v as { items: unknown[] }).items.length} rows + summary` : `${Object.keys(v).length} keys`)
                  : typeof v;
                return (
                  <tr key={k}>
                    <td className={cx(TD, "font-semibold text-gray-900")}>{k}</td>
                    <td className={TD}>{size}</td>
                    <td className={cx(TD, "font-mono text-xs break-all")}>{manifest.contentHashes?.[k] ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
