"use client";
import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Info } from "lucide-react";
import { BackButton } from "@/components/BackButton";
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
  id: number;
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
  const gridRef = React.useRef<AgGridReactType>(null);
  const router = useRouter();

  // Mock data matching the image description
  const mockRequests: Request[] = [
    {
      id: 47085,
      beneficiaryName: "Alok Shah",
      requesterName: "John Smith",
      displayName: "Active Directory",
      entityType: "ApplicationInstance",
      daysOpen: 434,
      status: "Request Awaiting Approval",
      canWithdraw: true,
      canProvideAdditionalDetails: false,
      details: {
        dateCreated: "03/07/2022",
        type: "ApplicationInstance",
        name: "Active Directory",
        justification: "System generated account request to enable provisioning of entitlements in application Active Directory",
        startDate: "03/07/2022",
        endDate: "",
        globalComments: "Awaiting manager approval.",
      },
      history: [
        { action: "Assigned to User", date: "2022-03-07", status: "ASSIGNED", assignedTo: "John Smith" },
        { action: "Request Submitted", date: "2022-03-07", status: "SUBMITTED", assignedTo: "System" },
        { action: "Under Review", date: "2022-03-08", status: "REVIEW", assignedTo: "Reviewer" },
        { action: "Awaiting Approval", date: "2022-03-09", status: "PENDING", assignedTo: "Approver" },
        { action: "Additional Info Requested", date: "2022-03-10", status: "INFO_REQUESTED", assignedTo: "Approver" },
        { action: "Info Provided", date: "2022-03-11", status: "INFO_PROVIDED", assignedTo: "John Smith" },
      ],
    },
    {
      id: 47084,
      beneficiaryName: "Alice Dickson",
      requesterName: "John Smith",
      displayName: "Active Directory",
      entityType: "ApplicationInstance",
      daysOpen: 434,
      status: "Provide Information",
      hasInfoIcon: true,
      canWithdraw: false,
      canProvideAdditionalDetails: true,
      details: {
        dateCreated: "03/07/2022",
        type: "ApplicationInstance",
        name: "Active Directory",
        justification: "Access request for new employee onboarding",
        startDate: "03/07/2022",
        endDate: "",
        globalComments: "Additional employment details required from HR.",
      },
      history: [
        { action: "Request Submitted", date: "2022-03-07", status: "SUBMITTED", assignedTo: "System" },
        { action: "Info Requested", date: "2022-03-08", status: "INFO_REQUESTED", assignedTo: "Approver" },
      ],
    },
    {
      id: 47083,
      beneficiaryName: "Alex Gair",
      requesterName: "John Smith",
      displayName: "Active Directory",
      entityType: "ApplicationInstance",
      daysOpen: 434,
      status: "Provide Information",
      hasInfoIcon: true,
      canWithdraw: false,
      canProvideAdditionalDetails: true,
      details: {
        dateCreated: "03/07/2022",
        type: "ApplicationInstance",
        name: "Active Directory",
        justification: "Role assignment for project team",
        startDate: "03/07/2022",
        endDate: "",
        globalComments: "Waiting for project lead to confirm role scope.",
      },
      history: [
        { action: "Request Submitted", date: "2022-03-07", status: "SUBMITTED", assignedTo: "System" },
        { action: "Info Requested", date: "2022-03-08", status: "INFO_REQUESTED", assignedTo: "Approver" },
      ],
    },
    {
      id: 52077,
      beneficiaryName: "John Smith",
      requesterName: "John Smith",
      displayName: "ApprvoalRole",
      entityType: "Role",
      daysOpen: 245,
      status: "Request Completed",
      canWithdraw: false,
      canProvideAdditionalDetails: false,
      details: {
        dateCreated: "06/15/2023",
        type: "Role",
        name: "ApprvoalRole",
        justification: "Role access for approval workflow",
        startDate: "06/15/2023",
        endDate: "",
        globalComments: "Request has been fulfilled.",
      },
      history: [
        { action: "Request Submitted", date: "2023-06-15", status: "SUBMITTED", assignedTo: "System" },
        { action: "Approved", date: "2023-06-16", status: "APPROVED", assignedTo: "Approver" },
        { action: "Completed", date: "2023-06-17", status: "COMPLETED", assignedTo: "System" },
      ],
    },
    {
      id: 49073,
      beneficiaryName: "Anuroop Bashetty",
      requesterName: "Anuroop Bashetty",
      displayName: "ON COMMIT REFRESH",
      entityType: "Entitlement",
      daysOpen: 427,
      status: "Request Closed",
      canWithdraw: false,
      canProvideAdditionalDetails: false,
      details: {
        dateCreated: "04/20/2023",
        type: "Entitlement",
        name: "ON COMMIT REFRESH",
        justification: "Entitlement for database refresh operations",
        startDate: "04/20/2023",
        endDate: "",
        globalComments: "Closed after entitlement was deprovisioned.",
      },
      history: [
        { action: "Request Submitted", date: "2023-04-20", status: "SUBMITTED", assignedTo: "System" },
        { action: "Approved", date: "2023-04-21", status: "APPROVED", assignedTo: "Approver" },
        { action: "Closed", date: "2023-04-22", status: "CLOSED", assignedTo: "System" },
      ],
    },
  ];

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

  const filteredRequests = mockRequests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.id.toString().includes(query) ||
      request.beneficiaryName.toLowerCase().includes(query) ||
      request.requesterName.toLowerCase().includes(query) ||
      request.displayName.toLowerCase().includes(query)
    );
  });

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "ID",
        field: "id",
        width: 110,
        sortable: true,
        cellRenderer: (params: ICellRendererParams) => {
          const id = params.data?.id;
          if (!id) return params.value;
          return (
            <button
              type="button"
              className="text-blue-600 hover:underline font-medium"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/track-request/${id}`);
              }}
            >
              {params.value}
            </button>
          );
        },
      },
      {
        headerName: "Requester",
        field: "requesterName",
        flex: 1,
        sortable: true,
        filter: true,
      },
      {
        headerName: "Beneficiary",
        field: "beneficiaryName",
        flex: 1,
        sortable: true,
        filter: true,
      },
      {
        headerName: "Date Created",
        field: "dateCreated",
        flex: 1,
        valueGetter: (params) => params.data?.details?.dateCreated ?? "-",
      },
      {
        headerName: "Global Comments",
        field: "globalComments",
        flex: 2,
        valueGetter: (params) => params.data?.details?.globalComments ?? "-",
      },
      {
        headerName: "Duration",
        field: "daysOpen",
        width: 120,
        sortable: true,
      },
      {
        headerName: "Request Type",
        field: "requestType",
        flex: 1,
        valueGetter: (params) => params.data?.details?.type ?? params.data?.entityType ?? "-",
      },
      {
        headerName: "Status",
        field: "status",
        flex: 1.2,
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
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Track requests</span>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for Requests"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium">
            <span>Filter</span>
            <ChevronDown className="w-4 h-4" />
          </button>
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
      {filteredRequests.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No requests found</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your search criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default TrackRequest;
