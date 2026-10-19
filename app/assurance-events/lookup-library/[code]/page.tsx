"use client";

// =====================================================================
// Lookup — the Continuous Compliance Console's lookup page
// (graph.keyforge.ai/console#/lookup-tables/{code}?version=) on the same API,
// laid out like the SLA profile page. "new" creates one (POST, DRAFT).
//   Definition   identity, source, columns and match (editable for a new
//                or DRAFT lookup: POST / PUT)
//   Rows         GET  /compliance/lookup-tables/{code}/rows (filters, paging),
//                DELETE …/rows?{key}= per row, and Seed Rows
//                (GET …/rows-table, POST …/rows: one row or CSV / JSON)
//   Where Used   GET  /compliance/lookup-tables/{code}/usage
//   Versions     GET  /compliance/lookup-tables/{code}/versions
// Actions: Create / Save, Activate, Delete Draft, New Version, Deprecate,
// Drop Cache, Clone.
// =====================================================================

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import { ControlsApiError } from "@/lib/controls-api";
import {
  COLUMN_ROLES, contextPaths, LOOKUPS_BASE, LOOKUPS_KEY, LookupTables, NEW_LOOKUP, SELECT_MODES, keyColumns, lookupHref, toLookupRequest, valueColumns,
  parseSeedRows, type LookupColumn, type LookupRowsTable, type LookupSeedResult, type LookupTable, type LookupTableRequest,
} from "@/lib/cc-lookup-tables-api";
import {
  BTN_DANGER, BTN_GHOST, BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL,
  PAGE, PAGE_INNER_FLUSH, PILL, PageHeader, PageSpinner, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";
import { CloneLookup } from "@/components/assurance-events/CloneLookup";
import { ConditionEditor } from "@/components/assurance-events/LookupConditionEditor";

type Tab = "definition" | "rows" | "usage" | "versions";

const PAGE_SIZES = [25, 50, 100, 200, 500];

const fmt = (t?: unknown) =>
  typeof t === "string" && t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LookupPage />
    </Suspense>
  );
}

function LookupPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { code: rawCode = "" } = useParams<{ code: string }>();
  const code = decodeURIComponent(rawCode);
  const isNew = code === "new";
  const version = Number(useSearchParams().get("version")) || undefined;
  const connection = useCcConnection();
  const q = useQuery({
    queryKey: [...LOOKUPS_KEY, "detail", code, version ?? "current"],
    queryFn: () => LookupTables.get(code, version),
    enabled: !isNew,
  });
  const vocab = useQuery({ queryKey: [...LOOKUPS_KEY, "vocabulary"], queryFn: () => LookupTables.vocabulary(), staleTime: Infinity });
  const l = isNew ? null : q.data ?? null;
  const [form, setForm] = useState<LookupTableRequest>(NEW_LOOKUP);
  const [tab, setTab] = useState<Tab>("definition");
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);
  const [cloning, setCloning] = useState<LookupTable | null>(null);

  useEffect(() => { if (q.data && !isNew) setForm(toLookupRequest(q.data)); }, [q.data, isNew]);
  useEffect(() => { setTab("definition"); }, [code]);

  const editable = isNew || (!!l && l.state === "DRAFT");
  const dirty = isNew || (!!l && JSON.stringify(form) !== JSON.stringify(toLookupRequest(l)));
  const patch = (x: Partial<LookupTableRequest>) => setForm((f) => ({ ...f, ...x }));
  const error = connection.error ?? q.error;

  /** Runs a write, reloads the library, and opens the resulting version. */
  const run = async (label: string | ((r: unknown) => string), action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setBanner(null);
    try {
      const r = (await action()) as Partial<LookupTable> | undefined;
      await qc.invalidateQueries({ queryKey: LOOKUPS_KEY });
      setBanner({ tone: "ok", text: typeof label === "function" ? label(r) : label });
      if (after) after();
      else if (r?.code && r?.version && (isNew || r.code !== code || r.version !== version)) router.push(lookupHref(r.code, r.version));
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Deprecate: a 409 means definitions still bind the lookup — ask before forcing.
  const deprecate = async (x: LookupTable) => {
    setBusy(true);
    setBanner(null);
    try {
      await LookupTables.deprecate(x.code, x.version, false);
      await qc.invalidateQueries({ queryKey: LOOKUPS_KEY });
      setBanner({ tone: "ok", text: "Deprecated" });
    } catch (e) {
      if (e instanceof ControlsApiError && e.status === 409 &&
          confirm(`${e.message}\n\nDeprecate anyway? Definitions keep their pinned version; DRAFT definitions following "latest" will fail to activate until rebound.`)) {
        await run("Deprecated (forced)", () => LookupTables.deprecate(x.code, x.version, true));
        return;
      }
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!isNew && (q.isLoading || !l)) {
    return (
      <div className={PAGE}>
        <div className={cx(PAGE_INNER_FLUSH, "space-y-3")}>
          <Link href={LOOKUPS_BASE} className={BTN_LINK}>← Lookup Library</Link>
          {error ? <BannerBar banner={{ tone: "err", text: (error as Error).message }} /> : <PageSpinner />}
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      {cloning && <CloneLookup src={cloning} onClose={() => setCloning(null)} onDone={(c) => router.push(lookupHref(c.code, c.version))} />}
      <div className={PAGE_INNER_FLUSH}>
        <Link href={LOOKUPS_BASE} className={cx(BTN_LINK, "inline-block mb-3")}>← Lookup Library</Link>
        <PageHeader
          title={<>{isNew ? "New Lookup" : l!.name}{l && <StateBadge value={l.state} />}</>}
          subtitle={isNew ? "A new DRAFT lookup: pick its source, declare its columns and match, create it, then activate it."
            : <><span className="font-mono">{l!.code}</span> · v{l!.version} · <span className="font-mono">{l!.sourceSchema ? `${l!.sourceSchema}.` : ""}{l!.sourceName}</span> ({l!.sourceKind}) · {l!.selectMode}</>}
          actions={
            <>
              {editable && (
                <button className={BTN_PRIMARY} disabled={busy || !dirty}
                        onClick={() => run(isNew ? "Created (DRAFT)" : "Saved", () => (isNew ? LookupTables.create(form) : LookupTables.update(code, form)))}>
                  <Save size={14} /> {isNew ? "Create" : "Save"}
                </button>
              )}
              {l && l.state === "DRAFT" && (
                <button className={BTN_PRIMARY} disabled={busy}
                        onClick={() => run("Activated", async () => {
                          if (dirty) await LookupTables.update(l.code, form);
                          return LookupTables.activate(l.code, l.version);
                        })}>
                  <ShieldCheck size={14} /> Activate
                </button>
              )}
              {l && l.state === "DRAFT" && (
                <button className={BTN_SECONDARY} disabled={busy}
                        onClick={() => confirm(`Delete DRAFT ${l.code} v${l.version}? ACTIVE and DEPRECATED versions are kept; the only version of a code is refused while a definition binds it.`) &&
                          run("Deleted", () => LookupTables.remove(l.code, l.version), () => router.push(LOOKUPS_BASE))}>
                  <Trash2 size={14} /> Delete Draft
                </button>
              )}
              {l && l.state !== "DRAFT" && (
                <button className={BTN_SECONDARY} disabled={busy} onClick={() => run("New version cut (DRAFT)", () => LookupTables.newVersion(l.code))}>
                  New Version
                </button>
              )}
              {l && l.state === "ACTIVE" && (
                <button className={BTN_DANGER} disabled={busy} onClick={() => deprecate(l)}>Deprecate</button>
              )}
              {l && (
                <button className={BTN_SECONDARY} disabled={busy}
                        onClick={() => run((r) => `Dropped ${(r as { dropped?: number })?.dropped ?? 0} cached key set(s)`,
                          () => LookupTables.invalidate(l.code), () => undefined)}>
                  Drop Cache
                </button>
              )}
              {l && <button className={BTN_SECONDARY} disabled={busy} onClick={() => setCloning(l)}><Copy size={14} /> Clone</button>}
            </>
          }
        />

        {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}
        {l && l.state !== "DRAFT" && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {l.state} lookups are immutable. Cut a new version to change it; activating the new version deprecates this one. Definitions keep
            the version they pinned until a new definition version is activated.
          </div>
        )}

        {!isNew && (
          <TabBar<Tab> active={tab} onChange={setTab}
                       tabs={[["definition", "Definition"], ["rows", "Rows"], ["usage", "Where Used"], ["versions", "Versions"]]} />
        )}

        {tab === "definition" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card title="Identity">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Code">
                    <input className={cx(INPUT, "font-mono")} value={form.code} readOnly={!isNew} onChange={(e) => patch({ code: e.target.value })} />
                  </Field>
                  <Field label="Owner (role or person accountable for the table)">
                    <input className={INPUT} value={form.owner} readOnly={!editable} placeholder="e.g. IAM_GOVERNANCE"
                           onChange={(e) => patch({ owner: e.target.value })} />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Name">
                      <input className={INPUT} value={form.name} readOnly={!editable} onChange={(e) => patch({ name: e.target.value })} />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Description">
                      <textarea className={INPUT} rows={2} value={form.description} readOnly={!editable} onChange={(e) => patch({ description: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Select">
                    <select className={INPUT} value={form.select} disabled={!editable} onChange={(e) => patch({ select: e.target.value })}>
                      {(vocab.data?.selectModes ?? SELECT_MODES).map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Max rows (candidate rows fetched)">
                    <input type="number" min={1} max={vocab.data?.maxRows ?? 5000} className={INPUT} value={form.maxRows} readOnly={!editable}
                           onChange={(e) => patch({ maxRows: Number(e.target.value) || 1 })} />
                  </Field>
                  <Field label="Cache TTL (ISO-8601; PT0S = no cache)">
                    <input className={cx(INPUT, "font-mono")} value={form.cacheTtl} readOnly={!editable} onChange={(e) => patch({ cacheTtl: e.target.value })} />
                  </Field>
                  <Field label="Tags (comma separated)">
                    <input className={INPUT} value={form.tags.join(", ")} readOnly={!editable}
                           onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Order by (JSON array; FIRST takes the first row)">
                      <JsonInput value={form.orderBy} readOnly={!editable} rows={3}
                                 onChange={(v) => Array.isArray(v) && patch({ orderBy: v })} />
                    </Field>
                  </div>
                </div>
                {l && (
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm mt-4">
                    <dt className="text-gray-500">Activated</dt><dd className="text-gray-900">{fmt(l.activatedAt)}</dd>
                    <dt className="text-gray-500">Deprecated</dt><dd className="text-gray-900">{fmt(l.deprecatedAt)}</dd>
                  </dl>
                )}
              </Card>

              <Card title="Source" subtitle="A table or view in an allow-listed schema.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Schema">
                    <select className={INPUT} value={form.source.schema} disabled={!editable}
                            onChange={(e) => patch({ source: { ...form.source, schema: e.target.value } })}>
                      <option value="">(default: {vocab.data?.allowedSchemas?.[0] || "current schema"})</option>
                      {[...new Set([...(vocab.data?.allowedSchemas ?? []), ...(form.source.schema ? [form.source.schema] : [])])]
                        .map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Kind">
                    <select className={INPUT} value={form.source.kind} disabled={!editable}
                            onChange={(e) => patch({ source: { ...form.source, kind: e.target.value } })}>
                      <option>VIEW</option>
                      <option>TABLE</option>
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label={`Object${vocab.data?.allowedNamePrefixes?.length ? ` (allowed prefixes: ${vocab.data.allowedNamePrefixes.join(", ")})` : ""}`}>
                      <input className={cx(INPUT, "font-mono")} value={form.source.name} readOnly={!editable}
                             onChange={(e) => patch({ source: { ...form.source, name: e.target.value } })} />
                    </Field>
                  </div>
                  <Field label="Tenant column (empty = tenant-private object)">
                    <input className={cx(INPUT, "font-mono")} value={form.tenantColumn} readOnly={!editable}
                           onChange={(e) => patch({ tenantColumn: e.target.value })} />
                  </Field>
                  <Field label="Rows table (the table rows are seeded into)">
                    <input className={cx(INPUT, "font-mono")} value={form.rowsTable?.name ?? ""} readOnly={!editable} placeholder="(none)"
                           onChange={(e) => patch({ rowsTable: e.target.value ? { schema: form.source.schema, name: e.target.value } : null })} />
                  </Field>
                </div>
              </Card>
            </div>

            <Card title="Columns" subtitle="KEY columns match the event, VALUE columns are copied into finding.lookup (BOTH: matched and copied)." flush>
              <ColumnsEditor columns={form.columns} editable={editable} types={vocab.data?.columnTypes} roles={vocab.data?.roles}
                             onChange={(columns) => patch({ columns })} />
            </Card>

            <Card title="Condition — which rows of the source match the event">
              {l && l.state !== "DRAFT" && (
                <div className="mb-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  This version is <b>{l.state}</b>: its condition is immutable, so the definitions that bind it keep resolving the same way. To change
                  the condition, cut a new version (
                  <button className={cx(BTN_SECONDARY, "px-2.5 py-1 text-xs")} disabled={busy}
                          onClick={() => run("New version cut (DRAFT)", () => LookupTables.newVersion(l.code))}>
                    New version with this condition
                  </button>
                  ), edit the DRAFT and activate it. A definition may also give itself an <b>own condition</b> for this lookup on its Lookups tab.
                </div>
              )}
              <ConditionEditor
                match={form.match}
                expression={form.condition?.expression ?? ""}
                keys={keyColumns(form.columns)}
                paths={contextPaths(vocab.data)}
                editable={editable}
                resetKey={l?.lookupId}
                onChange={(c) => patch({ match: c.match, condition: c.expression.trim() ? { language: "CEL", expression: c.expression } : null })}
              />
            </Card>
          </div>
        )}
        {tab === "usage" && l && <UsageCard code={l.code} />}
        {tab === "rows" && l && <RowsTab l={l} />}
        {tab === "versions" && l && <VersionsCard code={l.code} onOpen={(v) => router.push(lookupHref(v.code, v.version))} />}
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
const Empty = ({ children }: { children: ReactNode }) => (
  <div className="px-4 py-8 text-center text-sm text-gray-500">{children}</div>
);
function Loaded<T>({ q, children }: { q: { isLoading: boolean; error: unknown; data?: T }; children: (d: T) => ReactNode }) {
  if (q.isLoading) return <PageSpinner />;
  if (q.error) return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(q.error as Error).message}</div>;
  return q.data === undefined ? null : <>{children(q.data)}</>;
}

/** A JSON textarea: edits apply once the text parses. */
function JsonInput({ value, onChange, readOnly, rows }: { value: unknown; onChange: (v: unknown) => void; readOnly?: boolean; rows: number }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [bad, setBad] = useState(false);
  const serialized = JSON.stringify(value, null, 2);
  useEffect(() => {
    setText((t) => { try { return JSON.stringify(JSON.parse(t), null, 2) === serialized ? t : serialized; } catch { return t; } });
  }, [serialized]);
  return (
    <>
      <textarea className={cx(INPUT, "font-mono text-xs", bad && "border-red-400")} rows={rows} spellCheck={false} readOnly={readOnly} value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  try { onChange(JSON.parse(e.target.value)); setBad(false); } catch { setBad(true); }
                }} />
      {bad && <p className="text-xs text-red-600 mt-1">Not valid JSON — the change is not applied.</p>}
    </>
  );
}

function ColumnsEditor({ columns, editable, types, roles, onChange }: {
  columns: LookupColumn[]; editable: boolean; types?: string[]; roles?: string[]; onChange: (c: LookupColumn[]) => void;
}) {
  const update = (i: number, x: Partial<LookupColumn>) => onChange(columns.map((c, j) => (j === i ? { ...c, ...x } : c)));
  const typeOptions = (t: string) => [...new Set([...(types ?? ["STRING", "NUMBER", "BOOLEAN"]), t])];
  return (
    <>
      <table className="w-full">
        <thead>
          <tr className={THEAD_ROW}>
            <th className={TH}>Column</th><th className={TH}>Type</th><th className={TH}>Role</th><th className={TH}>Label</th>
            <th className={TH}>Sensitive</th>{editable && <th className={TH}></th>}
          </tr>
        </thead>
        <tbody className={TBODY}>
          {columns.map((c, i) => (
            <tr key={i}>
              <td className={TD}>
                <input className={cx(INPUT, "font-mono")} value={c.name} readOnly={!editable} onChange={(e) => update(i, { name: e.target.value })} />
              </td>
              <td className={TD}>
                <select className={INPUT} value={c.type} disabled={!editable} onChange={(e) => update(i, { type: e.target.value })}>
                  {typeOptions(c.type).map((t) => <option key={t}>{t}</option>)}
                </select>
              </td>
              <td className={TD}>
                <select className={INPUT} value={c.role} disabled={!editable} onChange={(e) => update(i, { role: e.target.value })}>
                  {(roles ?? COLUMN_ROLES).map((r) => <option key={r}>{r}</option>)}
                </select>
              </td>
              <td className={TD}>
                <input className={INPUT} value={c.label ?? ""} readOnly={!editable} onChange={(e) => update(i, { label: e.target.value })} />
              </td>
              <td className={TD}>
                <input type="checkbox" checked={!!c.sensitive} disabled={!editable} onChange={(e) => update(i, { sensitive: e.target.checked })} />
              </td>
              {editable && (
                <td className={TD}>
                  <button className={cx(BTN_GHOST, "px-2 text-red-600")} aria-label="Remove column" onClick={() => onChange(columns.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!columns.length && <tr><td colSpan={6}><Empty>No columns exposed yet.</Empty></td></tr>}
        </tbody>
      </table>
      {editable && (
        <div className="px-5 py-3 border-t border-gray-100">
          <button className={cx(BTN_SECONDARY, "text-xs")} onClick={() => onChange([...columns, { name: "", type: "STRING", role: "VALUE" }])}>
            <Plus size={12} /> Add Column
          </button>
        </div>
      )}
    </>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** A row value as the console shows it: — for empty, coloured booleans, monospace ids, readable timestamps. */
function cell(v: unknown): ReactNode {
  if (v == null || v === "") return <span className="text-gray-400">—</span>;
  if (typeof v === "boolean") return <span className={v ? "text-green-700" : "text-red-600"}>{String(v)}</span>;
  if (typeof v === "object") return <code className="text-xs text-gray-500 [overflow-wrap:anywhere]">{JSON.stringify(v)}</code>;
  if (typeof v === "string" && ISO_TIME.test(v)) return <span title={v}>{fmt(v)}</span>;
  if (typeof v === "string" && (UUID.test(v) || v.startsWith("sha256:"))) return <span className="font-mono text-xs">{v}</span>;
  return String(v);
}

/** The Rows tab: filters, the source's rows as the lookup sees them, and seeding into the rows table. */
function RowsTab({ l }: { l: LookupTable }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<Banner>(null);
  const rowsKey = [...LOOKUPS_KEY, l.code, l.version, "rows"];
  const q = useQuery({
    queryKey: [...rowsKey, page, pageSize, filters],
    queryFn: () => LookupTables.rows(l.code, { version: l.version, page, pageSize, filters }),
  });
  const rt = useQuery({ queryKey: [...LOOKUPS_KEY, l.code, l.version, "rows-table"], queryFn: () => LookupTables.rowsTable(l.code, l.version) });
  const reload = () => qc.invalidateQueries({ queryKey: rowsKey });

  const keys = keyColumns(l.columns);
  // Delete matches rows of the rows table by the KEY columns it actually has.
  const deleteKeys = rt.data?.seedable ? rt.data.keyColumns.filter((k) => rt.data!.columns.some((c) => c.name === k)) : [];
  const filterCount = Object.keys(filters).length;
  const cols = q.data?.columns ?? (l.columns ?? []).map((c) => c.name);
  const source = `${l.sourceSchema ? `${l.sourceSchema}.` : ""}${l.sourceName}`;
  const requestQuery = Object.entries({ ...filters, version: l.version, page, pageSize })
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");

  const apply = () => {
    setFilters(Object.fromEntries(Object.entries(inputs).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])));
    setPage(0);
  };
  const reset = () => { setInputs({}); setFilters({}); setPage(0); };

  const deleteRow = async (row: Record<string, unknown>) => {
    const match = Object.fromEntries(deleteKeys.map((k) => [k, String(row[k] ?? "")]));
    const where = Object.entries(match).map(([k, v]) => `${k} = ${v}`).join(" and ");
    if (!confirm(`Delete the row(s) of ${rt.data?.rowsTable?.name} where ${where}?`)) return;
    try {
      const r = await LookupTables.deleteRows(l.code, match, l.version);
      setBanner({ tone: "ok", text: `${r.deleted} row(s) deleted from ${r.rowsTable}` });
      reload();
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {banner && <BannerBar banner={banner} onClose={() => setBanner(null)} />}

      <div className={cx(CARD, "p-5")}>
        <p className="text-sm text-gray-600 mb-4">
          The source&apos;s rows as the lookup sees them: its declared columns, this tenant&apos;s rows
          {l.tenantColumn && <> (<code>{l.tenantColumn}</code>)</>}, in its <code>orderBy</code> order. Read live from{" "}
          <code>{source}</code>, the cache is not involved. Filters are equalities compared as text — type <code>*</code> to see the
          wildcard rows, <code>true</code> for a boolean.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end" onKeyDown={(e) => e.key === "Enter" && apply()}>
          {(l.columns ?? []).map((c) => (
            <div key={c.name}>
              <label className={cx(LABEL, "flex items-center gap-1.5")}>
                <span className="font-mono">{c.name}</span>
                {c.role !== "VALUE" && <span className={cx(PILL, "bg-blue-100 text-blue-700")}>{c.role === "BOTH" ? "KEY+VALUE" : "KEY"}</span>}
              </label>
              <input className={cx(INPUT, "font-mono")} value={inputs[c.name] ?? ""} placeholder={c.type}
                     onChange={(e) => setInputs({ ...inputs, [c.name]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className={LABEL}>Page size</label>
            <select className={INPUT} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
              {PAGE_SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button className={BTN_PRIMARY} onClick={apply}>Apply Filters</button>
          <button className={BTN_SECONDARY} onClick={reset} disabled={!filterCount && !Object.keys(inputs).length}>Reset</button>
          <button className={BTN_SECONDARY} onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500 font-mono [overflow-wrap:anywhere]">GET /compliance/lookup-tables/{"{code}"}/rows?{requestQuery}</div>
      </div>

      <Card
        title={`Rows · page ${page + 1}${q.data ? ` · ${q.data.count} row(s)${q.data.hasMore ? " (more)" : ""}${filterCount ? ` · ${filterCount} filter(s)` : ""}${q.data.durationMs != null ? ` · ${q.data.durationMs} ms` : ""}` : ""}`}
        right={
          <div className="flex gap-2">
            <button className={cx(BTN_SECONDARY, "text-xs")} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ previous page</button>
            <button className={cx(BTN_SECONDARY, "text-xs")} disabled={!q.data?.hasMore} onClick={() => setPage((p) => p + 1)}>next page ›</button>
          </div>
        }
        flush
      >
        <Loaded q={q}>{(d) => (
          <>
            {d.rows?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={THEAD_ROW}>
                      {cols.map((c) => <th key={c} className={cx(TH, "whitespace-nowrap")}>{c}</th>)}
                      {deleteKeys.length > 0 && <th className={TH}></th>}
                    </tr>
                  </thead>
                  <tbody className={TBODY}>
                    {d.rows.map((r, i) => (
                      <tr key={i}>
                        {cols.map((c) => <td key={c} className={cx(TD, "align-middle")}>{cell(r[c])}</td>)}
                        {deleteKeys.length > 0 && (
                          <td className={cx(TD, "align-middle text-right")}>
                            <button className="rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                                    onClick={() => deleteRow(r)}>
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>{filterCount ? "No rows match the filters." : page > 0 ? "No rows on this page." : "The source has no rows for this tenant."}</Empty>
            )}
            {keys.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                KEY columns: {keys.join(", ")} · a <code>*</code> in a KEY column is the wildcard row.
                {deleteKeys.length > 0 && <> <i>Delete</i> removes the rows of <code>{rt.data?.rowsTable?.name}</code> with the same KEY values.</>}
              </div>
            )}
          </>
        )}</Loaded>
      </Card>

      {rt.data && (rt.data.seedable ? (
        <SeedRows l={l} rt={rt.data} onDone={reload} onBanner={setBanner} />
      ) : (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Rows cannot be seeded from here: {rt.data.reason}
        </div>
      ))}
    </div>
  );
}

/** Seed rows into the rows table: one row from a form, or many from CSV / JSON (APPEND or REPLACE). */
function SeedRows({ l, rt, onDone, onBanner }: { l: LookupTable; rt: LookupRowsTable; onDone: () => void; onBanner: (b: Banner) => void }) {
  const [one, setOne] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"APPEND" | "REPLACE">("APPEND");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<LookupSeedResult | null>(null);
  const target = `${rt.rowsTable?.schema}.${rt.rowsTable?.name}`;

  const seed = async (rows: Array<Record<string, unknown>>, m: "APPEND" | "REPLACE") => {
    if (m === "REPLACE" && !confirm(`Replace every row of this tenant in ${target} with ${rows.length} row(s)?`)) return false;
    setBusy(true);
    try {
      const r = await LookupTables.seedRows(l.code, { rows, mode: m }, l.version);
      setLast(r);
      onBanner({ tone: "ok", text: `${r.inserted} row(s) inserted${r.deleted ? `, ${r.deleted} deleted` : ""} in ${r.rowsTable}` });
      onDone();
      return true;
    } catch (e) {
      onBanner({ tone: "err", text: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const insertOne = async () => {
    const row: Record<string, unknown> = {};
    for (const c of rt.columns) { const v = (one[c.name] ?? "").trim(); if (v !== "") row[c.name] = v; }
    if (await seed([row], "APPEND")) setOne({});
  };
  const loadMany = async () => {
    let rows: Array<Record<string, unknown>>;
    try { rows = parseSeedRows(text); } catch (e) { onBanner({ tone: "err", text: (e as Error).message }); return; }
    if (!rows.length && mode === "APPEND") { onBanner({ tone: "err", text: "Nothing to load" }); return; }
    if (await seed(rows, mode)) setText("");
  };

  return (
    <Card title={<>Seed Rows · <span className="font-normal">POST /compliance/lookup-tables/{"{code}"}/rows → {target}</span></>}>
      <p className="text-sm text-gray-600 mb-5">
        Rows are written into <code>{target}</code> for this tenant{rt.tenantColumn && <> (<code>{rt.tenantColumn}</code> is filled for you)</>}; the
        lookup reads them through <code>{rt.source}</code>. Columns:{" "}
        {rt.columns.map((c) => (
          <span key={c.name}>
            <code>{c.name}</code>{c.required && <b title="NOT NULL without a default">*</b>} <span className="text-gray-500">{c.sqlType}</span>{" "}
          </span>
        ))}
        . Every write is a <code>LOOKUP_TABLE_ROWS_SEEDED</code> ledger row and drops the lookup&apos;s cache.
      </p>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">Add One Row</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {rt.columns.map((c) => (
              <div key={c.name}>
                <label className={LABEL}>
                  <span className="font-semibold">{c.name}</span>{c.required && <span className="text-gray-500"> *</span>}{" "}
                  <span className="text-xs text-gray-500">{c.sqlType}</span>
                </label>
                {c.type === "boolean" ? (
                  <select className={INPUT} value={one[c.name] ?? ""} onChange={(e) => setOne({ ...one, [c.name]: e.target.value })}>
                    <option value="">—</option><option>true</option><option>false</option>
                  </select>
                ) : (
                  <input className={cx(INPUT, "font-mono")} type={c.type === "integer" || c.type === "number" ? "number" : "text"}
                         value={one[c.name] ?? ""} placeholder={c.required ? "required" : c.hasDefault ? "default" : "null"}
                         onChange={(e) => setOne({ ...one, [c.name]: e.target.value })} />
                )}
              </div>
            ))}
            <button className={cx(BTN_PRIMARY, "w-full justify-center")} disabled={busy} onClick={insertOne}>Insert Row</button>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">Load Many</div>
          <p className="text-sm text-gray-600 mb-2">
            CSV / TSV with a header line (<code>{rt.columns.map((c) => c.name).join(",")}</code>) or a JSON array of objects, as in the sample
            bundles&apos; <code>fallback_groups.json</code>; keys starting with <code>_</code> are notes; empty cells are NULL.
          </p>
          <textarea className={cx(INPUT, "font-mono text-xs")} rows={6} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)}
                    placeholder={"application,risk_tier,privileged,fallback_group,priority\nSAP-FI,HIGH,*,a3000000-0000-0000-0000-000000000001,10"} />
          <select className={cx(INPUT, "mt-3")} value={mode} onChange={(e) => setMode(e.target.value as "APPEND" | "REPLACE")}>
            <option value="APPEND">APPEND — add to the existing rows</option>
            <option value="REPLACE">REPLACE — delete this tenant&apos;s rows first</option>
          </select>
          <button className={cx(BTN_PRIMARY, "mt-3")} disabled={busy || (!text.trim() && mode === "APPEND")} onClick={loadMany}>Load</button>
          {last && (
            <p className="text-xs text-gray-500 mt-2">
              Last: {last.mode} → inserted {last.inserted}, deleted {last.deleted}{last.durationMs != null && ` (${last.durationMs} ms)`}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function UsageCard({ code }: { code: string }) {
  const q = useQuery({ queryKey: [...LOOKUPS_KEY, code, "usage"], queryFn: () => LookupTables.usage(code) });
  return (
    <Loaded q={q}>{(u) => {
      const byVersion = Object.entries(u.byVersion ?? {});
      return (
        <Card
          title="Where Used"
          subtitle={<>Definitions by pinned version. Latest ACTIVE version: <b>{u.latestActiveVersion ?? "—"}</b> · bound by <b>{u.definitions ?? 0}</b> definition(s) · named by <b>{u.rules?.length ?? 0}</b> rule(s).</>}
          flush
        >
          {byVersion.length ? byVersion.map(([v, rows]) => (
            <div key={v}>
              <div className="px-5 py-2 bg-gray-50 border-y border-gray-100 text-xs font-semibold text-gray-700">Version {v}</div>
              <table className="w-full">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Definition</th><th className={TH}>Version</th><th className={TH}>State</th>
                    <th className={TH}>Alias</th><th className={TH}>Primary</th><th className={TH}>Pinned</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {rows.map((d) => (
                    <tr key={d.definitionId + d.position}>
                      <td className={TD}><Link href={`/assurance-events/event-definitions/${d.definitionId}`} className={BTN_LINK}>{d.code}</Link></td>
                      <td className={TD}>v{d.version}</td>
                      <td className={TD}><StateBadge value={d.state} /></td>
                      <td className={cx(TD, "font-mono text-xs")}>{d.alias}</td>
                      <td className={TD}>{d.primary ? <span className={cx(PILL, "bg-blue-100 text-blue-700")}>Primary</span> : "—"}</td>
                      <td className={TD}>
                        <span className={cx(PILL, d.pinned ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{d.pinned ? "Yes" : "No"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )) : <Empty>Not bound by any definition.</Empty>}
        </Card>
      );
    }}</Loaded>
  );
}

function VersionsCard({ code, onOpen }: { code: string; onOpen: (l: LookupTable) => void }) {
  const q = useQuery({ queryKey: [...LOOKUPS_KEY, code, "versions"], queryFn: () => LookupTables.versions(code) });
  return (
    <Card title="Versions" subtitle="Click a version to open it." flush>
      <Loaded q={q}>{(rows) => (
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Version</th><th className={TH}>State</th><th className={TH}>Name</th><th className={TH}>Source</th>
              <th className={TH}>Key Columns</th><th className={TH}>Value Columns</th>
              <th className={TH}>Activated</th><th className={TH}>Deprecated</th><th className={TH}>Updated</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {rows.map((v) => (
              <tr key={v.lookupId} className={TR_CLICKABLE} onClick={() => onOpen(v)}>
                <td className={cx(TD, "font-semibold text-gray-900")}>v{v.version}</td>
                <td className={TD}><StateBadge value={v.state} /></td>
                <td className={TD}>{v.name}</td>
                <td className={cx(TD, "text-xs font-mono")}>{v.sourceSchema ? `${v.sourceSchema}.` : ""}{v.sourceName}</td>
                <td className={cx(TD, "text-xs font-mono")}>{keyColumns(v.columns).join(", ") || "—"}</td>
                <td className={cx(TD, "text-xs font-mono")}>{valueColumns(v.columns).join(", ") || "—"}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.activatedAt)}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.deprecatedAt)}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.updatedAt)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9}><Empty>No versions.</Empty></td></tr>}
          </tbody>
        </table>
      )}</Loaded>
    </Card>
  );
}
