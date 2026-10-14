"use client";

// =====================================================================
// Control — the Continuous Compliance Console's control page
// (graph.keyforge.ai/console#/controls/{code}?version=) on the same API,
// laid out like ISPM's gateway pages. Tabs:
//   Definition   GET  /compliance/controls/{code}?version=   (editable for a tenant DRAFT: PUT)
//   Versions     GET  /compliance/controls/{code}/versions
//   (Definition also shows Where Used: GET /compliance/controls/{code}/usage)
// Actions: Save, Activate, New Version, Deprecate (tenant controls), Clone.
// System controls are read-only — clone one to change it.
// =====================================================================

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Save, ShieldCheck } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  Controls, ControlsApiError, type Control, type ControlRequest,
} from "@/lib/controls-api";
import {
  BTN_DANGER, BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL, PAGE,
  Modal, PAGE_INNER_FLUSH, PILL, PageHeader, PageSpinner, Spinner, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";
import {
  BannerBar, JsonField, StateBadge, type Banner,
} from "@/components/assurance-events/definition-editor/fields";

const KEY = ["continuouscompliance", "controls"] as const;
const LIBRARY_HREF = "/assurance-events/control-library";
const controlHref = (code: string, version: number) => `${LIBRARY_HREF}/${encodeURIComponent(code)}?version=${version}`;
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

type Tab = "definition" | "versions";

const toRequest = (c: Control): ControlRequest => ({
  code: c.code,
  category: c.categoryCode,
  family: c.familyCode,
  objectKind: c.objectKind,
  name: c.name,
  description: c.description ?? "",
  condition: { language: c.condition?.language ?? "CEL", expression: c.condition?.expression ?? "" },
  parameters: c.parameters ?? [],
  evidenceFields: (c.evidenceFields as string[] | undefined) ?? [],
  severityHint: c.severityHint || undefined,
  tags: (c.tags as string[] | undefined) ?? [],
});

const fmt = (t?: unknown) =>
  typeof t === "string" && t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ControlPage />
    </Suspense>
  );
}

function ControlPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { code: rawCode = "" } = useParams<{ code: string }>();
  const code = decodeURIComponent(rawCode);
  const version = Number(useSearchParams().get("version")) || undefined;
  const connection = useCcConnection();
  const q = useQuery({ queryKey: [...KEY, "detail", code, version ?? "current"], queryFn: () => Controls.get(code, version) });
  const familiesQ = useQuery({ queryKey: [...KEY, "families"], queryFn: Controls.families });
  const categoriesQ = useQuery({ queryKey: [...KEY, "categories"], queryFn: Controls.categories });
  const c = q.data;
  const [form, setForm] = useState<ControlRequest | null>(null);
  const [tab, setTab] = useState<Tab>("definition");
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (q.data) setForm(toRequest(q.data)); }, [q.data]);
  useEffect(() => { setTab("definition"); }, [code]);

  const error = connection.error ?? q.error;
  const editable = !!c && !c.system && c.state === "DRAFT";
  const family = familiesQ.data?.families?.find((f) => f.code === form?.family);
  const categoryName = (cc: string) => categoriesQ.data?.find((x) => x.code === cc)?.displayName ?? cc;

  /** Runs a write, reloads the library, and opens the resulting version. */
  const run = async (label: string, action: () => Promise<Control>) => {
    setBusy(true);
    setBanner(null);
    try {
      const r = await action();
      await qc.invalidateQueries({ queryKey: KEY });
      setBanner({ tone: "ok", text: label });
      if (r?.code && r?.version && (r.code !== code || r.version !== version)) router.push(controlHref(r.code, r.version));
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Deprecate: a 409 means definitions still link the control — ask before forcing.
  const deprecate = async (x: Control) => {
    setBusy(true);
    setBanner(null);
    try {
      await Controls.deprecate(x.code, x.version, false);
      await qc.invalidateQueries({ queryKey: KEY });
      setBanner({ tone: "ok", text: "Deprecated" });
    } catch (e) {
      if (e instanceof ControlsApiError && e.status === 409 &&
          confirm(`${e.message}\n\nDeprecate anyway? Definitions keep their pinned version; DRAFT definitions following "latest" will fail to activate until relinked.`)) {
        await run("Deprecated (forced)", () => Controls.deprecate(x.code, x.version, true));
        return;
      }
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const [cloning, setCloning] = useState<Control | null>(null);
  const openClone = (x: Control) => setCloning(x);

  if (q.isLoading || !c || !form) {
    return (
      <div className={PAGE}>
        <div className={cx(PAGE_INNER_FLUSH, "space-y-3")}>
          <Link href={LIBRARY_HREF} className={BTN_LINK}>← Control Library</Link>
          {error ? <BannerBar banner={{ tone: "err", text: (error as Error).message }} /> : <PageSpinner />}
        </div>
      </div>
    );
  }

  const patch = (p: Partial<ControlRequest>) => setForm((f) => (f ? { ...f, ...p } : f));

  return (
    <div className={PAGE}>
      {cloning && <CloneControl src={cloning} onClose={() => setCloning(null)} onDone={(n) => router.push(controlHref(n.code, n.version))} />}
      <div className={PAGE_INNER_FLUSH}>
        <Link href={LIBRARY_HREF} className={cx(BTN_LINK, "inline-block mb-3")}>← Control Library</Link>
        <PageHeader
          title={
            <>
              {c.name}
              <StateBadge value={c.state} />
              <span className={cx(PILL, c.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                {c.system ? "System" : "Tenant"}
              </span>
            </>
          }
          subtitle={<><span className="font-mono">{c.code}</span> · v{c.version} · {categoryName(c.categoryCode)} · {c.objectKind}</>}
          actions={
            <>
              {editable && (
                <button className={BTN_PRIMARY} disabled={busy} onClick={() => run("Saved", () => Controls.update(c.code, form))}>
                  <Save size={14} /> Save
                </button>
              )}
              {editable && (
                <button className={BTN_PRIMARY} disabled={busy} onClick={() => run("Activated", () => Controls.activate(c.code, c.version))}>
                  <ShieldCheck size={14} /> Activate
                </button>
              )}
              {!c.system && c.state !== "DRAFT" && (
                <button className={BTN_SECONDARY} disabled={busy} onClick={() => run("New version cut (DRAFT)", () => Controls.newVersion(c.code))}>
                  New Version
                </button>
              )}
              {!c.system && c.state === "ACTIVE" && (
                <button className={BTN_DANGER} disabled={busy} onClick={() => deprecate(c)}>Deprecate</button>
              )}
              <button className={BTN_SECONDARY} disabled={busy} onClick={() => openClone(c)}><Copy size={14} /> Clone</button>
            </>
          }
        />

        {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}
        {!c.system && c.state !== "DRAFT" && (
          <Note>{c.state} controls are immutable. Cut a new version to change it; activating the new version deprecates this one. Definitions keep the version they pinned until a new definition version is activated.</Note>
        )}

        <TabBar<Tab>
          active={tab}
          onChange={setTab}
          tabs={[["definition", "Definition"], ["versions", "Versions"]]}
        />

        {tab === "definition" && (
          <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card title="Identity">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Code">
                  <input className={cx(INPUT, "font-mono")} value={form.code} readOnly />
                </Field>
                <Field label="Category">
                  <select className={INPUT} value={form.category} disabled={!editable} onChange={(e) => patch({ category: e.target.value })}>
                    {(categoriesQ.data ?? []).map((x) => <option key={x.code} value={x.code}>{x.displayName} ({x.code})</option>)}
                    {!(categoriesQ.data ?? []).some((x) => x.code === form.category) && <option value={form.category}>{form.category}</option>}
                  </select>
                </Field>
                <Field label="Object kind (the event's subject kind)">
                  <select className={INPUT} value={form.objectKind} disabled={!editable} onChange={(e) => patch({ objectKind: e.target.value })}>
                    {[...new Set([...(family?.objectKinds ?? []), form.objectKind])].map((k) => <option key={k}>{k}</option>)}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Name">
                    <input className={INPUT} value={form.name} readOnly={!editable} onChange={(e) => patch({ name: e.target.value })} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Description">
                    <textarea className={INPUT} rows={2} value={form.description ?? ""} readOnly={!editable}
                              onChange={(e) => patch({ description: e.target.value })} />
                  </Field>
                </div>
                <Field label="Severity hint">
                  <select className={INPUT} value={form.severityHint ?? ""} disabled={!editable}
                          onChange={(e) => patch({ severityHint: e.target.value || undefined })}>
                    <option value="">—</option>
                    {SEVERITIES.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Tags (comma separated)">
                  <input className={INPUT} value={form.tags.join(", ")} readOnly={!editable}
                         onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
                </Field>
              </div>
            </Card>

            <div className="space-y-6">
              <Card title="Condition (CEL)" subtitle="Compiled against the family's context on save, activate and test.">
                <textarea className={cx(INPUT, "font-mono text-xs")} rows={4} spellCheck={false} value={form.condition.expression}
                          readOnly={!editable} onChange={(e) => patch({ condition: { language: "CEL", expression: e.target.value } })} />
                <p className="text-xs text-gray-500 mt-2">
                  Variables: {family?.contextSchema ? Object.keys(family.contextSchema).map((k, i) => (
                    <span key={k}>{i > 0 && ", "}<code>{k}</code></span>
                  )) : "…"}, <code>params</code> (the defaults below), <code>tenant</code>, <code>now</code>. A parameter the
                  expression reads as <code>params.x</code> must be declared with a default.
                </p>
              </Card>

              <Card title="Parameters (Defaults)" subtitle="Library defaults, read as params.<name> (int, number, string, boolean, string[], duration; optional min / max / enum).">
                {editable ? (
                  <JsonField key={`params-${c.version}`} value={form.parameters} rows={7} onChange={(v) => patch({ parameters: v })} />
                ) : form.parameters.length ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead><tr className={THEAD_ROW}><th className={TH}>Name</th><th className={TH}>Type</th><th className={TH}>Default</th><th className={TH}>Range</th><th className={TH}>Description</th></tr></thead>
                      <tbody className={TBODY}>
                        {form.parameters.map((p) => (
                          <tr key={p.name}>
                            <td className={cx(TD, "font-mono text-xs font-semibold text-gray-900")}>{p.name}</td>
                            <td className={cx(TD, "text-xs")}>{p.type ?? "—"}</td>
                            <td className={cx(TD, "text-xs font-mono")}>{p.default === undefined ? "—" : JSON.stringify(p.default)}</td>
                            <td className={cx(TD, "text-xs")}>{p.min != null || p.max != null ? `${p.min ?? "…"} – ${p.max ?? "…"}` : "—"}</td>
                            <td className={cx(TD, "text-xs")}>{p.description ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-gray-500">No parameters.</p>}
                <FamilyContext family={family} />
              </Card>

              <Card title="Evidence Fields" subtitle="Context paths copied into the event's detection payload when the control fires.">
                <input className={cx(INPUT, "font-mono text-xs")} value={form.evidenceFields.join(", ")} readOnly={!editable}
                       onChange={(e) => patch({ evidenceFields: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
              </Card>
            </div>
          </div>
          <UsageTab code={c.code} />
          </div>
        )}
        {tab === "versions" && <VersionsTab code={c.code} onOpen={(v) => router.push(controlHref(v.code, v.version))} />}
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

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div><label className={LABEL}>{label}</label>{children}</div>
);
const Note = ({ children }: { children: ReactNode }) => (
  <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{children}</div>
);
const ErrorLine = ({ error }: { error: unknown }) => (
  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(error as Error).message}</div>
);
const Empty = ({ children }: { children: ReactNode }) => (
  <div className="px-4 py-8 text-center text-sm text-gray-500">{children}</div>
);
function Loaded<T>({ q, children }: { q: { isLoading: boolean; error: unknown; data?: T }; children: (d: T) => ReactNode }) {
  if (q.isLoading) return <PageSpinner />;
  if (q.error) return <ErrorLine error={q.error} />;
  return q.data === undefined ? null : <>{children(q.data)}</>;
}

/** The family's context — the variables a condition can read, as field pills. */
function FamilyContext({ family }: { family?: { contextSchema?: Record<string, { object?: string; fields?: Record<string, unknown> }> } }) {
  const schema = Object.entries(family?.contextSchema ?? {});
  if (!schema.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {schema.map(([name, v]) => (
        <div key={name}>
          <div className="text-xs mb-1">
            <span className="font-mono font-semibold text-gray-900">{name}</span>
            {v.object && <span className="text-gray-500"> ({v.object})</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(v.fields ?? {}).map(([field, type]) => (
              <span key={field} className={cx(PILL, "font-mono font-normal bg-gray-100 text-gray-700")}>
                {name}.{field}<span className="text-gray-400">{String(type)}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Versions / where used */

function VersionsTab({ code, onOpen }: { code: string; onOpen: (c: Control) => void }) {
  const q = useQuery({ queryKey: [...KEY, code, "versions"], queryFn: () => Controls.versions(code) });
  return (
    <Card title="Versions" subtitle="Tenant rows first, then the system library. Click a version to open it." flush>
      <Loaded q={q}>{(rows) => (
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Version</th><th className={TH}>State</th><th className={TH}>Owner</th><th className={TH}>Name</th>
              <th className={TH}>Expression</th><th className={TH}>Activated</th><th className={TH}>Deprecated</th><th className={TH}>Updated</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {(Array.isArray(rows) ? rows : []).map((v) => (
              <tr key={v.controlId} className={TR_CLICKABLE} onClick={() => onOpen(v)}>
                <td className={cx(TD, "font-semibold text-gray-900")}>v{v.version}</td>
                <td className={TD}><StateBadge value={v.state} /></td>
                <td className={cx(TD, "text-xs")}>{v.system ? "System" : "Tenant"}</td>
                <td className={TD}>{v.name}</td>
                <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{v.condition?.expression ?? "—"}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.activatedAt)}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.deprecatedAt)}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.updatedAt)}</td>
              </tr>
            ))}
            {!(Array.isArray(rows) && rows.length) && <tr><td colSpan={8}><Empty>No versions.</Empty></td></tr>}
          </tbody>
        </table>
      )}</Loaded>
    </Card>
  );
}

function UsageTab({ code }: { code: string }) {
  const q = useQuery({ queryKey: [...KEY, code, "usage"], queryFn: () => Controls.usage(code) });
  return (
    <Loaded q={q}>{(u) => {
      const byVersion = Object.entries(u.byVersion ?? {});
      return (
        <Card
          title="Where Used"
          subtitle={<>Definitions by pinned version (&apos;latest&apos; = DRAFT definitions following the ACTIVE version). Latest ACTIVE version: <b>{u.latestActiveVersion ?? "—"}</b> · linked by <b>{u.definitions ?? 0}</b> definition(s).</>}
          flush
        >
          {byVersion.length ? byVersion.map(([v, rows]) => (
            <div key={v}>
              <div className="px-5 py-2 bg-gray-50 border-y border-gray-100 text-xs font-semibold text-gray-700">Version {v}</div>
              <table className="w-full">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Definition</th><th className={TH}>Version</th><th className={TH}>State</th>
                    <th className={TH}>Position</th><th className={TH}>Pinned</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {rows.map((d) => (
                    <tr key={d.definitionId + d.position}>
                      <td className={TD}>
                        <Link href={`/assurance-events/event-definitions/${d.definitionId}`} className={BTN_LINK}>{d.code}</Link>
                      </td>
                      <td className={TD}>v{d.version}</td>
                      <td className={TD}><StateBadge value={d.state} /></td>
                      <td className={TD}>{d.position}</td>
                      <td className={TD}>
                        <span className={cx(PILL, d.pinned ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                          {d.pinned ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )) : <Empty>Not linked by any definition.</Empty>}
        </Card>
      );
    }}</Loaded>
  );
}

/* ---------------------------------------------------------------- Clone */

function CloneControl({ src, onDone, onClose }: { src: Control; onDone: (created: Control) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(src.system ? `MY_${src.code}` : `${src.code}_COPY`);
  const [name, setName] = useState(`${src.name} (copy)`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const created = await Controls.clone(src.code, { code: code.trim(), name: name.trim() });
      await qc.invalidateQueries({ queryKey: KEY });
      onClose();
      onDone(created);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Clone ${src.code} v${src.version}`} onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        A tenant DRAFT copy under a new code: the condition, parameters and evidence fields are copied; edit, test, then activate.
      </p>
      <Field label="New Code (UPPER_SNAKE_CASE)">
        <input className={cx(INPUT, "font-mono")} value={code} onChange={(e) => setCode(e.target.value)} />
      </Field>
      <Field label="Name">
        <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      {err && <ErrorLine error={new Error(err)} />}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
        <button type="button" className={BTN_PRIMARY} disabled={busy || !code.trim()} onClick={submit}>
          {busy && <Spinner size={14} className="text-white" />} Clone
        </button>
      </div>
    </div>
    </Modal>
  );
}

