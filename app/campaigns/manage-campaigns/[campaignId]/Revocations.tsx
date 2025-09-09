"use-client";
import React, { useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { BellIcon, DownloadIcon } from "lucide-react";

const Revocations: React.FC = () => {
  const [view, setView] = useState<"user" | "app">("user");

  // User View Dashboard Column Definitions
  const userDashboardColumnDefs = [
    { headerName: "Dept Name", field: "deptName", flex: 1 },
    { headerName: "Dept Owner", field: "deptOwner", flex: 1 },
    { headerName: "# Revocations", field: "revocations", flex: 1 },
    { headerName: "# Completed", field: "completed", flex: 1 },
    { headerName: "Insights", field: "insights", flex: 2 },
  ];

  // App View Dashboard Column Definitions
  const appDashboardColumnDefs = [
    { headerName: "App Name", field: "appName", flex: 1 },
    { headerName: "App Owner", field: "appOwner", flex: 1 },
    { headerName: "# Revocations", field: "revocations", flex: 1 },
    { headerName: "# Completed", field: "completed", flex: 1 },
    { headerName: "Revoke Method", field: "revokeMethod", flex: 1 },
    {
      headerName: "Actions",
      field: "actions",
      cellRenderer: () => (
        <div className="flex gap-2">
      <button
        title="Remind"
        className="text-yellow-400 hover:text-yellow-600 p-1 cursor-pointer"
      >
        <BellIcon />
      </button>
      <button
        title="Escalate"
        className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-arrow-up-narrow-wide-icon lucide-arrow-up-narrow-wide"
        >
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
          <path d="M11 12h4" />
          <path d="M11 16h7" />
          <path d="M11 20h10" />
        </svg>
      </button>
        </div>
      ),
      flex: 1,
    },
  ];

  // User View Table Column Definitions
  const userColumnDefs = [
    {
      headerName: "User Name",
      field: "userName",
      valueFormatter: (params: any) =>
        `${params.value} (${params.data.userStatus})`,
      flex: 2,
    },
    { headerName: "#Access", field: "access", flex: 1 },
    { headerName: "#Approved", field: "approved", flex: 1 },
    { headerName: "#Revoked", field: "revoked", flex: 1 },
    { headerName: "#Revokes Completed", field: "revokesCompleted", flex: 1 },
    { headerName: "Last Data Sync", field: "lastSync", flex: 1 },
  ];

  // App View Table Column Definitions
  const appColumnDefs = [
    {
      headerName: "App Name",
      field: "appName",
      valueFormatter: (params: any) =>
        `${params.value} (${params.data.appRisk})`,
      flex: 1,
    },
    { headerName: "#Access", field: "access", flex: 1 },
    { headerName: "#Approved", field: "approved", flex: 1 },
    { headerName: "#Revoked", field: "revoked", flex: 1 },
    { headerName: "#Revokes Completed", field: "revokesCompleted", flex: 1 },
    { headerName: "Last Data Sync", field: "lastSync", flex: 1 },
    { headerName: "App Owner", field: "appOwner", flex: 1 },

    {
      headerName: "Actions",
      field: "actions",
      cellRenderer: () => (
        <div className="flex gap-2">
      <button
        title="Remind"
        className="text-yellow-400 hover:text-yellow-600 p-1 cursor-pointer"
      >
        <BellIcon />
      </button>
      <button
        title="Escalate"
        className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-arrow-up-narrow-wide-icon lucide-arrow-up-narrow-wide"
        >
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
          <path d="M11 12h4" />
          <path d="M11 16h7" />
          <path d="M11 20h10" />
        </svg>
      </button>
          <button
            title="Download Excel"
            aria-label="Sign off selected rows"
            className="p-1 rounded transition-colors duration-200"
          >
            <DownloadIcon
              className="curser-pointer"
              strokeWidth="1"
              size="24"
            />
          </button>
        </div>
      ),
      flex: 1,
    },
  ];

  // Sample Data for Dashboard
  const userDashboardData = [
    {
      deptName: "IT Department",
      deptOwner: "Sarah Johnson",
      revocations: 20,
      completed: 15,
      insights: "75% completion rate, 5 pending revocations",
    },
  ];

  const appDashboardData = [
    {
      appName: "Core System",
      appOwner: "Alice Brown",
      revocations: 30,
      completed: 25,
      revokeMethod: "Direct Sync",
    },
  ];

  // Sample Data for Main Tables
  const userRowData = [
    {
      userName: "John Doe",
      userStatus: "Active",
      access: 10,
      approved: 8,
      revoked: 2,
      revokesCompleted: 2,
      lastSync: "2025-08-20",
    },
    {
      userName: "Jane Smith",
      userStatus: "Inactive",
      access: 5,
      approved: 3,
      revoked: 1,
      revokesCompleted: 1,
      lastSync: "2025-08-19",
    },
  ];

  const appRowData = [
    {
      appName: "App 1",
      appRisk: "High",
      access: 15,
      approved: 12,
      revoked: 3,
      revokesCompleted: 3,
      lastSync: "2025-08-20",
      appOwner: "Alice Brown",
    },
    {
      appName: "App 2",
      appRisk: "Medium",
      access: 8,
      approved: 6,
      revoked: 1,
      revokesCompleted: 1,
      lastSync: "2025-08-19",
      appOwner: "Bob Wilson",
    },
  ];

  return (
    <div className="p-4">
      {/* Toggle Button */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {/* <button
            className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${
              view === "user"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border-gray-200"
            }`}
            onClick={() => setView("user")}
          >
            User View
          </button> */}
          {/* <button
            className={`px-4 py-2 text-sm font-medium border rounded-r-lg ${
              view === "app"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border-gray-200"
            }`}
            onClick={() => setView("app")}
          >
            App View
          </button> */}
        </div>
      </div>

      {view === "user" ? (
        <>
          {/* User View Dashboard AG-Grid */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Campaign Completes on: August 30, 2025
            </h2>
            <div
              className="ag-theme-alpine"
              style={{ height: "100px", width: "100%" }}
            >
              <AgGridReact
                columnDefs={userDashboardColumnDefs}
                rowData={userDashboardData}
                defaultColDef={{
                  sortable: false,
                  filter: false,
                  resizable: true,
                }}
              />
            </div>
          </div>

          {/* User View Main AG-Grid Table */}
          {/* <div
            className="ag-theme-alpine"
            style={{ height: "400px", width: "100%" }}
          >
            <AgGridReact
              columnDefs={userColumnDefs}
              rowData={userRowData}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
            />
          </div> */}
        </>
      ) : (
        <>
          {/* App View Dashboard AG-Grid */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Campaign Completes on: August 30, 2025
            </h2>
            <div
              className="ag-theme-alpine"
              style={{ height: "100px", width: "100%" }}
            >
              <AgGridReact
                columnDefs={appDashboardColumnDefs}
                rowData={appDashboardData}
                defaultColDef={{
                  sortable: false,
                  filter: false,
                  resizable: true,
                }}
              />
            </div>
          </div>

          {/* App View Main AG-Grid Table */}
          <div
            className="ag-theme-alpine"
            style={{ height: "400px", width: "100%" }}
          >
            <AgGridReact
              columnDefs={appColumnDefs}
              rowData={appRowData}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Revocations;
