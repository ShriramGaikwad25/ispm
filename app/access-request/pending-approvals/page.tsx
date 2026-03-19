"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import {
  ArrowRight,
  Clock3,
  Info,
  Paperclip,
} from "lucide-react";
import "@/lib/ag-grid-setup";
import InsightsIcon from "@/components/InsightsIcon";

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

type NestedItem = {
  id: string;
  entityName: string;
  type: string;
  description: string;
  duration: string;
  hasInsight?: boolean;
  hasRisk?: boolean;
  hasViolation?: boolean;
};

type PendingApprovalStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Info Requested";

type PendingApproval = {
  id: string;
  requester: string;
  beneficiary: string;
  createdOn: string;
  lastActedOn: string;
  entityCount: number;
  comments: string;
  status: PendingApprovalStatus;
  hasInsight?: boolean;
  hasRisk?: boolean;
  hasViolation?: boolean;
  items: NestedItem[];
};

// Fallback mock data used only when API returns no records
const mockDataFallback: PendingApproval[] = [];

const formatDateToMMDDYY = (value: string): string => {
  if (!value) return "";

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    const yy = String(parsed.getFullYear()).slice(-2);
    return `${mm}-${dd}-${yy}`;
  }

  const normalized = value.trim().replace(/\//g, "-");
  const parts = normalized.split("-");

  // Support YYYY-MM-DD
  if (parts.length >= 3 && parts[0].length === 4) {
    const yy = parts[0].slice(-2);
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return `${mm}-${dd}-${yy}`;
  }

  // Support DD-MM-YYYY
  if (parts.length >= 3 && parts[2].length === 4) {
    const yy = parts[2].slice(-2);
    const mm = parts[1].padStart(2, "0");
    const dd = parts[0].padStart(2, "0");
    return `${mm}-${dd}-${yy}`;
  }

  return value;
};

