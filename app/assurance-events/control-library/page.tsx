"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, Plug, X } from "lucide-react";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { Catalog } from "@/lib/assurance-catalog-api";
import type { Detector } from "@/lib/assurance-catalog-api";
import {
  BTN_LINK, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, PageSpinner,
  Spinner, StatCard, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";

// =====================================================================
// Control Library (detector catalog) — everything KeyForge could detect.
//
// This is the library, deliberately separate from the controls a tenant
// runs. A detector here is a design: a condition in prose, with no fact
// resolver behind it. Loading these into the control catalog would
// create a hundred controls that can never produce a verdict, and
// coverage — the number the whole framework exists to protect — would
// stop meaning anything.
//
// So the page answers planning questions instead: what is possible, what
// is built, and what is missing before the rest becomes possible.
// Laid out like ISPM's gateway pages (Agent Task Library): stat cards,
// filter bar, tables, detail in the right sidebar.
// =====================================================================

const ROLLOUTS = ["", "Start", "Expand", "Validate later"];

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function rolloutPillClass(phase?: string) {
  if (phase === "Start") return "bg-green-100 text-green-700";
  if (phase === "Expand") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

export default function ControlLibraryPage() {
  const { openSidebar } = useRightSidebar();
  const [family, setFamily] = useState("");
  const [rollout, setRollout] = useState("");
  const [implemented, setImplemented] = useState<"" | "yes" | "no">("");
  const [search, setSearch] = useState("");

  const summaryQ = useQuery({ queryKey: ["catalog", "summary"], queryFn: () => Catalog.summary() });
  const familiesQ = useQuery({ queryKey: ["catalog", "families"], queryFn: () => Catalog.signalFamilies() });
  const detectorsQ = useQuery({
    queryKey: ["catalog", "detectors", family, rollout, implemented, search],
    queryFn: () => Catalog.detectors({
      family: family || undefined,
      rollout: rollout || undefined,
      implemented: implemented === "" ? undefined : implemented === "yes",
      search: search || undefined,
    }),
  });

  const s = summaryQ.data;
  const families = Array.isArray(familiesQ.data) ? familiesQ.data : [];
  const detectors = Array.isArray(detectorsQ.data) ? detectorsQ.data : [];
  const error = summaryQ.error ?? familiesQ.error ?? detectorsQ.error;

  const grouped = useMemo(() => {
    const m = new Map<string, Detector[]>();
    for (const d of detectors) {
      if (!m.has(d.signal_family)) m.set(d.signal_family, []);
      m.get(d.signal_family)!.push(d);
    }
    return [...m.entries()];
  }, [detectors]);

  const openDetector = (d: Detector) =>
    openSidebar(<DetectorDetail id={d.detector_id} />, { title: d.name, widthPx: 560 });

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Control Library"
          subtitle={
            <>
              Every use case KeyForge can govern, across {s?.families ?? 18} signal families. These are designs, not
              running controls — a detector becomes a control once an agent can resolve the facts it needs.
            </>
          }
        />

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {(error as Error).message}
          </div>
        )}

        {s && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="Detectors" value={s.detectors} hint="In the library" />
            <StatCard label="Implemented" value={s.implemented} hint="Running as event definitions" />
            <StatCard label="Signal families" value={s.families} hint="Groups of related detectors" />
            <StatCard label="Domain agents" value={s.agents} hint="Agents that own detectors" />
            <StatCard label="Phase 1 (Start)" value={s.phase_start} hint="First rollout wave" />
          </div>
        )}

        {/* Family readiness */}
        <div className={cx(CARD, "mb-6")}>
          <div className={CARD_HEADER}>
            <div>
              <div className={CARD_TITLE}>Signal Families</div>
              <div className={CARD_SUBTITLE}>
                A family becomes reachable when a connector feeding it is configured. Click to filter.
              </div>
            </div>
            {family && (
              <button className={cx(BTN_LINK, "inline-flex items-center gap-1")} onClick={() => setFamily("")}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {familiesQ.isLoading && <Spinner />}
            {families.map((f) => {
              const active = family === f.code;
              const reachable = f.configured_sources > 0;
              return (
                <button
                  key={f.code}
                  onClick={() => setFamily(active ? "" : f.code)}
                  className={cx(
                    "text-left border rounded-lg p-3 transition-colors",
                    active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{f.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">{f.detector_count}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    {f.implemented_count > 0 ? (
                      <span className="text-green-700 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> {f.implemented_count} built
                      </span>
                    ) : (
                      <span className="text-gray-400 inline-flex items-center gap-1">
                        <Circle size={12} /> none built
                      </span>
                    )}
                    <span className={cx("inline-flex items-center gap-1", reachable ? "text-blue-700" : "text-amber-700")}>
                      <Plug size={12} /> {reachable ? `${f.configured_sources} live source` : "no live source"}
                    </span>
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
            placeholder="Search detectors by name, condition, or source..."
            aria-label="Search detectors"
            className="flex-1 min-w-[260px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select className={FILTER_INPUT} value={rollout} onChange={(e) => setRollout(e.target.value)} aria-label="Rollout phase">
              {ROLLOUTS.map((r) => <option key={r} value={r}>{r === "" ? "All phases" : r}</option>)}
            </select>
            <select className={FILTER_INPUT} value={implemented} aria-label="Implementation"
                    onChange={(e) => setImplemented(e.target.value as "" | "yes" | "no")}>
              <option value="">Built and not built</option>
              <option value="yes">Implemented only</option>
              <option value="no">Not yet implemented</option>
            </select>
            <span className="text-sm text-gray-500 whitespace-nowrap">{detectors.length} shown</span>
          </div>
        </div>

        {detectorsQ.isLoading ? (
          <PageSpinner />
        ) : (
          <div className="space-y-6">
            {grouped.map(([famName, items]) => (
              <div key={famName} className={cx(CARD, "overflow-hidden")}>
                <div className={CARD_HEADER}>
                  <div className={CARD_TITLE}>{famName}</div>
                  <span className="text-xs text-gray-500">{items.length} detectors</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className={THEAD_ROW}>
                        <th className={TH}>Detector</th>
                        <th className={TH}>Domain Agent</th>
                        <th className={TH}>Default Response</th>
                        <th className={TH}>Phase</th>
                        <th className={TH}>Status</th>
                      </tr>
                    </thead>
                    <tbody className={TBODY}>
                      {items.map((d) => (
                        <tr key={d.detector_id} className={TR_CLICKABLE} onClick={() => openDetector(d)}>
                          <td className={cx(TD, "max-w-[460px]")}>
                            <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{d.detector_id}</div>
                            {d.finding_condition && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.finding_condition}</div>
                            )}
                          </td>
                          <td className={TD}>{d.agent_name ?? d.agent_code}</td>
                          <td className={TD}>{d.default_response ?? "—"}</td>
                          <td className={cx(TD, "whitespace-nowrap")}>
                            {d.rollout_phase
                              ? <span className={cx(PILL, rolloutPillClass(d.rollout_phase))}>{d.rollout_phase}</span>
                              : "—"}
                          </td>
                          <td className={cx(TD, "whitespace-nowrap")}>
                            {d.is_implemented ? (
                              <span className={cx(PILL, "bg-green-100 text-green-700")} title={d.implemented_event_code ?? undefined}>
                                Implemented
                              </span>
                            ) : (
                              <span className={cx(PILL, "bg-gray-100 text-gray-600")}>Design</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {grouped.length === 0 && !detectorsQ.error && (
              <div className={cx(CARD, "px-4 py-8 text-center text-sm text-gray-500")}>
                No detectors match the current filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Detector detail, shown in the right sidebar like an Agent Task Library task. */
function DetectorDetail({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["catalog", "detector", id], queryFn: () => Catalog.detector(id) });
  const d = q.data;

  if (q.isLoading) return <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner /> Loading…</div>;
  if (q.error) return <div className="text-sm text-red-700">{(q.error as Error).message}</div>;
  if (!d) return null;

  return (
    <div>
      {d.finding_condition && <p className="text-sm text-gray-500 mb-4 leading-relaxed">{d.finding_condition}</p>}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <DetailCard label="Detector ID" value={d.detector_id} />
        <DetailCard label="Signal Family" value={d.signal_family} />
        <DetailCard label="Domain Agent" value={d.agent_name ?? d.agent_code} />
        <DetailCard label="Rollout Phase" value={d.rollout_phase ?? "—"} />
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Status</h3>
        {d.is_implemented ? (
          <span className={cx(PILL, "bg-green-100 text-green-700")}>Implemented as {d.implemented_event_code}</span>
        ) : (
          <span className={cx(PILL, "bg-gray-100 text-gray-600")}>Not yet built</span>
        )}
      </div>

      <DetailText label="Required Evidence" value={d.evidence_inputs} />
      <DetailText label="Likely Source" value={d.likely_source} />
      <DetailText label="Default Response" value={d.default_response} />
      <DetailText label="Accountable Owner" value={d.accountable_owner} />
      <DetailText label="Action Policy" value={d.action_policy} />
      <DetailText label="Closure Evidence" value={d.closure_evidence} />

      {d.sources && d.sources.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Sources That Feed This Detector</h3>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {d.sources.map((src) => (
              <div key={src.code} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                <Plug size={14} className={src.status === "CONFIGURED" ? "text-green-600" : "text-gray-300"} />
                <span className="font-medium text-gray-900">{src.name}</span>
                <span className="text-xs text-gray-500">{src.contribution.toLowerCase()}</span>
                <span className={cx(PILL, "ml-auto",
                  src.status === "CONFIGURED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                  {src.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
          {d.configured_sources === 0 && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              None of these sources is connected, so this detector cannot run here yet.
            </div>
          )}
        </div>
      )}

      {d.reporter_mapping && <DetailText label="Reporter It Would Feed" value={d.reporter_mapping} />}
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

function DetailText({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{label}</h3>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  );
}
