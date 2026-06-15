"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { RotateCw } from "lucide-react";
import { getNhiV2TenantId, nhiV2ExecuteQuery } from "@/lib/nhi-v2-api";
import { groupCount, NHI_V2_PALETTE } from "@/lib/nhi-v2-charts";
import { NHI2_PAGE_SHELL_CLASS } from "@/lib/nhi-shell";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Doughnut = dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), { ssr: false });
const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), { ssr: false });

const NHI_IDENTITIES_QUERY = `SELECT i.nhi_id, i.name, i.nhi_type, i.state, i.risk_level,
                i.criticality, i.execution_type, i.load_source,
                i.createddate, i.review_status
           FROM public.kf_nhi_identity i
          WHERE i.tenant_id = ?::uuid
          ORDER BY i.createddate DESC
          LIMIT 500`;

type IdentityRow = Record<string, unknown>;

function chartFromGroups(groups: { name: string; value: number }[], offset = 0) {
  return {
    labels: groups.map((g) => g.name),
    datasets: [
      {
        data: groups.map((g) => g.value),
        backgroundColor: groups.map((_, i) => NHI_V2_PALETTE[(i + offset) % NHI_V2_PALETTE.length]),
        borderWidth: 0,
      },
    ],
  };
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const TABLE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nhi_type", label: "Type" },
  { key: "state", label: "State" },
  { key: "risk_level", label: "Risk" },
  { key: "criticality", label: "Criticality" },
  { key: "execution_type", label: "Execution" },
  { key: "review_status", label: "Review" },
  { key: "load_source", label: "Source" },
  { key: "createddate", label: "Created" },
] as const;

function cellText(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

function formatCreated(v: unknown): string {
  if (v == null || v === "") return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString();
}

/** NHI_V2 NHIInventory.jsx — faithful port with ispm Tailwind. */
export function Nhi2InventoryPage() {
  const [rows, setRows] = useState<IdentityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const tid = getNhiV2TenantId();
      const { rows: r } = await nhiV2ExecuteQuery(NHI_IDENTITIES_QUERY, [tid]);
      setRows(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byType = useMemo(() => groupCount(rows, "nhi_type"), [rows]);
  const byState = useMemo(() => groupCount(rows, "state"), [rows]);
  const byCriticality = useMemo(() => groupCount(rows, "criticality"), [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, pageSafe, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading NHI inventory…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">{err}</p>
        <button type="button" onClick={() => void load()} className="mt-2 text-sm text-red-700 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`${NHI2_PAGE_SHELL_CLASS} space-y-6`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">NHI Inventory</h1>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="By type">
          <Doughnut
            data={chartFromGroups(byType)}
            options={{ responsive: true, maintainAspectRatio: false, cutout: "45%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } } }}
          />
        </ChartCard>
        <ChartCard title="By state">
          <Doughnut
            data={chartFromGroups(byState, 2)}
            options={{ responsive: true, maintainAspectRatio: false, cutout: "45%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } } }}
          />
        </ChartCard>
        <ChartCard title="By criticality">
          <Bar
            data={{
              labels: byCriticality.map((g) => g.name),
              datasets: [{ data: byCriticality.map((g) => g.value), backgroundColor: "#6366f1", borderRadius: 6 }],
            }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
          />
        </ChartCard>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Identities ({rows.length})</h2>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[38%]" />
              {TABLE_COLUMNS.slice(1).map((col) => (
                <col key={col.key} />
              ))}
              <col className="w-[4.5rem]" />
            </colgroup>
            <thead className="bg-slate-50">
              <tr>
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 align-top text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-normal break-words"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-[4.5rem] px-3 py-2.5 align-top text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length + 1} className="px-4 py-8 text-center text-sm text-slate-500">
                    No identities found.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const nhiId = cellText(r.nhi_id);
                  return (
                    <tr key={nhiId} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2 align-top font-medium text-slate-900 whitespace-normal break-words">
                        <Link
                          href={`/non-human-identity-2/nhis/${encodeURIComponent(nhiId)}`}
                          className="text-blue-700 hover:underline break-words"
                        >
                          {cellText(r.name)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{cellText(r.nhi_type)}</td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{cellText(r.state)}</td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{cellText(r.risk_level)}</td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{cellText(r.criticality)}</td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{cellText(r.execution_type)}</td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{cellText(r.review_status)}</td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{cellText(r.load_source)}</td>
                      <td className="px-3 py-2 align-top text-slate-700 whitespace-normal break-words">{formatCreated(r.createddate)}</td>
                      <td className="px-3 py-2 align-top">
                        <Link
                          href={`/non-human-identity-2/nhis/${encodeURIComponent(nhiId)}`}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span>
              Showing {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, rows.length)} of {rows.length}{" "}
              · page {pageSafe} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-200 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="h-[240px]">{children}</div>
    </div>
  );
}
