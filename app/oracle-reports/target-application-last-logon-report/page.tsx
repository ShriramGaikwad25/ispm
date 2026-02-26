"use client";

import React, { useEffect, useState } from "react";
import { executeQuery } from "@/lib/api";
import dynamic from "next/dynamic";
import { ColDef, GridApi } from "ag-grid-community";
import "@/lib/ag-grid-setup";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

type LastLogonRow = Record<string, any>;

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

export default function TargetApplicationLastLogonReportPage() {
  const [rows, setRows] = useState<LastLogonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  useEffect(() => {
    const runQuery = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await executeQuery<any>(
          "SELECT * FROM ag_target_last_login",
          []
        );

        let data: LastLogonRow[] = [];

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
            data = [response as LastLogonRow];
          }
        }

        setRows(data);
      } catch (err: any) {
        console.error("Failed to load target application last logon report:", err);
        setError(err?.message || "Failed to load target application last logon report");
      } finally {
        setLoading(false);
      }
    };

    runQuery();
  }, []);

  const formatDateTime = (value: any): string => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return typeof value === "string" ? value : "";
    }
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yy = pad(date.getFullYear() % 100);
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${yy}/${MM}/${dd} ${hh}:${mm}`;
  };

  const formatCell = (key: string, value: any): string => {
    if (value === null || value === undefined) return "";

    const lowerKey = key.toLowerCase();
    const looksLikeDate =
      lowerKey.includes("date") ||
      lowerKey.includes("time") ||
      lowerKey.includes("timestamp") ||
      lowerKey.includes("last_login") ||
      lowerKey.includes("lastlogon") ||
      lowerKey.includes("last_logon");

    if (looksLikeDate) {
      return formatDateTime(value);
    }

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const PREFERRED_COLUMN_ORDER = [
    "display_name",
    "AGUserName",
    "Application",
    "application_userName",
    "last_login_time",
  ] as const;

  const columns = React.useMemo(() => {
    if (!rows.length) return [] as string[];
    const keys = new Set<string>();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
    const filtered = Array.from(keys).filter((k) => {
      const lower = k.toLowerCase().replace(/\s+/g, "");
      if (lower === "target_identity_id" || lower === "targetidentityid") return false;
      if (lower === "global_identity_id" || lower === "globalidentityid") return false;
      return true;
    });
    const normalized = (key: string) => key.toLowerCase().replace(/\s+/g, "_");
    const ordered: string[] = [];
    for (const preferred of PREFERRED_COLUMN_ORDER) {
      const match = filtered.find((k) => normalized(k) === preferred.toLowerCase().replace(/\s+/g, "_"));
      if (match) {
        ordered.push(match);
      }
    }
    for (const k of filtered) {
      if (!ordered.includes(k)) ordered.push(k);
    }
    return ordered;
  }, [rows]);

  const toTitleCase = (value: string): string =>
    value
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));

  const getHeaderName = (col: string): string => {
    const normalized = col.toLowerCase().replace(/_/g, "");
    if (normalized === "displayname") return "Display Name";
    if (normalized === "agusername") return "AG User Name";
    if (normalized === "applicationusername") return "Application User Name";
    if (normalized === "lastlogintime" || normalized === "lastlogin")
      return "Last Login Time";
    return toTitleCase(col);
  };

  const columnDefs = React.useMemo<ColDef[]>(() => {
    return columns.map((col) => {
      const lower = col.toLowerCase();
      const normalized = lower.replace(/_/g, "");
      const isApplicationUserName = normalized === "applicationusername";
      const isApplicationCol = lower.includes("application");
      const isLastLoginTime =
        normalized === "lastlogintime" || normalized === "lastlogin";

      return {
        headerName: getHeaderName(col),
        field: col,
        valueGetter: (params: any) =>
          params.data ? formatCell(col, params.data[col]) : "",
        flex: isApplicationUserName || isLastLoginTime || isApplicationCol ? 0 : 1,
        width: isApplicationUserName
          ? 220
          : isLastLoginTime
          ? 140
          : isApplicationCol
          ? 120
          : undefined,
        minWidth: isApplicationUserName
          ? 200
          : isLastLoginTime
          ? 110
          : isApplicationCol
          ? 110
          : 120,
        sortable: true,
        filter: true,
        resizable: true,
        wrapText: true,
        autoHeight: true,
        cellStyle: {
          whiteSpace: "normal",
          wordBreak: "break-word",
          lineHeight: 1.4,
        },
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
      wrapText: true,
      autoHeight: true,
      cellStyle: {
        whiteSpace: "normal",
        wordBreak: "break-word",
        lineHeight: 1.4,
      },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full py-4 px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Last Login Report - Application
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            View last login timestamps for Oracle target application accounts to
            identify inactive or stale access.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">
            Loading target application last logon data…
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
                  params.api.sizeColumnsToFit();
                }}
                onFirstDataRendered={(params: any) => {
                  params.api.sizeColumnsToFit();
                }}
              />
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        .ag-theme-alpine .ag-header-cell-label .ag-header-cell-text {
          white-space: normal !important;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
}

