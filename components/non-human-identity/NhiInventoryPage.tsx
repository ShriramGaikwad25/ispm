"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import Link from "next/link";
import { Eye, RotateCw, Search } from "lucide-react";
import { executeQuery } from "@/lib/api";
import { extractResultRows } from "@/lib/nhi-dashboard";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Doughnut = dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), {
  ssr: false,
});
const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), {
  ssr: false,
});

const NHI_TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const NHI_IDENTITIES_QUERY = `SELECT i.nhi_id, i.name, i.nhi_type, i.state, i.risk_level,
                i.criticality, i.execution_type, i.load_source,
                i.createddate, i.review_status,
                COALESCE(NULLIF(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')), ''), u.username) AS owner_name,
                ai.instancename AS associated_system,
                COALESCE(NULLIF(TRIM(i.customattributes->>'environment'), ''), '') AS environment_label
           FROM public.kf_nhi_identity i
           LEFT JOIN public.usr u ON u.userid = i.ownerid
           LEFT JOIN public.applicationinstance ai ON ai.instanceid = i.instanceid
          WHERE i.tenant_id = ?::uuid
          ORDER BY i.createddate DESC
          LIMIT 500`;

type NhiIdentity = {
  nhi_id: string;
  name: string;
  nhi_type: string;
  state: string;
  risk_level: string;
  criticality: string;
  execution_type: string;
  load_source: string;
  createddate: string;
  review_status: string;
  owner_name: string;
  associated_system: string;
  environment_label: string;
};

const FILTER_ALL = "all" as const;

function displayCell(v: string | undefined): string {
  const s = (v ?? "").trim();
  return s.length ? s : "—";
}

function uniqueSortedOptions(rows: NhiIdentity[], key: keyof NhiIdentity): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    set.add(displayCell(r[key] as string | undefined));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

const DONUT_COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#A855F7",
  "#14B8A6",
  "#EC4899",
  "#8B5CF6",
];

const STATE_COLORS: Record<string, string> = {
  active: "#F59E0B",
  expiring_soon: "#EF4444",
  suspended: "#06B6D4",
  expired: "#A855F7",
  pending_approval: "#14B8A6",
};

const STATE_ORDER = ["active", "expiring_soon", "suspended", "expired", "pending_approval"];
const CRITICALITY_ORDER = ["tier3_standard", "tier2_important", "tier1_critical", "tier0_low"];

