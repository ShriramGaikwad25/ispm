"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Info } from "lucide-react";
const AgGridReact = dynamic(() => import("ag-grid-react").then((mod) => mod.AgGridReact), { ssr: false });
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";

interface RequestHistory {
  action: string;
  date: string;
  status: string;
  assignedTo: string;
}

interface RequestDetails {
  dateCreated: string;
  type: string;
  name: string;
  justification: string;
  startDate: string;
  endDate: string;
  globalComments?: string;
}

interface Request {
  id: string | number;
  routeId: string | number;
  beneficiaryName: string;
  requesterName: string;
  displayName: string;
  entityType: string;
  daysOpen: number;
  status: string;
  hasInfoIcon?: boolean;
  canWithdraw?: boolean;
  canProvideAdditionalDetails?: boolean;
  details?: RequestDetails;
  history?: RequestHistory[];
}

const TrackRequest: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const gridRef = React.useRef<AgGridReactType>(null);
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery";
    setLoading(true);
    setError(null);

    const body = {
      query: "select * from vw_access_request_full_json where requested_by_user_id = ?::uuid",
      parameters: ["d4cc2173-7471-4e26-8c72-a27be88ff6cb"],
    };

    const formatDate = (value: string | null | undefined): string => {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = String(d.getFullYear());
      return `${mm}/${dd}/${yyyy}`;
    };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        let rawRows: any[] = [];
        if (Array.isArray(data)) rawRows = data;
        else if (Array.isArray((data as any).resultSet)) rawRows = (data as any).resultSet;
        else if (Array.isArray((data as any).rows)) rawRows = (data as any).rows;

        if (!rawRows || rawRows.length === 0) {
          setRequests([]);
          return;
        }
        const mapped: Request[] = rawRows
          .filter((row) => {
            const requestJson = row?.request_json ?? {};
            const workflowInstanceId = requestJson?.workflow_instance?.id;
            return workflowInstanceId !== null && workflowInstanceId !== undefined && String(workflowInstanceId).trim() !== "";
          })
          .map((row) => {
          const requestJson = row.request_json ?? {};
          const accessRequest = requestJson.access_request ?? {};
          const requestedBy = accessRequest.requested_by ?? {};
          const requestedFor = accessRequest.requested_for ?? {};
          const accessItems: any[] = Array.isArray(requestJson.access_items) ? requestJson.access_items : [];
          const firstItem = accessItems[0] ?? {};
          const catalog = firstItem.catalog ?? {};
          const entitlementMeta = firstItem.entitlement_metadata ?? {};

          const requesterNameFromObject =
            requestedBy.display_name ||
            [requestedBy.first_name, requestedBy.last_name].filter(Boolean).join(" ") ||
            requestedBy.username ||
            "";

          const beneficiaryNameFromObject =
            requestedFor.display_name ||
            [requestedFor.first_name, requestedFor.last_name].filter(Boolean).join(" ") ||
            requestedFor.username ||
            "";

          const primaryDisplayName =
            catalog.name || catalog.entitlementname || catalog.applicationName || catalog.applicationname || "";
          const displayNameFromCatalog =
            accessItems.length > 1 && primaryDisplayName
              ? `${primaryDisplayName} +${accessItems.length - 1} more`
              : primaryDisplayName;

          const entityTypeFromCatalog =
            catalog.type || catalog.entitlementtype || (catalog.metadata?.entitlementType as string) || "Entitlement";

          const requestedOn: string | undefined = accessRequest.created_at;
          const raisedOn = formatDate(requestedOn);

          let daysOpen = 0;
          if (requestedOn) {
            const d = new Date(requestedOn);
            if (!Number.isNaN(d.getTime())) {
              const now = new Date();
              const diffMs = now.getTime() - d.getTime();
              daysOpen = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
            }
          }

          const rawStatus =
            (typeof accessRequest.status === "string" && accessRequest.status.trim()) ||
            (typeof row.status === "string" && row.status.trim()) ||
            "";
          const status = rawStatus ? rawStatus.replace(/_/g, " ") : "Request Submitted";

          const justification: string =
            (accessRequest.justification as string) || (entitlementMeta.comments as string) || "";

          const startDate = entitlementMeta.startDate ? String(entitlementMeta.startDate) : raisedOn;
          const endDate = entitlementMeta.endDate ? String(entitlementMeta.endDate) : "";
          const hasHighRiskOrPrivileged = accessItems.some((item) => {
            const itemCatalog = item?.catalog ?? {};
            const privileged = String(itemCatalog.privileged ?? "").toLowerCase() === "yes";
            const riskLevel = String(itemCatalog.risk ?? item?.risk?.level ?? "").toLowerCase();
            return privileged || riskLevel.startsWith("high");
          });
          const workflowInstanceId = requestJson?.workflow_instance?.id;

          return {
            id:
              workflowInstanceId ??
              row.request_id ??
              accessRequest.id ??
              row.requestid ??
              row.id ??
              "",
            routeId:
              workflowInstanceId ??
              row.request_id ??
              accessRequest.id ??
              row.requestid ??
              row.id ??
              "",
            beneficiaryName: String(beneficiaryNameFromObject),
            requesterName: String(requesterNameFromObject),
            displayName: String(displayNameFromCatalog),
            entityType: String(entityTypeFromCatalog),
            daysOpen,
            status,
            hasInfoIcon: hasHighRiskOrPrivileged,
            canWithdraw: status.toLowerCase().includes("awaiting") || status.toLowerCase().includes("pending"),
            canProvideAdditionalDetails: status.toLowerCase().includes("provide information"),
            details: {
              dateCreated: raisedOn,
              type: String(entityTypeFromCatalog),
              name: String(displayNameFromCatalog || ""),
              justification,
              startDate,
              endDate,
              globalComments: justification || undefined,
            },
            history: [],
          };
        });

        setRequests(mapped);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load track requests.";
        setError(message);
        setRequests([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    if (status.includes("Completed") || status.includes("Approved")) {
      return "bg-green-100 text-green-800";
    }
    if (status.includes("Closed")) {
      return "bg-gray-100 text-gray-800";
    }
    if (status.includes("Awaiting") || status.includes("Pending")) {
      return "bg-yellow-100 text-yellow-800";
    }
    if (status.includes("Provide Information")) {
      return "bg-orange-100 text-orange-800";
    }
    return "bg-blue-100 text-blue-800";
  };

  const parseMmDdYyyy = (value: string): Date | null => {
    if (!value) return null;
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    const [mm, dd, yyyy] = parts.map((p) => Number(p));
    if (!mm || !dd || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd);
  };

  const parseInputDate = (value: string): Date | null => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const [yyyy, mm, dd] = parts.map((p) => Number(p));
    if (!mm || !dd || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd);
  };

  const filteredRequests = requests.filter((request) => {
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      const matchesSearch =
        request.id.toString().includes(query) ||
        request.requesterName.toLowerCase().includes(query) ||
        request.beneficiaryName.toLowerCase().includes(query);

      if (!matchesSearch) {
        return false;
      }
    }

    if (statusFilter) {
      if (request.status !== statusFilter) {
        return false;
      }
    }

    const createdStr = request.details?.dateCreated ?? "";
    const createdDate = parseMmDdYyyy(createdStr);
    const from = parseInputDate(fromDate);
    const to = parseInputDate(toDate);

    if (from && createdDate && createdDate < from) {
      return false;
    }

    if (to && createdDate && createdDate > to) {
      return false;
    }

    return true;
  });

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "ID",
        field: "id",
        width: 110,
        sortable: true,
        cellRenderer: (params: ICellRendererParams) => {
          const routeId = params.data?.routeId as string | number | undefined;
          if (!routeId) return params.value;
          return (
            <button
              type="button"
              className="text-blue-600 hover:underline font-medium"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/track-request/${encodeURIComponent(String(routeId))}`);
              }}
            >
              {params.value}
            </button>
          );
        },
      },
      {
        headerName: "Type",
        field: "requestType",
        flex: 0.8,
        valueGetter: (params) =>
          params.data?.details?.type ?? params.data?.entityType ?? "-",
      },
      {
        headerName: "Requester",
        field: "requesterName",
        flex: 0.9,
        sortable: true,
        filter: true,
      },
      {
        headerName: "Beneficiary",
        field: "beneficiaryName",
        flex: 0.9,
        sortable: true,
        filter: true,
      },
      {
        headerName: "Raised On",
        field: "raisedOn",
        flex: 0.9,
        valueGetter: (params) => params.data?.details?.dateCreated ?? "-",
      },
      {
        headerName: "Expires On",
        field: "expiresOn",
        flex: 0.9,
        valueGetter: (params) => params.data?.details?.endDate || "-",
      },
      {
        headerName: "Status",
        field: "status",
        flex: 1,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.data?.status as string;
          const hasInfoIcon = !!params.data?.hasInfoIcon;
          return (
            <div className="flex items-center gap-1">
              <span
                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                  status
                )}`}
              >
                {status}
              </span>
              {hasInfoIcon && (
                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <Info className="w-3 h-3 text-blue-600" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Comments",
        field: "comments",
        flex: 3,
        valueGetter: (params) => params.data?.details?.globalComments ?? "-",
      },
    ],
    [router]
  );

  return (
    <div>
      <h1 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2 text-blue-950">
        Track requests
      </h1>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search by ID / Requester / Beneficiary */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search
            </label>
            <Search className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Request ID, Requester, Beneficiary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Date Created From */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date Created (From)
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Date Created To */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date Created (To)
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Status dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">All</option>
              <option value="Request Awaiting Approval">
                Request Awaiting Approval
              </option>
              <option value="Provide Information">Provide Information</option>
              <option value="Request Completed">Request Completed</option>
              <option value="Request Closed">Request Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table (AG Grid) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="ag-theme-quartz w-full" style={{ width: "100%", minWidth: 0 }}>
          <AgGridReact
            ref={gridRef}
            rowData={filteredRequests}
            columnDefs={columnDefs}
            rowSelection="single"
            rowModelType="clientSide"
            animateRows={true}
            domLayout="autoHeight"
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
            }}
            onGridReady={(params) => {
              params.api.sizeColumnsToFit();
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
              params.api.sizeColumnsToFit();
            }}
            suppressSizeToFit={false}
          />
        </div>
      </div>

      {/* Empty State */}
      {/* {filteredRequests.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No requests found</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your search criteria
          </p>
        </div>
      )} */}
    </div>
  );
};

export default TrackRequest;
