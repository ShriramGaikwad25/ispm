"use-client";
import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { BellIcon, DownloadIcon } from "lucide-react";
import { IDetailCellRendererParams, ColDef } from "ag-grid-enterprise";
import { formatDateMMDDYY } from "@/utils/utils";

// Detail Cell Renderer for App View
// const DetailCellRenderer = (props: IDetailCellRendererParams) => {
//   const { data } = props;
//   const details = data.details || [];

//   return (
//     <div className="flex flex-col p-4 bg-gray-50 border-t border-gray-200 ml-10">
//       <div className="flex flex-row items-center gap-2 mb-2">
//         <span className="text-gray-600 text-sm font-medium">
//           Revocation Details:
//         </span>
//       </div>
//       <div className="ml-4 space-y-2">
//         {details.length > 0 ? (
//           details.map((detail: any, index: number) => (
//             <div key={index} className="text-sm text-gray-800">
//               <span className="font-medium">{detail.type}:</span>{" "}
//               {detail.description}
//               {detail.status && (
//                 <span
//                   className={`ml-2 px-2 py-1 rounded text-xs ${
//                     detail.status === "Completed"
//                       ? "bg-green-100 text-green-800"
//                       : detail.status === "Pending"
//                       ? "bg-yellow-100 text-yellow-800"
//                       : "bg-red-100 text-red-800"
//                   }`}
//                 >
//                   {detail.status}
//                 </span>
//               )}
//             </div>
//           ))
//         ) : (
//           <span className="text-gray-500 italic">
//             No revocation details available
//           </span>
//         )}
//       </div>
//     </div>
//   );
// };

// Identity | Account | Entitlement | Type | Status | Ticket#  | Evidence
// Detail Cell Renderer Parameters
// const detailCellRendererParams = {
//   detailGridOptions: {
//     columnDefs: [
//       {
//         field: "identity",
//         headerName: "Identity",
//         flex: 1,
//         cellStyle: { fontWeight: "bold" },
//       },
//       {
//         field: "account",
//         headerName: "Account",
//         flex: 2,
//         wrapText: true,
//         autoHeight: true,
//       },
//             {
//         field: "entitlement",
//         headerName: "Entitlement",
//         flex: 2,
//         wrapText: true,
//         autoHeight: true,
//       },
//             {
//         field: "type",
//         headerName: "Type",
//         flex: 2,
//         wrapText: true,
//         autoHeight: true,
//       },
//       {
//         field: "status",
//         headerName: "Status",
//         flex: 2,
//         wrapText: true,
//         autoHeight: true,
//       },
//             {
//         field: "ticket",
//         headerName: "#Ticket",
//         flex: 2,
//         wrapText: true,
//         autoHeight: true,
//       },
//             {
//         field: "evidence",
//         headerName: "Evidence",
//         flex: 2,
//         wrapText: true,
//         autoHeight: true,
//       },
//     ],
//     defaultColDef: {
//       flex: 1,
//       sortable: true,
//       filter: true,
//       resizable: true,
//     },
//     onGridReady: (params: any) => {
//       console.log("Detail grid ready:", params.api);
//       params.api.sizeColumnsToFit();
//     },
//     domLayout: "autoHeight",
//     headerHeight: 40,
//     rowHeight: 50,
//     suppressRowClickSelection: true,
//     rowSelection: "single",
//   },
//   getDetailRowData: (params: any) => {
//     console.log("getDetailRowData called with:", params.data);
//     const details = params.data.details || [];
//     console.log("Details to show:", details);
//     if (details.length > 0) {
//       console.log("Successfully providing detail data");
//       params.successCallback(details);
//     } else {
//       console.log("No detail data available");
//       params.successCallback([]);
//     }
//   },
// };

