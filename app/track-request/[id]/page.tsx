"use client";

import React from "react";
import { Info, FileText, Clock, Search, ChevronDown, ChevronUp } from "lucide-react";

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
      justification:
        "System generated account request to enable provisioning of entitlements in application Active Directory",
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

const TrackRequestDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = React.use(params);
  const numericId = Number(id);
  const request = mockRequests.find((r) => r.id === numericId);
  const [historySearch, setHistorySearch] = React.useState("");
  const [isItemExpanded, setIsItemExpanded] = React.useState(true);

  const historyItems = request?.history ?? [];
  const filteredHistory = historyItems.filter((item) => {
    if (!historySearch.trim()) return true;
    const query = historySearch.toLowerCase();
    return (
      item.action.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query) ||
      item.assignedTo.toLowerCase().includes(query) ||
      item.date.toLowerCase().includes(query)
    );
  });

  if (!request || !request.details) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Request not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Request Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Request Details</h2>
        </div>
        <div className="space-y-3 text-sm">
          {/* Date Created - small inline pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-700">
            <span className="font-medium uppercase tracking-wide text-[11px]">Date Created</span>
            <span className="text-gray-900">{request.details.dateCreated}</span>
          </div>

          {/* Main fields in boxed layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Row 1: Name + Type */}
            <div className="border border-gray-200 rounded-md bg-gray-50 px-3 py-2 flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                Name
                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <Info className="w-3 h-3 text-blue-600" />
                </div>
              </span>
              <span className="text-gray-900 mt-0.5 truncate">{request.details.name}</span>
            </div>
            <div className="border border-gray-200 rounded-md bg-gray-50 px-3 py-2 flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Type
              </span>
              <span className="text-gray-900 mt-0.5">{request.details.type}</span>
            </div>

            {/* Row 2: Start Date + End Date */}
            <div className="border border-gray-200 rounded-md bg-gray-50 px-3 py-2 flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Start Date
              </span>
              <span className="text-gray-900 mt-0.5">{request.details.startDate}</span>
            </div>
            <div className="border border-gray-200 rounded-md bg-gray-50 px-3 py-2 flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                End Date
              </span>
              <span className="text-gray-900 mt-0.5">{request.details.endDate || "-"}</span>
            </div>

            {/* Row 3: Global Comments full width */}
            <div className="sm:col-span-2 border border-gray-200 rounded-md bg-gray-50 px-3 py-2 flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Global Comments
              </span>
              <span className="text-gray-900 mt-0.5 whitespace-pre-wrap break-words">
                {request.details.globalComments || request.details.justification}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Access Items with per-item history */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Access Items</h2>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg bg-gray-50">
            {/* Item header - clickable to collapse/expand */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsItemExpanded((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsItemExpanded((prev) => !prev);
                }
              }}
              className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 text-left hover:bg-gray-100 transition-colors cursor-pointer"
              aria-expanded={isItemExpanded}
            >
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {request.details.name}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {request.details.type}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  disabled={!request.canWithdraw}
                  title="Withdraw"
                  className={`inline-flex items-center justify-center p-2 rounded text-xs font-medium transition-colors border ${
                    request.canWithdraw
                      ? "bg-white border-red-300 text-red-600 hover:bg-red-50 cursor-pointer"
                      : "bg-white border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <img src="/withdraw-icon.svg" alt="Withdraw" className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  disabled={!request.canProvideAdditionalDetails}
                  title="Provide Additional Details"
                  className={`inline-flex items-center justify-center p-2 rounded text-xs font-medium transition-colors border ${
                    request.canProvideAdditionalDetails
                      ? "bg-white border-indigo-300 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                      : "bg-white border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <img
                    src="/provide-details-icon.svg"
                    alt="Provide additional details"
                    className="w-5 h-5"
                  />
                </button>
                <span className="text-gray-500 ml-3" aria-hidden>
                  {isItemExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </div>
            </div>

            {isItemExpanded && (
              <>
                {/* Item summary fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 py-3">
                  <div className="border border-gray-200 rounded-md bg-white px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                      Start Date
                    </span>
                    <span className="text-gray-900 mt-0.5">{request.details.startDate}</span>
                  </div>
                  <div className="border border-gray-200 rounded-md bg-white px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                      End Date
                    </span>
                    <span className="text-gray-900 mt-0.5">{request.details.endDate || "-"}</span>
                  </div>
                  <div className="sm:col-span-2 border border-gray-200 rounded-md bg-white px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                      Global Comments
                    </span>
                    <span className="text-gray-900 mt-0.5 whitespace-pre-wrap break-words">
                      {request.details.globalComments || request.details.justification}
                    </span>
                  </div>
                </div>

                {/* Per-item history */}
                {historyItems.length > 0 && (
                  <div className="border-t border-gray-200 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <h3 className="text-xs font-semibold text-gray-900">Request History</h3>
                      </div>
                      <div className="relative w-full sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search item history"
                          className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left text-[11px] font-medium text-gray-500 uppercase">
                              Action
                            </th>
                            <th className="px-3 py-1.5 text-left text-[11px] font-medium text-gray-500 uppercase">
                              Date
                            </th>
                            <th className="px-3 py-1.5 text-left text-[11px] font-medium text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-3 py-1.5 text-left text-[11px] font-medium text-gray-500 uppercase">
                              Assigned To
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredHistory.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-1.5 text-xs text-gray-900">{item.action}</td>
                              <td className="px-3 py-1.5 text-xs text-gray-500">{item.date}</td>
                              <td className="px-3 py-1.5 text-xs text-gray-500">{item.status}</td>
                              <td className="px-3 py-1.5 text-xs text-gray-500">{item.assignedTo}</td>
                            </tr>
                          ))}
                          {filteredHistory.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-2 text-xs text-gray-500 text-center"
                              >
                                No history entries match your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackRequestDetailPage;

