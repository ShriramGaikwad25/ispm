"use client";

// =====================================================================
// SLA profile — the Continuous Compliance Console's SLA profile page
// (graph.keyforge.ai/console#/sla-profiles/{code}?version=) on the same API,
// laid out like ISPM's gateway pages. "new" creates one (POST, DRAFT).
//   Definition   identity, deadline, escalation chain, applies-when
//                (editable for a new or tenant DRAFT profile: POST / PUT),
//                and Where Used (GET /compliance/sla-profiles/{code}/usage)
//   Versions     GET  /compliance/sla-profiles/{code}/versions
// Actions: Create / Save, Activate, New Version, Deprecate (tenant profiles), Clone.
// =====================================================================

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import { ControlsApiError } from "@/lib/controls-api";
import {
  ESCALATION_ACTIONS, NEW_SLA_PROFILE, SEVERITIES, SLA_BASE, SLA_PROFILES_KEY, SlaProfiles, TIMEOUT_ACTIONS, chainText,
  humanDuration, slaHref, toSlaProfileRequest, type EscalationStep, type SlaProfile, type SlaProfileRequest,
} from "@/lib/cc-sla-profiles-api";
import {
  BTN_DANGER, BTN_GHOST, BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL,
  PAGE, PAGE_INNER_FLUSH, PILL, PageHeader, PageSpinner, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";
import { CloneSlaProfile } from "@/components/assurance-events/CloneSlaProfile";

type Tab = "definition" | "versions";

const fmt = (t?: unknown) =>
  typeof t === "string" && t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SlaProfilePage />
    </Suspense>
  );
}

function SlaProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { code: rawCode = "" } = useParams<{ code: string }>();
  const code = decodeURIComponent(rawCode);
  const isNew = code === "new";
  const version = Number(useSearchParams().get("version")) || undefined;
  const connection = useCcConnection();
  const q = useQuery({
    queryKey: [...SLA_PROFILES_KEY, "detail", code, version ?? "current"],
    queryFn: () => SlaProfiles.get(code, version),
    enabled: !isNew,
  });
  const p = isNew ? null : q.data ?? null;
  const [form, setForm] = useState<SlaProfileRequest>(NEW_SLA_PROFILE);
  const [tab, setTab] = useState<Tab>("definition");
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);
  const [cloning, setCloning] = useState<SlaProfile | null>(null);

  useEffect(() => { if (q.data && !isNew) setForm(toSlaProfileRequest(q.data)); }, [q.data, isNew]);
  useEffect(() => { setTab("definition"); }, [code]);

  const editable = isNew || (!!p && !p.system && p.state === "DRAFT");
  const dirty = isNew || (!!p && JSON.stringify(form) !== JSON.stringify(toSlaProfileRequest(p)));
  const patch = (x: Partial<SlaProfileRequest>) => setForm((f) => ({ ...f, ...x }));
  const error = connection.error ?? q.error;

  /** Runs a write, reloads the library, and opens the resulting version. */
  const run = async (label: string, action: () => Promise<SlaProfile>) => {
    setBusy(true);
    setBanner(null);
    try {
      const r = await action();
      await qc.invalidateQueries({ queryKey: SLA_PROFILES_KEY });
      setBanner({ tone: "ok", text: label });
      if (r?.code && r?.version && (isNew || r.code !== code || r.version !== version)) router.push(slaHref(r.code, r.version));
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Deprecate: a 409 means definitions still link the profile — ask before forcing.
  const deprecate = async (x: SlaProfile) => {
    setBusy(true);
    setBanner(null);
    try {
      await SlaProfiles.deprecate(x.code, x.version, false);
      await qc.invalidateQueries({ queryKey: SLA_PROFILES_KEY });
      setBanner({ tone: "ok", text: "Deprecated" });
    } catch (e) {
      if (e instanceof ControlsApiError && e.status === 409 &&
          confirm(`${e.message}\n\nDeprecate anyway? Definitions keep their pinned version; DRAFT definitions following "latest" will fail to activate until relinked.`)) {
        await run("Deprecated (forced)", () => SlaProfiles.deprecate(x.code, x.version, true));
        return;
      }
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!isNew && (q.isLoading || !p)) {
    return (
      <div className={PAGE}>
        <div className={cx(PAGE_INNER_FLUSH, "space-y-3")}>
          <Link href={SLA_BASE} className={BTN_LINK}>← SLA</Link>
          {error ? <BannerBar banner={{ tone: "err", text: (error as Error).message }} /> : <PageSpinner />}
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      {cloning && <CloneSlaProfile src={cloning} onClose={() => setCloning(null)} onDone={(c) => router.push(slaHref(c.code, c.version))} />}
      <div className={PAGE_INNER_FLUSH}>
        <Link href={SLA_BASE} className={cx(BTN_LINK, "inline-block mb-3")}>← SLA</Link>
        <PageHeader
          title={
            <>
              {isNew ? "New SLA Profile" : p!.name}
              {p && <StateBadge value={p.state} />}
              {p && (
                <span className={cx(PILL, p.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                  {p.system ? "System" : "Tenant"}
                </span>
              )}
            </>
          }
          subtitle={isNew ? "A new DRAFT profile: set its deadline and condition, create it, then activate it."
            : <><span className="font-mono">{p!.code}</span> · v{p!.version} · {p!.dueAt ? "dueAt expression" : p!.duration} · {p!.actionOnTimeout || "definition default"}</>}
          actions={
            <>
              {editable && (
                <button className={BTN_PRIMARY} disabled={busy || !dirty}
                        onClick={() => run(isNew ? "Created (DRAFT)" : "Saved", () => (isNew ? SlaProfiles.create(form) : SlaProfiles.update(code, form)))}>
                  <Save size={14} /> {isNew ? "Create" : "Save"}
                </button>
              )}
              {p && !p.system && p.state === "DRAFT" && (
                <button className={BTN_PRIMARY} disabled={busy}
                        onClick={() => run("Activated", async () => {
                          if (dirty) await SlaProfiles.update(p.code, form);
                          return SlaProfiles.activate(p.code, p.version);
                        })}>
                  <ShieldCheck size={14} /> Activate
                </button>
              )}
              {p && !p.system && p.state !== "DRAFT" && (
                <button className={BTN_SECONDARY} disabled={busy} onClick={() => run("New version cut (DRAFT)", () => SlaProfiles.newVersion(p.code))}>
                  New Version
                </button>
              )}
              {p && !p.system && p.state === "ACTIVE" && (
                <button className={BTN_DANGER} disabled={busy} onClick={() => deprecate(p)}>Deprecate</button>
              )}
              {p && <button className={BTN_SECONDARY} disabled={busy} onClick={() => setCloning(p)}><Copy size={14} /> Clone</button>}
            </>
          }
        />

        {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}
        {p && !p.system && p.state !== "DRAFT" && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {p.state} profiles are immutable. Cut a new version to change it; activating the new version deprecates this one. Definitions keep
            the version they pinned until a new definition version is activated.
          </div>
        )}

        {!isNew && (
          <TabBar<Tab> active={tab} onChange={setTab} tabs={[["definition", "Definition"], ["versions", "Versions"]]} />
        )}

        {tab === "definition" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card title="Identity">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Code">
                    <input className={cx(INPUT, "font-mono")} value={form.code} readOnly={!isNew} onChange={(e) => patch({ code: e.target.value })} />
                  </Field>
                  <Field label="Severity hint (informational)">
                    <select className={INPUT} value={form.severityHint} disabled={!editable} onChange={(e) => patch({ severityHint: e.target.value })}>
                      <option value="">—</option>
                      {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                    </select>
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
                  <div className="md:col-span-2">
                    <Field label="Tags (comma separated)">
                      <input className={INPUT} value={form.tags.join(", ")} readOnly={!editable}
                             onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
                    </Field>
                  </div>
                </div>
                {p && (
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm mt-4">
                    <dt className="text-gray-500">Activated</dt><dd className="text-gray-900">{fmt(p.activatedAt)}</dd>
                    <dt className="text-gray-500">Deprecated</dt><dd className="text-gray-900">{fmt(p.deprecatedAt)}</dd>
                  </dl>
                )}
              </Card>

              <Card title="Deadline" subtitle="A duration (ISO-8601 or ${expression}) or an absolute dueAt, which wins over the duration.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={`Duration${form.duration && !form.duration.includes("${") ? ` (${humanDuration(form.duration)})` : ""}`}>
                    <input className={cx(INPUT, "font-mono")} value={form.duration} readOnly={!editable} placeholder="P2D, PT24H, ${definition.slaDuration}"
                           onChange={(e) => patch({ duration: e.target.value })} />
                  </Field>
                  <Field label="Due at (wins over duration)">
                    <input className={cx(INPUT, "font-mono text-xs")} value={form.dueAt} readOnly={!editable} placeholder="${event.detectionPayload.contractEndsAt}"
                           onChange={(e) => patch({ dueAt: e.target.value })} />
                  </Field>
                  <Field label="Action on timeout">
                    <select className={INPUT} value={form.actionOnTimeout} disabled={!editable} onChange={(e) => patch({ actionOnTimeout: e.target.value })}>
                      <option value="">(definition default)</option>
                      {TIMEOUT_ACTIONS.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </Field>
                  <Field label="On reopen">
                    <select className={INPUT} value={form.onReopen} disabled={!editable} onChange={(e) => patch({ onReopen: e.target.value })}>
                      <option>RESET</option>
                      <option>KEEP</option>
                    </select>
                  </Field>
                  <Field label="Clock">
                    <select className={INPUT} value={form.clock} disabled={!editable} onChange={(e) => patch({ clock: e.target.value })}>
                      <option>CALENDAR</option>
                    </select>
                  </Field>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card
                title="Escalation Chain"
                subtitle="Steps in ascending percentage of the deadline. Not overridden = the definition's chain applies."
                right={editable && (
                  form.escalationChain == null ? (
                    <button className={cx(BTN_SECONDARY, "text-xs")} onClick={() => patch({ escalationChain: [{ atPercent: 50, action: "NUDGE", params: {} }] })}>
                      Override
                    </button>
                  ) : (
                    <button className={cx(BTN_SECONDARY, "text-xs")} onClick={() => patch({ escalationChain: null })}>Use definition chain</button>
                  )
                )}
              >
                <ChainEditor chain={form.escalationChain} editable={editable} onChange={(c) => patch({ escalationChain: c })} />
              </Card>

              <Card title="Applies When" subtitle="CEL over the SLA context; empty = unconditional. A definition's link may override it.">
                <textarea className={cx(INPUT, "font-mono text-xs")} rows={3} spellCheck={false} value={form.appliesWhen} readOnly={!editable}
                          placeholder="subject.privileged == true || subject.riskTier in ['HIGH', 'CRITICAL']"
                          onChange={(e) => patch({ appliesWhen: e.target.value })} />
                <p className="text-xs text-gray-500 mt-2">
                  Variables: <code>event</code> (severity, reopenCount, status, detectionPayload, …), <code>subject</code> (application, riskTier,
                  privileged, …), <code>finding</code>, <code>definition</code> (code, severity, slaDuration), <code>sla</code>, <code>tenant</code>,{" "}
                  <code>now</code>. Unconditional profiles end a FIRST_MATCH list: link them last as the effective default.
                </p>
              </Card>
            </div>

            {p && <UsageCard code={p.code} />}
          </div>
        )}
        {tab === "versions" && p && <VersionsCard code={p.code} onOpen={(v) => router.push(slaHref(v.code, v.version))} />}
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

/** The escalation chain: percentage, action and params per step. */
function ChainEditor({ chain, editable, onChange }: { chain: EscalationStep[] | null; editable: boolean; onChange: (c: EscalationStep[] | null) => void }) {
  if (chain == null) return <p className="text-sm text-gray-500">The definition&apos;s chain applies (not overridden).</p>;
  const update = (i: number, x: Partial<EscalationStep>) => onChange(chain.map((s, j) => (j === i ? { ...s, ...x } : s)));
  return (
    <div className="space-y-3">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}><th className={cx(TH, "w-28")}>At %</th><th className={TH}>Action</th><th className={TH}>Params</th>{editable && <th className={TH}></th>}</tr>
          </thead>
          <tbody className={TBODY}>
            {chain.map((s, i) => (
              <tr key={i}>
                <td className={TD}>
                  <input type="number" min={1} max={100} className={cx(INPUT, "w-20")} value={s.atPercent} readOnly={!editable}
                         onChange={(e) => update(i, { atPercent: Number(e.target.value) })} />
                </td>
                <td className={TD}>
                  <select className={INPUT} value={s.action} disabled={!editable}
                          onChange={(e) => update(i, {
                            action: e.target.value,
                            ...(e.target.value === "REASSIGN" && !s.params?.strategy ? { params: { ...(s.params ?? {}), strategy: "APP_OWNER" } } : {}),
                          })}>
                    {[...new Set([...ESCALATION_ACTIONS, s.action])].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </td>
                <td className={TD}>
                  <input className={cx(INPUT, "font-mono text-xs")} defaultValue={JSON.stringify(s.params ?? {})} readOnly={!editable}
                         key={`${i}-${JSON.stringify(s.params ?? {})}`}
                         onBlur={(e) => { try { update(i, { params: JSON.parse(e.target.value || "{}") }); } catch { /* keep */ } }} />
                </td>
                {editable && (
                  <td className={TD}>
                    <button className={cx(BTN_GHOST, "px-2 text-red-600")} aria-label="Remove step" onClick={() => onChange(chain.filter((_, j) => j !== i))}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!chain.length && <tr><td colSpan={4}><Empty>No steps: only the timeout action fires.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {editable && (
        <button className={cx(BTN_SECONDARY, "text-xs")}
                onClick={() => onChange([...chain, { atPercent: Math.min(100, (chain.at(-1)?.atPercent ?? 0) + 25), action: "NOTIFY_MANAGER", params: {} }])}>
          <Plus size={12} /> Add Step
        </button>
      )}
    </div>
  );
}

function UsageCard({ code }: { code: string }) {
  const q = useQuery({ queryKey: [...SLA_PROFILES_KEY, code, "usage"], queryFn: () => SlaProfiles.usage(code) });
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
                    <th className={TH}>Priority</th><th className={TH}>Pinned</th><th className={TH}>Link Condition</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {rows.map((d) => (
                    <tr key={d.definitionId + d.position}>
                      <td className={TD}><Link href={`/assurance-events/event-definitions/${d.definitionId}`} className={BTN_LINK}>{d.code}</Link></td>
                      <td className={TD}>v{d.version}</td>
                      <td className={TD}><StateBadge value={d.state} /></td>
                      <td className={TD}>{d.position}</td>
                      <td className={TD}>
                        <span className={cx(PILL, d.pinned ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{d.pinned ? "Yes" : "No"}</span>
                      </td>
                      <td className={cx(TD, "text-xs font-mono")}>{d.when || <i className="text-gray-500 font-sans">profile&apos;s own</i>}</td>
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

function VersionsCard({ code, onOpen }: { code: string; onOpen: (p: SlaProfile) => void }) {
  const q = useQuery({ queryKey: [...SLA_PROFILES_KEY, code, "versions"], queryFn: () => SlaProfiles.versions(code) });
  return (
    <Card title="Versions" subtitle="Tenant rows first, then the system library. Click a version to open it." flush>
      <Loaded q={q}>{(rows) => (
        <table className="w-full">
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>Version</th><th className={TH}>State</th><th className={TH}>Owner</th><th className={TH}>Name</th>
              <th className={TH}>Deadline</th><th className={TH}>On Timeout</th><th className={TH}>Escalation</th>
              <th className={TH}>Applies When</th><th className={TH}>Activated</th><th className={TH}>Deprecated</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {rows.map((v) => (
              <tr key={v.profileId} className={TR_CLICKABLE} onClick={() => onOpen(v)}>
                <td className={cx(TD, "font-semibold text-gray-900")}>v{v.version}</td>
                <td className={TD}><StateBadge value={v.state} /></td>
                <td className={cx(TD, "text-xs")}>{v.system ? "System" : "Tenant"}</td>
                <td className={TD}>{v.name}</td>
                <td className={cx(TD, "text-xs font-mono")}>{v.dueAt || v.duration || "—"}</td>
                <td className={cx(TD, "text-xs")}>{v.actionOnTimeout || "definition default"}</td>
                <td className={cx(TD, "text-xs")}>{chainText(v.escalationChain)}</td>
                <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{v.appliesWhen || "unconditional"}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.activatedAt)}</td>
                <td className={cx(TD, "text-xs whitespace-nowrap")}>{fmt(v.deprecatedAt)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10}><Empty>No versions.</Empty></td></tr>}
          </tbody>
        </table>
      )}</Loaded>
    </Card>
  );
}
