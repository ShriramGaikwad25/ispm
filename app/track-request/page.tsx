"use client";
import React, { useState } from "react";
import { Search, Filter, ChevronDown, ChevronUp, Info, ArrowUpDown, X } from "lucide-react";

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
  details?: RequestDetails;
  history?: RequestHistory[];
}

const TrackRequest: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [currentHistoryPage, setCurrentHistoryPage] = useState<{ [key: number]: number }>({});
  const historyPageSize = 5;

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
      details: {
        dateCreated: "03/07/2022",
        type: "ApplicationInstance",
        name: "Active Directory",
        justification: "System generated account request to enable provisioning of entitlements in application Active Directory",
        startDate: "03/07/2022",
        endDate: "",
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
      details: {
        dateCreated: "03/07/2022",
        type: "ApplicationInstance",
        name: "Active Directory",
        justification: "Access request for new employee onboarding",
        startDate: "03/07/2022",
        endDate: "",
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
      details: {
        dateCreated: "03/07/2022",
        type: "ApplicationInstance",
        name: "Active Directory",
        justification: "Role assignment for project team",
        startDate: "03/07/2022",
        endDate: "",
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
      details: {
        dateCreated: "06/15/2023",
        type: "Role",
        name: "ApprvoalRole",
        justification: "Role access for approval workflow",
        startDate: "06/15/2023",
        endDate: "",
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
      details: {
        dateCreated: "04/20/2023",
        type: "Entitlement",
        name: "ON COMMIT REFRESH",
        justification: "Entitlement for database refresh operations",
        startDate: "04/20/2023",
        endDate: "",
      },
      history: [
        { action: "Request Submitted", date: "2023-04-20", status: "SUBMITTED", assignedTo: "System" },
        { action: "Approved", date: "2023-04-21", status: "APPROVED", assignedTo: "Approver" },
        { action: "Closed", date: "2023-04-22", status: "CLOSED", assignedTo: "System" },
      ],
    },
  ];

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  };

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

  const getPaginatedHistory = (history: RequestHistory[], requestId: number) => {
    const page = currentHistoryPage[requestId] || 1;
    const startIndex = (page - 1) * historyPageSize;
    const endIndex = startIndex + historyPageSize;
    return history.slice(startIndex, endIndex);
  };

  const getTotalHistoryPages = (history: RequestHistory[]) => {
    return Math.ceil(history.length / historyPageSize);
  };

  const handleHistoryPageChange = (requestId: number, page: number) => {
    setCurrentHistoryPage((prev) => ({ ...prev, [requestId]: page }));
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

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beneficiary Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requester Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity Type
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("daysOpen")}
                >
                  <div className="flex items-center gap-1">
                    Days Open
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => {
                const isExpanded = expandedRows.has(request.id);
                return (
                  <React.Fragment key={request.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRow(request.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <span className="text-sm font-medium text-gray-900">{request.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {request.beneficiaryName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {request.requesterName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {request.displayName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {request.entityType}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {request.daysOpen}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                          {request.hasInfoIcon && (
                            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                              <Info className="w-3 h-3 text-blue-600" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {request.canWithdraw && (
                          <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium">
                            Withdraw
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && request.details && (
                      <tr>
                        <td colSpan={8} className="px-0 py-0 bg-gray-50">
                          <div className="p-6 space-y-6">
                            {/* Request Details */}
                            <div>
                              <h3 className="text-lg font-semibold mb-4 text-gray-900">Request Details</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase">Date Created</label>
                                  <p className="text-sm text-gray-900 mt-1">{request.details.dateCreated}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                                  <p className="text-sm text-gray-900 mt-1">{request.details.type}</p>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                    Name
                                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Info className="w-3 h-3 text-blue-600" />
                                    </div>
                                  </label>
                                  <p className="text-sm text-gray-900 mt-1">{request.details.name}</p>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs font-medium text-gray-500 uppercase">Justification</label>
                                  <p className="text-sm text-gray-900 mt-1">{request.details.justification}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase">Start Date</label>
                                  <p className="text-sm text-gray-900 mt-1">{request.details.startDate}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase">End Date</label>
                                  <p className="text-sm text-gray-900 mt-1">{request.details.endDate || "-"}</p>
                                </div>
                              </div>
                            </div>

                            {/* Request History */}
                            {request.history && request.history.length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-4 text-gray-900">Request History</h3>
                                <div className="overflow-x-auto">
                                  <table className="w-full border border-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {getPaginatedHistory(request.history, request.id).map((item, idx) => (
                                        <tr key={idx}>
                                          <td className="px-4 py-2 text-sm text-gray-900">{item.action}</td>
                                          <td className="px-4 py-2 text-sm text-gray-500">{item.date}</td>
                                          <td className="px-4 py-2 text-sm text-gray-500">{item.status}</td>
                                          <td className="px-4 py-2 text-sm text-gray-500">{item.assignedTo}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {getTotalHistoryPages(request.history) > 1 && (
                                  <div className="flex items-center justify-center gap-2 mt-4">
                                    <button
                                      onClick={() => handleHistoryPageChange(request.id, (currentHistoryPage[request.id] || 1) - 1)}
                                      disabled={(currentHistoryPage[request.id] || 1) === 1}
                                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      &lt;
                                    </button>
                                    <span className="px-3 py-1 text-sm text-gray-700">
                                      {currentHistoryPage[request.id] || 1} / {getTotalHistoryPages(request.history || [])}
                                    </span>
                                    <button
                                      onClick={() => handleHistoryPageChange(request.id, (currentHistoryPage[request.id] || 1) + 1)}
                                      disabled={(currentHistoryPage[request.id] || 1) >= getTotalHistoryPages(request.history || [])}
                                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      &gt;
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
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
