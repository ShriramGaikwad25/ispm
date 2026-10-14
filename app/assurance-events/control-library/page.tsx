"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, Layers, X } from "lucide-react";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { useCcConnection } from "@/hooks/useCcConnection";
import { Controls, ControlsApiError, type Control, type ControlQuery } from "@/lib/controls-api";
import {
  BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL, PAGE, PAGE_INNER,
  PILL, PageHeader, PageSpinner, Spinner, StatCard, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, SeverityBadge, StateBadge, type Banner } from "@/components/assurance-events/definition-editor/fields";

// =====================================================================
// Control Library — the control catalog, on the same live APIs as the
// Continuous Compliance Console's Controls page (graph.keyforge.ai/console
// #/controls, see lib/controls-api.ts):
//   GET  /compliance/detection-families
//   GET  /compliance/control-categories
//   GET  /compliance/controls?family=&category=&state=&q=
//   POST /compliance/controls/{code}/clone
//
// A control is a named, categorised condition (CEL) on one object kind,
// evaluated by its detection family. System controls are read-only —
// clone one to change it.
// Laid out like ISPM's gateway pages (Agent Task Library): stat cards,
// family tiles, filter bar, tables, detail in the right sidebar.
// =====================================================================

const KEY = ["continuouscompliance", "controls"] as const;
const STATES = ["DRAFT", "ACTIVE", "DEPRECATED"];

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function errorText(e: unknown): string {
  if (e instanceof ControlsApiError && e.status === 401) {
    return `${e.message} The Continuous Compliance service did not accept the signed-in session's token.`;
  }
  return (e as Error)?.message ?? String(e);
}

