"use client";

import React, { useEffect, useState, useCallback } from "react";
import { executeQuery } from "@/lib/api";
import dynamic from "next/dynamic";
import { ColDef, GridApi } from "ag-grid-community";
import { ChevronRight } from "lucide-react";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import "@/lib/ag-grid-setup";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

type HistoryRow = Record<string, any>;

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

function IdentitySidebarSection({ identityId }: { identityId: string }) {
  const [details, setDetails] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = `Select * from ag_identities where id='${identityId}'`;
        const response = await executeQuery<any>(query, []);
        let data: any[] = [];
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
            data = [response as Record<string, any>];
          }
        }
        if (!cancelled) {
          setDetails(data[0] || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load identity details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [identityId]);

  const getField = (row: any, candidates: string[]): string => {
    if (!row) return "";
    const deepGet = (obj: any, path: string): any => {
      if (!obj || !path) return undefined;
      const parts = path.split(".");
      let current = obj;
      for (const part of parts) {
        if (current == null) return undefined;
        if (!Number.isNaN(Number(part))) {
          const idx = Number(part);
          current = Array.isArray(current) ? current[idx] : undefined;
        } else {
          current = current[part];
        }
      }
      return current;
    };

    for (const key of candidates) {
      if (key.includes(".")) {
        const v = deepGet(row, key);
        if (v !== undefined && v !== null && v !== "") return String(v);
      }
    }
    const containers: any[] = [
      row,
      (row as any).payload,
      (row as any).payload?.value,
      (row as any).payload?.value?.customAttributes,
    ].filter(Boolean);
    for (const container of containers) {
      const keys = Object.keys(container);
      for (const key of candidates) {
        if (!key || key.includes(".")) continue;
        if (container[key] !== undefined && container[key] !== null) {
          return String(container[key]);
        }
      }
      for (const key of candidates) {
        if (!key || key.includes(".")) continue;
        const lowerTarget = key.toLowerCase();
        const actualKey = keys.find((rk) => rk.toLowerCase() === lowerTarget);
        if (
          actualKey &&
          container[actualKey] !== undefined &&
          container[actualKey] !== null
        ) {
          return String(container[actualKey]);
        }
      }
    }
    return "";
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          User details
        </h3>
        {loading && (
          <p className="mt-1 text-xs text-gray-500">Loading identity details…</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {!loading && !error && details && (
          <dl className="mt-2 grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)] gap-x-4 gap-y-2 text-xs">
            <div className="contents">
              <dt className="font-medium text-gray-500">FirstName</dt>
              <dd className="text-gray-900 text-right break-words">
                {getField(details, [
                  "payload.value.name.givenName",
                  "payload.value.customAttributes.USR_UDF_FIRST_NAME_PRF",
                  "givenName",
                  "FirstName",
                  "first_name",
                  "firstName",
                ]) || "—"}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-gray-500">LastName</dt>
              <dd className="text-gray-900 text-right break-words">
                {getField(details, [
                  "payload.value.name.familyName",
                  "familyName",
                  "LastName",
                  "last_name",
                  "lastName",
                ]) || "—"}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-gray-500">Primary Email</dt>
              <dd className="text-gray-900 text-right break-words">
                {getField(details, [
                  "payload.value.customAttributes.USR_UDF_DIR_EMAIL",
                  "payload.value.emails.0.value",
                  "PrimaryEmail",
                  "primary_email",
                  "primaryEmail",
                  "email",
                  "mail",
                ]) || "—"}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-gray-500">AGSubType</dt>
              <dd className="text-gray-900 text-right break-words">
                {getField(details, [
                  "payload.value.agSubType",
                  "payload.value.userType",
                  "AGSubType",
                  "ag_sub_type",
                  "agsubtype",
                  "userType",
                ]) || "—"}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-gray-500">USR_UDF_AFF_PRI</dt>
              <dd className="text-gray-900 text-right break-words">
                {getField(details, [
                  "payload.value.customAttributes.USR_UDF_AFF_PRI",
                  "payload.value.customAttributes.USR_UDF_AFF_PRI_EMPSTU_TYP",
                  "USR_UDF_AFF_PRI",
                  "usr_udf_aff_pri",
                  "primaryAffiliation",
                  "affiliation",
                ]) || "—"}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-gray-500">usr_udf_dir_status</dt>
              <dd className="text-gray-900 text-right break-words">
                {getField(details, [
                  "payload.value.customAttributes.USR_UDF_DIR_STATUS",
                  "usr_udf_dir_status",
                  "USR_UDF_DIR_STATUS",
                  "campusStatus",
                  "status",
                ]) || "—"}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-gray-500">usr_udf_dir_email</dt>
              <dd className="text-gray-900 text-right break-words">
                {getField(details, [
                  "payload.value.customAttributes.USR_UDF_DIR_EMAIL",
                  "usr_udf_dir_email",
                  "USR_UDF_DIR_EMAIL",
                  "directoryEmail",
                ]) || "—"}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

function AccessBundleSidebarContent({ bundleId }: { bundleId: string }) {
  const [bundle, setBundle] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await executeQuery<any>(
          `Select * from ag_accessbundles_permissions where id='${bundleId}'`,
          []
        );
        let first: any = null;
        if (Array.isArray(response)) {
          first = response[0];
        } else if (response && typeof response === "object") {
          if (Array.isArray(response.resultSet)) {
            first = response.resultSet[0];
          } else {
            first = response;
          }
        }
        if (!first || typeof first !== "object") {
          if (!cancelled) setBundle(null);
          return;
        }
        const payload = (first as any).payload;
        const p = payload && typeof payload === "object" ? payload : first;
        if (!cancelled) setBundle(p);
      } catch (err: any) {
        if (!cancelled)
          setError(err?.message || "Failed to load access bundle details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [bundleId]);

  const b = bundle;

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-gray-200 px-3 py-2.5">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          Access bundle
        </h3>
        {loading && (
          <p className="mt-1 text-xs text-gray-500">
            Loading access bundle details…
          </p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {!loading && !error && b && (
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Name</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.name ?? b.displayName ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Description</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.description ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">CreatedBy</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.createdBy?.displayName ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">requestableBy</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.requestableBy?.displayName ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Status</dt>
              <dd className="text-gray-900 text-right">
                {b.status ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Approval Workflow</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.approvalWorkflowId?.displayName ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Orchestrated System</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.orchestratedSystem?.displayName ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">owners</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.owners?.[0]?.name ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">resourceType</dt>
              <dd className="text-gray-900 text-right break-words">
                {b.customAttributes?.resourceType ?? b.resourceType ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">
                Auto-approve if no violation
              </dt>
              <dd className="text-gray-900 text-right">
                {String(
                  b.autoApproveIfNoViolation ?? "—"
                )}
              </dd>
            </div>
            {b.accessTimeLimitType !== "INDEFINITELY" && (
              <div className="flex justify-between gap-4">
                <dt className="text-xs font-medium text-gray-500">
                  accessTimeLimit
                </dt>
                <dd className="text-xs text-gray-900 text-right">
                  {b.accessTimeLimit ?? "—"}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-xs font-medium text-gray-500">
                permission resource
              </dt>
              <dd className="text-xs text-gray-900 text-right break-words">
                {b.permissions?.[0]?.resource?.name ??
                  b.permissions?.[0]?.resource?.displayName ??
                  "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-xs font-medium text-gray-500">
                permission type
              </dt>
              <dd className="text-xs text-gray-900 text-right">
                {b.permissions?.[0]?.type ?? b.permissions?.[0]?.permissionType ?? "—"}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

export default function UserAccessHistoryReportPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const { openSidebar } = useRightSidebar();

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
      if (lower.includes("target") && lower.includes("account") && lower.includes("id")) return false;
      // Fallbacks for slightly different naming
      if (lower.includes("global") && lower.includes("ocid")) return false;
      if (lower.includes("access") && lower.includes("bundle")) return false;
      return true;
    });
  }, [rows]);

  const getAssignmentType = useCallback((row: HistoryRow | null) => {
    if (!row) return "";
    const raw =
      row["assignmentType"] ??
      row["assignment_type"] ??
      row["assignmenttype"] ??
      row["assignment type"] ??
      row["Type"] ??
      row["type"];

    const text =
      typeof raw === "string" ? raw.trim() : String(raw ?? "");

    // Normalise Access Bundle type so we can check consistently
    if (/access\s*bundle/i.test(text)) {
      return "ACCESS_BUNDLE";
    }

    return text;
  }, []);

  const getAccessBundleIdFromRow = useCallback(
    (row: HistoryRow | null): string | null => {
      if (!row) return null;

      // 1) Prefer explicit "Access Bundle ID" style fields on the row
      const keys = Object.keys(row);
      const accessBundleKey = keys.find((k) => {
        const lower = k.toLowerCase();
        return (
          lower.includes("access") &&
          lower.includes("bundle") &&
          lower.includes("id")
        );
      });
      if (accessBundleKey && row[accessBundleKey]) {
        return String(row[accessBundleKey]);
      }

      // 2) Fallback to payload.accessBundles[0].id if present
      const payload = (row as any)?.payload;
      const accessBundles =
        payload && Array.isArray(payload.accessBundles)
          ? payload.accessBundles
          : null;
      if (accessBundles && accessBundles.length) {
        const bundleId = accessBundles[0]?.id;
        if (bundleId) return String(bundleId);
      }

      return null;
    },
    []
  );

  const getIdentityIdFromRow = (row: HistoryRow): string | null => {
    if (!row) return null;
    const keys = Object.keys(row);
    // Prefer explicit Global User OCID-style fields
    let key =
      keys.find((k) => k.toLowerCase().includes("global_user_ocid")) ||
      keys.find(
        (k) => k.toLowerCase().includes("global") && k.toLowerCase().includes("ocid")
      ) ||
      keys.find((k) => k.toLowerCase() === "id");

    if (key && row[key]) {
      return String(row[key]);
    }
    return null;
  };

  const getDisplayNameFromRow = useCallback((row: HistoryRow | null): string => {
    if (!row) return "";
    const entries = Object.entries(row);
    const match = entries.find(([k, v]) => {
      const norm = k.toLowerCase().replace(/\s+/g, "");
      return norm === "displayname" && v !== undefined && v !== null && v !== "";
    });
    return match ? String(match[1]) : "";
  }, []);

  const columnDefs = React.useMemo<ColDef[]>(() => {
    const defs: ColDef[] = columns.map((col) => {
      const lower = col.toLowerCase();
      const isAccessDate =
        lower.includes("access") && lower.includes("date");
      const isApplicationCol = lower.includes("application");
      const isDisplayNameCol =
        lower.includes("display") && lower.includes("name");
      const isUserLoginCol =
        lower.includes("user") && lower.includes("login");
      const isActionCol = lower.includes("action");
      const isPermissionNameCol =
        lower.includes("permission") && lower.includes("name");

      const colDef: ColDef = {
        headerName: col,
        field: col,
        valueGetter: (params: any) =>
          params.data ? formatCell(params.data[col], col) : "",
        flex: isApplicationCol || isUserLoginCol || isActionCol
          ? 0
          : isAccessDate
          ? 0
          : 1,
        width: isDisplayNameCol
          ? 220
          : isPermissionNameCol
          ? 280
          : isUserLoginCol
          ? 140
          : isActionCol
          ? 140
          : isApplicationCol
          ? 120
          : isAccessDate
          ? 160
          : undefined,
        minWidth: isDisplayNameCol
          ? 200
          : isPermissionNameCol
          ? 240
          : isUserLoginCol
          ? 120
          : isActionCol
          ? 120
          : isApplicationCol
          ? 110
          : isAccessDate
          ? 140
          : 120,
        sortable: true,
        filter: true,
        resizable: true,
      };

      if (isDisplayNameCol) {
        colDef.valueGetter = (params: any) => {
          const row = params.data as HistoryRow;
          const fromRow = getDisplayNameFromRow(row);
          return fromRow || (row ? formatCell(row[col], col) : "");
        };
        colDef.cellRenderer = (params: any) => {
          const row = params.data as HistoryRow;
          const display = getDisplayNameFromRow(row);
          if (!display) return "";
          const identityId = getIdentityIdFromRow(row);
          const assignmentType = getAssignmentType(row);
          const bundleId = getAccessBundleIdFromRow(row);
          return (
            <button
              type="button"
              className="text-blue-600 underline hover:text-blue-800"
              onClick={() => {
                openSidebar(
                  <div className="space-y-4">
                    {identityId ? (
                      <IdentitySidebarSection identityId={identityId} />
                    ) : (
                      <div className="text-xs text-gray-500">
                        No identity details available for this record.
                      </div>
                    )}
                    {bundleId && assignmentType === "ACCESS_BUNDLE" && (
                      <AccessBundleSidebarContent bundleId={bundleId} />
                    )}
                  </div>,
                  { title: "Row details", widthPx: 480 }
                );
              }}
            >
              {display}
            </button>
          );
        };
      }

      return colDef;
    });

    // Add trailing arrow column to open sidebar with identity and access bundle details
    defs.push({
      headerName: "",
      field: "expand",
      flex: 0,
      width: 56,
      minWidth: 56,
      maxWidth: 56,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const row = params.data as HistoryRow;
        const identityId = getIdentityIdFromRow(row);
        return (
          <button
            type="button"
            className="flex items-center justify-center w-full h-full min-h-[32px] text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            onClick={() => {
              const assignmentType = getAssignmentType(row);
              const bundleId = getAccessBundleIdFromRow(row);
              openSidebar(
                <div className="space-y-4">
                  {identityId ? (
                    <IdentitySidebarSection identityId={identityId} />
                  ) : (
                    <div className="text-xs text-gray-500">
                      No identity details available for this record.
                    </div>
                  )}
                  {bundleId && assignmentType === "ACCESS_BUNDLE" && (
                    <AccessBundleSidebarContent bundleId={bundleId} />
                  )}
                </div>,
                { title: "Row details", widthPx: 480 }
              );
            }}
            title="View details"
          >
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        );
      },
    } as ColDef);

    return defs;
  }, [columns, openSidebar, getAssignmentType, getAccessBundleIdFromRow, getIdentityIdFromRow]);

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

function formatDateTime(value: any): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return typeof value === "string" ? value : String(value ?? "");
  }
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yy = pad(date.getFullYear() % 100);
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yy}/${MM}/${dd} ${hh}:${mm}`;
}

function formatCell(value: any, key?: string): string {
  if (key) {
    const lowerKey = key.toLowerCase();
    const isDateLike =
      lowerKey.includes("date") ||
      lowerKey.includes("time") ||
      lowerKey.includes("timestamp");
    if (isDateLike) {
      return formatDateTime(value);
    }
  }

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