async function fetchPendingApprovals(): Promise<PendingApproval[]> {
  const response = await fetch(
    "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add authorization here if required, e.g. Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query:
          "select * from kf_wf_get_approval_task where assignee_id = 'f558e3b2-348b-4ff3-be4c-a3c5dc8b5a91' AND task_status = 'OPEN'",
        parameters: [],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load pending approvals (${response.status})`);
  }

  const json = await response.json();

  const toStringSafe = (value: unknown) =>
    value === null || value === undefined ? "" : String(value);
  const pick = (row: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  };

  const rows: any[] = Array.isArray(json)
    ? json
    : Array.isArray((json as any)?.resultSet)
    ? (json as any).resultSet
    : Array.isArray((json as any)?.data)
    ? (json as any).data
    : Array.isArray((json as any)?.rows)
    ? (json as any).rows
    : [];

  return rows.map((row, index) => {
    const statusRaw = toStringSafe(
      pick(row, ["status", "task_status", "taskStatus", "STATE", "state"]) ||
        "Pending"
    );

    const normalizedStatus =
      (["Pending", "Approved", "Rejected", "Info Requested"] as const).find(
        (s) => s.toLowerCase() === String(statusRaw).toLowerCase()
      ) ?? "Pending";

    const createdOn = toStringSafe(
      pick(row, [
        "created_on",
        "createdOn",
        "created_at",
        "assigned_on",
        "assignedOn",
        "start_date",
        "requested_on",
      ])
    );

    const lastActedOn = toStringSafe(
      pick(row, [
        "last_acted_on",
        "lastActedOn",
        "updated_at",
        "modified_at",
        "expires_on",
        "expiresOn",
        "due_date",
        "expiry_date",
      ])
    );

    const requester = toStringSafe(
      row?.requester?.displayname ??
        pick(row, [
          "requester_name",
          "requestor_name",
          "requester",
          "requested_by_name",
          "requested_by",
        ])
    );

    const beneficiary = toStringSafe(
      row?.beneficiary?.username ??
        pick(row, [
          "beneficiary_name",
          "beneficiary",
          "user_name",
          "account_name",
          "requested_for",
        ])
    );

    const rawItems =
      (Array.isArray(row.items) && row.items) ||
      (Array.isArray(row.line_items) && row.line_items) ||
      [];
    const items: NestedItem[] = rawItems;
    const itemDetails = row.itemdetails ?? row.itemDetails;
    const itemDetailsCount = Array.isArray(itemDetails)
      ? itemDetails.length
      : itemDetails && typeof itemDetails === "object"
      ? Object.keys(itemDetails).length
      : 0;

    return {
      id: toStringSafe(
        pick(row, [
          "request_id",
          "requestid",
          "req_id",
          "task_id",
          "taskid",
          "taskId",
          "id",
          "requestId",
        ]) || index + 1
      ),
      requester,
      beneficiary,
      createdOn,
      lastActedOn,
      entityCount:
        itemDetailsCount ||
        Number(
          pick(row, [
            "entity_count",
            "entityCount",
            "number_of_entities",
            "items_count",
            "itemsCount",
          ]) ?? items.length
        ) ||
        0,
      comments: toStringSafe(
        pick(row, [
          "requester_justification",
          "comments",
          "comment",
          "remarks",
          "justification",
          "reason",
        ])
      ),
      status: normalizedStatus,
      hasInsight: Boolean(row.hasInsight ?? row.has_insight),
      hasRisk: Boolean(row.hasRisk ?? row.has_risk),
      hasViolation: Boolean(row.hasViolation ?? row.has_violation),
      items,
    };
  });
}

const InsightsCell: React.FC<{
  hasRisk?: boolean;
  hasInsight?: boolean;
  hasViolation?: boolean;
}> = () => {
  return (
    <div className="flex items-center justify-center" title="AI Insights">
      <InsightsIcon size={24} className="shrink-0 text-amber-500" />
    </div>
  );
};

type ActionsCellProps = {
  node?: ICellRendererParams["node"];
  onDetailedReview?: () => void;
};

const ActionsCell: React.FC<ActionsCellProps> = ({ node, onDetailedReview }) => {
  const baseBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={baseBtn}
        title="Detailed Review"
        aria-label="Detailed Review"
        onClick={(e) => {
          e.stopPropagation();
          onDetailedReview?.();
        }}
      >
        <ArrowRight className="h-4 w-4 text-gray-700" />
      </button>
    </div>
  );
};

const DetailsCell: React.FC = () => {
  const baseBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={baseBtn}
        title="Comments"
        aria-label="Comments"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          className="cursor-pointer hover:opacity-80"
        >
          <path
            d="M0.700195 0V19.5546H3.5802V25.7765C3.57994 25.9525 3.62203 26.1247 3.70113 26.2711C3.78022 26.4176 3.89277 26.5318 4.02449 26.5992C4.15621 26.6666 4.30118 26.6842 4.44101 26.6498C4.58085 26.6153 4.70926 26.5304 4.80996 26.4058C6.65316 24.1232 10.3583 19.5546 10.3583 19.5546H25.1802V0H0.700195ZM2.1402 1.77769H23.7402V17.7769H9.76212L5.0202 23.6308V17.7769H2.1402V1.77769ZM5.0202 5.33307V7.11076H16.5402V5.33307H5.0202ZM26.6202 5.33307V7.11076H28.0602V23.11H25.1802V28.9639L20.4383 23.11H9.34019L7.9002 24.8877H19.8421C19.8421 24.8877 23.5472 29.4563 25.3904 31.7389C25.4911 31.8635 25.6195 31.9484 25.7594 31.9828C25.8992 32.0173 26.0442 31.9997 26.1759 31.9323C26.3076 31.8648 26.4202 31.7507 26.4993 31.6042C26.5784 31.4578 26.6204 31.2856 26.6202 31.1096V24.8877H29.5002V5.33307H26.6202ZM5.0202 8.88845V10.6661H10.7802V8.88845H5.0202ZM5.0202 12.4438V14.2215H19.4202V12.4438H5.0202Z"
            fill="#2684FF"
          />
        </svg>
      </button>
      <button
        type="button"
        className={baseBtn}
        title="Duration"
        aria-label="Duration"
      >
        <Clock3 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={baseBtn}
        title="More details"
        aria-label="More details"
      >
        <Info className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={baseBtn}
        title="Attachment details"
        aria-label="Attachment details"
      >
        <Paperclip className="h-4 w-4" />
      </button>
    </div>
  );
};

const PendingApprovalsPage: React.FC = () => {
  const gridRef = React.useRef<any>(null);
  const router = useRouter();

  const {
    data: pendingApprovals = mockDataFallback,
    isLoading,
    isError,
    error,
  } = useQuery<PendingApproval[], Error>({
    queryKey: ["pending-approvals"],
    queryFn: fetchPendingApprovals,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | PendingApprovalStatus
  >("All");
  const [hoveredCard, setHoveredCard] = useState<"card1" | "card2" | null>(null);

  // Quick Win hover animation can change available grid width without a window resize event.
  // Re-fit columns both immediately and after the transition completes.
  useEffect(() => {
    const fitColumns = () => {
      try {
        gridRef.current?.api?.sizeColumnsToFit();
      } catch {
        // ignore
      }
    };
    const rafId = window.requestAnimationFrame(fitColumns);
    const timeoutId = window.setTimeout(fitColumns, 550);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [hoveredCard]);

  const parseInputDate = (value: string): Date | null => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const [yyyy, mm, dd] = parts.map((p) => Number(p));
    if (!mm || !dd || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd);
  };

  const filteredData: PendingApproval[] = useMemo(() => {
    const source = pendingApprovals.length ? pendingApprovals : mockDataFallback;

    const query = searchQuery.trim().toLowerCase();
    const from = parseInputDate(fromDate);
    const to = parseInputDate(toDate);

    return source.filter((row) => {
      if (query) {
        const matchesSearch =
          row.requester.toLowerCase().includes(query) ||
          row.beneficiary.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      const assigned = parseInputDate(row.createdOn);
      if (from && assigned && assigned < from) return false;
      if (to && assigned && assigned > to) return false;

      if (statusFilter !== "All") {
        if (row.status !== statusFilter) return false;
      }

      return true;
    });
  }, [pendingApprovals, searchQuery, fromDate, toDate, statusFilter]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Req ID",
        field: "id",
        minWidth: 90,
        width: 100,
      },
      {
        headerName: "Requester",
        field: "requester",
        minWidth: 140,
        width: 160,
      },
      {
        headerName: "Beneficiary",
        field: "beneficiary",
        minWidth: 140,
        width: 160,
      },
      {
        headerName: "Created On",
        field: "createdOn",
        minWidth: 130,
        width: 140,
        valueFormatter: (params) => formatDateToMMDDYY(params.value ?? ""),
      },
      {
        headerName: "# Entity",
        field: "entityCount",
        minWidth: 110,
        width: 115,
        cellClass: "text-center",
      },
      {
        headerName: "Comments",
        field: "comments",
        minWidth: 240,
        width: 300,
      },
      {
        headerName: "Status",
        field: "status",
        minWidth: 120,
        width: 130,
      },
      {
        headerName: "Insights",
        field: "insights",
        minWidth: 110,
        width: 110,
        cellRenderer: (params: ICellRendererParams) => {
          const data = params.data as PendingApproval | undefined;
          if (!data) return null;
          return (
            <InsightsCell
              hasRisk={data.hasRisk}
              hasInsight={data.hasInsight}
              hasViolation={data.hasViolation}
            />
          );
        },
      },
      {
        headerName: "Actions",
        field: "actions",
        minWidth: 130,
        width: 140,
        cellRenderer: (params: ICellRendererParams) => (
          <ActionsCell
            node={params.node}
            onDetailedReview={() => {
              const requestId = params.data?.id;
              if (!requestId) return;
              router.push(
                `/access-request/pending-approvals/${encodeURIComponent(
                  String(requestId)
                )}`
              );
            }}
          />
        ),
      },
    ],
    [router]
  );

  const detailColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Entity Name",
        field: "entityName",
        flex: 1.2,
      },
      {
        headerName: "Type",
        field: "type",
        flex: 0.9,
      },
      {
        headerName: "Description",
        field: "description",
        flex: 1.8,
      },
      {
        headerName: "Details",
        field: "details",
        flex: 1.4,
        cellRenderer: () => <DetailsCell />,
      },
      {
        headerName: "Insights",
        field: "insights",
        flex: 1.2,
        cellRenderer: (params: ICellRendererParams) => {
          const data = params.data as NestedItem | undefined;
          if (!data) return null;
          return (
            <InsightsCell
              hasRisk={data.hasRisk}
              hasInsight={data.hasInsight}
              hasViolation={data.hasViolation}
            />
          );
        },
      },
      {
        headerName: "Action",
        field: "action",
        flex: 1.3,
        cellRenderer: () => <ActionsCell />,
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="mb-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  My Approvals
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                  Review and act on pending access requests. Use Quick View to see
                  and act on individual line items.
                </p>
                {isLoading && (
                  <p className="text-xs text-gray-500 mt-1">
                    Loading pending approvals from server...
                  </p>
                )}
                {isError && (
                  <p className="text-xs text-red-500 mt-1">
                    Failed to load pending approvals
                    {error?.message ? `: ${error.message}` : ""}
                  </p>
                )}
              </div>

              {/* Filters row moved up into header area */}
              <div className="flex flex-col gap-3">
                {/* Row 1: Search + Status */}
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  {/* 1) Free form search */}
                  <div className="w-full md:w-96">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Search (Requester, Beneficiary)
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type a requester or beneficiary name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  {/* 3) Status filter */}
                  <div className="w-full md:w-96">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as typeof statusFilter)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="All">All</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Info Requested">Info Requested</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Date Assigned (Range) */}
                <div className="w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date Assigned (Range)
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights: Quick Win – match Access Review / App Owner Quick Wins layout */}
            <div className="w-full lg:w-1/3 flex">
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 shadow-sm w-full h-full flex flex-col">
                <div className="flex justify-between items-center mb-3 flex-shrink-0">
                  <h2 className="text-sm font-medium text-gray-800">
                    AI Insights: Quick Win
                  </h2>
                </div>
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                  {/* Card 1 */}
                  <div
                    className="relative flex-1 min-h-[5rem] cursor-pointer overflow-hidden rounded-lg border border-blue-200 bg-blue-50 shadow-sm"
                    onMouseEnter={() => setHoveredCard("card1")}
                    onMouseLeave={() =>
                      setHoveredCard((prev) => (prev === "card1" ? null : prev))
                    }
                  >
                    {/* First page (default) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                      <p className="text-sm font-semibold text-blue-800">Speed</p>
                      <span className="mt-0.5 text-xs font-bold text-blue-600">
                        35% Completion
                      </span>
                    </div>
                    {/* Second page content on hover with diagonal sweep from top-right to bottom-left */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      <div
                        className="w-full h-full flex flex-col justify-between px-3 py-2 text-white rounded-lg shadow-sm"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(59, 130, 246, 0.9))",
                          transform:
                            hoveredCard === "card1"
                              ? "translate(0, 0)"
                              : "translate(120%, -120%)",
                          transition: "transform 0.5s ease-out",
                        }}
                      >
                        <p className="text-[11px] leading-snug">
                          Quick review of recommended access through peer analysis with
                          70% match. Reduce effort by 3 hours.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="px-2 py-0.5 text-[10px] font-medium rounded bg-white/90 text-blue-700 pointer-events-auto"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="px-2 py-0.5 text-[10px] font-medium rounded border border-white/80 text-white bg-transparent pointer-events-auto"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div
                    className="relative flex-1 min-h-[5rem] cursor-pointer overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm"
                    onMouseEnter={() => setHoveredCard("card2")}
                    onMouseLeave={() =>
                      setHoveredCard((prev) => (prev === "card2" ? null : prev))
                    }
                  >
                    {/* First page (default) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                      <p className="text-sm font-semibold text-emerald-800">
                        Low Risk
                      </p>
                      <span className="mt-0.5 text-xs font-bold text-emerald-600">
                        25% Completion
                      </span>
                    </div>
                    {/* Second page content on hover with diagonal sweep from top-right to bottom-left */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      <div
                        className="w-full h-full flex flex-col justify-between px-3 py-2 text-white rounded-lg shadow-sm"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(5, 150, 105, 0.95), rgba(16, 185, 129, 0.9))",
                          transform:
                            hoveredCard === "card2"
                              ? "translate(0, 0)"
                              : "translate(120%, -120%)",
                          transition: "transform 0.5s ease-out",
                        }}
                      >
                        <p className="text-[11px] leading-snug">
                          Quick review of existing access approved in previous cycles
                          with low risk items. Reduce effort by 2 hours.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="px-2 py-0.5 text-[10px] font-medium rounded bg-white/90 text-emerald-700 pointer-events-auto"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="px-2 py-0.5 text-[10px] font-medium rounded border border-white/80 text-white bg-transparent pointer-events-auto"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ag-theme-quartz w-full" style={{ width: "100%", minWidth: 0 }}>
            <AgGridReact
              ref={gridRef}
              rowData={filteredData}
              columnDefs={columnDefs}
              rowSelection="single"
              rowModelType="clientSide"
              animateRows
              domLayout="autoHeight"
              defaultColDef={{
                sortable: true,
                filter: false,
                resizable: true,
                wrapHeaderText: true,
                autoHeaderHeight: true,
              }}
              masterDetail
              isRowMaster={(data: PendingApproval) =>
                !!data && Array.isArray(data.items) && data.items.length > 0
              }
              detailCellRendererParams={{
                detailGridOptions: {
                  columnDefs: detailColumnDefs,
                  defaultColDef: {
                    sortable: false,
                    filter: false,
                    resizable: true,
                  },
                },
                getDetailRowData: (params: any) => {
                  const items = (params.data as PendingApproval)?.items ?? [];
                  params.successCallback(items);
                },
              }}
              onGridReady={(params) => {
                try {
                  params.api.sizeColumnsToFit();
                } catch {
                  // ignore
                }
                const handleResize = () => {
                  try {
                    params.api.sizeColumnsToFit();
                  } catch {
                    // ignore
                  }
                };
                window.addEventListener("resize", handleResize);
                params.api.addEventListener("gridPreDestroyed", () => {
                  window.removeEventListener("resize", handleResize);
                });
              }}
              onGridSizeChanged={(params) => {
                try {
                  params.api.sizeColumnsToFit();
                } catch {
                  // ignore
                }
              }}
              onFirstDataRendered={(params) => {
                try {
                  params.api.sizeColumnsToFit();
                } catch {
                  // ignore
                }
              }}
              suppressSizeToFit={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalsPage;