export default function ControlLibraryPage() {
  const { openSidebar } = useRightSidebar();
  const [family, setFamily] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState<Banner>(null);

  const query: ControlQuery = { family: family || undefined, category: category || undefined, state: state || undefined, q: search || undefined };
  // Connection check first, as the Continuous Compliance Console does on load.
  const connection = useCcConnection();
  const familiesQ = useQuery({ queryKey: [...KEY, "families"], queryFn: Controls.families });
  const categoriesQ = useQuery({ queryKey: [...KEY, "categories"], queryFn: Controls.categories });
  const controlsQ = useQuery({ queryKey: [...KEY, "list", query], queryFn: () => Controls.list(query) });
  // Unfiltered list for the summary cards and the family tiles.
  const allQ = useQuery({ queryKey: [...KEY, "list", {}], queryFn: () => Controls.list({}) });

  const families = familiesQ.data?.families ?? [];
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const controls = useMemo(() => (Array.isArray(controlsQ.data) ? controlsQ.data : []), [controlsQ.data]);
  const all = useMemo(() => (Array.isArray(allQ.data) ? allQ.data : []), [allQ.data]);
  const error = connection.error ?? controlsQ.error ?? categoriesQ.error ?? familiesQ.error;

  const categoryName = (code: string) => categories.find((c) => c.code === code)?.displayName ?? code;

  const s = useMemo(() => ({
    controls: all.length,
    active: all.filter((c) => c.state === "ACTIVE").length,
    families: families.length,
    categories: categories.length,
    tenant: all.filter((c) => !c.system).length,
  }), [all, families, categories]);

  const openControl = (c: Control) =>
    openSidebar(
      <ControlDetail control={c} categoryName={categoryName(c.categoryCode)} onCloned={(code) =>
        setBanner({ tone: "ok", text: `Cloned as ${code} (DRAFT).` })} />,
      { title: c.name, widthPx: 560 },
    );

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Control Library"
          subtitle={
            <>
              Every control KeyForge can evaluate, across {s.families || "its"} detection families. A control is a named,
              categorised condition on one object kind; system controls are read-only — clone one to change it.
            </>
          }
        />

        {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {errorText(error)}
          </div>
        )}

        {allQ.data && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="Controls" value={s.controls} hint="In the library" />
            <StatCard label="Active" value={s.active} hint="Evaluated when linked to a definition" />
            <StatCard label="Detection families" value={s.families} hint="How controls are evaluated" />
            <StatCard label="Categories" value={s.categories} hint="Groups of related controls" />
            <StatCard label="Tenant controls" value={s.tenant} hint="Cloned or created by you" />
          </div>
        )}

        {/* Categories */}
        <div className={cx(CARD, "mb-6")}>
          <div className={CARD_HEADER}>
            <div>
              <div className={CARD_TITLE}>Categories</div>
              <div className={CARD_SUBTITLE}>Groups of related controls. Click to filter.</div>
            </div>
            {category && (
              <button className={cx(BTN_LINK, "inline-flex items-center gap-1")} onClick={() => setCategory("")}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoriesQ.isLoading && <Spinner />}
            {categories.map((cat) => {
              const active = category === cat.code;
              const inCategory = all.filter((c) => c.categoryCode === cat.code);
              const activeCount = inCategory.filter((c) => c.state === "ACTIVE").length;
              const label = cat.displayName || cat.code;
              return (
                <button
                  key={cat.code}
                  onClick={() => setCategory(active ? "" : cat.code)}
                  className={cx(
                    "text-left border rounded-lg p-3 transition-colors",
                    active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{label}</span>
                    <span className="text-xs text-gray-500 shrink-0">{inCategory.length}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    {activeCount > 0 ? (
                      <span className="text-green-700 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> {activeCount} active
                      </span>
                    ) : (
                      <span className="text-gray-400 inline-flex items-center gap-1">
                        <Circle size={12} /> none active
                      </span>
                    )}
                    {inCategory.length === 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Layers size={12} /> no controls
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-gray-200 rounded-lg bg-white shadow-sm p-4 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search controls by code, name, or description..."
            aria-label="Search controls"
            className="flex-1 min-w-[260px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select className={FILTER_INPUT} value={family} onChange={(e) => setFamily(e.target.value)} aria-label="Family">
              <option value="">All families</option>
              {families.map((f) => (
                <option key={f.code} value={f.code}>
                  {typeof f.displayName === "string" && f.displayName ? f.displayName : f.code}
                </option>
              ))}
            </select>
            <select className={FILTER_INPUT} value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
              <option value="">All states</option>
              {STATES.map((st) => <option key={st} value={st}>{st.charAt(0) + st.slice(1).toLowerCase()}</option>)}
            </select>
            <span className="text-sm text-gray-500 whitespace-nowrap">{controls.length} shown</span>
          </div>
        </div>

        {controlsQ.isLoading ? (
          <PageSpinner />
        ) : (
          <div className={cx(CARD, "overflow-hidden")}>
            <table className="w-full">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>Control</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Object</th>
                  <th className={TH}>Severity Hint</th>
                  <th className={TH}>State</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {controls.map((c) => (
                  <tr key={c.controlId ?? `${c.code}-${c.version}`} className={TR_CLICKABLE} onClick={() => openControl(c)}>
                    <td className={cx(TD, "max-w-[460px]")}>
                      <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{c.code} · v{c.version}</div>
                      {c.condition?.expression && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 font-mono">{c.condition.expression}</div>
                      )}
                    </td>
                    <td className={TD}>{categoryName(c.categoryCode)}</td>
                    <td className={TD}>{c.objectKind ?? "—"}</td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      {c.severityHint ? <SeverityBadge value={c.severityHint} /> : "—"}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      <span className="inline-flex gap-1">
                        <StateBadge value={c.state} />
                        {!c.system && <span className={cx(PILL, "bg-blue-100 text-blue-700")}>Tenant</span>}
                      </span>
                    </td>
                  </tr>
                ))}
                {controls.length === 0 && !controlsQ.error && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No controls match the current filters.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** The family's context — the variables a condition can read (GET /compliance/detection-families). */
function FamilyContext({ code }: { code: string }) {
  const familiesQ = useQuery({ queryKey: [...KEY, "families"], queryFn: Controls.families });
  const f = familiesQ.data?.families?.find((x) => x.code === code);
  return (
    <div>
      {familiesQ.isLoading ? (
        <Spinner />
      ) : !f ? (
        <div className="text-sm text-gray-500">Unknown family.</div>
      ) : (
        <>
          {Object.entries(f.contextSchema ?? {}).map(([name, v]) => (
            <div key={name} className="mb-3">
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
        </>
      )}
    </div>
  );
}

/** Control detail, shown in the right sidebar like an Agent Task Library task. */
function ControlDetail({ control: c, categoryName, onCloned }: {
  control: Control; categoryName: string; onCloned: (code: string) => void;
}) {
  const qc = useQueryClient();
  const { closeSidebar } = useRightSidebar();
  const [cloning, setCloning] = useState(false);
  const [code, setCode] = useState(c.system ? `MY_${c.code}` : `${c.code}_COPY`);
  const [name, setName] = useState(`${c.name} (copy)`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clone = async () => {
    setBusy(true);
    setErr(null);
    try {
      const created = await Controls.clone(c.code, { code: code.trim(), name: name.trim() });
      await qc.invalidateQueries({ queryKey: KEY });
      closeSidebar();
      onCloned(created?.code ?? code);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {c.description && <p className="text-sm text-gray-500 mb-4 leading-relaxed">{c.description}</p>}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <DetailCard label="Control Code" value={c.code} />
        <DetailCard label="Detection Family" value={c.familyCode} />
        <DetailCard label="Category" value={categoryName} />
        <DetailCard label="Object" value={c.objectKind ?? "—"} />
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Status</h3>
        <span className="inline-flex gap-2 items-center">
          <StateBadge value={c.state} />
          <span className={cx(PILL, c.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
            {c.system ? "System (read-only)" : "Tenant"}
          </span>
          <span className="text-sm text-gray-500">v{c.version}</span>
        </span>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Condition{c.condition?.language ? ` (${c.condition.language})` : ""}</h3>
        <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 whitespace-pre-wrap break-words text-gray-800">
          {c.condition?.expression ?? "—"}
        </pre>
      </div>

      {c.severityHint && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Severity Hint</h3>
          <SeverityBadge value={c.severityHint} />
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Parameters (Defaults)</h3>
        {(c.parameters ?? []).length === 0 ? null : (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {c.parameters!.map((p) => (
              <div key={p.name} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                <span className="font-medium text-gray-900 font-mono">{p.name}</span>
                {p.description && <span className="text-xs text-gray-500">{p.description}</span>}
                <span className={cx(PILL, "ml-auto bg-gray-100 text-gray-600 font-mono")}>
                  {p.default !== undefined ? JSON.stringify(p.default) : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className={(c.parameters ?? []).length ? "mt-4" : ""}>
          <FamilyContext code={c.familyCode} />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        {!cloning ? (
          <button type="button" className={BTN_PRIMARY} onClick={() => setCloning(true)}>Clone</button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              A tenant DRAFT copy under a new code: condition, parameters and evidence fields are copied; edit, test,
              then activate.
            </p>
            <div>
              <label className={LABEL}>New Code (UPPER_SNAKE_CASE)</label>
              <input className={cx(INPUT, "font-mono")} value={code}
                     onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} />
            </div>
            <div>
              <label className={LABEL}>Name</label>
              <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className={BTN_SECONDARY} onClick={() => setCloning(false)}>Cancel</button>
              <button type="button" className={BTN_PRIMARY} onClick={clone} disabled={busy || !code.trim() || !name.trim()}>
                {busy && <Spinner size={14} className="text-white" />} Clone
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}
