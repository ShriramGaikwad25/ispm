 "use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  Repeat,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldX,
  Sliders,
  Undo2,
  UserRoundCheckIcon,
} from "lucide-react";
import "@/lib/ag-grid-setup";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useRouter } from "next/navigation";

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

const mockRows = [
  // User events
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Job Title Change",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Manager Change",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Privileged Access Assigned (Directly)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "New Account Discovered (Directly/Target System recon)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "SoD Violation Detected",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Account Inactive (>90 days)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Conditional Access Expiry (in 7 days)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Manager Inactive",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Contractor Expiring in 7 days",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Sensitive Data Access (Advanced, for later phases)",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType:
      "User Risk Score Breach (Advanced, can we integrated with SIEM/UEBA for input, later phases)",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType:
      "Privilege Escalation Chain Detection (user acquires multiple privilege accesses through either request or directly in end system)",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  // Entitlement events
  {
    entity: "Entitlement",
    details: "ZNew_Comp_PP4",
    eventType: "Newly Discovered Entitlement",
    actionType: "Review Details",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "Entitlement",
    details: "ZNew_Comp_PP4",
    eventType: "Owner Inactive",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "Entitlement",
    details: "No assigned user for more than X days",
    eventType: "No Assigned User",
    actionType: "Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  // Service account events
  {
    entity: "Service Account",
    details: "svc_148",
    eventType: "Owner Inactive",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  // Account events
  {
    entity: "Account",
    details: "Multiple",
    eventType: "Newly Discovered Unlinked Accounts",
    actionType: "Classify",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
];

export default function ContinuousCompliancePage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>(mockRows);
  const [activeTab, setActiveTab] = useState(0); // 0 = Open, 1 = Complete
  const [searchTerm, setSearchTerm] = useState<string>("");

  const parseMMDDYYYY = (value: unknown): Date | null => {
    const s = String(value ?? "").trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;

    const mm = Number(m[1]);
    const dd = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!mm || !dd || !yyyy) return null;

    const d = new Date(yyyy, mm - 1, dd);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const { openRows, completeRows } = useMemo(() => {
    // Open tab should always show all rows coming from ContinousComplience.json.
    const open = rows;

    // Keep Complete as an optional subset of expired rows.
    const complete = rows.filter((r) => {
      const expiresOn = r?.expiresOn ?? r?.dueOn ?? "";
      const d = parseMMDDYYYY(expiresOn);
      return !!d && d < today;
    });

    return { openRows: open, completeRows: complete };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, today]);

  const filteredOpenRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return openRows;

    const rowMatchesSearch = (r: any) => {
      const entries = Object.entries(r ?? {});
      for (const [key, value] of entries) {
        // Match key names too (useful if user searches for "ZNew_Comp_PP4")
        if (String(key).toLowerCase().includes(q)) return true;

        if (value === null || value === undefined) continue;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          if (String(value).toLowerCase().includes(q)) return true;
          continue;
        }

        if (Array.isArray(value)) {
          if (
            value.some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
          ) {
            return true;
          }
          continue;
        }

        // Fallback for unexpected objects
        try {
          if (JSON.stringify(value).toLowerCase().includes(q)) return true;
        } catch {
          // ignore
        }
      }
      return false;
    };

    return openRows.filter((r) => rowMatchesSearch(r));
  }, [openRows, searchTerm]);

  const filteredCompleteRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return completeRows;

    const rowMatchesSearch = (r: any) => {
      const entries = Object.entries(r ?? {});
      for (const [key, value] of entries) {
        if (String(key).toLowerCase().includes(q)) return true;

        if (value === null || value === undefined) continue;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          if (String(value).toLowerCase().includes(q)) return true;
          continue;
        }

        if (Array.isArray(value)) {
          if (
            value.some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
          ) {
            return true;
          }
          continue;
        }

        try {
          if (JSON.stringify(value).toLowerCase().includes(q)) return true;
        } catch {
          // ignore
        }
      }
      return false;
    };

    return completeRows.filter((r) => rowMatchesSearch(r));
  }, [completeRows, searchTerm]);

  const displayedRows = activeTab === 0 ? filteredOpenRows : filteredCompleteRows;

  useEffect(() => {
    let cancelled = false;

    const mapJsonRow = (item: any) => {
      const entity = String(item?.["Entitlement"] ?? "");
      const assignedTo = String(item?.["Hudson.White"] ?? "");
      const triggerEvent = String(item?.["Newly Discovered Entitlement"] ?? "");
      const eventType = String(item?.["Review Details"] ?? "");
      const actionType = String(item?.["Review Details"] ?? "");

      // Date key is dynamic (e.g. "03/25/2026") - pick the first DD/MM/YYYY-like key.
      const dateKey =
        Object.keys(item || {}).find((k) => /^\d{2}\/\d{2}\/\d{4}$/.test(k)) ?? "";
      const dueOn = dateKey ? String(item?.[dateKey] ?? "") : "";

      // Details are the remaining attribute in the JSON payload (often like "ZNew_Comp_PP4").
      // We exclude known structural keys and the dynamic date key.
      const reservedKeys = new Set([
        "Entitlement",
        "Hudson.White",
        "Newly Discovered Entitlement",
        "Review Details",
        "Review, Reassign",
      ]);
      const detailsKey =
        Object.keys(item || {}).find(
          (k) => !reservedKeys.has(k) && k !== dateKey
        ) ?? "";
      const details =
        detailsKey
          ? String(item?.[detailsKey] ?? "")
          : String(item?.["ZNew_Comp_PP4"] ?? "");

      const actionsText = item?.["Review, Reassign"];
      const actions =
        typeof actionsText === "string"
          ? actionsText
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

      // Keep the original JSON properties so the UI/actions can use the full dataset.
      // (We still add normalized fields for the existing AgGrid columns.)
      return {
        ...item,
        entity,
        details,
        triggerEvent,
        eventType,
        assignedTo,
        actionType,
        dueOn,
        expiresOn: dueOn,
        actions,
      };
    };

    const load = async () => {
      try {
        const res = await fetch("/ContinousComplience.json", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load JSON (${res.status})`);
        const data = await res.json();

        if (cancelled) return;
        if (!Array.isArray(data)) {
          setRows(mockRows);
          return;
        }

        setRows(data.map(mapJsonRow));
      } catch (e) {
        // Fallback to mock rows if JSON is missing/malformed.
        if (!cancelled) setRows(mockRows);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep Open as the safe default view when data loads.
  useEffect(() => {
    if (rows.length > 0) {
      setActiveTab(0);
    }
  }, [rows.length]);

  // If Complete is selected but has no records, switch back to Open automatically.
  useEffect(() => {
    if (
      activeTab === 1 &&
      searchTerm.trim() === "" &&
      completeRows.length === 0 &&
      openRows.length > 0
    ) {
      setActiveTab(0);
    }
  }, [activeTab, searchTerm, completeRows.length, openRows.length]);

  const handleReviewClick = (rowData: any) => {
    const triggerEventValue =
      rowData?.triggerEvent ?? rowData?.eventType ?? "";

    // User lifecycle events → open dummy Continuous Compliance review page
    if (rowData?.entity === "User") {
      const params = new URLSearchParams({
        triggerEvent: triggerEventValue,
        entity: rowData.entity ?? "",
        details: rowData.details ?? "",
      });

      router.push(
        `/campaigns/continuous-compliance/review?${params.toString()}`
      );
      return;
    }

    // Entitlement events → open dummy Entitlement Owner-style page (not live entitlement-owner)
    if (rowData?.entity === "Entitlement" || rowData?.entity === "Service Account") {
      const params = new URLSearchParams({
        reviewerId: "DUMMY_REVIEWER",
        certificationId: "DUMMY_CERT",
        appinstanceid: "DUMMY_APP_INSTANCE",
      });
      router.push(`/campaigns/continuous-compliance/entitlement-review?${params.toString()}`);
      return;
    }

    // Account events → open dummy Unlinked Accounts table page
    if (rowData?.entity === "Account") {
      router.push(`/campaigns/continuous-compliance/unlinked-accounts`);
      return;
    }

    // Fallback for other rows: keep placeholder behavior
    // eslint-disable-next-line no-console
    console.log("Review clicked", rowData);
  };

  const columnDefs: ColDef[] = [
    { headerName: "Entity", field: "entity", flex: 1 },
    { headerName: "Details", field: "details", flex: 1 },
    {
      headerName: "Trigger Event",
      field: "triggerEvent",
      valueGetter: (p) =>
        p.data?.triggerEvent ?? p.data?.eventType ?? "",
      flex: 2,
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "Event Type",
      field: "eventType",
      valueGetter: (p) => p.data?.actionType ?? p.data?.eventType ?? "",
      flex: 1.4,
      wrapText: true,
    },
    {
      headerName: "Assigned To",
      field: "assignedTo",
      valueGetter: (p) => p.data?.assignedTo ?? "",
      flex: 1,
    },
    {
      headerName: "Expires On",
      field: "expiresOn",
      valueGetter: (p) => p.data?.expiresOn ?? p.data?.dueOn ?? "",
      flex: 1.2,
    },
    {
      headerName: "Action",
      field: "actions",
      flex: 1.1,
      width: 200,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams) => {
        const value = params.value as string[] | string | undefined;

        const actions = Array.isArray(value)
          ? value
          : typeof value === "string"
            ? value.split(",").map((s) => s.trim())
            : [];

        const has = (pattern: RegExp) => actions.some((a) => pattern.test(String(a)));

        const hasReview = has(/^review$/i);
        const hasReassign = has(/^reassign$/i);
        const hasRevokeAccess = has(/revoke/i);
        const hasAdjustAccess = has(/adjust\s*access/i);
        const hasEnforceMfa = has(/enforce\s*mfa/i);
        const hasDisable = has(/^disable$/i);
        const hasMitigating = has(/mitigate/i);
        const hasRationalize = has(/rationalize/i);
        const hasRotate = has(/^rotate$/i);
        const hasRestore = has(/restore/i);

        const onActionClick = (actionName: string) => {
          // eslint-disable-next-line no-console
          console.log(`${actionName} clicked`, params.data);
        };

        return (
          <div
            className="flex items-center gap-2 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {hasReview && (
              <button
                type="button"
                title="Review"
                aria-label="Review"
                className="p-1 rounded transition-colors duration-200 hover:bg-green-50"
                onClick={() => handleReviewClick(params.data)}
              >
                <FileText
                  className="cursor-pointer"
                  color="#2563eb"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasReassign && (
              <button
                type="button"
                title="Reassign"
                aria-label="Reassign"
                className="p-1 rounded transition-colors duration-200 hover:bg-purple-50"
                onClick={() => onActionClick("Reassign")}
              >
                <UserRoundCheckIcon
                  className="cursor-pointer"
                  color="#b146ccff"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasRevokeAccess && (
              <button
                type="button"
                title="Revoke Access"
                aria-label="Revoke Access"
                className="p-1 rounded transition-colors duration-200 hover:bg-red-50"
                onClick={() => onActionClick("Revoke Access")}
              >
                <ShieldX
                  className="cursor-pointer"
                  color="#dc2626"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasAdjustAccess && (
              <button
                type="button"
                title="Adjust Access"
                aria-label="Adjust Access"
                className="p-1 rounded transition-colors duration-200 hover:bg-amber-50"
                onClick={() => onActionClick("Adjust Access")}
              >
                <Sliders
                  className="cursor-pointer"
                  color="#d97706"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasEnforceMfa && (
              <button
                type="button"
                title="Enforce MFA"
                aria-label="Enforce MFA"
                className="p-1 rounded transition-colors duration-200 hover:bg-indigo-50"
                onClick={() => onActionClick("Enforce MFA")}
              >
                <Lock
                  className="cursor-pointer"
                  color="#4f46e5"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasDisable && (
              <button
                type="button"
                title="Disable"
                aria-label="Disable"
                className="p-1 rounded transition-colors duration-200 hover:bg-gray-50"
                onClick={() => onActionClick("Disable")}
              >
                <Ban
                  className="cursor-pointer"
                  color="#6b7280"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasMitigating && (
              <button
                type="button"
                title="Mitigating"
                aria-label="Mitigating"
                className="p-1 rounded transition-colors duration-200 hover:bg-emerald-50"
                onClick={() => onActionClick("Mitigating")}
              >
                <ShieldCheck
                  className="cursor-pointer"
                  color="#059669"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasRationalize && (
              <button
                type="button"
                title="Rationalize"
                aria-label="Rationalize"
                className="p-1 rounded transition-colors duration-200 hover:bg-teal-50"
                onClick={() => onActionClick("Rationalize")}
              >
                <Repeat
                  className="cursor-pointer"
                  color="#0f766e"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasRotate && (
              <button
                type="button"
                title="Rotate"
                aria-label="Rotate"
                className="p-1 rounded transition-colors duration-200 hover:bg-indigo-50"
                onClick={() => onActionClick("Rotate")}
              >
                <RotateCcw
                  className="cursor-pointer"
                  color="#4f46e5"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}

            {hasRestore && (
              <button
                type="button"
                title="Restore"
                aria-label="Restore"
                className="p-1 rounded transition-colors duration-200 hover:bg-cyan-50"
                onClick={() => onActionClick("Restore")}
              >
                <Undo2
                  className="cursor-pointer"
                  color="#0891b2"
                  strokeWidth={1}
                  size={22}
                />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Continuous Compliance
              </h1>
            </div>
          </div>

          <div className="mt-4">
            {/* Open / Complete tabs (inline to avoid remounting input on every keystroke) */}
            <div
              role="tablist"
              aria-label="Continuous Compliance Tabs"
              className="flex flex-shrink-0 gap-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 0}
                onClick={() => setActiveTab(0)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 0
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {activeTab === 0 ? (
                  <ChevronDown size={16} className="text-white" />
                ) : (
                  <ChevronUp size={16} className="text-gray-500" />
                )}
                Open
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 1}
                onClick={() => setActiveTab(1)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {activeTab === 1 ? (
                  <ChevronDown size={16} className="text-white" />
                ) : (
                  <ChevronUp size={16} className="text-gray-500" />
                )}
                Complete
              </button>
            </div>

            {/* Tab panel */}
            <div role="tabpanel" className="mt-4 flex flex-col">
              <div className="w-full flex flex-col">
                <div className="mb-3 flex items-center gap-3 justify-between flex-wrap">
                  <div
                    className="relative bg-white rounded-md border border-gray-300"
                    style={{
                      display: "flex",
                      padding: "6px 10px",
                      alignItems: "center",
                      gap: "8px",
                      alignSelf: "stretch",
                      flex: "1 1 320px",
                      minWidth: 260,
                    }}
                  >
                    <Search className="text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-0 bg-transparent text-gray-700 focus:outline-none flex-1"
                    />
                  </div>
                </div>

                <div className="ag-theme-alpine w-full">
                  <AgGridReact
                    theme="legacy"
                    rowData={displayedRows}
                    columnDefs={columnDefs}
                    defaultColDef={{
                      sortable: true,
                      filter: true,
                      resizable: true,
                      flex: 1,
                    }}
                    domLayout="autoHeight"
                  />
                </div>
                {displayedRows.length === 0 && (
                  <div className="mt-3 text-sm text-gray-500">
                    No records found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

