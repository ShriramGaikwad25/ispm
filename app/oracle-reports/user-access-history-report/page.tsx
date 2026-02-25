"use client";

import React, { useEffect, useState } from "react";
import { executeQuery } from "@/lib/api";
import dynamic from "next/dynamic";
import { ColDef, GridApi } from "ag-grid-community";
import "@/lib/ag-grid-setup";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

type HistoryRow = Record<string, any>;

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

export default function UserAccessHistoryReportPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  useEffect(() => {
    const runQuery = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await executeQuery<any>(
          "SELECT * FROM ag_user_access_history",
          []
        );

        let data: HistoryRow[] = [];

        if (Array.isArray(response)) {
          data = response;
        } else if (response && typeof response === "object") {
          const possibleKeys = [
            "resultSet",
            "data",
            "items",
            "rows",
            "results",
            "records",
            "value",
            "values",
          ];
          for (const key of possibleKeys) {
            const v = (response as any)[key];
            if (Array.isArray(v)) {
              data = v;
              break;
            }
          }
          if (!data.length) {
            data = [response as HistoryRow];
          }
        }

        setRows(data);
      } catch (err: any) {
        console.error("Failed to load user access history report:", err);
        setError(err?.message || "Failed to load user access history");
      } finally {
        setLoading(false);
      }
    };

    runQuery();
  }, []);

  const columns = React.useMemo(() => {
    if (!rows.length) return [] as string[];
    const keys = new Set<string>();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
    // Hide verification-related technical columns and a few sensitive columns
    return Array.from(keys).filter((k) => {
      const lower = k.toLowerCase();
      if (lower.includes("verif")) return false;
      if (lower.includes("global_user_ocid")) return false;
      if (lower.includes("access_bundle_id")) return false;
      // Fallbacks for slightly different naming
      if (lower.includes("global") && lower.includes("ocid")) return false;
      if (lower.includes("access") && lower.includes("bundle")) return false;
      return true;
    });
  }, [rows]);

  const columnDefs = React.useMemo<ColDef[]>(() => {
    return columns.map((col) => {
      const lower = col.toLowerCase();
      const isAccessDate =
        lower.includes("access") && lower.includes("date");
      const isApplicationCol = lower.includes("application");

      return {
        headerName: col,
        field: col,
        valueGetter: (params: any) =>
          params.data ? formatCell(params.data[col]) : "",
        flex: isAccessDate || isApplicationCol ? 0 : 1,
        width: isApplicationCol ? 120 : isAccessDate ? 160 : undefined,
        minWidth: isApplicationCol ? 110 : isAccessDate ? 140 : 120,
        sortable: true,
        filter: true,
        resizable: true,
      } as ColDef;
    });
  }, [columns]);

  const defaultColDef = React.useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 100,
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full py-4 px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            User Access History Report
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Review historical access changes for users across applications.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">
            Loading user access history…
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="text-sm text-gray-500">No data returned.</p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="mt-2">
            <div className="ag-theme-alpine w-full">
              <AgGridReact
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                theme="legacy"
                pagination={true}
                paginationPageSize={20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                animateRows={true}
                domLayout="autoHeight"
                onGridReady={(params: any) => {
                  setGridApi(params.api);
                  const allColumnIds: string[] = [];
                  const cols = params.columnApi?.getColumns?.() || [];
                  cols.forEach((col: any) => {
                    if (col && col.getColId) {
                      allColumnIds.push(col.getColId());
                    }
                  });
                  if (allColumnIds.length) {
                    params.columnApi.autoSizeColumns(allColumnIds);
                  }
                }}
                onFirstDataRendered={(params: any) => {
                  const allColumnIds: string[] = [];
                  const cols = params.columnApi?.getColumns?.() || [];
                  cols.forEach((col: any) => {
                    if (col && col.getColId) {
                      allColumnIds.push(col.getColId());
                    }
                  });
                  if (allColumnIds.length) {
                    params.columnApi.autoSizeColumns(allColumnIds);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCell(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

