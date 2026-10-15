"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, Layers, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCcConnection } from "@/hooks/useCcConnection";
import { Controls, ControlsApiError, type Control, type ControlQuery } from "@/lib/controls-api";
import {
  BTN_LINK, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, PageSpinner, Spinner,
  StatCard, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
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
// category tiles, filter bar, one table per category; a row opens the control page.
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
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState<Banner>(null);

  const query: ControlQuery = { category: category || undefined, state: state || undefined, q: search || undefined };
  // Connection check first, as the Continuous Compliance Console does on load.
  const connection = useCcConnection();
  const categoriesQ = useQuery({ queryKey: [...KEY, "categories"], queryFn: Controls.categories });
  const controlsQ = useQuery({ queryKey: [...KEY, "list", query], queryFn: () => Controls.list(query) });
  // Unfiltered list for the summary cards and the family tiles.
  const allQ = useQuery({ queryKey: [...KEY, "list", {}], queryFn: () => Controls.list({}) });

  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const controls = useMemo(() => (Array.isArray(controlsQ.data) ? controlsQ.data : []), [controlsQ.data]);
  const all = useMemo(() => (Array.isArray(allQ.data) ? allQ.data : []), [allQ.data]);
  const error = connection.error ?? controlsQ.error ?? categoriesQ.error;

  const categoryName = (code: string) => categories.find((c) => c.code === code)?.displayName ?? code;

  const s = useMemo(() => ({
    controls: all.length,
    active: all.filter((c) => c.state === "ACTIVE").length,
    categories: categories.length,
    tenant: all.filter((c) => !c.system).length,
  }), [all, categories]);

  // Controls grouped by category, in the order of the category list.
  const grouped = useMemo(() => {
    const m = new Map<string, Control[]>();
    for (const c of controls) m.set(c.categoryCode, [...(m.get(c.categoryCode) ?? []), c]);
    const order = categories.map((c) => c.code);
    const rank = (code: string) => (order.includes(code) ? order.indexOf(code) : order.length);
    return [...m.entries()].sort((x, y) => rank(x[0]) - rank(y[0]));
  }, [controls, categories]);

  // The control page: Definition, Test, Versions, Where Used, Audit, Raw JSON.
  const openControl = (c: Control) =>
    router.push(`/assurance-events/control-library/${encodeURIComponent(c.code)}?version=${c.version}`);

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Control Library"
          subtitle={
            <>
              Every control KeyForge can evaluate is listed here across various categories. A control is a named,
              categorised condition on one object kind; system controls are read only - you may clone the existing
              control to build a new one.
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Controls" value={s.controls} hint="In the library" />
            <StatCard label="Active" value={s.active} hint="Evaluated when linked to a definition" />
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
          <div className="space-y-6">
            {grouped.map(([catCode, items]) => (
              <div key={catCode} className={cx(CARD, "overflow-hidden")}>
                <div className={CARD_HEADER}>
                  <div className={CARD_TITLE}>{categoryName(catCode)}</div>
                  <span className="text-xs text-gray-500">{items.length} control{items.length === 1 ? "" : "s"}</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className={TH}>Control</th>
                      <th className={TH}>Object</th>
                      <th className={TH}>Severity Hint</th>
                      <th className={TH}>State</th>
                    </tr>
                  </thead>
                  <tbody className={TBODY}>
                    {items.map((c) => (
                      <tr key={c.controlId ?? `${c.code}-${c.version}`} className={TR_CLICKABLE} onClick={() => openControl(c)}>
                        <td className={cx(TD, "w-1/2")}>
                          <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                          {c.description && <div className="text-xs text-gray-500 mt-0.5">{c.description}</div>}
                        </td>
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
                  </tbody>
                </table>
              </div>
            ))}
            {grouped.length === 0 && !controlsQ.error && (
              <div className={cx(CARD, "px-4 py-8 text-center text-sm text-gray-500")}>
                No controls match the current filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
