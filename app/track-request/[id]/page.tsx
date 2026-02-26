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
  const [expandedTimelineIndex, setExpandedTimelineIndex] = React.useState<number | null>(null);
  const [timelineComment, setTimelineComment] = React.useState("");
  const [timelineAttachmentName, setTimelineAttachmentName] = React.useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);

  const historyItems = request?.history ?? [];
  const sortedHistory = [...historyItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const filteredHistory = sortedHistory.filter((item) => {
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
      {/* Request Header Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {/* Row 1: Request ID + Request Type */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Request ID: {request.id}
            </h2>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700">
            Request Type:{" "}
            <span className="ml-1 font-semibold">
              {request.details.type || request.entityType}
            </span>
          </div>
        </div>

        {/* Row 2: Date Created | Requester | Beneficiary | Duration (optional) | Justification */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Date Created
            </div>
            <div className="text-gray-900">{request.details.dateCreated}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Requester
            </div>
            <div className="text-gray-900">{request.requesterName}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Beneficiary
            </div>
            <div className="text-gray-900">{request.beneficiaryName}</div>
          </div>
          {typeof request.daysOpen === "number" && (
            <div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Duration
              </div>
              <div className="text-gray-900">{request.daysOpen} days</div>
            </div>
          )}
          <div className="md:col-span-2">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Justification
            </div>
            <div className="text-gray-900 whitespace-pre-wrap break-words">
              {request.details.justification}
            </div>
          </div>
        </div>
      </div>

      {/* Line Item Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="border border-gray-200 rounded-lg bg-gray-50">
          {/* Line item header: requested access item + tags + actions */}
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
            className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 text-left hover:bg-gray-100 transition-colors cursor-pointer"
            aria-expanded={isItemExpanded}
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {request.details.name}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-red-300 bg-red-50 text-red-600">
                  High Risk
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-blue-300 bg-blue-50 text-blue-600">
                  {request.displayName}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-emerald-300 bg-emerald-50 text-emerald-600">
                  Training Check
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                disabled={!request.canWithdraw}
                className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  request.canWithdraw
                    ? "border-red-300 text-red-600 bg-white hover:bg-red-50 cursor-pointer"
                    : "border-gray-200 text-gray-400 bg-white cursor-not-allowed"
                }`}
              >
                <img
                  src="/withdraw-icon.svg"
                  alt="Withdraw"
                  className="w-4 h-4"
                />
              </button>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                disabled={!request.canProvideAdditionalDetails}
                className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  request.canProvideAdditionalDetails
                    ? "border-indigo-300 text-indigo-600 bg-white hover:bg-indigo-50 cursor-pointer"
                    : "border-gray-200 text-gray-400 bg-white cursor-not-allowed"
                }`}
              >
                <img
                  src="/provide-details-icon.svg"
                  alt="Provide additional details"
                  className="w-4 h-4"
                />
              </button>
              {request.details.globalComments && (
                <div
                  className="ml-1 w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600"
                  title="User-provided details"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="text-gray-500 ml-1" aria-hidden>
                {isItemExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </span>
            </div>
          </div>

          {isItemExpanded && (
            <div className="px-4 py-3 space-y-3 text-sm">
              {/* Compact row: access duration, comments, attachment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Access Duration
                  </div>
                  <div className="text-gray-900">
                    {request.details.startDate}
                    {request.details.endDate
                      ? ` - ${request.details.endDate}`
                      : " (ongoing)"}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Comments
                    {request.details.globalComments && (
                      <Info className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap break-words">
                    {request.details.globalComments || "No additional comments provided."}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Attachment
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View / Add Attachment
                  </button>
                </div>
              </div>

              {/* Request Actions Timeline (within access item) */}
              {historyItems.length > 0 && (
                <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <h3 className="text-xs font-semibold text-gray-900">
                        Request Actions Timeline
                      </h3>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder="Search actions"
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                            Action
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                            Assigned To
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredHistory.map((item, idx) => {
                          const isRequestInfoRow =
                            item.action.toLowerCase().includes("requesting info") ||
                            item.action.toLowerCase().includes("info requested");
                          const isExpanded = expandedTimelineIndex === idx;

                          return (
                            <React.Fragment key={`${item.action}-${item.date}-${idx}`}>
                              <tr
                                className={
                                  isRequestInfoRow ? "cursor-pointer hover:bg-gray-50" : ""
                                }
                                onClick={() => {
                                  if (!isRequestInfoRow) return;
                                  setExpandedTimelineIndex(isExpanded ? null : idx);
                                }}
                              >
                                <td className="px-3 py-1.5 text-gray-900">
                                  {item.action}
                                  {isRequestInfoRow && (
                                    <span className="ml-2 text-[10px] text-blue-600 underline">
                                      (add info)
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-gray-500">{item.date}</td>
                                <td className="px-3 py-1.5 text-gray-500">{item.status}</td>
                                <td className="px-3 py-1.5 text-gray-500">{item.assignedTo}</td>
                              </tr>
                              {isRequestInfoRow && isExpanded && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="bg-gray-50 px-4 py-3 text-xs text-gray-700"
                                  >
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <div className="text-[11px] font-medium text-gray-600">
                                          Additional comments
                                        </div>
                                        <textarea
                                          rows={3}
                                          value={timelineComment}
                                          onChange={(e) => setTimelineComment(e.target.value)}
                                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Provide any additional information for this request"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[11px] font-medium text-gray-600">
                                          Attachment
                                        </div>
                                        <input
                                          type="file"
                                          className="block w-full text-[11px] text-gray-600 file:mr-2 file:py-1 file:px-2 file:text-[11px] file:font-medium file:border-0 file:rounded-md file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            setTimelineAttachmentName(file ? file.name : "");
                                          }}
                                        />
                                        {timelineAttachmentName && (
                                          <div className="text-[11px] text-gray-500 mt-0.5">
                                            Selected: {timelineAttachmentName}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100"
                                          onClick={() => {
                                            setExpandedTimelineIndex(null);
                                            setTimelineComment("");
                                            setTimelineAttachmentName("");
                                          }}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 rounded-md border border-blue-600 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
                                          onClick={() => {
                                            setIsConfirmModalOpen(true);
                                          }}
                                        >
                                          Submit
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-2 text-center text-gray-500"
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
            </div>
          )}
        </div>
      </div>
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Confirm submission
            </h3>
            <p className="text-xs text-gray-700">
              Are you sure you want to submit? This action can't be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100"
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-blue-600 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
                onClick={() => {
                  // Here we would call an API in a real app
                  setIsConfirmModalOpen(false);
                  setExpandedTimelineIndex(null);
                  setTimelineComment("");
                  setTimelineAttachmentName("");
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackRequestDetailPage;

