"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { executeQuery } from "@/lib/api";
import { extractResultRows } from "@/lib/nhi-dashboard";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), { ssr: false });

const TENANT_ID = "a0000000-0000-0000-0000-000000000001";

export const FINDINGS_STATUS_OPTIONS = [
  "all",
  "open",
  "triaged",
  "in_progress",
  "blocked",
  "risk_accepted",
  "resolved",
  "closed",
] as const;

export type FindingsStatusFilter = (typeof FINDINGS_STATUS_OPTIONS)[number];

type FindingRow = {
  finding_id: string;
  source: string;
  severity: string;
  status: string;
  priority_score: number | null;
  title: string;
  nhi_id: string;
  nhi_name: string;
  detected_at: string;
  sla_due_at: string;
  sla_breached: boolean;
};

function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return null;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return Boolean(v);
}

function sevColor(s: string): string {
  const key = s.toLowerCase();
  return (
    {
      critical: "#ef4444",
      high: "#f97316",
      medium: "#f59e0b",
      low: "#3b82f6",
      info: "#64748b",
    }[key] ?? "#6366f1"
  );
}

function groupCount(rows: FindingRow[], key: keyof FindingRow): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = asText(r[key]) || "(null)";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function toneForSeverity(sev: string): string {
  const s = sev.toLowerCase();
  if (s === "critical") return "bg-red-50 text-red-700 border-red-200";
  if (s === "high") return "bg-orange-50 text-orange-700 border-orange-200";
  if (s === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "low") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function toneForStatus(st: string): string {
  const s = st.toLowerCase();
  if (s === "open" || s === "blocked") return "bg-red-50 text-red-700 border-red-200";
  if (s === "in_progress" || s === "triaged") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "resolved" || s === "closed" || s === "risk_accepted") return "bg-green-50 text-green-700 border-green-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export function FindingsPage({
  suppressPageHeader,
  refreshNonce = 0,
  statusFilter,
  onStatusFilterChange,
}: {
  suppressPageHeader?: boolean;
  refreshNonce?: number;
  statusFilter?: FindingsStatusFilter;
  onStatusFilterChange?: (v: FindingsStatusFilter) => void;
} = {}) {
  const [rows, setRows] = useState<FindingRow[]>([]);
  const [internalStatus, setInternalStatus] = useState<FindingsStatusFilter>("open");
  const controlled = statusFilter !== undefined && onStatusFilterChange !== undefined;
  const status = controlled ? statusFilter : internalStatus;
  const setStatusValue = (v: FindingsStatusFilter) => {
    if (controlled) onStatusFilterChange(v);
    else setInternalStatus(v);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseSql = `
        SELECT f.finding_id, f.source, f.severity, f.status, f.priority_score,
               f.title, f.nhi_id, i.name AS nhi_name,
               f.detected_at, f.sla_due_at,
               f.sla_due_at < now() AS sla_breached
          FROM public.kf_nhi_finding f
     LEFT JOIN public.kf_nhi_identity i ON i.nhi_id = f.nhi_id AND i.tenant_id = f.tenant_id
         WHERE f.tenant_id = ?::uuid`;
      const sql =
        status === "all"
          ? `${baseSql} ORDER BY f.detected_at DESC LIMIT 500`
          : `${baseSql} AND f.status = ? ORDER BY f.detected_at DESC LIMIT 500`;
      const params = status === "all" ? [TENANT_ID] : [TENANT_ID, status];

      const result = extractResultRows(await executeQuery<unknown>(sql, params));
      setRows(
        result.map((r) => ({
          finding_id: asText(r.finding_id),
          source: asText(r.source),
          severity: asText(r.severity),
          status: asText(r.status),
          priority_score: asNum(r.priority_score),
          title: asText(r.title),
          nhi_id: asText(r.nhi_id),
          nhi_name: asText(r.nhi_name),
          detected_at: asText(r.detected_at),
          sla_due_at: asText(r.sla_due_at),
          sla_breached: asBool(r.sla_breached),
        }))
      );
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load findings");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load, refreshNonce]);

  const bySource = useMemo(() => groupCount(rows, "source"), [rows]);
  const bySev = useMemo(() => groupCount(rows, "severity"), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.title, r.source, r.severity, r.status, r.nhi_name, r.finding_id]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [status, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  const showLocalToolbar = !suppressPageHeader || !controlled;

  return (
    <div className={`w-full space-y-4 ${suppressPageHeader ? "" : "pb-8"}`}>
      {showLocalToolbar && (
        <div
          className={`flex flex-wrap items-end gap-3 ${suppressPageHeader ? "justify-start" : "justify-between"}`}
        >
          {!suppressPageHeader && <h1 className="text-2xl font-semibold text-slate-900">Findings</h1>}
          <div className="flex items-center gap-2">
            <select
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
              value={status}
              onChange={(e) => setStatusValue(e.target.value as FindingsStatusFilter)}
            >
              {FINDINGS_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {!suppressPageHeader && (
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={() => void load()}
                title="Refresh"
                aria-label="Refresh"
              >
                ↻
              </button>
            )}
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-slate-500">Loading findings…</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By source">
          <Bar
            data={{
              labels: bySource.map((x) => x.name),
              datasets: [{ label: "Count", data: bySource.map((x) => x.value), backgroundColor: "#6366f1", borderRadius: 4 }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { ticks: { maxRotation: 25, minRotation: 25, font: { size: 10 } }, grid: { display: false } },
              },
            }}
          />
        </ChartCard>
        <ChartCard title="By severity">
          <Bar
            data={{
              labels: bySev.map((x) => x.name),
              datasets: [
                {
                  label: "Count",
                  data: bySev.map((x) => x.value),
                  backgroundColor: bySev.map((x) => sevColor(x.name)),
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
            }}
          />
        </ChartCard>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Findings ({filtered.length})</h2>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${rows.length} rows...`}
              className="w-56 rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            />
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              aria-label="Rows per page"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Source</th>
                <th className="px-2 py-2">Severity</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Priority</th>
                <th className="px-2 py-2">Identity</th>
                <th className="px-2 py-2">SLA</th>
                <th className="px-2 py-2">Detected</th>
                <th className="px-2 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-3 text-slate-500">
                    No findings.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.finding_id || `${r.title}-${r.detected_at}`} className="border-b border-gray-50 hover:bg-slate-50/70">
                    <td className="px-2 py-2 text-slate-700">{r.title || "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{r.source || "—"}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${toneForSeverity(r.severity)}`}>{r.severity || "—"}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${toneForStatus(r.status)}`}>{r.status || "—"}</span>
                    </td>
                    <td className="px-2 py-2 text-slate-700">{r.priority_score != null ? r.priority_score.toFixed(1) : "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{r.nhi_name || "—"}</td>
                    <td className="px-2 py-2">
                      {r.sla_breached ? (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">breached</span>
                      ) : (
                        "ok"
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-700">{r.detected_at ? new Date(r.detected_at).toLocaleString() : "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{r.sla_due_at ? new Date(r.sla_due_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-slate-600">
            <span>
              {filtered.length} rows · page {pageSafe} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="h-[220px]">{children}</div>
    </div>
  );
}

