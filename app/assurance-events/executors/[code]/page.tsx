"use client";

// Executor detail — ported from the deployed Continuous Assurance console
// (graph.keyforge.ai/cc/executors/:code). DRAFT executors are editable
// (Save / Activate); ACTIVE ones can be paused, resumed or deprecated; any
// executor can be dry-run tested. Built-in (INPROCESS) connectors have
// nothing to configure.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CodeXml, Pause, Play, Save, ShieldCheck } from "lucide-react";
import {
  EXECUTORS_BASE, Executors, type ExecutorDetail, type ExecutorRequest,
} from "@/lib/assurance-executors";
import { formatRelative } from "@/lib/assurance-format";
import {
  BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_TITLE, INPUT, LABEL, PAGE, PAGE_INNER, PageHeader, Spinner, cx,
} from "@/components/assurance-events/ui";
import {
  BannerBar, JsonField, KeyValueList, StateBadge, WireView, type Banner,
} from "@/components/assurance-events/definition-editor/fields";

export default function ExecutorDetailPage() {
  const { code = "" } = useParams<{ code: string }>();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["assurance", "gov", "executor", code], queryFn: () => Executors.get(code) });
  const [ex, setEx] = useState<ExecutorDetail | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    if (query.data) setEx(structuredClone(query.data));
  }, [query.data]);

  if (query.error && !ex) {
    return (
      <div className={PAGE}>
        <div className={cx(PAGE_INNER, "space-y-3")}>
          <Link href={EXECUTORS_BASE} className={BTN_LINK}>← Executors</Link>
          <BannerBar banner={{ tone: "err", text: (query.error as Error).message }} />
        </div>
      </div>
    );
  }
  if (!ex) return <div className="px-6"><Spinner /></div>;

  const ro = ex.state !== "DRAFT" || ex.kind === "INPROCESS";
  const patch = (p: Partial<ExecutorDetail>) => setEx({ ...ex, ...p });
  const request: ExecutorRequest = {
    executorCode: ex.executor_code, kind: ex.kind, displayName: ex.display_name, description: ex.description,
    supports: ex.supports, endpoint: ex.endpoint, auth: ex.auth, protocol: ex.protocol, agent: ex.agent, context: ex.context,
  };

  /** Runs a write, refreshes the executor queries, and reports the outcome in the banner. */
  const run = async (okText: string, action: () => Promise<ExecutorDetail | unknown>) => {
    setBanner(null);
    try {
      const r = await action();
      await qc.invalidateQueries({ queryKey: ["assurance", "gov"] });
      if (r && typeof r === "object" && "executor_code" in r) setEx(r as ExecutorDetail);
      setBanner({ tone: "ok", text: okText });
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    }
  };

  const d = ex.diagnose;

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
      <Link href={EXECUTORS_BASE} className={cx(BTN_LINK, "inline-block mb-3")}>← Executors</Link>
      <PageHeader
        title={
          <>
            {ex.display_name || ex.executor_code}
            <StateBadge value={ex.kind} />
            <StateBadge value={ex.state} />
            {ex.paused && <StateBadge value="PAUSED" />}
          </>
        }
        subtitle={<><span className="font-mono">{ex.executor_code}</span> · v{ex.version}</>}
        actions={
          <>
            <button className={BTN_SECONDARY} onClick={() => setShowRequest((v) => !v)}>
              <CodeXml size={14} /> {showRequest ? "Hide Request" : "Show Request"}
            </button>
            <button className={BTN_SECONDARY}
                    onClick={async () => {
                      try { setTestResult(await Executors.test(code)); }
                      catch (e) { setTestResult({ error: (e as Error).message }); }
                    }}>
              <Play size={14} /> Dry-run Test
            </button>
            {ex.state === "ACTIVE" && ex.kind !== "INPROCESS" && (
              <>
                <button className={BTN_SECONDARY}
                        onClick={() => run(
                          ex.paused ? "Resumed — rules bound to it act again." : "Paused — rules bound to it route to the owner.",
                          () => (ex.paused ? Executors.resume(code) : Executors.pause(code, "Paused from console")),
                        )}>
                  {ex.paused ? <Play size={14} /> : <Pause size={14} />} {ex.paused ? "Resume" : "Pause"}
                </button>
                <button className={cx(BTN_SECONDARY, "text-red-700")}
                        onClick={() => run("Deprecated.", () => Executors.deprecate(code))}>
                  <Ban size={14} /> Deprecate
                </button>
              </>
            )}
            {ex.state === "DRAFT" && (
              <>
                <button className={BTN_SECONDARY} onClick={() => run("Saved.", () => Executors.update(code, request))}>
                  <Save size={14} /> Save
                </button>
                <button className={BTN_PRIMARY} onClick={() => run("Activated.", () => Executors.activate(code))}>
                  <ShieldCheck size={14} /> Activate
                </button>
              </>
            )}
          </>
        }
      />

      {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6 min-w-0">
          <section className={CARD}>
            <div className={CARD_HEADER}><div className={CARD_TITLE}>Identity and contract</div></div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Display name</label>
                <input className={INPUT} disabled={ro} value={ex.display_name ?? ""}
                       onChange={(e) => patch({ display_name: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Supports (action types)</label>
                <input className={cx(INPUT, "font-mono text-xs")} disabled={ro} defaultValue={ex.supports.join(", ")}
                       key={ex.supports.join(",")}
                       onBlur={(e) => patch({ supports: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              </div>
              {ex.kind !== "INPROCESS" ? (
                <div className="md:col-span-2">
                  <label className={LABEL}>Endpoint (host must be on the allow-list)</label>
                  <input className={cx(INPUT, "font-mono text-xs")} disabled={ro} value={ex.endpoint ?? ""}
                         onChange={(e) => patch({ endpoint: e.target.value })} />
                </div>
              ) : (
                <div className="md:col-span-2 text-sm text-gray-500">
                  Built-in connector: no endpoint, authentication or protocol to configure.
                </div>
              )}
            </div>
          </section>

          {ex.kind !== "INPROCESS" && (
            <>
              <section className={CARD}>
                <div className={CARD_HEADER}><div className={CARD_TITLE}>Authentication — secrets by reference only</div></div>
                <div className="p-5">
                  <JsonField key={`auth-${ex.version}-${ex.state}`} value={ex.auth} readOnly={ro} rows={6}
                             onChange={(v) => patch({ auth: v })}
                             hint="type: NONE | BEARER | API_KEY | BASIC | OAUTH2_CLIENT_CREDENTIALS · secretRef / signingSecretRef / callbackSecretRef as env://NAME or file:///path" />
                </div>
              </section>
              <section className={CARD}>
                <div className={CARD_HEADER}><div className={CARD_TITLE}>Protocol</div></div>
                <div className="p-5">
                  <JsonField key={`protocol-${ex.version}-${ex.state}`} value={ex.protocol} readOnly={ro} rows={6}
                             onChange={(v) => patch({ protocol: v })}
                             hint="timeout, asyncDeadline (pending results), rollbackSupported, circuitBreaker {failureThreshold, openFor}, callbackUrlTemplate" />
                </div>
              </section>
              {ex.kind === "AGENT" && (
                <section className={CARD}>
                  <div className={CARD_HEADER}><div className={CARD_TITLE}>Agent guardrails</div></div>
                  <div className="p-5">
                    <JsonField key={`agent-${ex.version}-${ex.state}`} value={ex.agent} readOnly={ro} rows={5}
                               onChange={(v) => patch({ agent: v })}
                               hint="defaultMode PROPOSE | EXECUTE · allowedActions (plan steps outside it are rejected) · maxSteps · toolsExecutor" />
                  </div>
                </section>
              )}
              <section className={CARD}>
                <div className={CARD_HEADER}><div className={CARD_TITLE}>Context sent to the adapter</div></div>
                <div className="p-5">
                  <JsonField key={`context-${ex.version}-${ex.state}`} value={ex.context} readOnly={ro} rows={3}
                             onChange={(v) => patch({ context: v })}
                             hint="include: event, subject, finding · redact: dotted paths removed before sending" />
                </div>
              </section>
            </>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <section className={CARD}>
            <div className={CARD_HEADER}><div className={CARD_TITLE}>Diagnose</div></div>
            <div className="p-5 space-y-2 text-sm">
              <KeyValueList rows={[
                ["Ready", d.ready ? <span key="r" className="text-emerald-700">yes</span> : <span key="r" className="text-red-600">no</span>],
                ...(ex.kind === "INPROCESS" ? [] : [["Endpoint allow-listed", d.endpointAllowed ? "yes" : "no"] as [string, string]]),
                ...Object.entries(d.secrets ?? {}).map(([k, ok]) => [k, ok ? "resolvable" : "not set for the service"] as [string, string]),
                ["Circuit breaker", d.circuit],
                ["Last call", ex.last_call_at ? `${formatRelative(ex.last_call_at)} · ${ex.last_status}` : "—"],
              ]} />
              {d.problems.map((p) => <div key={p} className="text-xs text-red-600">✕ {p}</div>)}
              <div className="text-[11px] text-gray-500">Secret values are never returned — only whether each reference resolves.</div>
            </div>
          </section>

          {testResult != null && (
            <section className={CARD}>
              <div className={CARD_HEADER}><div className={CARD_TITLE}>Dry-run result</div></div>
              <pre className="text-xs p-4 overflow-auto max-h-80 bg-gray-50 text-gray-800">{JSON.stringify(testResult, null, 2)}</pre>
            </section>
          )}

          {showRequest && (
            <WireView method={ex.state === "DRAFT" ? "PUT" : "POST"}
                      path={`/executors${ex.state === "DRAFT" ? `/${code}` : ""}`}
                      body={request} />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
