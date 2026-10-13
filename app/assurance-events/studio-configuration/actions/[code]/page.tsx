"use client";

// =====================================================================
// Action — the Continuous Compliance Console's action page
// (graph.keyforge.ai/console#/actions/{code}?version=) on the same API,
// laid out like ISPM's gateway pages. Tabs:
//   Definition   GET  /compliance/action-types/{code}?version=
//   Test         POST /compliance/action-types/{code}/test      (dry run, nothing executes)
//   Contract     GET  /compliance/action-types/{code}/contract?version=
//   Where Used   GET  /compliance/action-types/{code}/usage
//   Versions     GET  /compliance/action-types/{code}/versions
// Actions: Activate, New Version, Deprecate (tenant actions), Clone.
// =====================================================================

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { useCcConnection } from "@/hooks/useCcConnection";
import { ControlsApiError } from "@/lib/controls-api";
import {
  ACTIONS_KEY, Actions, actionHref, paramSummary, type ActionParameter, type ActionTestResult, type ActionType,
} from "@/lib/cc-actions-api";
import { CloneAction } from "@/components/assurance-events/CloneAction";
import {
  BTN_DANGER, BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL, PAGE,
  PAGE_INNER_FLUSH, PILL, PageHeader, PageSpinner, Spinner, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, KeyValueList, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";

type Tab = "definition" | "test" | "contract" | "usage" | "versions";
const LIBRARY_HREF = "/assurance-events/studio-configuration?tab=actions";

const fmt = (t?: string | null) =>
  t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ActionPage />
    </Suspense>
  );
}

function ActionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { openSidebar } = useRightSidebar();
  const { code: rawCode = "" } = useParams<{ code: string }>();
  const code = decodeURIComponent(rawCode);
  const version = Number(useSearchParams().get("version")) || undefined;
  const connection = useCcConnection();
  const q = useQuery({ queryKey: [...ACTIONS_KEY, code, version ?? "current"], queryFn: () => Actions.get(code, version) });
  const a = q.data;
  const error = connection.error ?? q.error;
  const [tab, setTab] = useState<Tab>("definition");
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);

  /** Runs a lifecycle action, then reloads and opens the resulting version. */
  const act = async (label: string, action: () => Promise<ActionType>) => {
    setBusy(true);
    setBanner(null);
    try {
      const r = await action();
      await qc.invalidateQueries({ queryKey: ACTIONS_KEY });
      setBanner({ tone: "ok", text: label });
      if (r?.code && r?.version) router.push(actionHref(r.code, r.version));
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Deprecate: a 409 means definitions still use the action — ask before forcing.
  const deprecate = async (x: ActionType) => {
    setBusy(true);
    setBanner(null);
    try {
      await Actions.deprecate(x.code, x.version, false);
      await qc.invalidateQueries({ queryKey: ACTIONS_KEY });
      setBanner({ tone: "ok", text: "Deprecated" });
    } catch (e) {
      if (e instanceof ControlsApiError && e.status === 409 &&
          confirm(`${e.message}\n\nDeprecate anyway? Pinned definitions keep their version; DRAFT definitions following "latest" will fail to activate.`)) {
        await act("Deprecated (forced)", () => Actions.deprecate(x.code, x.version, true));
        return;
      }
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const openClone = (x: ActionType) =>
    openSidebar(
      <CloneAction src={x} onDone={(c) => { setTab("definition"); router.push(actionHref(c.code, c.version)); }} />,
      { title: `Clone ${x.code} v${x.version}`, widthPx: 480 },
    );

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
        <Link href={LIBRARY_HREF} className={cx(BTN_LINK, "inline-block mb-3")}>← Action library</Link>
        {q.isLoading && <PageSpinner />}
        {error && <ErrorLine error={error} />}
        {a && (
          <>
            <PageHeader
              title={
                <>
                  {a.name}
                  <StateBadge value={a.state} />
                  <span className={cx(PILL, a.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                    {a.system ? "System" : "Tenant"}
                  </span>
                  <span className={cx(PILL, a.autoExecution === "REVIEW_ONLY" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                    {a.autoExecution}
                  </span>
                </>
              }
              subtitle={
                <>
                  <span className="font-mono">{a.code}</span> · v{a.version} · {a.category} · {a.targetKind} ·{" "}
                  {a.reversible ? "reversible" : "irreversible"}
                </>
              }
              actions={
                <>
                  {!a.system && a.state === "DRAFT" && (
                    <button className={BTN_PRIMARY} disabled={busy}
                            onClick={() => act("Activated", () => Actions.activate(a.code, a.version))}>Activate</button>
                  )}
                  {!a.system && a.state !== "DRAFT" && (
                    <button className={BTN_SECONDARY} disabled={busy}
                            onClick={() => act("New version cut (DRAFT)", () => Actions.newVersion(a.code))}>New Version</button>
                  )}
                  {!a.system && a.state === "ACTIVE" && (
                    <button className={BTN_DANGER} disabled={busy} onClick={() => deprecate(a)}>Deprecate</button>
                  )}
                  <button className={BTN_SECONDARY} disabled={busy} onClick={() => openClone(a)}>Clone</button>
                </>
              }
            />

            {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}
            {(a.warnings ?? []).length > 0 && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 space-y-1">
                {a.warnings!.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}

            <TabBar<Tab>
              active={tab}
              onChange={setTab}
              tabs={[["definition", "Definition"], ["test", "Test"], ["contract", "Contract"], ["usage", "Where Used"], ["versions", "Versions"]]}
            />

            {tab === "definition" && <DefinitionTab a={a} />}
            {tab === "test" && <TestTab key={`${a.code}@${a.version}`} a={a} />}
            {tab === "contract" && <ContractTab a={a} />}
            {tab === "usage" && <UsageTab code={a.code} />}
            {tab === "versions" && <VersionsTab code={a.code} onOpen={(v) => router.push(actionHref(v.code, v.version))} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- building blocks */

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

const ErrorLine = ({ error }: { error: unknown }) => (
  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(error as Error).message}</div>
);
const Empty = ({ children }: { children: ReactNode }) => (
  <div className="px-4 py-8 text-center text-sm text-gray-500">{children}</div>
);
const Mono = ({ children }: { children: ReactNode }) => <span className="font-mono text-xs">{children}</span>;
const Dash = () => <span className="text-gray-400">—</span>;
const Json = ({ v, max = 360 }: { v: unknown; max?: number }) => (
  <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto text-gray-800" style={{ maxHeight: max }}>
    {JSON.stringify(v ?? {}, null, 2)}
  </pre>
);

function Loaded<T>({ q, children }: { q: { isLoading: boolean; error: unknown; data?: T }; children: (d: T) => ReactNode }) {
  if (q.isLoading) return <PageSpinner />;
  if (q.error) return <ErrorLine error={q.error} />;
  return q.data === undefined ? null : <>{children(q.data)}</>;
}

const constraints = (p: ActionParameter) =>
  [p.enum && `enum ${p.enum.join("|")}`, p.min != null && `min ${p.min}`, p.max != null && `max ${p.max}`,
    p.maxLength != null && `maxLength ${p.maxLength}`, p.pattern && `pattern ${p.pattern}`].filter(Boolean).join(" · ");

/** The parameter contract as a table. */
function ParametersTable({ params, withTemplates }: { params: ActionParameter[]; withTemplates?: boolean }) {
  return (
    <table className="w-full">
      <thead>
        <tr className={THEAD_ROW}>
          <th className={TH}>Name</th><th className={TH}>Type</th><th className={TH}>Required</th><th className={TH}>Constraints</th>
          <th className={TH}>Default</th>{withTemplates && <th className={TH}>Suggested Template</th>}<th className={TH}>Help</th>
        </tr>
      </thead>
      <tbody className={TBODY}>
        {params.map((p) => (
          <tr key={p.name}>
            <td className={TD}>
              <div className="font-mono text-xs font-semibold text-gray-900">{p.name}</div>
              {p.label && <div className="text-xs text-gray-500">{p.label}</div>}
              {p.sensitive && <span className={cx(PILL, "bg-amber-100 text-amber-700 mt-1")}>Sensitive</span>}
            </td>
            <td className={cx(TD, "text-xs")}>{p.type}</td>
            <td className={TD}>{p.required ? "Yes" : "No"}</td>
            <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{constraints(p) || "—"}</td>
            <td className={cx(TD, "text-xs font-mono")}>{p.default == null ? "—" : JSON.stringify(p.default)}</td>
            {withTemplates && <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{p.suggested || "—"}</td>}
            <td className={cx(TD, "text-xs")}>{p.help || "—"}</td>
          </tr>
        ))}
        {!params.length && <tr><td colSpan={7}><Empty>No parameters: any params object is accepted.</Empty></td></tr>}
      </tbody>
    </table>
  );
}

/* ---------------------------------------------------------------- Definition */

function DefinitionTab({ a }: { a: ActionType }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Identity">
          <KeyValueList rows={[
            ["Code", <Mono key="c">{a.code}</Mono>],
            ["Name", a.name],
            ["Description", a.description || <Dash key="d" />],
            ["Category", a.category],
            ["Target kind", a.targetKind],
            ["Reversible", a.reversible ? "Yes (executor returns a rollback token)" : "No"],
            ["Auto-execution", a.autoExecution],
            ["Tags", a.tags?.length ? a.tags.join(", ") : <Dash key="t" />],
            ["Activated", fmt(a.activatedAt)],
            ["Deprecated", fmt(a.deprecatedAt)],
          ]} />
        </Card>
        <Card title="Executor" subtitle="Who runs it: rule then.executor → action bindings → this default → iga for IGA_* actions">
          <KeyValueList rows={[
            ["Default executor", a.defaultExecutor ? <Mono key="e">{a.defaultExecutor}</Mono> : "None (bound per definition)"],
          ]} />
        </Card>
      </div>

      <Card title="Parameters" subtitle="The contract of params: required = given literally or as a template, or defaulted." flush>
        <ParametersTable params={a.parameters ?? []} withTemplates />
      </Card>

      <Card title="Result Fields" subtitle="Evidence keys the executor returns" flush>
        <table className="w-full">
          <thead><tr className={THEAD_ROW}><th className={TH}>Name</th><th className={TH}>Description</th></tr></thead>
          <tbody className={TBODY}>
            {(a.resultFields ?? []).map((r) => (
              <tr key={r.name}>
                <td className={cx(TD, "font-mono text-xs font-semibold text-gray-900")}>{r.name}</td>
                <td className={TD}>{r.description || "—"}</td>
              </tr>
            ))}
            {!(a.resultFields ?? []).length && <tr><td colSpan={2}><Empty>None documented.</Empty></td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Test */

const SAMPLE_CONTEXT = {
  subject: { name: "SAP_FIN_ADMIN", entitlementId: "e0000000-0000-0000-0000-000000000002", riskTier: "HIGH" },
  finding: { fallbackAvailable: false },
  event: { severity: "HIGH" },
};

function TestTab({ a }: { a: ActionType }) {
  const [executor, setExecutor] = useState(a.defaultExecutor ?? "");
  const [params, setParams] = useState(() => JSON.stringify(Object.fromEntries((a.parameters ?? [])
    .map((p) => [p.name, p.suggested ?? p.example ?? p.default]).filter(([, v]) => v != null)), null, 2));
  const [mode, setMode] = useState<"context" | "event">("context");
  const [eventId, setEventId] = useState("");
  const [context, setContext] = useState(JSON.stringify(SAMPLE_CONTEXT, null, 2));
  const [result, setResult] = useState<ActionTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        params: JSON.parse(params || "{}"), version: a.version, executor: executor.trim() || undefined,
        ...(mode === "event" ? { eventId: eventId.trim() } : { context: JSON.parse(context || "{}") }),
      };
      setResult(await Actions.test(a.code, body));
    } catch (e) {
      setError(e instanceof SyntaxError ? `Invalid JSON: ${e.message}` : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card
        title="Test"
        subtitle={`Templates are resolved against the context and the result is validated against v${a.version}'s schema; an external executor receives a DRY_RUN. Nothing is executed.`}
        right={
          <button className={BTN_PRIMARY} disabled={busy || (mode === "event" && !eventId.trim())} onClick={run}>
            {busy && <Spinner size={14} className="text-white" />} Test v{a.version}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Executor (empty = the action&apos;s default)</label>
            <input className={cx(INPUT, "font-mono")} value={executor} onChange={(e) => setExecutor(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Params (JSON)</label>
            <textarea className={cx(INPUT, "font-mono text-xs")} rows={8} value={params} onChange={(e) => setParams(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={mode === "context"} onChange={() => setMode("context")} /> Hand-written context
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={mode === "event"} onChange={() => setMode("event")} /> A real event (its governance context)
            </label>
          </div>
          {mode === "event" ? (
            <div>
              <label className={LABEL}>Event ID</label>
              <input className={cx(INPUT, "font-mono")} value={eventId} placeholder="Paste an event ID from All Events"
                     onChange={(e) => setEventId(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className={LABEL}>Context (JSON)</label>
              <textarea className={cx(INPUT, "font-mono text-xs")} rows={8} value={context} onChange={(e) => setContext(e.target.value)} />
            </div>
          )}
          {error && <ErrorLine error={new Error(error)} />}
        </div>
      </Card>

      <Card title="Result">
        {result ? (
          <div className="space-y-4">
            <KeyValueList rows={[
              ["Valid", <span key="v" className={result.violations?.length ? "text-red-600" : "text-green-700"}>
                {result.violations?.length ? `${result.violations.length} violation(s)` : "Yes"}
              </span>],
              ["Executor", <span key="e" className="inline-flex items-center gap-2 flex-wrap">
                <Mono>{result.executor?.code ?? "—"}</Mono>
                {result.executor?.kind && <span className={cx(PILL, "bg-gray-100 text-gray-700")}>{result.executor.kind}</span>}
                {result.executor?.supportsAction === false && <span className={cx(PILL, "bg-red-100 text-red-700")}>Does not support it</span>}
              </span>],
              ["Operation", result.operation ?? <Dash key="o" />],
              ...(result.answer ? [["Adapter answer", <span key="a" className={cx(PILL, "bg-gray-100 text-gray-700")}>{String(result.answer.status)}</span>] as [string, ReactNode]] : []),
            ]} />
            {!!result.violations?.length && (
              <ul className="list-disc ml-5 text-sm text-red-600 space-y-1">
                {result.violations.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            )}
            <Json v={result} max={420} />
          </div>
        ) : <span className="text-sm text-gray-500">Run a test to see the resolved parameters and any violations.</span>}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Contract */

function ContractTab({ a }: { a: ActionType }) {
  const q = useQuery({ queryKey: [...ACTIONS_KEY, a.code, a.version, "contract"], queryFn: () => Actions.contract(a.code, a.version) });
  const download = () => {
    const blob = new Blob([JSON.stringify(q.data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${a.code}-v${a.version}-contract.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  };
  return (
    <Loaded q={q}>{(c) => (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            What an adapter team needs: the parameter table, sample EXECUTE{a.reversible ? " and ROLLBACK" : ""} envelopes, the
            result shape and the documented result fields.
          </p>
          <button className={BTN_PRIMARY} onClick={download}><Download size={14} /> Download Contract</button>
        </div>
        <Card title={`Parameters of ${a.code} v${a.version}`} flush>
          <ParametersTable params={a.parameters ?? []} />
        </Card>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title="EXECUTE Envelope" subtitle="Sample values"><Json v={c.envelopes?.EXECUTE} max={420} /></Card>
          <Card title="Result the Executor Returns">
            <div className="space-y-4">
              <Json v={c.result} max={260} />
              {c.envelopes?.ROLLBACK != null && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">ROLLBACK Envelope</h3>
                  <Json v={c.envelopes.ROLLBACK} max={260} />
                </div>
              )}
            </div>
          </Card>
        </div>
        {!!c.notes?.length && (
          <Card title="Notes">
            <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1">
              {c.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </Card>
        )}
      </div>
    )}</Loaded>
  );
}

/* ---------------------------------------------------------------- Where used / versions */

function UsageTab({ code }: { code: string }) {
  const q = useQuery({ queryKey: [...ACTIONS_KEY, code, "usage"], queryFn: () => Actions.usage(code) });
  return (
    <Loaded q={q}>{(u) => {
      const byVersion = Object.entries(u.byVersion ?? {});
      return (
        <div className="space-y-6">
          <Card
            title="Definitions"
            subtitle={<>By pinned version (&apos;latest&apos; = DRAFT definitions following the ACTIVE version). Latest ACTIVE version: <b>{u.latestActiveVersion ?? "—"}</b> · named by <b>{u.definitions ?? 0}</b> definition(s).</>}
            flush
          >
            {byVersion.length ? byVersion.map(([v, rows]) => (
              <div key={v}>
                <div className="px-5 py-2 bg-gray-50 border-y border-gray-100 text-xs font-semibold text-gray-700">Version {v}</div>
                <table className="w-full">
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className={TH}>Definition</th><th className={TH}>Version</th><th className={TH}>State</th>
                      <th className={TH}>Pinned</th><th className={TH}>Named In</th>
                    </tr>
                  </thead>
                  <tbody className={TBODY}>
                    {rows.map((d) => (
                      <tr key={d.definitionId}>
                        <td className={TD}>
                          <Link href={`/assurance-events/event-definitions/${d.definitionId}`} className={BTN_LINK}>{d.code}</Link>
                        </td>
                        <td className={TD}>v{d.version}</td>
                        <td className={TD}><StateBadge value={d.state} /></td>
                        <td className={TD}>
                          <span className={cx(PILL, d.pinned ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                            {d.pinned ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className={TD}>
                          <div className="flex flex-wrap gap-1">
                            {d.sources.map((s) => <span key={s} className={cx(PILL, "bg-gray-100 text-gray-700 font-normal")}>{s}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )) : <Empty>Not named by any definition.</Empty>}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card title="Executors and Agents Listing It" flush>
              <table className="w-full">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Executor</th><th className={TH}>Version</th><th className={TH}>State</th>
                    <th className={TH}>Kind</th><th className={TH}>Via</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {(u.executors ?? []).map((x) => (
                    <tr key={`${x.executorCode}-${x.version}`}>
                      <td className={cx(TD, "font-mono text-xs")}>{x.executorCode}</td>
                      <td className={TD}>v{x.version}</td>
                      <td className={TD}><StateBadge value={x.state} /></td>
                      <td className={cx(TD, "text-xs")}>{x.kind}</td>
                      <td className={cx(TD, "text-xs")}>{x.via ?? "—"}</td>
                    </tr>
                  ))}
                  {!(u.executors ?? []).length && <tr><td colSpan={5}><Empty>No executor lists it.</Empty></td></tr>}
                </tbody>
              </table>
              {!!u.inProcessConnectors?.length && (
                <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-100">
                  In-process connectors implementing it: {u.inProcessConnectors.join(", ")}
                </p>
              )}
            </Card>
            <Card title="Review Forms Whose Outcomes Run It" flush>
              <table className="w-full">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Form</th><th className={TH}>Version</th><th className={TH}>State</th>
                    <th className={TH}>Owner</th><th className={TH}>Outcome</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {(u.reviewForms ?? []).map((f, i) => (
                    <tr key={i}>
                      <td className={TD}>
                        <Link href={`/assurance-events/review-forms/${encodeURIComponent(f.formCode)}?version=${f.version}`} className={BTN_LINK}>
                          {f.formCode}
                        </Link>
                      </td>
                      <td className={TD}>v{f.version}</td>
                      <td className={TD}><StateBadge value={f.state} /></td>
                      <td className={cx(TD, "text-xs")}>{f.system ? "System" : "Tenant"}</td>
                      <td className={cx(TD, "font-mono text-xs")}>{f.outcome}</td>
                    </tr>
                  ))}
                  {!(u.reviewForms ?? []).length && <tr><td colSpan={5}><Empty>No review form runs it.</Empty></td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      );
    }}</Loaded>
  );
}

function VersionsTab({ code, onOpen }: { code: string; onOpen: (a: ActionType) => void }) {
  const q = useQuery({ queryKey: [...ACTIONS_KEY, code, "versions"], queryFn: () => Actions.versions(code) });
  return (
    <Card title="Versions" subtitle="Click a version to open it." flush>
      <Loaded q={q}>{(rows) => (
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Version</th><th className={TH}>State</th><th className={TH}>Owner</th><th className={TH}>Name</th>
              <th className={TH}>Parameters</th><th className={TH}>Auto-Execution</th><th className={TH}>Default Executor</th>
              <th className={TH}>Activated</th><th className={TH}>Deprecated</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {rows.map((v) => (
              <tr key={v.actionId} className={TR_CLICKABLE} onClick={() => onOpen(v)}>
                <td className={cx(TD, "font-semibold text-gray-900")}>v{v.version}</td>
                <td className={TD}><StateBadge value={v.state} /></td>
                <td className={cx(TD, "text-xs")}>{v.system ? "System" : "Tenant"}</td>
                <td className={TD}>{v.name}</td>
                <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{paramSummary(v.parameters) || "—"}</td>
                <td className={cx(TD, "text-xs")}>{v.autoExecution}</td>
                <td className={cx(TD, "text-xs font-mono")}>{v.defaultExecutor || "—"}</td>
                <td className={cx(TD, "text-xs")}>{fmt(v.activatedAt)}</td>
                <td className={cx(TD, "text-xs")}>{fmt(v.deprecatedAt)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9}><Empty>No versions.</Empty></td></tr>}
          </tbody>
        </table>
      )}</Loaded>
    </Card>
  );
}
