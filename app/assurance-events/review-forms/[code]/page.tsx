"use client";

// =====================================================================
// Review form — the Continuous Compliance Console's form page
// (graph.keyforge.ai/console#/forms/{code}?version=) on the same API, laid
// out like ISPM's gateway pages. The form comes from the library response
// (GET /compliance/review-forms). Tabs:
//   Definition          (the form and its fields; editable for a tenant DRAFT: PUT /compliance/review-forms/{code})
//   Where Used          GET  /compliance/review-forms/{code}/usage
//   Preview & Dry Run   POST /compliance/review-forms/{code}/render | /test
//   Versions            GET  /compliance/review-forms/{code}/versions
// Actions: Save, Activate, New Version, Deprecate (tenant forms), Clone.
// =====================================================================

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import { ControlsApiError } from "@/lib/controls-api";
import { CcEvents, type CcReviewFormTest, type CcReviewFormView } from "@/lib/cc-events-api";
import {
  REVIEW_FORMS_BASE, REVIEW_FORMS_KEY, ReviewForms, SUBJECT_KINDS, SUBMIT_AUTHORITIES, toReviewFormRequest,
  type ApiFormField, type ApiReviewForm, type ReviewFormRequest,
} from "@/lib/assurance-review-forms";
import {
  BTN_DANGER, BTN_GHOST, BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL, PAGE,
  PAGE_INNER_FLUSH, PILL, PageHeader, PageSpinner, Spinner, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, JsonField, KeyValueList, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";
import { ReviewFormFields, type FormValues } from "@/components/assurance-events/ReviewFormFields";
import { CloneReviewForm } from "@/components/assurance-events/CloneReviewForm";

type Tab = "definition" | "usage" | "preview" | "versions";

const formHref = (code: string, version: number) =>
  `${REVIEW_FORMS_BASE}/${encodeURIComponent(code)}?version=${version}`;
const fmt = (t?: string | null) =>
  t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReviewFormPage />
    </Suspense>
  );
}

function ReviewFormPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { code: rawCode = "" } = useParams<{ code: string }>();
  const code = decodeURIComponent(rawCode);
  const version = Number(useSearchParams().get("version")) || undefined;
  const connection = useCcConnection();
  const q = useQuery({ queryKey: REVIEW_FORMS_KEY, queryFn: ReviewForms.fetchAll });
  const error = connection.error ?? q.error;
  const form = q.data ? ReviewForms.pick(q.data, code, version) : undefined;
  const [tab, setTab] = useState<Tab>("definition");
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);
  // The editable copy (a tenant DRAFT is saved with PUT /compliance/review-forms/{code}).
  const [draft, setDraft] = useState<ReviewFormRequest | null>(null);
  useEffect(() => { setDraft(form ? toReviewFormRequest(form) : null); }, [form?.formId, form?.version, q.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const editable = !!form && !form.system && form.state === "DRAFT";
  const dirty = !!form && !!draft && JSON.stringify(draft) !== JSON.stringify(toReviewFormRequest(form));
  const patch = (p: Partial<ReviewFormRequest>) => setDraft((d) => (d ? { ...d, ...p } : d));

  /** Runs a lifecycle action, then reloads the library and opens the resulting version. */
  const act = async (label: string, action: () => Promise<ApiReviewForm>) => {
    setBusy(true);
    setBanner(null);
    try {
      const r = await action();
      await qc.invalidateQueries({ queryKey: REVIEW_FORMS_KEY });
      setBanner({ tone: "ok", text: label });
      if (r?.code && r?.version) router.push(formHref(r.code, r.version));
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Deprecate: a 409 means definitions still name the form — ask before forcing.
  const deprecateWithForce = async (f: ApiReviewForm) => {
    setBusy(true);
    setBanner(null);
    try {
      await ReviewForms.deprecate(f.code, f.version, false);
      await qc.invalidateQueries({ queryKey: REVIEW_FORMS_KEY });
      setBanner({ tone: "ok", text: "Deprecated" });
    } catch (e) {
      if (e instanceof ControlsApiError && e.status === 409 &&
          confirm(`${e.message}\n\nDeprecate anyway? Events already routed keep this version; definitions naming it fall back to the shipped form on the next routing.`)) {
        await act("Deprecated (forced)", () => ReviewForms.deprecate(f.code, f.version, true));
        return;
      }
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const [cloning, setCloning] = useState<ApiReviewForm | null>(null);
  const openClone = (x: ApiReviewForm) => setCloning(x);

  return (
    <div className={PAGE}>
      {cloning && <CloneReviewForm src={cloning} onClose={() => setCloning(null)} onDone={(c) => { setTab("definition"); router.push(formHref(c.code, c.version)); }} />}
      <div className={PAGE_INNER_FLUSH}>
        <Link href={REVIEW_FORMS_BASE} className={cx(BTN_LINK, "inline-block mb-3")}>← Review forms</Link>
        {q.isLoading && <PageSpinner />}
        {error && <ErrorLine error={error} />}
        {q.data && !form && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Review form {code} was not found in the review form library.
          </div>
        )}
        {form && (
          <>
            <PageHeader
              title={
                <>
                  {form.title}
                  <StateBadge value={form.state} />
                  <span className={cx(PILL, form.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                    {form.system ? "System" : "Tenant"}
                  </span>
                </>
              }
              subtitle={
                <>
                  <span className="font-mono">{form.code}</span> · v{form.version} ·{" "}
                  {(form.appliesTo?.subjectKinds?.length ? form.appliesTo.subjectKinds : ["*"]).join(", ")} · {form.submitAuthority ?? "—"}
                </>
              }
              actions={
                <>
                  {editable && draft && (
                    <button className={BTN_PRIMARY} disabled={busy || !dirty}
                            onClick={() => act("Saved", () => ReviewForms.update(form.code, draft))}>
                      <Save size={14} /> Save
                    </button>
                  )}
                  {!form.system && form.state === "DRAFT" && (
                    <button className={BTN_PRIMARY} disabled={busy}
                            onClick={() => act("Activated", async () => {
                              if (dirty && draft) await ReviewForms.update(form.code, draft);
                              return ReviewForms.activate(form.code, form.version);
                            })}>Activate</button>
                  )}
                  {editable && dirty && (
              <Note>Unsaved changes. Save to keep them; Activate saves them first.</Note>
            )}
            {!form.system && form.state !== "DRAFT" && (
                    <button className={BTN_SECONDARY} disabled={busy}
                            onClick={() => act("New version cut (DRAFT)", () => ReviewForms.newVersion(form.code))}>New Version</button>
                  )}
                  {!form.system && form.state === "ACTIVE" && (
                    <button className={BTN_DANGER} disabled={busy} onClick={() => deprecateWithForce(form)}>Deprecate</button>
                  )}
                  <button className={BTN_SECONDARY} disabled={busy} onClick={() => openClone(form)}>Clone</button>
                </>
              }
            />

            {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}

            {!form.system && form.state !== "DRAFT" && (
              <Note>{form.state} forms are immutable. Cut a new version to change it; activating it deprecates this one. Events already routed keep the version they were given.</Note>
            )}

            <TabBar<Tab>
              active={tab}
              onChange={setTab}
              tabs={[
                ["definition", "Definition"], ["usage", "Where Used"],
                ["preview", "Preview & Dry Run"], ["versions", "Versions"],
              ]}
            />

            {tab === "definition" && draft && (
              <div className="space-y-6">
                <DefinitionTab f={form} draft={draft} editable={editable} patch={patch} />
                {/* Only the Identity section is editable: fields are kept as cloned. */}
                <FieldsTab f={form} draft={draft} editable={false} patch={patch} />
              </div>
            )}
            {tab === "preview" && <PreviewTab key={`${form.code}@${form.version}`} f={form} />}
            {tab === "versions" && <VersionsTab code={form.code} onOpen={(v) => router.push(formHref(v.code, v.version))} />}
            {tab === "usage" && <UsageTab code={form.code} />}
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

const Note = ({ children }: { children: ReactNode }) => (
  <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{children}</div>
);
const ErrorLine = ({ error }: { error: unknown }) => (
  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(error as Error).message}</div>
);
const Empty = ({ children }: { children: ReactNode }) => (
  <div className="px-4 py-8 text-center text-sm text-gray-500">{children}</div>
);
const Mono = ({ children }: { children: ReactNode }) => <span className="font-mono text-xs">{children}</span>;
const Dash = () => <span className="text-gray-400">—</span>;

/** A scalar or object as text (objects as compact JSON). */
function show(v: unknown): ReactNode {
  if (v === null || v === undefined || v === "") return <Dash />;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return <Mono>{JSON.stringify(v)}</Mono>;
  return String(v);
}

/** Loading / error wrapper for a tab's query. */
function Loaded<T>({ q, children }: { q: { isLoading: boolean; error: unknown; data?: T }; children: (d: T) => ReactNode }) {
  if (q.isLoading) return <PageSpinner />;
  if (q.error) return <ErrorLine error={q.error} />;
  return q.data === undefined ? null : <>{children(q.data)}</>;
}

/* ---------------------------------------------------------------- Definition */

type EditProps = { f: ApiReviewForm; draft: ReviewFormRequest; editable: boolean; patch: (p: Partial<ReviewFormRequest>) => void };

function DefinitionTab({ f, draft, editable, patch }: EditProps) {
  const kinds = draft.appliesTo?.subjectKinds ?? [];
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card title="Identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Code</label>
            <input className={cx(INPUT, "font-mono")} value={draft.code} readOnly />
          </div>
          <div>
            <label className={LABEL}>Submit authority (who may submit)</label>
            <select className={INPUT} value={draft.submitAuthority || "REVIEWER_OR_DECIDER"} disabled={!editable}
                    onChange={(e) => patch({ submitAuthority: e.target.value })}>
              {SUBMIT_AUTHORITIES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Title</label>
            <input className={INPUT} value={draft.title} readOnly={!editable} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Intent (the one-line instruction the reviewer sees)</label>
            <textarea className={INPUT} rows={2} value={draft.intent ?? ""} readOnly={!editable}
                      onChange={(e) => patch({ intent: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Tags (comma separated)</label>
            <input className={INPUT} value={(draft.tags ?? []).join(", ")} readOnly={!editable}
                   onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
          </div>
        </div>
        <div className="mt-4">
          <KeyValueList rows={[
            ["Activated", fmt(f.activatedAt)],
            ["Deprecated", fmt(f.deprecatedAt)],
          ]} />
        </div>
      </Card>
      <Card title="Applies To" subtitle="Which events may be routed to this form">
        <div className="space-y-4 text-sm">
          <div>
            <div className={LABEL}>Subject kinds (* = any)</div>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECT_KINDS.map((k) => {
                const on = kinds.includes(k);
                return (
                  <label key={k}
                         className={cx(PILL, "border font-mono", 
                           on ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200")}>
                    <input type="checkbox" className="mr-1" checked={on} disabled
                           onChange={(e) => patch({
                             appliesTo: { ...draft.appliesTo, subjectKinds: e.target.checked ? [...kinds, k] : kinds.filter((x) => x !== k) },
                           })} />
                    {k === "*" ? "any" : k}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className={LABEL}>Event type codes (comma separated, empty = any)</label>
            <input className={cx(INPUT, "font-mono text-xs")} value={(draft.appliesTo?.eventTypeCodes ?? []).join(", ")} readOnly
                   onChange={(e) => patch({
                     appliesTo: { ...draft.appliesTo, eventTypeCodes: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) },
                   })} />
          </div>
          <p className="text-xs text-gray-500">
            Routing skips a form that does not apply and falls back to the definition default, then to the shipped form.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Fields */

function FieldsTab({ draft, editable, patch }: EditProps) {
  const fields = draft.fields;
  const typesQ = useQuery({ queryKey: [...REVIEW_FORMS_KEY, "field-types"], queryFn: ReviewForms.fieldTypes });
  const sourcesQ = useQuery({ queryKey: [...REVIEW_FORMS_KEY, "option-sources"], queryFn: ReviewForms.optionSources });
  const [sel, setSel] = useState(0);
  const f = fields[sel];
  const setFields = (next: ApiFormField[]) => patch({ fields: next });
  const update = (i: number, p: Partial<ApiFormField>) => setFields(fields.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, by: number) => {
    const next = [...fields];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    setFields(next);
    setSel(i + by);
  };
  const type = (code?: string) => (typesQ.data ?? []).find((t) => t.code === code);
  const source = (code?: string) => (sourcesQ.data ?? []).find((s) => s.code === code);
  const src = source(f?.options?.source);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
      <Card
        title="Fields"
        subtitle="What the reviewer is asked, in order. Outcomes read the values as form.<name>."
        right={editable && (
          <button className={BTN_SECONDARY} onClick={() => {
            setFields([...fields, { name: `field${fields.length + 1}`, label: "New field", type: "TEXT", required: false }]);
            setSel(fields.length);
          }}>
            <Plus size={14} /> Add Field
          </button>
        )}
        flush
      >
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>#</th><th className={TH}>Name</th><th className={TH}>Type</th><th className={TH}>Required</th>
              <th className={TH}>Options</th><th className={TH}>Visible When</th>{editable && <th className={TH}></th>}
            </tr>
          </thead>
          <tbody className={TBODY}>
            {fields.map((x, i) => (
              <tr key={i} className={cx(TR_CLICKABLE, i === sel && "bg-blue-50")} onClick={() => setSel(i)}>
                <td className={TD}>{i + 1}</td>
                <td className={TD}>
                  <div className="font-mono text-xs font-semibold text-gray-900">{x.name}</div>
                  <div className="text-xs text-gray-500">{x.label}</div>
                </td>
                <td className={cx(TD, "text-xs")}>{x.type}</td>
                <td className={TD}>{x.required ? "✓" : ""}</td>
                <td className={cx(TD, "text-xs font-mono")}>{x.options?.source || (x.validate?.enum ? "enum" : "—")}</td>
                <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{x.visibleWhen || "—"}</td>
                {editable && (
                  <td className={cx(TD, "whitespace-nowrap")} onClick={(e) => e.stopPropagation()}>
                    <button className={BTN_GHOST} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
                    <button className={BTN_GHOST} disabled={i === fields.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
                    <button className={cx(BTN_GHOST, "text-red-600")} aria-label="Remove field"
                            onClick={() => { setFields(fields.filter((_, j) => j !== i)); setSel(0); }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!fields.length && <tr><td colSpan={7}><Empty>No fields.</Empty></td></tr>}
          </tbody>
        </table>
        <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-100">
          Templates <code>{"${…}"}</code> and CEL see <code>event</code>, <code>subject</code>, <code>finding</code>, <code>definition</code>,{" "}
          <code>proposal</code>, <code>form</code>, <code>tenant</code>, <code>now</code>.
        </p>
      </Card>

      <Card title={f ? `Field '${f.name}'` : "Field"}>
        {f ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Name (identifier)</label>
              <input className={cx(INPUT, "font-mono")} value={f.name} readOnly={!editable} onChange={(e) => update(sel, { name: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Type</label>
              <select className={INPUT} value={f.type} disabled={!editable} onChange={(e) => update(sel, { type: e.target.value })}>
                {(typesQ.data?.length ? typesQ.data : [{ code: f.type, displayName: f.type }]).map((t) => (
                  <option key={t.code} value={t.code}>{t.code}{t.displayName && t.displayName !== t.code ? ` — ${t.displayName}` : ""}</option>
                ))}
                {!!typesQ.data?.length && !type(f.type) && <option value={f.type}>{f.type}</option>}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Label</label>
              <input className={INPUT} value={f.label ?? ""} readOnly={!editable} onChange={(e) => update(sel, { label: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Help</label>
              <input className={INPUT} value={f.help ?? ""} readOnly={!editable} onChange={(e) => update(sel, { help: e.target.value || undefined })} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!f.required} disabled={!editable} onChange={(e) => update(sel, { required: e.target.checked })} />
              Required (when visible)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!f.sensitive} disabled={!editable} onChange={(e) => update(sel, { sensitive: e.target.checked })} />
              Sensitive (hashed in the ledger, redacted in packs)
            </label>
            <div className="md:col-span-2">
              <label className={LABEL}>Options source</label>
              <select className={INPUT} value={f.options?.source ?? ""} disabled={!editable}
                      onChange={(e) => update(sel, { options: e.target.value ? { ...(f.options ?? {}), source: e.target.value } : undefined })}>
                <option value="">None{type(f.type)?.needsOptions ? " (free value)" : ""}</option>
                {(sourcesQ.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
                {f.options?.source && !src && <option value={f.options.source}>{f.options.source}</option>}
              </select>
              {src?.description && <p className="text-xs text-gray-500 mt-1">{src.description}</p>}
            </div>
            {(src?.parameters ?? []).map((param) => (
              <div key={param} className="md:col-span-2">
                {param === "values" ? (
                  <JsonField key={`${sel}-values`} label="Options values" value={(f.options?.values as unknown[]) ?? []} rows={4} readOnly={!editable}
                             onChange={(v) => update(sel, { options: { ...(f.options ?? { source: "STATIC" }), values: v } })} />
                ) : (
                  <>
                    <label className={LABEL}>Options {param}</label>
                    <input className={cx(INPUT, "font-mono text-xs")} value={String(f.options?.[param] ?? "")} readOnly={!editable}
                           placeholder={param === "workgroup" ? "${subject.approvalGroup}" : ""}
                           onChange={(e) => update(sel, { options: { ...(f.options ?? { source: "" }), [param]: e.target.value } })} />
                  </>
                )}
              </div>
            ))}
            <div className="md:col-span-2">
              <label className={LABEL}>Prefill (template)</label>
              <input className={cx(INPUT, "font-mono text-xs")} value={f.prefill ?? ""} readOnly={!editable} placeholder="${subject.fallbackGroup}"
                     onChange={(e) => update(sel, { prefill: e.target.value || undefined })} />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Visible when (CEL)</label>
              <input className={cx(INPUT, "font-mono text-xs")} value={f.visibleWhen ?? ""} readOnly={!editable} placeholder="form.resolution == 'ASSIGN'"
                     onChange={(e) => update(sel, { visibleWhen: e.target.value || undefined })} />
            </div>
            <div className="md:col-span-2">
              <JsonField key={`${sel}-validate-${f.name}`}
                         label={`Validate (JSON · ${(type(f.type)?.validate ?? []).join(", ") || "none for this type"})`}
                         value={f.validate ?? {}} rows={3} readOnly={!editable} onChange={(v) => update(sel, { validate: v })} />
            </div>
          </div>
        ) : <span className="text-sm text-gray-500">Select a field.</span>}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Preview & dry run */

const initialValues = (v: CcReviewFormView): FormValues =>
  Object.fromEntries(v.fields.filter((f) => f.value !== null && f.value !== undefined).map((f) => [f.name, f.value]));

function PreviewTab({ f }: { f: ApiReviewForm }) {
  const [eventId, setEventId] = useState("");
  const [view, setView] = useState<CcReviewFormView | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [test, setTest] = useState<CcReviewFormTest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const render = async () => {
    setBusy(true); setError(null); setTest(null);
    try {
      const r = await CcEvents.renderReviewForm(f.code, eventId.trim(), f.version, {});
      setView(r); setValues(initialValues(r));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  // Conditional fields: re-render (visibility) shortly after a change, keeping the typed values.
  const change = (next: FormValues) => {
    setValues(next);
    if (!view?.fields.some((x) => x.conditional)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      CcEvents.renderReviewForm(f.code, eventId.trim(), f.version, next)
        .then((r) => setView({ ...r, fields: r.fields.map((x) => ({ ...x, value: next[x.name] ?? x.value })) }))
        .catch(() => { /* keep the current view */ });
    }, 400);
  };

  const dryRun = async () => {
    setBusy(true); setError(null);
    try { setTest(await CcEvents.testReviewForm(f.code, eventId.trim(), values, f.version)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const plan = (test?.plan ?? {}) as { resultingStatus?: string; then?: string };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
      <Card title="Preview" subtitle={`This version (v${f.version}) rendered for a real event. Nothing is changed.`}>
        <div className="space-y-5">
          <div>
            <label className={LABEL}>Event ID (any event of a matching subject kind)</label>
            <div className="flex gap-2">
              <input className={cx(INPUT, "font-mono")} value={eventId} placeholder="Paste an event ID from All Events"
                     onChange={(e) => setEventId(e.target.value)} />
              <button className={BTN_PRIMARY} disabled={!eventId.trim() || busy} onClick={render}>
                {busy && !view && <Spinner size={14} className="text-white" />} Render
              </button>
            </div>
          </div>
          {error && <ErrorLine error={new Error(error)} />}
          {view && (
            <>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{view.title}</span>
                {view.intent ? ` — ${view.intent}` : ""} · event {view.eventStatus} · {view.submittable ? "submittable" : "read-only"}
              </p>
              <ReviewFormFields fields={view.fields} values={values} onChange={change} readOnly={false} />
              <div className="flex flex-wrap items-center gap-2">
                <button className={BTN_SECONDARY} disabled={busy} onClick={dryRun}>Dry Run</button>
                <span className="text-xs text-gray-500">Validates the values, picks the outcome and shows the resolved plan; nothing executes.</span>
              </div>
            </>
          )}
        </div>
      </Card>
      <Card title="Resolved Plan">
        {test ? (
          <div className="space-y-4">
            <KeyValueList rows={[
              ["Valid", <span key="v" className={test.valid ? "text-green-700" : "text-red-600"}>{String(test.valid)}</span>],
              ["Outcome", test.outcome || <Dash key="o" />],
              ["Resulting status", plan.resultingStatus || <Dash key="r" />],
              ["Then", plan.then || <Dash key="t" />],
            ]} />
            {test.diagnostics.length > 0 && (
              <ul className="list-disc ml-5 text-sm text-red-600 space-y-1">
                {test.diagnostics.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            )}
            {test.plan != null && (
              <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto max-h-96 text-gray-800">
                {JSON.stringify(test.plan, null, 2)}
              </pre>
            )}
          </div>
        ) : <span className="text-sm text-gray-500">Render the form for an event, fill it in, then run a dry run.</span>}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Versions / where used */

function VersionsTab({ code, onOpen }: { code: string; onOpen: (f: ApiReviewForm) => void }) {
  const q = useQuery({ queryKey: [...REVIEW_FORMS_KEY, code, "versions"], queryFn: () => ReviewForms.versions(code) });
  return (
    <Card title="Versions" subtitle="Tenant rows first, then the system library. Click a version to open it." flush>
      <Loaded q={q}>{(rows) => (
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Version</th><th className={TH}>State</th><th className={TH}>Owner</th><th className={TH}>Title</th>
              <th className={TH}>Fields</th><th className={TH}>Outcomes</th><th className={TH}>Activated</th><th className={TH}>Deprecated</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {rows.map((v) => (
              <tr key={v.formId} className={TR_CLICKABLE} onClick={() => onOpen(v)}>
                <td className={cx(TD, "font-semibold text-gray-900")}>v{v.version}</td>
                <td className={TD}><StateBadge value={v.state} /></td>
                <td className={cx(TD, "text-xs")}>{v.system ? "System" : "Tenant"}</td>
                <td className={TD}>{v.title}</td>
                <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{v.fields.map((x) => x.name).join(", ")}</td>
                <td className={cx(TD, "text-xs font-mono")}>{v.outcomes.map((x) => x.id).join(", ")}</td>
                <td className={cx(TD, "text-xs")}>{fmt(v.activatedAt)}</td>
                <td className={cx(TD, "text-xs")}>{fmt(v.deprecatedAt)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8}><Empty>No versions.</Empty></td></tr>}
          </tbody>
        </table>
      )}</Loaded>
    </Card>
  );
}

function UsageTab({ code }: { code: string }) {
  const q = useQuery({ queryKey: [...REVIEW_FORMS_KEY, code, "usage"], queryFn: () => ReviewForms.usage(code) });
  return (
    <Loaded q={q}>{(u) => (
      <div className="space-y-6">
        <Card
          title="Definitions"
          subtitle={<>Latest ACTIVE version: <b>{u.latestActiveVersion ?? "—"}</b>. Definitions name a form as their default or in a REVIEWER rule; events pin the version they were routed with.</>}
          flush
        >
          <table className="w-full">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>Definition</th><th className={TH}>Version</th><th className={TH}>State</th>
                <th className={TH}>As Default</th><th className={TH}>Rules</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {(u.definitions ?? []).map((d) => (
                <tr key={d.definitionId}>
                  <td className={TD}>
                    <Link href={`/assurance-events/event-definitions/${d.definitionId}`} className={BTN_LINK}>{d.code}</Link>
                  </td>
                  <td className={TD}>v{d.version}</td>
                  <td className={TD}><StateBadge value={d.state} /></td>
                  <td className={TD}>{d.asDefault ? "✓" : ""}</td>
                  <td className={cx(TD, "text-xs font-mono")}>{(d.rules ?? []).join(", ") || "—"}</td>
                </tr>
              ))}
              {!(u.definitions ?? []).length && <tr><td colSpan={5}><Empty>Not named by any definition.</Empty></td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    )}</Loaded>
  );
}
