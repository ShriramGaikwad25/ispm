"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";
import { Eye, RotateCw, Search } from "lucide-react";
import { executeQuery } from "@/lib/api";
import {
  AGENT_POSTURE_LIST_QUERY,
  computeAgentSummary,
  formatUsd,
  NHI_TENANT_ID,
  parseAgentPostureListRows,
  type NhiAgentRow,
} from "@/lib/nhi-agents";

const FILTER_ALL = "all" as const;

function displayCell(v: string | undefined): string {
  const s = (v ?? "").trim();
  return s.length ? s : "—";
}

function uniqueSortedOptions(rows: NhiAgentRow[], key: keyof NhiAgentRow): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    set.add(displayCell(r[key] as string | undefined));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const Radar = dynamic(() => import("react-chartjs-2").then((m) => m.Radar), {
  ssr: false,
});
const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), {
  ssr: false,
});

const RADAR_LABELS = [
  "Capability",
  "Authorization",
  "Autonomy",
  "Activity",
  "Delegation",
];

const TOP_N = 10;

/** Whole numbers for radar (avoids 84.0652-style tooltips). */
function roundRadarValues(values: number[]): number[] {
  return values.map((v) =>
    Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0
  );
}

export function AgentPosturePage() {
  const [agents, setAgents] = useState<NhiAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [agentNameSearch, setAgentNameSearch] = useState("");
  const [interfaceTypeFilter, setInterfaceTypeFilter] = useState<string>(FILTER_ALL);
  const [classificationFilter, setClassificationFilter] = useState<string>(FILTER_ALL);
  const [platformFilter, setPlatformFilter] = useState<string>(FILTER_ALL);
  const [environmentFilter, setEnvironmentFilter] = useState<string>(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [businessOwnerFilter, setBusinessOwnerFilter] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const listRes = await executeQuery<unknown>(AGENT_POSTURE_LIST_QUERY, [
        NHI_TENANT_ID,
      ]);
      setAgents(parseAgentPostureListRows(listRes));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
      setAgents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const postureSummary = useMemo(
    () => computeAgentSummary(agents),
    [agents]
  );

  const metrics = postureSummary.metrics;

  const radar = useMemo(
    () => roundRadarValues(postureSummary.radar),
    [postureSummary.radar]
  );

  const radarData = useMemo(
    () => ({
      labels: RADAR_LABELS,
      datasets: [
        {
          label: "Posture",
          data: radar,
          hidden: true,
          backgroundColor: "rgba(41, 121, 255, 0.15)",
          borderColor: "#2979FF",
          borderWidth: 2,
          pointBackgroundColor: "#2979FF",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#2979FF",
        },
      ],
    }),
    [radar]
  );

  const topByActions = useMemo(() => {
    return [...agents]
      .sort(
        (a, b) =>
          (b.actions_last_24h ?? 0) - (a.actions_last_24h ?? 0)
      )
      .slice(0, TOP_N);
  }, [agents]);

  const barData = useMemo(() => {
    const labels = topByActions.map((a) =>
      (a.agent_name ?? "—").length > 22
        ? `${(a.agent_name ?? "").slice(0, 20)}…`
        : a.agent_name ?? "—"
    );
    const actions = topByActions.map((a) => {
      const t = a.actions_last_24h ?? 0;
      const d = a.denied_last_24h ?? 0;
      return Math.max(0, t - d);
    });
    const denied = topByActions.map((a) => a.denied_last_24h ?? 0);
    return {
      labels,
      datasets: [
        {
          label: "Actions",
          data: actions,
          backgroundColor: "#2979FF",
          borderRadius: 4,
        },
        {
          label: "Denied",
          data: denied,
          backgroundColor: "#EF4444",
          borderRadius: 4,
        },
      ],
    };
  }, [topByActions]);

  const filterOptions = useMemo(
    () => ({
      interfaceTypes: uniqueSortedOptions(agents, "interface_type"),
      classifications: uniqueSortedOptions(agents, "identity_classification"),
      platforms: uniqueSortedOptions(agents, "platform_name"),
      environments: uniqueSortedOptions(agents, "environment_label"),
      statuses: uniqueSortedOptions(agents, "identity_state"),
      owners: uniqueSortedOptions(agents, "business_owner_name"),
    }),
    [agents]
  );

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (agentNameSearch.trim()) {
        const q = agentNameSearch.trim().toLowerCase();
        if (!(a.agent_name ?? "").toLowerCase().includes(q)) return false;
      }
      if (interfaceTypeFilter !== FILTER_ALL && displayCell(a.interface_type) !== interfaceTypeFilter) {
        return false;
      }
      if (classificationFilter !== FILTER_ALL && displayCell(a.identity_classification) !== classificationFilter) {
        return false;
      }
      if (platformFilter !== FILTER_ALL && displayCell(a.platform_name) !== platformFilter) {
        return false;
      }
      if (environmentFilter !== FILTER_ALL && displayCell(a.environment_label) !== environmentFilter) {
        return false;
      }
      if (statusFilter !== FILTER_ALL && displayCell(a.identity_state) !== statusFilter) {
        return false;
      }
      if (businessOwnerFilter !== FILTER_ALL && displayCell(a.business_owner_name) !== businessOwnerFilter) {
        return false;
      }
      return true;
    });
  }, [
    agents,
    agentNameSearch,
    interfaceTypeFilter,
    classificationFilter,
    platformFilter,
    environmentFilter,
    statusFilter,
    businessOwnerFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    agentNameSearch,
    interfaceTypeFilter,
    classificationFilter,
    platformFilter,
    environmentFilter,
    statusFilter,
    businessOwnerFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  return (
    <div className="w-full min-w-0 space-y-6 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            AI Agent Inventory
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Performance and posture across registered AI agents.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
        >
          <RotateCw
            className={`h-4 w-4 ${refreshing || loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </button>
      </div>

      {(loading || error) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {loading && <span className="text-slate-500">Loading…</span>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-8">
          <MetricCard label="Agents total" value={metrics.agentsTotal} tone="dark" />
          <MetricCard
            label="Active"
            value={metrics.activeDisplay}
            tone="muted"
          />
          <MetricCard
            label="Delegations"
            value={metrics.delegations}
            tone="dark"
          />
          <MetricCard
            label="Actions 24h"
            value={metrics.actions24h}
            tone="blue"
          />
          <MetricCard
            label="Denied 24h"
            value={metrics.denied24h}
            tone="amber"
          />
          <MetricCard
            label="Hallucin. 7d"
            value={metrics.hallucinations7d}
            tone="amber"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Agent posture radar
          </h2>
          <div className="relative mx-auto h-[260px] max-w-[320px]">
            {agents.length === 0 && !loading ? (
              <p className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                No agent rows yet — nothing to plot.
              </p>
            ) : (
              <Radar
                data={radarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      min: 0,
                      max: 100,
                      ticks: { stepSize: 25, font: { size: 10 } },
                      grid: { color: "#e2e8f0" },
                      pointLabels: { font: { size: 11 } },
                    },
                  },
                  interaction: {
                    mode: "nearest",
                    intersect: false,
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                    enabled: false,
                      callbacks: {
                        label: (ctx) => {
                          const labels = ctx.chart?.data?.labels;
                          const axis =
                            Array.isArray(labels) &&
                            typeof ctx.dataIndex === "number"
                              ? String(labels[ctx.dataIndex] ?? "")
                              : "";
                          const raw = ctx.raw;
                          const n =
                            typeof raw === "number" && Number.isFinite(raw)
                              ? Math.round(raw)
                              : raw;
                          return axis ? `${axis}: ${n}` : `${ctx.dataset.label}: ${n}`;
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-700">
          Top agents by 24h action volume
        </h2>
        <div className="h-[280px] w-full">
          {topByActions.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No agent rows returned.
            </p>
          ) : (
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "top",
                    labels: { boxWidth: 12, font: { size: 11 } },
                  },
                },
                scales: {
                  x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { size: 10 }, maxRotation: 45 },
                  },
                  y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: "#f1f5f9" },
                  },
                },
              }}
            />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                All agents
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Filter by agent name and attributes (same pattern as Rotation Policy).
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label htmlFor="agent-inv-name" className="text-sm font-medium text-gray-700">
                Agent name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
                <input
                  id="agent-inv-name"
                  type="search"
                  value={agentNameSearch}
                  onChange={(e) => setAgentNameSearch(e.target.value)}
                  placeholder="Search by agent name…"
                  autoComplete="off"
                  className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
            <div className="min-w-0">
              <label htmlFor="agent-inv-interface" className="text-sm font-medium text-gray-700">
                Interface type
              </label>
              <select
                id="agent-inv-interface"
                value={interfaceTypeFilter}
                onChange={(e) => setInterfaceTypeFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.interfaceTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="agent-inv-classification" className="text-sm font-medium text-gray-700">
                Classification
              </label>
              <select
                id="agent-inv-classification"
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.classifications.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="agent-inv-platform" className="text-sm font-medium text-gray-700">
                Platform
              </label>
              <select
                id="agent-inv-platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.platforms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="agent-inv-env" className="text-sm font-medium text-gray-700">
                Environment
              </label>
              <select
                id="agent-inv-env"
                value={environmentFilter}
                onChange={(e) => setEnvironmentFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.environments.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="agent-inv-status" className="text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="agent-inv-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.statuses.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="agent-inv-owner" className="text-sm font-medium text-gray-700">
                Business owner
              </label>
              <select
                id="agent-inv-owner"
                value={businessOwnerFilter}
                onChange={(e) => setBusinessOwnerFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.owners.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <th className="whitespace-nowrap px-3 py-2.5">Agent</th>
                <th className="whitespace-nowrap px-3 py-2.5">Vendor</th>
                <th className="whitespace-nowrap px-3 py-2.5">Model</th>
                <th className="whitespace-nowrap px-3 py-2.5">Version</th>
                <th className="whitespace-nowrap px-3 py-2.5">Eval</th>
                <th className="whitespace-nowrap px-3 py-2.5">Tools</th>
                <th className="whitespace-nowrap px-3 py-2.5">Delegations</th>
                <th className="whitespace-nowrap px-3 py-2.5">Actions 24h</th>
                <th className="whitespace-nowrap px-3 py-2.5">Denied 24h</th>
                <th className="whitespace-nowrap px-3 py-2.5">Hallucin. 7d</th>
                <th className="whitespace-nowrap px-3 py-2.5">Lat ms</th>
                <th className="whitespace-nowrap px-3 py-2.5">Tokens 24h</th>
                <th className="whitespace-nowrap px-3 py-2.5">$ 24h</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center w-14">View</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a, idx) => (
                <tr
                  key={a.nhi_id ?? `${a.agent_name}-${idx}`}
                  className="border-b border-gray-50 hover:bg-slate-50/80"
                >
                  <td className="max-w-[200px] truncate px-3 py-2 font-medium text-slate-900">
                    {a.agent_name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {a.vendor ?? "—"}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-slate-700">
                    {a.model_name ?? "—"}
                  </td>
                  <td className="max-w-[100px] truncate px-3 py-2 text-slate-600">
                    {a.model_version ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-800">
                    {a.evaluation_score != null
                      ? (Math.round(a.evaluation_score * 10) / 10).toFixed(1)
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {a.tools_enabled ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {a.active_delegations ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {a.actions_last_24h ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {a.denied_last_24h ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {a.hallucinations_last_7d ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                    {a.avg_latency_ms_24h ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                    {a.tokens_last_24h ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-800">
                    {formatUsd(a.cost_usd_24h)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {a.nhi_id ? (
                      <Link
                        href={`/non-human-identity/ai-agent-inventory/${encodeURIComponent(a.nhi_id)}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        title="View agent details"
                        aria-label={`View details for ${a.agent_name ?? "agent"}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Link>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-xs text-slate-600">
            <span>
              {filtered.length} rows · page {pageSafe} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "dark" | "blue" | "amber" | "muted";
}) {
  const cls =
    tone === "blue"
      ? "text-blue-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "muted"
          ? "text-slate-400"
          : "text-slate-900";
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>
        {value}
      </p>
    </div>
  );
}