const Revocations: React.FC = () => {
  const [view, setView] = useState<"user" | "app">("app");

  // User View Dashboard Column Definitions
  // const userDashboardColumnDefs = [
  //   { headerName: "Dept Name", field: "deptName", flex: 1 },
  //   { headerName: "Dept Owner", field: "deptOwner", flex: 1 },
  //   { headerName: "# Revocations", field: "revocations", flex: 1 },
  //   { headerName: "# Completed", field: "completed", flex: 1 },
  //   { headerName: "Insights", field: "insights", flex: 2 },
  // ];

  const detailCellRendererParams = useMemo(() => {
    return {
      detailGridOptions: {
        columnDefs: [
          { field: "identity", headerName: "Identity", flex: 1 },
          { field: "Account", headerName: "Account", flex: 1 },
          { field: "Entitlement", headerName: "Entitlement", flex: 1 },
          { field: "Type", headerName: "Type", flex: 1 },
          { field: "Status", headerName: "Status", flex: 1 },
          { field: "Ticket", headerName: "#Ticket", flex: 1 },
          { field: "Evidence", headerName: "Evidence", flex: 1 },
        ],
        defaultColDef: {
          flex: 2,
        },
      },
      getDetailRowData: (params: any) => {
        params.successCallback([{ info: params.data.details }]);
      },
    };
  }, []);
  // App View Dashboard Column Definitions
  // const appDashboardColumnDefs = [
  //   { headerName: "Application", field: "appName", flex: 1 },
  //   { headerName: "App Owner", field: "appOwner", flex: 1 },
  //   { headerName: "# Revocations", field: "revocations", flex: 1 },
  //   { headerName: "# Completed", field: "completed", flex: 1 },
  //   { headerName: "Revoke Method", field: "revokeMethod", flex: 1 },
  //   {
  //     headerName: "Actions",
  //     field: "actions",
  //     cellRenderer: () => (
  //       <div className="flex gap-2">
  //         <button
  //           title="Remind"
  //           className="text-yellow-400 hover:text-yellow-600 p-1 cursor-pointer"
  //         >
  //           <BellIcon />
  //         </button>
  //         <button
  //           title="Escalate"
  //           className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
  //         >
  //           <svg
  //             xmlns="http://www.w3.org/2000/svg"
  //             width="24"
  //             height="24"
  //             viewBox="0 0 24 24"
  //             fill="none"
  //             stroke="currentColor"
  //             strokeWidth="1"
  //             strokeLinecap="round"
  //             strokeLinejoin="round"
  //             className="lucide lucide-arrow-up-narrow-wide-icon lucide-arrow-up-narrow-wide"
  //           >
  //             <path d="m3 8 4-4 4 4" />
  //             <path d="M7 4v16" />
  //             <path d="M11 12h4" />
  //             <path d="M11 16h7" />
  //             <path d="M11 20h10" />
  //           </svg>
  //         </button>
  //       </div>
  //     ),
  //     flex: 1,
  //   },
  // ];

  // User View Table Column Definitions
  // const userColumnDefs = [
  //   {
  //     headerName: "User Name",
  //     field: "userName",
  //     valueFormatter: (params: any) =>
  //       `${params.value} (${params.data.userStatus})`,
  //     flex: 2,
  //   },
  //   { headerName: "#Access", field: "access", flex: 1 },
  //   { headerName: "#Approved", field: "approved", flex: 1 },
  //   { headerName: "#Revoked", field: "revoked", flex: 1 },
  //   { headerName: "#Revokes Completed", field: "revokesCompleted", flex: 1 },
  //   { headerName: "Last Data Sync", field: "lastSync", flex: 1 },
  // ];

  // App View Table Column Definitions
  const appColumnDefs: ColDef[] = [
    {
      headerName: "Application",
      field: "appName",
      cellRenderer: "agGroupCellRenderer",
      flex: 2,
    },
    { headerName: "Owner", field: "appOwner", flex: 2 },
    { headerName: "#Access", field: "access", flex: 2 },
    { headerName: "#Approved", field: "approved", flex: 2 },
    { headerName: "#Revoked", field: "revoked", flex: 2 },
    { headerName: "#Revokes Completed", field: "revokesCompleted", flex: 2 },
    {
      headerName: "Last Sync",
      field: "lastSync",
      flex: 2,
      valueFormatter: (params) => formatDateMMDDYY(params.value),
    },

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
      flex: 2,
    },
  ];

  // Check if a cell is a full width cell (for detail rows)
  const isFullWidthCell = (rowNode: any) => {
    return rowNode.detail;
  };

  // Sample Data for Dashboard
  // const userDashboardData = [
  //   {
  //     deptName: "IT Department",
  //     deptOwner: "Sarah Johnson",
  //     revocations: 20,
  //     completed: 15,
  //     insights: "75% completion rate, 5 pending revocations",
  //   },
  // ];

  // const appDashboardData = [
  //   {
  //     appName: "Core System",
  //     appOwner: "Alice Brown",
  //     revocations: 30,
  //     completed: 25,
  //     revokeMethod: "Direct Sync",
  //   },
  // ];

  // Sample Data for Main Tables
  // const userRowData = [
  //   {
  //     userName: "John Doe",
  //     userStatus: "Active",
  //     access: 10,
  //     approved: 8,
  //     revoked: 2,
  //     revokesCompleted: 2,
  //     lastSync: "2025-08-20",
  //   },
  //   {
  //     userName: "Jane Smith",
  //     userStatus: "Inactive",
  //     access: 5,
  //     approved: 3,
  //     revoked: 1,
  //     revokesCompleted: 1,
  //     lastSync: "2025-08-19",
  //   },
  // ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  const appRowData = [
    {
      appName: "SAP",
      appRisk: "High",
      access: 170,
      approved: 145,
      revoked: 25,
      revokesCompleted: 6,
      lastSync: "2025-08-20",
      appOwner: "Alice Brown",
    },
    {
      appName: "Sales Force",
      appRisk: "Medium",
      access: 130,
      approved: 112,
      revoked: 18,
      revokesCompleted: 4,
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
          {/* <div className="mb-6">
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
          </div> */}

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
          {/* <div className="mb-6">
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
          </div> */}

          {/* App View Main AG-Grid Table */}
          <div
            className="ag-theme-alpine"
            style={{ height: "400px", width: "100%" }}
          >
            {/* <AgGridReact
              columnDefs={appColumnDefs}
              rowData={appRowData}
              getRowId={(params) => params.data.appName}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              masterDetail={true}
              detailCellRendererParams={detailCellRendererParams}
              detailRowAutoHeight={true}
              detailRowHeight={200}
              suppressRowClickSelection={true}
              detailCellRenderer="agDetailCellRenderer"
              rowSelection={{
                mode: "multiRow",
                masterSelects: "detail",
              }}
              onGridReady={(params) => {
                console.log("Grid initialized:", {
                  api: !!params.api,
                  enterpriseModules: (params.api as any).isEnterprise?.()
                    ? "Loaded"
                    : "Not loaded",
                });
                params.api.sizeColumnsToFit();
              }}
              onFirstDataRendered={(params) => {
                console.log(
                  "onFirstDataRendered called - master rows will expand only when arrow is clicked"
                );
                params.api.forEachNode((node) => {
                  console.log(
                    "Row:",
                    node.data?.appName,
                    "isMaster:",
                    node.master,
                    "expanded:",
                    node.expanded
                  );
                });
              }}
              onRowClicked={(params) => {
                console.log(
                  "Row clicked:",
                  params.data?.appName,
                  "isMaster:",
                  params.node.master
                );
              }}
            /> */}
            <AgGridReact
              rowData={appRowData}
              columnDefs={appColumnDefs}
              defaultColDef={defaultColDef}
              // rowSelection={rowSelection}
              masterDetail={true}
              detailCellRendererParams={detailCellRendererParams}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Revocations;
