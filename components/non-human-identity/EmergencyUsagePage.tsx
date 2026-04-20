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

type EmergencyRow = {
  emergency_id: string;
  nhi_id: string;
  nhi_name: string;
  invoked_by: string;
  reason: string;
  ticket_reference: string;
  incident_severity: string;
  started_at: string;
  ended_at: string;
  reviewed_at: string;
  review_outcome: string;
  still_active: boolean;
  pending_review: boolean;
};

function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
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
    }[key] ?? "#6366f1"
  );
}

function sevTone(s: string): string {
  const key = s.toLowerCase();
  if (key === "critical") return "bg-red-50 text-red-700 border-red-200";
  if (key === "high") return "bg-orange-50 text-orange-700 border-orange-200";
  if (key === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  if (key === "low") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function groupCount<T extends Record<string, unknown>>(rows: T[], key: keyof T): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = asText(r[key]) || "(none)";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function EmergencyUsagePage() {
  const [rows, setRows] = useState<EmergencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = extractResultRows(
        await executeQuery<unknown>(
          `SELECT e.emergency_id, e.nhi_id, i.name AS nhi_name,
                  e.invoked_by, e.reason, e.ticket_reference, e.incident_severity,
                  e.started_at, e.ended_at, e.reviewed_at, e.review_outcome,
                  (e.ended_at   IS NULL) AS still_active,
                  (e.reviewed_at IS NULL) AS pending_review
             FROM public.kf_nhi_emergency_usage e
        LEFT JOIN public.kf_nhi_identity i
               ON i.nhi_id = e.nhi_id AND i.tenant_id = e.tenant_id
            WHERE e.tenant_id = ?::uuid
            ORDER BY e.started_at DESC
            LIMIT 500`,
          [TENANT_ID]
        )
      );
      setRows(
        result.map((r) => ({
          emergency_id: asText(r.emergency_id),
          nhi_id: asText(r.nhi_id),
          nhi_name: asText(r.nhi_name),
          invoked_by: asText(r.invoked_by),
          reason: asText(r.reason),
          ticket_reference: asText(r.ticket_reference),
          incident_severity: asText(r.incident_severity),
          started_at: asText(r.started_at),
          ended_at: asText(r.ended_at),
          reviewed_at: asText(r.reviewed_at),
          review_outcome: asText(r.review_outcome),
          still_active: asBool(r.still_active),
          pending_review: asBool(r.pending_review),
        }))
      );
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load emergency usage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => rows.filter((r) => r.still_active).length, [rows]);
  const pending = useMemo(() => rows.filter((r) => r.pending_review).length, [rows]);
  const reviewed = rows.length - pending;
  const bySev = useMemo(() => groupCount(rows, "incident_severity"), [rows]);
  const byOutcome = useMemo(
    () => groupCount(rows.filter((r) => !r.pending_review), "review_outcome"),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.nhi_name, r.incident_severity, r.reason, r.ticket_reference, r.review_outcome, r.invoked_by]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  return (
    <div className="w-full space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Emergency Usage (break-glass)</h1>
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          onClick={() => void load()}
          title="Refresh"
          aria-label="Refresh"
        >
          ↻
        </button>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading emergency invocations…</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 xl:grid-cols-3 xl:items-stretch">
        <div className="h-full rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="grid h-full gap-2 sm:grid-cols-2">
            <Kpi label="Total invocations" value={String(rows.length)} compact />
            <Kpi label="Still active" value={String(active)} tone={active > 0 ? "warn" : "ok"} compact />
            <Kpi label="Pending review" value={String(pending)} tone={pending > 0 ? "danger" : "ok"} compact />
            <Kpi label="Reviewed" value={String(reviewed)} compact />
          </div>
        </div>

        <ChartCard title="By incident severity">
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
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
                x: { ticks: { font: { size: 10 } }, grid: { display: false } },
              },
            }}
          />
        </ChartCard>

        <ChartCard title="Review outcomes">
          <Bar
            data={{
              labels: byOutcome.map((x) => x.name),
              datasets: [{ label: "Count", data: byOutcome.map((x) => x.value), backgroundColor: "#6366f1", borderRadius: 4 }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
                x: { ticks: { font: { size: 10 } }, grid: { display: false } },
              },
            }}
          />
        </ChartCard>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Invocations ({filtered.length})</h2>
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
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-2 py-2">NHI</th>
                <th className="px-2 py-2">Severity</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Ticket</th>
                <th className="px-2 py-2">Started</th>
                <th className="px-2 py-2">Ended</th>
                <th className="px-2 py-2">Reviewed</th>
                <th className="px-2 py-2">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-3 text-slate-500">
                    No emergency invocations.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.emergency_id || `${r.nhi_id}-${r.started_at}`} className="border-b border-gray-50 hover:bg-slate-50/70">
                    <td className="px-2 py-2 text-slate-700">{r.nhi_name || "—"}</td>
                    <td className="px-2 py-2">
                      {r.incident_severity ? (
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${sevTone(r.incident_severity)}`}>{r.incident_severity}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-700">{r.reason || "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{r.ticket_reference || "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
                    <td className="px-2 py-2 text-slate-700">{r.ended_at ? new Date(r.ended_at).toLocaleString() : "active"}</td>
                    <td className="px-2 py-2">
                      {r.pending_review ? (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">pending</span>
                      ) : (
                        "yes"
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-700">{r.review_outcome || "—"}</td>
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

function Kpi({
  label,
  value,
  tone = "default",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "danger";
  compact?: boolean;
}) {
  const cls =
    tone === "ok"
      ? "text-green-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-slate-900";
  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${compact ? "px-3 py-2" : "px-4 py-3"} shadow-sm`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`${compact ? "mt-0.5 text-3xl" : "mt-1 text-2xl"} font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="h-[240px]">{children}</div>
    </div>
  );
}

