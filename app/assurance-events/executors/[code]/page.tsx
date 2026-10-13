"use client";

// Executor — the Continuous Compliance Console's executor page
// (graph.keyforge.ai/console#/executors/{code}) on the same API, laid out
// like ISPM's gateway pages. "new" registers one (POST /compliance/executors).
// DRAFT executors are editable (Save / Activate); ACTIVE ones can be paused,
// resumed, cut a new version or deprecated; any executor can be dry-run
// tested. Diagnose shows readiness (GET …/diagnose).

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Pause, Play, RefreshCw, Save, ShieldCheck, X } from "lucide-react";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  EXECUTORS_BASE, EXECUTORS_KEY, EXECUTORS_LIST_HREF, Executors, NEW_EXECUTOR, type ExecutorDetail, type ExecutorRequest,
} from "@/lib/assurance-executors";
import { ACTIONS_KEY, Actions, actionHref } from "@/lib/cc-actions-api";
import {
  BTN_DANGER, BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL, PAGE,
  PAGE_INNER_FLUSH, PageHeader, PageSpinner, Spinner, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, JsonField, KeyValueList, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";

const toRequest = (e: ExecutorDetail): ExecutorRequest => ({
  executorCode: e.executor_code, kind: e.kind, displayName: e.display_name, description: e.description,
  supports: e.supports, endpoint: e.endpoint, auth: e.auth, protocol: e.protocol, agent: e.agent, context: e.context,
});

export default function ExecutorPage() {
  const { code: rawCode = "" } = useParams<{ code: string }>();
  const code = decodeURIComponent(rawCode);
  const isNew = code === "new";
  const router = useRouter();
  const qc = useQueryClient();
  const { openSidebar } = useRightSidebar();
  const connection = useCcConnection();
  const query = useQuery({
    queryKey: [...EXECUTORS_KEY, code], queryFn: () => Executors.get(code), enabled: !isNew,
  });
  const stored = isNew ? null : query.data ?? null;
  const [form, setForm] = useState<ExecutorRequest>(NEW_EXECUTOR);
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (query.data && !isNew) setForm(toRequest(query.data));
  }, [query.data, isNew]);

  const error = connection.error ?? query.error;
  const editable = isNew || stored?.state === "DRAFT";
  const patch = (p: Partial<ExecutorRequest>) => setForm((f) => ({ ...f, ...p }));

  /** Runs a write, refreshes the registry, and opens the resulting executor. */
  const run = async (okText: string, action: () => Promise<ExecutorDetail>) => {
    setBusy(true);
    setBanner(null);
    try {
      const r = await action();
      await qc.invalidateQueries({ queryKey: EXECUTORS_KEY });
      setBanner({ tone: "ok", text: okText });
      if (isNew || r.executor_code !== code) router.push(`${EXECUTORS_BASE}/${encodeURIComponent(r.executor_code)}`);
      else setForm(toRequest(r));
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const openTest = () => stored && openSidebar(<DryRunTest x={stored} />, { title: `Dry-run · ${stored.executor_code}`, widthPx: 560 });

  if (!isNew && (query.isLoading || (query.error && !stored))) {
    return (
      <div className={PAGE}>
        <div className={cx(PAGE_INNER_FLUSH, "space-y-3")}>
          <Link href={EXECUTORS_LIST_HREF} className={BTN_LINK}>← Executors</Link>
          {query.isLoading ? <PageSpinner /> : <BannerBar banner={{ tone: "err", text: (error as Error).message }} />}
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
        <Link href={EXECUTORS_LIST_HREF} className={cx(BTN_LINK, "inline-block mb-3")}>← Executors</Link>
        <PageHeader
          title={
            <>
              {isNew ? "Register Executor" : form.displayName || form.executorCode}
              <StateBadge value={form.kind} />
              {stored && <StateBadge value={stored.state} />}
              {stored?.paused && <StateBadge value="PAUSED" />}
            </>
          }
          subtitle={
            isNew ? "A new DRAFT executor: fill in the contract, register it, then activate it."
              : <><span className="font-mono">{form.executorCode}</span> · v{stored?.version}{stored?.paused && stored.pause_reason ? ` · paused: ${stored.pause_reason}` : ""}</>
          }
          actions={
            <>
              {editable && (
                <button className={BTN_PRIMARY} disabled={busy}
                        onClick={() => run(isNew ? "Registered (DRAFT)." : "Saved.", () => (isNew ? Executors.create(form) : Executors.update(code, form)))}>
                  <Save size={14} /> {isNew ? "Register" : "Save"}
                </button>
              )}
              {stored?.state === "DRAFT" && (
                <button className={BTN_PRIMARY} disabled={busy} onClick={() => run("Activated.", () => Executors.activate(code))}>
                  <ShieldCheck size={14} /> Activate
                </button>
              )}
              {stored?.state === "ACTIVE" && (
                <>
                  {stored.paused ? (
                    <button className={BTN_SECONDARY} disabled={busy} onClick={() => run("Resumed — rules bound to it act again.", () => Executors.resume(code))}>
                      <Play size={14} /> Resume
                    </button>
                  ) : (
                    <button className={BTN_SECONDARY} disabled={busy} onClick={() => setPausing(true)}>
                      <Pause size={14} /> Pause
                    </button>
                  )}
                  <button className={BTN_SECONDARY} disabled={busy} title="Cuts a new DRAFT version to edit and activate"
                          onClick={() => run("New version (DRAFT) — edit and activate it.", () => Executors.update(code, form))}>
                    New Version
                  </button>
                  <button className={BTN_DANGER} disabled={busy}
                          onClick={() => confirm(`Deprecate ${stored.executor_code} v${stored.version}? Definitions bound to it fall back to the in-process connector or route to the owner.`)
                            && run("Deprecated.", () => Executors.deprecate(code))}>
                    <Ban size={14} /> Deprecate
                  </button>
                </>
              )}
              {stored && (
                <button className={BTN_SECONDARY} onClick={openTest}><Play size={14} /> Dry-run Test</button>
              )}
            </>
          }
        />

        {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}
        {connection.error && <div className="mb-4"><BannerBar banner={{ tone: "err", text: (connection.error as Error).message }} /></div>}

        {pausing && stored && (
          <div className={cx(CARD, "p-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end")}>
            <div className="flex-1">
              <label className={LABEL}>Pause reason (bound rules route to the owner while paused)</label>
              <input className={INPUT} value={reason} placeholder="adapter maintenance" onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className={BTN_SECONDARY} onClick={() => setPausing(false)}>Cancel</button>
              <button className={BTN_DANGER} disabled={busy}
                      onClick={() => { setPausing(false); run("Paused — bound rules route to the owner.", () => Executors.pause(code, reason.trim())); }}>
                Pause
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-6 min-w-0">
            <Card title="Identity and Contract">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Executor code</label>
                  <input className={cx(INPUT, "font-mono")} readOnly={!isNew} value={form.executorCode}
                         onChange={(e) => patch({ executorCode: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Kind</label>
                  <select className={INPUT} disabled={!editable} value={form.kind} onChange={(e) => patch({ kind: e.target.value })}>
                    {["REST", "AGENT", "INPROCESS"].map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Display name</label>
                  <input className={INPUT} readOnly={!editable} value={form.displayName ?? ""} onChange={(e) => patch({ displayName: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Description</label>
                  <input className={INPUT} readOnly={!editable} value={form.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Supports (ACTIVE Action library codes; an in-process connector may only list the codes it implements)</label>
                  <SupportsPicker value={form.supports} editable={editable} onChange={(supports) => patch({ supports })} />
                </div>
                {form.kind !== "INPROCESS" && (
                  <div className="md:col-span-2">
                    <label className={LABEL}>Endpoint (host must be on the allowed-hosts list)</label>
                    <input className={cx(INPUT, "font-mono text-xs")} readOnly={!editable} value={form.endpoint ?? ""}
                           onChange={(e) => patch({ endpoint: e.target.value })} />
                  </div>
                )}
              </div>
            </Card>

            {form.kind !== "INPROCESS" && (
              <>
                <Card title="Authentication" subtitle="Secrets by reference only: env://NAME or file:///path">
                  <JsonField key={`auth-${stored?.version}-${stored?.state}`} value={form.auth ?? {}} readOnly={!editable} rows={7}
                             onChange={(v) => patch({ auth: v })}
                             hint="type: NONE | BEARER | API_KEY | BASIC | OAUTH2_CLIENT_CREDENTIALS · secretRef / signingSecretRef / callbackSecretRef" />
                </Card>
                <Card title="Protocol">
                  <JsonField key={`protocol-${stored?.version}-${stored?.state}`} value={form.protocol ?? {}} readOnly={!editable} rows={7}
                             onChange={(v) => patch({ protocol: v })}
                             hint="timeout, asyncDeadline, estimateSupported, rollbackSupported, circuitBreaker {failureThreshold, openFor}" />
                </Card>
                {form.kind === "AGENT" && (
                  <Card title="Agent Guardrails">
                    <JsonField key={`agent-${stored?.version}-${stored?.state}`} value={form.agent ?? {}} readOnly={!editable} rows={5}
                               onChange={(v) => patch({ agent: v })}
                               hint="defaultMode, allowedActions, maxSteps, toolsExecutor" />
                  </Card>
                )}
                <Card title="Context Sent to the Adapter">
                  <JsonField key={`context-${stored?.version}-${stored?.state}`} value={form.context ?? {}} readOnly={!editable} rows={4}
                             onChange={(v) => patch({ context: v })}
                             hint="include: event, subject, finding · redact: dotted paths removed before sending" />
                </Card>
              </>
            )}
          </div>

          <div className="space-y-6 min-w-0">
            {stored ? <DiagnoseCard code={code} version={stored.version} /> : (
              <Card title="Diagnose">
                <p className="text-sm text-gray-500">Available after the executor is registered.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- building blocks */

function Card({ title, subtitle, right, children }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div>
          <div className={CARD_TITLE}>{title}</div>
          {subtitle && <div className={CARD_SUBTITLE}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function show(v: unknown): ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-gray-400">—</span>;
  if (typeof v === "boolean") return v ? <span className="text-green-700">Yes</span> : <span className="text-red-600">No</span>;
  if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ") : <span className="text-gray-400">—</span>;
  if (typeof v === "object") return <span className="font-mono text-xs break-all">{JSON.stringify(v)}</span>;
  return String(v);
}

/** GET /compliance/executors/{code}/diagnose — scalars as fields, nested objects as their own lists. */
function DiagnoseCard({ code, version }: { code: string; version: number }) {
  const q = useQuery({ queryKey: [...EXECUTORS_KEY, code, version, "diagnose"], queryFn: () => Executors.diagnose(code) });
  const d = q.data ?? {};
  const nested = Object.entries(d).filter(([, v]) => v && typeof v === "object" && !Array.isArray(v));
  const flat = Object.entries(d).filter(([, v]) => !(v && typeof v === "object" && !Array.isArray(v)));
  return (
    <Card
      title="Diagnose"
      right={
        <button className={BTN_SECONDARY} onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      }
    >
      {q.isLoading ? <Spinner /> : q.error ? (
        <div className="text-sm text-red-600">{(q.error as Error).message}</div>
      ) : (
        <div className="space-y-4 text-sm">
          {flat.length > 0 && <KeyValueList rows={flat.map(([k, v]) => [k, show(v)] as [string, ReactNode])} />}
          {nested.map(([k, v]) => (
            <div key={k}>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{k}</h3>
              <KeyValueList rows={Object.entries(v as Record<string, unknown>).map(([kk, vv]) => [kk, show(vv)] as [string, ReactNode])} />
            </div>
          ))}
          <p className="text-[11px] text-gray-500">Secret values are never returned, only whether each reference resolves in the API process.</p>
        </div>
      )}
    </Card>
  );
}

/** Supported actions as chips; editable executors add from the ACTIVE action library. */
function SupportsPicker({ value, editable, onChange }: { value: string[]; editable: boolean; onChange: (v: string[]) => void }) {
  const q = useQuery({ queryKey: [...ACTIONS_KEY, "list", { state: "ACTIVE" }], queryFn: () => Actions.list({ state: "ACTIVE" }) });
  const [pick, setPick] = useState("");
  const active = new Map((q.data ?? []).map((a) => [a.code, a]));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((c) => {
          const a = active.get(c);
          const known = !!a || q.isLoading;
          return (
            <span key={c} title={known ? "" : "Not an ACTIVE action: save will refuse it"}
                  className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-mono",
                    known ? "border-gray-200 bg-white text-gray-700" : "border-red-300 bg-red-50 text-red-700")}>
              {a ? <Link href={actionHref(a.code, a.version)} className="hover:text-blue-700">{c}</Link> : c}
              {editable && (
                <button type="button" aria-label={`Remove ${c}`} className="text-gray-400 hover:text-red-600"
                        onClick={() => onChange(value.filter((x) => x !== c))}>
                  <X size={12} />
                </button>
              )}
            </span>
          );
        })}
        {!value.length && <span className="text-sm text-gray-400">None</span>}
      </div>
      {editable && (
        <div className="flex gap-2 mt-2">
          <select className={INPUT} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">— Add an ACTIVE action —</option>
            {(q.data ?? []).filter((a) => !value.includes(a.code)).map((a) => (
              <option key={a.actionId} value={a.code}>{a.code} v{a.version} · {a.name}</option>
            ))}
          </select>
          <button type="button" className={BTN_SECONDARY} disabled={!pick} onClick={() => { onChange([...value, pick]); setPick(""); }}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}

/** Dry-run (right sidebar): POST /compliance/executors/{code}/test — nothing is persisted. */
function DryRunTest({ x }: { x: ExecutorDetail }) {
  const [body, setBody] = useState<unknown>({
    action: x.supports[0] ?? "IGA_SET_APPROVAL_GROUP",
    operation: "DRY_RUN",
    params: { entitlementId: "00000000-0000-0000-0000-000000000000", workgroupId: "55555555-5555-5555-5555-555555555555" },
    context: {},
  });
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try { setResult(await Executors.test(x.executor_code, body)); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Sends the operation (default DRY_RUN) to the adapter with a signed envelope; nothing is persisted.
      </p>
      <JsonField value={body} rows={12} onChange={setBody} />
      <button className={BTN_PRIMARY} disabled={busy} onClick={run}>
        {busy && <Spinner size={14} className="text-white" />} {busy ? "Calling…" : "Run Test"}
      </button>
      {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {result != null && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Result</h3>
          <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto max-h-96 text-gray-800">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
