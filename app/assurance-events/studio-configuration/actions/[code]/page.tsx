"use client";

// =====================================================================
// Action — the Continuous Compliance Console's action page
// (graph.keyforge.ai/console#/actions/{code}?version=) on the same API,
// laid out like ISPM's gateway pages. Tabs:
//   Definition   GET  /compliance/action-types/{code}?version=
//   Where Used   GET  /compliance/action-types/{code}/usage
//   Versions     GET  /compliance/action-types/{code}/versions
// Actions: Save (a tenant DRAFT's identity), Activate, New Version, Deprecate (tenant actions), Clone.
// =====================================================================

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import { ControlsApiError } from "@/lib/controls-api";
import {
  ACTIONS_KEY, ACTION_CATEGORIES, Actions, TARGET_KINDS, actionHref, paramSummary, toActionRequest,
  type ActionParameter, type ActionRequest, type ActionType,
} from "@/lib/cc-actions-api";
import { CloneAction } from "@/components/assurance-events/CloneAction";
import {
  BTN_DANGER, BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL, PAGE,
  PAGE_INNER_FLUSH, PILL, PageHeader, PageSpinner, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, KeyValueList, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";

type Tab = "definition" | "usage" | "versions";
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
  // The editable copy: a tenant DRAFT can change its Identity (PUT /compliance/action-types/{code}).
  const [draft, setDraft] = useState<ActionRequest | null>(null);
  useEffect(() => { setDraft(a ? toActionRequest(a) : null); }, [a]);
  const editable = !!a && !a.system && a.state === "DRAFT";
  const dirty = !!a && !!draft && JSON.stringify(draft) !== JSON.stringify(toActionRequest(a));
  const patch = (p: Partial<ActionRequest>) => setDraft((d) => (d ? { ...d, ...p } : d));

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

  const [cloning, setCloning] = useState<ActionType | null>(null);
  const openClone = (x: ActionType) => setCloning(x);

  return (
    <div className={PAGE}>
      {cloning && <CloneAction src={cloning} onClose={() => setCloning(null)} onDone={(c) => { setTab("definition"); router.push(actionHref(c.code, c.version)); }} />}
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
                  {editable && draft && (
                    <button className={BTN_PRIMARY} disabled={busy || !dirty}
                            onClick={() => act("Saved", () => Actions.update(a.code, draft))}>
                      <Save size={14} /> Save
                    </button>
                  )}
                  {!a.system && a.state === "DRAFT" && (
                    <button className={BTN_PRIMARY} disabled={busy}
                            onClick={() => act("Activated", async () => {
                              if (dirty && draft) await Actions.update(a.code, draft);
                              return Actions.activate(a.code, a.version);
                            })}>Activate</button>
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
              tabs={[["definition", "Definition"], ["usage", "Where Used"], ["versions", "Versions"]]}
            />

            {editable && dirty && (
              <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Unsaved changes. Save to keep them; Activate saves them first.
              </div>
            )}
            {tab === "definition" && draft && <DefinitionTab a={a} draft={draft} editable={editable} patch={patch} />}
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

function DefinitionTab({ a, draft, editable, patch }: {
  a: ActionType; draft: ActionRequest; editable: boolean; patch: (p: Partial<ActionRequest>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <Card title="Identity" subtitle={editable ? "Only the identity of a draft can be changed." : undefined}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Code</label>
              <input className={cx(INPUT, "font-mono")} value={draft.code} readOnly />
            </div>
            <div>
              <label className={LABEL}>Category</label>
              <select className={INPUT} value={draft.category} disabled={!editable} onChange={(e) => patch({ category: e.target.value })}>
                {[...new Set([...ACTION_CATEGORIES, draft.category])].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Name</label>
              <input className={INPUT} value={draft.name} readOnly={!editable} onChange={(e) => patch({ name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Description</label>
              <textarea className={INPUT} rows={2} value={draft.description ?? ""} readOnly={!editable}
                        onChange={(e) => patch({ description: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Target kind (what it changes)</label>
              <select className={INPUT} value={draft.targetKind} disabled={!editable} onChange={(e) => patch({ targetKind: e.target.value })}>
                {[...new Set([...TARGET_KINDS, draft.targetKind])].map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Reversible</label>
              <select className={INPUT} value={String(draft.reversible)} disabled={!editable}
                      onChange={(e) => patch({ reversible: e.target.value === "true" })}>
                <option value="true">Yes (executor returns a rollback token)</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Auto-execution</label>
              <select className={INPUT} value={draft.autoExecution} disabled={!editable} onChange={(e) => patch({ autoExecution: e.target.value })}>
                <option>ALLOWED</option>
                <option>REVIEW_ONLY</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Tags (comma separated)</label>
              <input className={INPUT} value={draft.tags.join(", ")} readOnly={!editable}
                     onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
            </div>
          </div>
          <div className="mt-4">
            <KeyValueList rows={[["Activated", fmt(a.activatedAt)], ["Deprecated", fmt(a.deprecatedAt)]]} />
          </div>
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
