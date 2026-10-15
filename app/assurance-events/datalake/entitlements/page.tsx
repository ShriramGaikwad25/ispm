"use client";

// =====================================================================
// Datalake › Entitlements — IIQ entitlements from the datalake via the
// entities service's named query GET_IIQ_ALL_ENTITLEMENTS
// (POST /entities/api/v1/ACMECOM/executeNamedQuery, parameters [pageSize, page]).
// The global fetch patch (lib/authFetch.ts) adds the bearer token and X-Tenant-Id.
// Columns are taken from the rows themselves.
// =====================================================================

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import {
  BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER_FLUSH, PageHeader, PageSpinner, Spinner,
  TBODY, TD, TH, THEAD_ROW, cx,
} from "@/components/assurance-events/ui";

const NAMED_QUERY_URL = "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeNamedQuery";
const PAGE_SIZES = [25, 50, 100, 250];

type Row = Record<string, unknown>;

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

/** The entities service answers with a bare array or wraps it in resultSet / rows / data. */
function extractRows(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["resultSet", "rows", "data", "items", "content"]) {
      if (Array.isArray(o[key])) return o[key] as Row[];
    }
  }
  return [];
}

async function fetchEntitlements(pageSize: number, page: number): Promise<Row[]> {
  const res = await fetch(NAMED_QUERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "GET_IIQ_ALL_ENTITLEMENTS", parameters: [pageSize, page] }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data && typeof data === "object" ? (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).message : null;
    throw new Error(msg ? String(msg) : `Request failed: ${res.status}`);
  }
  return extractRows(data);
}

/** "app_name" / "appName" → "App Name" */
const columnLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase());

function cellText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DatalakeEntitlementsPage() {
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["datalake", "iiq-entitlements", pageSize, page],
    queryFn: () => fetchEntitlements(pageSize, page),
  });
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const columns = useMemo(() => {
    const keys: string[] = [];
    rows.forEach((r) => Object.keys(r).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
    return keys;
  }, [rows]);

  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () => (term ? rows.filter((r) => columns.some((c) => cellText(r[c]).toLowerCase().includes(term))) : rows),
    [rows, columns, term],
  );

  const hasNext = rows.length >= pageSize;

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
        <PageHeader
          title="Entitlements"
          subtitle="IIQ entitlements held in the Assurance Events datalake."
          actions={
            <button type="button" className={BTN_SECONDARY} onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={cx("h-4 w-4", q.isFetching && "animate-spin")} /> Refresh
            </button>
          }
        />

        <div className={CARD}>
          <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={CARD_TITLE}>IIQ Entitlements</div>
              <div className={CARD_SUBTITLE}>
                Page {page} · {visible.length}{term ? ` of ${rows.length}` : ""} row{visible.length === 1 ? "" : "s"}
              </div>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this page…"
              className={cx(FILTER_INPUT, "w-64")}
              aria-label="Search entitlements on this page"
            />
          </div>

          {q.isLoading ? (
            <PageSpinner />
          ) : q.error ? (
            <div className="p-5 text-sm text-red-600">
              Could not load entitlements: {q.error instanceof Error ? q.error.message : String(q.error)}
            </div>
          ) : visible.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">{term ? "No entitlements match the search." : "No entitlements found."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={THEAD_ROW}>
                    {columns.map((c) => <th key={c} className={cx(TH, "whitespace-nowrap")}>{columnLabel(c)}</th>)}
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {visible.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {columns.map((c) => (
                        <td key={c} className={cx(TD, "max-w-xs truncate")} title={cellText(r[c])}>{cellText(r[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className={cx(FILTER_INPUT, "py-1")}
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-2">
              {q.isFetching && !q.isLoading && <Spinner />}
              <button type="button" className={BTN_SECONDARY} onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || q.isFetching}>
                Previous
              </button>
              <span>Page {page}</span>
              <button type="button" className={BTN_SECONDARY} onClick={() => setPage((p) => p + 1)} disabled={!hasNext || q.isFetching}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