function safeText(v: unknown): string {
  if (v == null) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

function parseIdentityRow(r: Record<string, unknown>): NhiIdentity {
  return {
    nhi_id: safeText(r.nhi_id),
    name: safeText(r.name),
    nhi_type: safeText(r.nhi_type),
    state: safeText(r.state),
    risk_level: safeText(r.risk_level),
    criticality: safeText(r.criticality),
    execution_type: safeText(r.execution_type),
    load_source: safeText(r.load_source),
    createddate: safeText(r.createddate),
    review_status: safeText(r.review_status),
    owner_name: safeText(r.owner_name),
    associated_system: safeText(r.associated_system),
    environment_label: safeText(r.environment_label),
  };
}

function countBy(items: NhiIdentity[], key: keyof NhiIdentity): { label: string; value: number }[] {
  const m = new Map<string, number>();
  for (const row of items) {
    const k = row[key] || "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function orderedBuckets(
  buckets: { label: string; value: number }[],
  preferredOrder: string[]
): { label: string; value: number }[] {
  const map = new Map(buckets.map((x) => [x.label.toLowerCase(), x]));
  const out: { label: string; value: number }[] = [];
  for (const key of preferredOrder) {
    const found = map.get(key.toLowerCase());
    if (found) {
      out.push(found);
      map.delete(key.toLowerCase());
    }
  }
  const rest = [...map.values()].sort((a, b) => b.value - a.value);
  return [...out, ...rest];
}

function formatDate(v: string): string {
  if (!v || v === "—") return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US");
}

export function NhiInventoryPage() {
  const [rows, setRows] = useState<NhiIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identityNameSearch, setIdentityNameSearch] = useState("");
  const [nhiTypeFilter, setNhiTypeFilter] = useState<string>(FILTER_ALL);
  const [identityTypeFilter, setIdentityTypeFilter] = useState<string>(FILTER_ALL);
  const [environmentFilter, setEnvironmentFilter] = useState<string>(FILTER_ALL);
  const [associatedSystemFilter, setAssociatedSystemFilter] = useState<string>(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState<string>(FILTER_ALL);
  const [riskFilter, setRiskFilter] = useState<string>(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await executeQuery<unknown>(NHI_IDENTITIES_QUERY, [NHI_TENANT_ID]);
      const resultRows = extractResultRows(response);
      setRows(resultRows.map((r) => parseIdentityRow(r as Record<string, unknown>)));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load NHI inventory");
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

  const byType = useMemo(() => countBy(rows, "nhi_type"), [rows]);
  const byState = useMemo(
    () => orderedBuckets(countBy(rows, "state"), STATE_ORDER),
    [rows]
  );
  const byCriticality = useMemo(
    () => orderedBuckets(countBy(rows, "criticality"), CRITICALITY_ORDER),
    [rows]
  );

  const filterOptions = useMemo(
    () => ({
      nhiTypes: uniqueSortedOptions(rows, "nhi_type"),
      identityTypes: uniqueSortedOptions(rows, "execution_type"),
      environments: uniqueSortedOptions(rows, "environment_label"),
      associatedSystems: uniqueSortedOptions(rows, "associated_system"),
      owners: uniqueSortedOptions(rows, "owner_name"),
      risks: uniqueSortedOptions(rows, "risk_level"),
      statuses: uniqueSortedOptions(rows, "state"),
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (identityNameSearch.trim()) {
        const q = identityNameSearch.trim().toLowerCase();
        const nameOk = r.name.toLowerCase().includes(q);
        const idOk = r.nhi_id.toLowerCase().includes(q);
        if (!nameOk && !idOk) return false;
      }
      if (nhiTypeFilter !== FILTER_ALL && displayCell(r.nhi_type) !== nhiTypeFilter) return false;
      if (identityTypeFilter !== FILTER_ALL && displayCell(r.execution_type) !== identityTypeFilter) {
        return false;
      }
      if (environmentFilter !== FILTER_ALL && displayCell(r.environment_label) !== environmentFilter) {
        return false;
      }
      if (
        associatedSystemFilter !== FILTER_ALL &&
        displayCell(r.associated_system) !== associatedSystemFilter
      ) {
        return false;
      }
      if (ownerFilter !== FILTER_ALL && displayCell(r.owner_name) !== ownerFilter) return false;
      if (riskFilter !== FILTER_ALL && displayCell(r.risk_level) !== riskFilter) return false;
      if (statusFilter !== FILTER_ALL && displayCell(r.state) !== statusFilter) return false;
      return true;
    });
  }, [
    rows,
    identityNameSearch,
    nhiTypeFilter,
    identityTypeFilter,
    environmentFilter,
    associatedSystemFilter,
    ownerFilter,
    riskFilter,
    statusFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    identityNameSearch,
    nhiTypeFilter,
    identityTypeFilter,
    environmentFilter,
    associatedSystemFilter,
    ownerFilter,
    riskFilter,
    statusFilter,
    pageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold text-slate-900">NHI Inventory</h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
        >
          <RotateCw className={`h-4 w-4 ${refreshing || loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {(loading || error) && (
        <div className="flex items-center gap-2 text-sm">
          {loading && <span className="text-slate-500">Loading…</span>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="By Type">
          <Doughnut
            data={{
              labels: byType.map((x) => x.label),
              datasets: [
                {
                  data: byType.map((x) => x.value),
                  backgroundColor: byType.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]),
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "62%",
              plugins: {
                legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } },
                datalabels: { display: false },
              },
            }}
          />
        </ChartCard>
        <ChartCard title="By State">
          <Doughnut
            data={{
              labels: byState.map((x) => x.label),
              datasets: [
                {
                  data: byState.map((x) => x.value),
                  backgroundColor: byState.map(
                    (x, i) => STATE_COLORS[x.label.toLowerCase()] ?? DONUT_COLORS[i % DONUT_COLORS.length]
                  ),
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "62%",
              plugins: {
                legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } },
                datalabels: { display: false },
              },
            }}
          />
        </ChartCard>
        <ChartCard title="By Criticality">
          <Bar
            data={{
              labels: byCriticality.map((x) => x.label),
              datasets: [
                {
                  label: "Count",
                  data: byCriticality.map((x) => x.value),
                  borderRadius: 4,
                  backgroundColor: "#5B6DF6",
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, datalabels: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { display: false, precision: 0 },
                  grid: { color: "#eef2ff" },
                },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              },
            }}
          />
        </ChartCard>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Identities ({filtered.length})
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Filter by name and attributes (same pattern as Rotation Policy).
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label htmlFor="nhi-inv-page-size" className="text-sm font-medium text-gray-700">
                Rows
              </label>
              <select
                id="nhi-inv-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                aria-label="Rows per page"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label htmlFor="nhi-inv-name" className="text-sm font-medium text-gray-700">
                Name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
                <input
                  id="nhi-inv-name"
                  type="search"
                  value={identityNameSearch}
                  onChange={(e) => setIdentityNameSearch(e.target.value)}
                  placeholder="Search by name or NHI id…"
                  autoComplete="off"
                  aria-label="Search by identity name or NHI id"
                  className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
            <div className="min-w-0">
              <label htmlFor="nhi-inv-nhi-type" className="text-sm font-medium text-gray-700">
                NHI type
              </label>
              <select
                id="nhi-inv-nhi-type"
                value={nhiTypeFilter}
                onChange={(e) => setNhiTypeFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.nhiTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="nhi-inv-identity-type" className="text-sm font-medium text-gray-700">
                Identity type
              </label>
              <select
                id="nhi-inv-identity-type"
                value={identityTypeFilter}
                onChange={(e) => setIdentityTypeFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.identityTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="nhi-inv-env" className="text-sm font-medium text-gray-700">
                Environment
              </label>
              <select
                id="nhi-inv-env"
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
              <label htmlFor="nhi-inv-system" className="text-sm font-medium text-gray-700">
                Associated system
              </label>
              <select
                id="nhi-inv-system"
                value={associatedSystemFilter}
                onChange={(e) => setAssociatedSystemFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.associatedSystems.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="nhi-inv-owner" className="text-sm font-medium text-gray-700">
                Owner
              </label>
              <select
                id="nhi-inv-owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
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
            <div className="min-w-0">
              <label htmlFor="nhi-inv-risk" className="text-sm font-medium text-gray-700">
                Risk
              </label>
              <select
                id="nhi-inv-risk"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={FILTER_ALL}>All</option>
                {filterOptions.risks.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="nhi-inv-status" className="text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="nhi-inv-status"
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
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <th className="whitespace-nowrap px-3 py-2.5">Name</th>
                <th className="whitespace-nowrap px-3 py-2.5">Type</th>
                <th className="whitespace-nowrap px-3 py-2.5">State</th>
                <th className="whitespace-nowrap px-3 py-2.5">Risk</th>
                <th className="whitespace-nowrap px-3 py-2.5">Criticality</th>
                <th className="whitespace-nowrap px-3 py-2.5">Execution</th>
                <th className="whitespace-nowrap px-3 py-2.5">Review</th>
                <th className="whitespace-nowrap px-3 py-2.5">Source</th>
                <th className="whitespace-nowrap px-3 py-2.5">Created</th>
                <th className="w-14 whitespace-nowrap px-2 py-2.5 text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.nhi_id} className="border-b border-gray-50 hover:bg-slate-50/80">
                  <td className="max-w-[240px] truncate px-3 py-2 font-medium text-slate-900">{r.name}</td>
                  <td className="px-3 py-2 text-slate-700">{r.nhi_type}</td>
                  <td className="px-3 py-2 text-slate-700">{r.state}</td>
                  <td className="px-3 py-2 text-slate-700">{r.risk_level}</td>
                  <td className="px-3 py-2 text-slate-700">{r.criticality}</td>
                  <td className="px-3 py-2 text-slate-700">{r.execution_type}</td>
                  <td className="px-3 py-2 text-slate-700">{r.review_status}</td>
                  <td className="px-3 py-2 text-slate-700">{r.load_source}</td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(r.createddate)}</td>
                  <td className="px-2 py-2 text-center">
                    {r.nhi_id && r.nhi_id !== "—" ? (
                      <Link
                        href={`/non-human-identity/nhi-inventory/${encodeURIComponent(r.nhi_id)}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        title="View NHI details"
                        aria-label={`View details for ${r.name}`}
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
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-slate-600">
            <span>
              {filtered.length} rows · page {pageSafe} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-200 bg-white px-2 py-1 font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-gray-200 bg-white px-2 py-1 font-medium hover:bg-gray-50 disabled:opacity-40"
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</h2>
      <div className="h-[220px]">{children}</div>
    </div>
  );
}

