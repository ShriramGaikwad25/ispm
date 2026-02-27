"use client";

import React, { useEffect, useState } from "react";
import { executeQuery } from "@/lib/api";
import dynamic from "next/dynamic";
import { ColDef, GridApi } from "ag-grid-community";
import { ChevronDown } from "lucide-react";
import "@/lib/ag-grid-setup";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

type GuardrailRow = Record<string, any>;

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

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

export default function AccessGuardrailReportPage() {
  const [rows, setRows] = useState<GuardrailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [openRuleRowIds, setOpenRuleRowIds] = useState<string[]>([]);

  useEffect(() => {
    const runQuery = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await executeQuery<any>(
          "Select * from ag_accessguardrails_report",
          []
        );

        let rawData: GuardrailRow[] = [];

        if (Array.isArray(response)) {
          rawData = response;
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
              rawData = v;
              break;
            }
          }
          if (!rawData.length) {
            rawData = [response as GuardrailRow];
          }
        }

        const data: GuardrailRow[] = rawData.map((row) => {
          const payload = (row as any).payload;
          if (typeof payload === "string") {
            try {
              const parsed = JSON.parse(payload);
              return {
                ...parsed,
                _rowId: (row as any).id ?? parsed.id,
              } as GuardrailRow;
            } catch {
              return row;
            }
          }
          if (payload && typeof payload === "object") {
            return {
              ...(payload as any),
              _rowId: (row as any).id ?? (payload as any).id,
            } as GuardrailRow;
          }
          return row;
        });

        setRows(data);
      } catch (err: any) {
        console.error("Failed to load access guardrail report:", err);
        setError(err?.message || "Failed to load access guardrail report");
      } finally {
        setLoading(false);
      }
    };

    runQuery();
  }, []);

  const displayRows = React.useMemo(() => {
    const result: GuardrailRow[] = [];
    rows.forEach((row) => {
      const baseId = String(
        (row as any)._rowId ?? (row as any).id ?? (row as any).name ?? ""
      );
      const baseRow: GuardrailRow = { ...row, _isDetail: false };
      result.push(baseRow);
      if (openRuleRowIds.includes(baseId)) {
        result.push({
          _isDetail: true,
          _parentId: baseId,
          _rowId: `detail-${baseId}`,
          name: (row as any).name,
          rules: (row as any).rules,
          actionOnFailure: (row as any).actionOnFailure,
        } as GuardrailRow);
      }
    });
    return result;
  }, [rows, openRuleRowIds]);

  const columnDefs = React.useMemo<ColDef[]>(() => {
    const defs: ColDef[] = [
      {
        headerName: "Name",
        field: "name",
        minWidth: 160,
        flex: 1.2,
        valueGetter: (params: any) =>
          params.data?._isDetail
            ? ""
            : formatCell(
                params.data?.name ?? params.data?.displayName,
                "name"
              ),
        cellRenderer: (params: any) => {
          const data = params.data as GuardrailRow;
          if (!data?._isDetail) {
            return params.value;
          }

          const rawRules = (data as any)?.rules;
          let rules: any[] = [];
          if (Array.isArray(rawRules)) {
            rules = rawRules;
          } else if (
            rawRules &&
            typeof rawRules === "object" &&
            Array.isArray(rawRules.items)
          ) {
            rules = rawRules.items;
          }
          const actionOnFailure: any = (data as any)?.actionOnFailure;

          const buildConditionStatement = (cond: any): string | null => {
            if (!cond) return null;
            const type = cond.type;
            const bc = cond.basicCondition || {};
            const add = cond.additionalAttributes || {};
            const opCode = String(bc.operator || "").toUpperCase();
            const opText =
              opCode === "EQ"
                ? "Equals"
                : opCode === "CONTAINS"
                ? "Contains"
                : opCode || "";

            if (type === "DOES_NOT_HAVE_PERMISSION") {
              return `If User does not have permission ${opText} name: ${
                bc.displayName ?? ""
              }, permissionTypeLabel: ${
                add.permissionTypeLabel ?? ""
              } of resource ${add.connectedSystemLabel ?? ""}`;
            }

            if (type === "PERMISSION") {
              return `If User permission ${opText} name: ${
                bc.displayName ?? ""
              }, type: ${add.permissionTypeLabel ?? ""} of resource name: ${
                add.connectedSystemLabel ?? ""
              }`;
            }

            if (type === "IDENTITY_ATTRIBUTE") {
              const rhsArr = Array.isArray(bc.rhs) ? bc.rhs : [bc.rhs];
              const rhsVal =
                rhsArr && rhsArr.length ? rhsArr[0] : undefined;
              return `If User's ${bc.displayName ?? ""} ${opText} ${
                rhsVal ?? ""
              }`;
            }

            return null;
          };

          const policyLines: string[] = [];
          rules.forEach((rule: any) => {
            const conds: any[] = Array.isArray(rule?.conditions?.items)
              ? rule.conditions.items
              : [];
            const condStmts = conds
              .map(buildConditionStatement)
              .filter((x): x is string => !!x);
            if (!condStmts.length) return;
            const joiner = (rule.operator || "AND").toUpperCase();
            const joined =
              condStmts.length === 1
                ? condStmts[0]
                : condStmts.map((s) => `(${s})`).join(` ${joiner} `);
            policyLines.push(joined);
          });

          const risk = actionOnFailure?.risk;
          const days =
            actionOnFailure?.revokeLaterAfterNumberOfDays ?? null;
          let onViolation = "";
          if (risk === "LOW" && days != null) {
            onViolation = `Access will be removed after ${days} days.`;
          } else if (risk === "HIGH") {
            onViolation = "Access request will be blocked.";
          } else if (risk) {
            onViolation = `Risk level ${risk}.`;
          }

          if (!rules.length && !policyLines.length) {
            return (
              <div className="px-4 py-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                  No rules available for this guardrail.
                </div>
              </div>
            );
          }

          return (
            <div className="px-4 py-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="space-y-2 text-xs text-gray-900">
                  {policyLines.length > 0 && (
                    <div>
                      <span className="font-semibold">
                        Policy Statement
                      </span>
                      <ul className="list-disc pl-5 space-y-0.5 mt-1">
                        {policyLines.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(actionOnFailure?.actionType || onViolation) && (
                    <div className="pt-1 border-t border-gray-200 mt-1">
                      <div className="font-semibold mb-0.5">Then</div>
                      <div>
                        {actionOnFailure?.actionType
                          ? actionOnFailure.actionType
                          : "Action configured for this guardrail."}
                      </div>
                      {onViolation && (
                        <div className="mt-1">
                          <span className="font-semibold">
                            On Violation:&nbsp;
                          </span>
                          <span>{onViolation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        },
        colSpan: (params: any) =>
          params.data?._isDetail
            ? 8 // span all visible columns
            : 1,
      },
      {
        headerName: "Description",
        field: "description",
        minWidth: 200,
        valueGetter: (params: any) =>
          params.data?._isDetail
            ? ""
            : formatCell(params.data?.description, "description"),
      },
      {
        headerName: "Time Created",
        field: "timeCreated",
        minWidth: 140,
        valueGetter: (params: any) =>
          params.data?._isDetail
            ? ""
            : formatDateTime(
                params.data?.timeCreated ??
                  params.data?.createdTime ??
                  params.data?.created_at ??
                  params.data?.createdAt
              ),
      },
      {
        headerName: "Lifecycle State",
        field: "lifecycleState",
        minWidth: 130,
        valueGetter: (params: any) =>
          params.data?._isDetail
            ? ""
            : formatCell(params.data?.lifecycleState ?? params.data?.status),
      },
      {
        headerName: "Active On",
        field: "activeOn",
        minWidth: 160,
        valueGetter: (params: any) => {
          if (params.data?._isDetail) return "";
          const v = params.data?.isDetectiveViolationCheckEnabled;
          if (v === true) return "New request and Existing Access";
          if (v === false) return "New Access request";
          return "";
        },
      },
      {
        headerName: "Owner",
        field: "primaryOwnerDisplayName",
        minWidth: 160,
        valueGetter: (params: any) =>
          params.data?._isDetail
            ? ""
            : formatCell(
                params.data?.primaryOwnerDisplayName ??
                  params.data?.primaryOwner?.displayName ??
                  params.data?.primaryOwner?.name ??
                  params.data?.owner?.displayName ??
                  params.data?.owner?.name,
                "owner"
              ),
      },
      {
        headerName: "Created By",
        field: "createdBy",
        minWidth: 150,
        valueGetter: (params: any) =>
          params.data?._isDetail
            ? ""
            : formatCell(
                params.data?.createdBy?.displayName ??
                  params.data?.createdBy?.name ??
                  params.data?.created_by?.display_name ??
                  params.data?.created_by?.name,
                "createdBy"
              ),
      },
      {
        headerName: "Rules",
        field: "rules",
        minWidth: 120,
        cellRenderer: (params: any) => {
          const row = params.data as GuardrailRow;
          if (row?._isDetail) return null;
          const id = String(
            (row as any)._rowId ?? (row as any).id ?? (row as any).name ?? ""
          );
          const isOpen = openRuleRowIds.includes(id);
          const rules: any[] = Array.isArray(row?.rules) ? row.rules : [];
          return (
            <div>
              <button
                type="button"
                className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:text-blue-600 hover:border-blue-400 bg-white"
                onClick={() => {
                  setOpenRuleRowIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((x) => x !== id)
                      : [...prev, id]
                  );
                }}
              >
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            </div>
          );
        },
      },
    ];

    return defs.map((def) => ({
      ...def,
      flex: def.flex ?? 1,
      sortable: def.sortable ?? true,
      filter: def.filter ?? true,
      resizable: def.resizable ?? true,
      wrapText: true,
      autoHeight: true,
      cellStyle: {
        whiteSpace: "normal",
        wordBreak: "break-word",
        lineHeight: 1.4,
      },
    }));
  }, [openRuleRowIds]);

  const defaultColDef = React.useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 80,
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
            Access GuardRail Report
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            View Access GuardRail policies, violations, and evaluations.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">
            Loading access guardrail data…
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
                rowData={displayRows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                theme="legacy"
                getRowHeight={(params: any) => {
                  const data = params?.data as GuardrailRow | undefined;
                  if (data?._isDetail) {
                    const rawRules = (data as any)?.rules;
                    let rules: any[] = [];
                    if (Array.isArray(rawRules)) {
                      rules = rawRules;
                    } else if (
                      rawRules &&
                      typeof rawRules === "object" &&
                      Array.isArray(rawRules.items)
                    ) {
                      rules = rawRules.items;
                    }
                    const firstRule = rules[0];
                    const condCount = Array.isArray(
                      firstRule?.conditions?.items
                    )
                      ? firstRule.conditions.items.length
                      : 0;
                    // More conditions → taller box
                    if (condCount >= 2) return 320;
                    return 260;
                  }
                  return 52;
                }}
                isFullWidthRow={(params: any) =>
                  params?.rowNode?.data?._isDetail === true
                }
                fullWidthCellRenderer={(params: any) => {
                  const data = params.data as GuardrailRow;
                  const rawRules = (data as any)?.rules;
                  let rules: any[] = [];
                  if (Array.isArray(rawRules)) {
                    rules = rawRules;
                  } else if (
                    rawRules &&
                    typeof rawRules === "object" &&
                    Array.isArray(rawRules.items)
                  ) {
                    rules = rawRules.items;
                  }

                  const actionOnFailure: any = (data as any)?.actionOnFailure;

                  type Statement = { text: string; joinerAfter?: string };
                  const statements: Statement[] = [];

                  const buildConditionStatement = (cond: any): string | null => {
                    if (!cond) return null;
                    const type = cond.type;
                    const bc = cond.basicCondition || {};
                    const add = cond.additionalAttributes || {};
                    const opCode = String(bc.operator || "").toUpperCase();
                    const opText =
                      opCode === "EQ"
                        ? "Equals"
                        : opCode === "CONTAINS"
                        ? "Contains"
                        : opCode || "";

                    if (type === "DOES_NOT_HAVE_PERMISSION") {
                      // First statement: remove literal labels "name:" and "permissionTypeLabel:"
                      return `If User does not have permission ${opText} ${bc.displayName ?? ""} ${add.permissionTypeLabel ?? ""} of resource ${add.connectedSystemLabel ?? ""}`;
                    }

                    if (type === "PERMISSION") {
                      return `If User permission ${opText} name: ${
                        bc.displayName ?? ""
                      }, type: ${add.permissionTypeLabel ?? ""} of resource name: ${
                        add.connectedSystemLabel ?? ""
                      }`;
                    }

                    if (type === "IDENTITY_ATTRIBUTE") {
                      const rhsArr = Array.isArray(bc.rhs) ? bc.rhs : [bc.rhs];
                      const rhsVal =
                        rhsArr && rhsArr.length ? rhsArr[0] : undefined;
                      return `If User's ${bc.displayName ?? ""} ${opText} ${
                        rhsVal ?? ""
                      }`;
                    }

                    return null;
                  };

                  // Use only the first rule for now (most policies have one)
                  const firstRule = rules[0];
                  if (firstRule) {
                    const conds: any[] = Array.isArray(
                      firstRule?.conditions?.items
                    )
                      ? firstRule.conditions.items
                      : [];
                    const joiner = (firstRule.operator || "AND").toUpperCase();
                    const condStmts = conds
                      .map(buildConditionStatement)
                      .filter((x): x is string => !!x);
                    condStmts.forEach((text, idx) => {
                      statements.push({
                        text,
                        joinerAfter:
                          idx < condStmts.length - 1 ? joiner : undefined,
                      });
                    });
                  }

                  const risk = actionOnFailure?.risk;
                  const days =
                    actionOnFailure?.revokeLaterAfterNumberOfDays ?? null;
                  let onViolation = "";
                  if (risk === "LOW" && days != null) {
                    onViolation = `Access will be removed after ${days} days.`;
                  } else if (risk === "HIGH") {
                    onViolation = "Access request will be blocked.";
                  } else if (risk) {
                    onViolation = `Risk level ${risk}.`;
                  }

                  return (
                    <div className="px-4 py-4">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
                        {(!rules.length && !statements.length) && (
                          <div className="text-sm text-gray-500">
                            No rules available for this guardrail.
                          </div>
                        )}
                        {(rules.length || statements.length) && (
                          <div className="space-y-4 text-sm text-gray-900">
                            {statements.length > 0 && (
                              <div className="space-y-3">
                                {statements.map((st, idx) => (
                                  <div key={idx} className="space-y-2">
                                    <div className="text-[11px] font-semibold text-gray-600">
                                      STATEMENT {idx + 1}
                                    </div>
                                    <div className="border border-gray-300 rounded px-3 py-2 bg-white">
                                      {st.text}
                                    </div>
                                    {st.joinerAfter && (
                                      <div className="mt-2 mb-1 flex items-center justify-center">
                                        <span className="px-3 py-1 rounded-full border border-gray-300 text-[11px] font-semibold text-gray-600 bg-white">
                                          {st.joinerAfter}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {(actionOnFailure?.actionType || onViolation) && (
                              <div className="pt-3 border-t border-gray-200 mt-1 space-y-2">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-semibold">Then:</span>
                                  <span>
                                    {actionOnFailure?.actionType
                                      ? actionOnFailure.actionType
                                      : "Action configured for this guardrail."}
                                  </span>
                                </div>
                                {onViolation && (
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-semibold">
                                      On Violation:
                                    </span>
                                    <span>{onViolation}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
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

