"use client";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import SelectAll from "@/components/agTable/SelectAll";
import CustomPagination from "@/components/agTable/CustomPagination";
import Filters from "@/components/agTable/Filters";
import Exports from "@/components/agTable/Exports";
import ColumnSettings from "@/components/agTable/ColumnSettings";
import {
  ColDef,
  GetRowIdParams,
  GridApi,
  ICellRendererParams,
  IDetailCellRendererParams,
  FirstDataRenderedEvent,
} from "ag-grid-enterprise";
import ActionButtons from "@/components/agTable/ActionButtons";
import { AlertTriangle, CheckCircle, MailIcon } from "lucide-react";
import RightSidebar from "@/components/RightSideBar";
import Accordion from "@/components/Accordion";
import ChartAppOwnerComponent from "@/components/ChartForAppOwner";
import './AppOwner.css'

// Register AG Grid Enterprise modules (if not already done in ag-grid-setup)
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
ModuleRegistry.registerModules([MasterDetailModule]);

type DataItem = {
  label: string;
  value: number | string;
  color?: string;
};

/*** dummy data ***/
const rowData = [
  {
    accountId: "Derrick Watson",
    userId: "7243915",
    entitlementName: "Job Title",
    entitlementDescription: "Testing is going on",
    aiInsights: "thumbs-down",
    accountSummary: "Regular Accounts",
    accountActivity: "Active in past 30 days",
    changeSinceLastReview: "New accounts",
    accountType: "Disabled",
    userType: "Active",
    lastLoginDate: "2025-05-25",
    department: "Finance",
    manager: "John Doe",
  },
  {
    accountId: "Sophia Davis",
    userId: "7243215",
    entitlementName: "Job Title",
    entitlementDescription: "Change Since Last Review",
    aiInsights: "thumbs-up",
    accountSummary: "Elevated Accounts",
    accountActivity: "Active in past 30-60 days",
    changeSinceLastReview: "New entitlements",
    accountType: "Privileged",
    userType: "Active",
    lastLoginDate: "2025-05-22",
    department: "Marketing",
    manager: "Jane Smith",
  },
  {
    accountId: "Michael Brown",
    userId: "7241234",
    entitlementName: "Analyst",
    entitlementDescription: "New Entitlement",
    aiInsights: "thumbs-up",
    accountSummary: "Orphan Accounts",
    accountActivity: "Active in past more than 90 days",
    changeSinceLastReview: "Old accounts",
    accountType: "Orphan",
    userType: "Disable",
    lastLoginDate: "2025-04-10",
    department: "Operations",
    manager: "David Johnson",
  },
  {
    accountId: "Lisa Thompson",
    userId: "7241987",
    entitlementName: "Admin",
    entitlementDescription: "Old Account - Retained Access",
    aiInsights: "thumbs-down",
    accountSummary: "Terminated User Accounts",
    accountActivity: "Active in past more than 90 days",
    changeSinceLastReview: "Old accounts",
    accountType: "Disabled",
    userType: "Disable",
    lastLoginDate: "2025-03-05",
    department: "HR",
    manager: "Emily Davis",
  },
  {
    accountId: "Kevin Smith",
    userId: "7248892",
    entitlementName: "Developer",
    entitlementDescription: "Elevated Access Granted",
    aiInsights: "thumbs-up",
    accountSummary: "Elevated Accounts",
    accountActivity: "Active in past 30 days",
    changeSinceLastReview: "New entitlements",
    accountType: "Privileged",
    userType: "Active",
    lastLoginDate: "2025-05-20",
    department: "Engineering",
    manager: "Mark Wilson",
  },
];

const data: {
  accountSummary: DataItem[];
  accountActivity: DataItem[];
  changeSinceLastReview: DataItem[];
} = {
  accountSummary: [
    { label: "Regular Accounts", value: 0 },
    { label: "Elevated Accounts", value: 0 },
    { label: "Orphan Accounts", value: 0 },
    { label: "Terminated User Accounts", value: 0 },
  ],
  accountActivity: [
    { label: "Active in past 30 days", value: 0 },
    { label: "Active in past 30-60 days", value: 0 },
    { label: "Active in past more than 90 days", value: 0 },
  ],
  changeSinceLastReview: [
    { label: "New accounts", value: 0 },
    { label: "Old accounts", value: 0 },
    { label: "New entitlements", value: 0 },
  ],
};

// Custom Detail Cell Renderer for Entitlement Description
const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const { data } = props;
  return (
    <div className="flex p-4 bg-gray-50 border-t border-gray-200 ml-10">
      <div className="flex flex-row items-center gap-2">
        <span className="font-bold text-md text-[#1759e4]">Entitlement Description:-</span>
        <span className="text-gray-800">{data.entitlementDescription}</span>
      </div>
    </div>
  );
};

export default function AppOwner() {
  const [selected, setSelected] = useState<{ [key: string]: number | null }>({});
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
  const [isGridReady, setIsGridReady] = useState(false);
  const pageSizeSelector = [5, 10, 20, 50, 100];
  const defaultPageSize = pageSizeSelector[0];
  const [pageNumber, setPageNumber] = useState(1);
  const gridApiRef = useRef<GridApi | null>(null);
  const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(new Map());
  const [comment, setComment] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

  const handleOpen = () => setSidebarOpen(true);
  const handleClose = () => setSidebarOpen(false);

  const openModal = () => {
    alert("Modal opened");
  };

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 100,
    }),
    []
  );

const autoGroupColumnDef = useMemo<ColDef>(
  () => ({
    minWidth: 200,
    cellRendererParams: {
      suppressExpand: true, // Hide the arrow for dynamic group column
    },
  }),
  []
);

  const detailCellRenderer = useCallback(DetailCellRenderer, []);

  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
    {
      field: "accountId",
      headerName: "Account ID",
      cellRenderer: "agGroupCellRenderer", 
      cellRendererParams: {
        suppressExpand: true,
        innerRenderer: (params: ICellRendererParams) => {
          const { accountType } = params.data || {};
          const accountTypeLabel = accountType ? `(${accountType})` : "";
          return (
            <div className="flex items-center space-x-2">
              <div
                className="flex flex-col gap-0 cursor-pointer hover:underline"
                onClick={openModal}
              >
                <span className="text-gray-800 font-bold text-[14px]">
                  {params.value}{" "}
                  {accountType && (
                    <span
                      className="text-[#175AE4] font-normal"
                      title={`Account Type: ${accountType}`}
                    >
                      {accountTypeLabel}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        },
      },
      cellClass: "ag-cell-no-padding",
    },
    {
      field: "risk",
      headerName: "Risk",
      width: 100,
      cellRenderer: (params: ICellRendererParams) => {
        const userName = params.value;
        const risk = params.data?.risk;
        const riskColor =
          risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
        return <span style={{ color: riskColor }}>{userName}</span>;
      },
    },
    {
      field: "Display Name",
      headerName: "Display Name",
      cellRenderer: (params: ICellRendererParams) => {
        const { userType } = params.data || {};
        const userTypeLabel = userType ? `(${userType})` : "";
        return (
          <div
            className="flex flex-col gap-0 cursor-pointer hover:underline"
            onClick={openModal}
          >
            <span className="text-gray-800">
              {/* {params.value}{" "}
              {userType && (
                <span
                  className="text-[#175AE4] font-normal"
                  title={`User Type: ${userType}`}
                >
                  {userTypeLabel}
                </span>
              )} */}
            </span>
          </div>
        );
      },
    },
    {
      field: "entitlementName",
      headerName: "Entitlement Name",
      enableRowGroup: true,
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex flex-col gap-0">
          <span className="text-gray-800">{params.value}</span>
        </div>
      ),
    },
    {
      field: "lastLogin",
      headerName: "Last Login Date",
      enableRowGroup: true,
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex flex-col gap-0">
          <span className="text-gray-800">{params.value}</span>
        </div>
      ),
    },
    {
      field: "aiInsights",
      headerName: "AI Insights",
      cellRenderer: (params: ICellRendererParams) => {
        const icon =
          params.value === "thumbs-up" ? (
            <svg width="21" height="16" viewBox="0 0 21 18" className="m-auto">
              <path
                fill="#34C759"
                d="M3.76 7.5V18.76H0V7.5H3.76ZM18.76 6.24C18.9277 6.23138 19.0954 6.25807 19.2522 6.31834C19.409 6.37861 19.5513 6.47112 19.6701 6.58989C19.7889 6.70866 19.8814 6.85103 19.9417 7.00781C20.0019 7.16458 20.0286 7.33226 20.02 7.5V12.16C19.9961 12.3819 19.9353 12.5982 19.84 12.8L17 17.54C16.772 17.9044 16.4571 18.2066 16.0837 18.4195C15.7102 18.6324 15.2898 18.7494 14.86 18.76H7.5C6.83696 18.76 6.20107 18.4966 5.73223 18.0278C5.26339 17.5589 5 16.923 5 16.26V7.12C5.00576 6.55515 5.19531 6.00753 5.54 5.56L10 0C10.3342 0 10.6547 0.13275 10.891 0.369045C11.1273 0.605341 11.26 0.925827 11.26 1.26V6.26L18.76 6.24Z"
              />
            </svg>
          ) : (
            <svg
              width="21"
              height="16"
              viewBox="0 0 21 18"
              fill="none"
              className="m-auto"
            >
              <path
                fill="#FF2D55"
                d="M3.76 11.24V0H0V11.26L3.76 11.24ZM18.76 12.5C18.9277 12.5086 19.0954 12.4819 19.2522 12.4217C19.409 12.3614 19.5513 12.2689 19.6701 12.1501C19.7889 12.0313 19.8814 11.889 19.9417 11.7322C20.0019 11.5754 20.0286 11.4077 20.02 11.24V6.58C19.9961 6.35812 19.9353 6.1418 19.84 5.94L17 1.2C16.7678 0.836499 16.4487 0.53649 16.0717 0.327006C15.6946 0.117522 15.2713 0.00514447 14.84 0H7.5C6.83696 0 6.20107 0.263392 5.73223 0.732233C5.26339 1.20107 5 1.83696 5 2.5V11.62C5 12.1933 5.18 12.7133 5.54 13.18L10 18.74C10.3342 18.74 10.6547 18.6073 10.891 18.371C11.1273 18.1347 11.26 17.8142 11.26 17.48V12.48L18.76 12.5Z"
              />
            </svg>
          );
        return (
          <div className="flex flex-col gap-0">
            <span className="text-gray-800 cursor-pointer">{icon}</span>
          </div>
        );
      },
      onCellClicked: handleOpen,
    },
    { field: "Account Type", headerName: "Account Type", flex: 2, hide: true },
    { field: "User Status", headerName: "User Status", flex: 2, hide: true },
    { field: "User ID", headerName: "User ID", flex: 2, hide: true },
    { field: "User Manager", headerName: "User Manager", flex: 2, hide: true },
    { field: "User Dept", headerName: "User Dept", flex: 2, hide: true },
    { field: "Job Title", headerName: "Job Title", flex: 2, hide: true },
    { field: "Access Grant Date", headerName: "Access Grant Date", flex: 2, hide: true },
    { field: "User Type", headerName: "User Type", flex: 2, hide: true },
    { field: "Entitlement Type", headerName: "Entitlement Type", flex: 2, hide: true },
    {
      field: "actions",
      headerName: "Actions",
      cellRenderer: (params: ICellRendererParams) => {
        return <ActionButtons api={params.api} selectedRows={[params.data]} />;
      },
    },
  ]);

  // Get columns available for row grouping
  const groupableColumns = useMemo(() => {
    return columnDefs
      .filter((col) => col.enableRowGroup && col.field)
      .map((col) => ({
        field: col.field!,
        headerName: col.headerName || col.field!,
      }));
  }, [columnDefs]);

  // Apply row grouping with retry mechanism
  const applyRowGrouping = (
    selectedField: string | null,
    retries = 5,
    delay = 500
  ) => {
    console.log(
      `Attempting to apply row grouping for: ${selectedField}, retries left: ${retries}`
    );
    if (gridApiRef.current && gridApiRef.current.columnApi) {
      const columnApi = gridApiRef.current.columnApi;
      console.log("Row grouping applied successfully for:", selectedField);
      columnApi.setRowGroupColumns([]);
      if (selectedField) {
        columnApi.setRowGroupColumns([selectedField]);
      }
    } else if (retries > 0) {
      console.warn(`Grid API not ready, retrying (${retries} attempts left)`);
      setTimeout(
        () => applyRowGrouping(selectedField, retries - 1, delay * 2),
        delay
      );
    } else {
      console.error(
        "Failed to apply row grouping: Grid API or Column API not available after retries"
      );
      alert("Unable to group rows at this time. Please try again later.");
    }
  };

  // Handle group by column change
  const handleGroupByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedField = event.target.value || null;
    console.log("Group by changed to:", selectedField);
    setGroupByColumn(selectedField);
    if (isGridReady) {
      applyRowGrouping(selectedField);
    } else {
      console.log("Grid not ready, deferring group change to onGridReady");
    }
  };

  // Expand the first row by default
  const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    params.api.forEachNode(function (node) {
      if (node.id === "0") {
        node.setExpanded(true);
      }
    });
  }, []);

  // Log grid initialization status and apply initial grouping
  useEffect(() => {
    if (isGridReady && gridApiRef.current && gridApiRef.current.columnApi) {
      console.log("Grid API and Column API initialized successfully", {
        groupByColumn,
        columns: gridApiRef.current.columnApi
          ?.getAllColumns()
          ?.map((col) => col.getColId()),
      });
      if (groupByColumn) {
        applyRowGrouping(groupByColumn);
      }
    }
  }, [isGridReady, groupByColumn]);

  return (
    <>
      <h1 className="text-xl font-bold mb-6 border-b border-gray-300 pb-2 text-blue-950">
        Application Owner
      </h1>
      <Accordion
        iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
        open={true}
      >
        <ChartAppOwnerComponent />
      </Accordion>
      <div className="flex items-center justify-between mb-4 relative z-10 pt-10">
        <SelectAll
          gridApi={gridApiRef.current}
          detailGridApis={detailGridApis}
          clearDetailGridApis={() => setDetailGridApis(new Map())}
          showExpandCollapse={true}
        />
        <div className="flex items-center space-x-4">
          {/* <div className="flex items-center">
            <label htmlFor="groupBy" className="mr-2 text-sm font-semibold">
              Group By:
            </label>
            <select
              id="groupBy"
              value={groupByColumn || ""}
              onChange={handleGroupByChange}
              disabled={!isGridReady}
              className={`border border-gray-300 rounded-md px-2 py-1 text-sm ${
                !isGridReady ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <option value="">None</option>
              {groupableColumns.map((col) => (
                <option key={col.field} value={col.field}>
                  {col.headerName}
                </option>
              ))}
            </select>
          </div> */}
          <CustomPagination
            totalItems={rowData.length}
            currentPage={pageNumber}
            totalPages={Math.ceil(rowData.length / defaultPageSize)}
            pageSize={defaultPageSize}
            onPageChange={handlePageChange}
          />
          <Filters gridApi={gridApiRef} />
          <Exports gridApi={gridApiRef.current} />
          <MailIcon
            size={32}
            color="#35353A"
            className="transform scale-[.6]"
          />
          <ColumnSettings
            columnDefs={columnDefs}
            gridApi={gridApiRef.current}
            visibleColumns={() => {
              const visibleCols: string[] = [];
              columnDefs.forEach((colDef) => {
                if (colDef.field) {
                  visibleCols.push(colDef.field);
                }
              });
              return visibleCols;
            }}
          />
        </div>
      </div>
      <div style={{ height: "100%", width: "100%" }}>
        <AgGridReact
          rowData={rowData}
          getRowId={(params: GetRowIdParams) => params.data.accountId}
          columnDefs={columnDefs}
          groupDefaultExpanded={-1}
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          rowGroupPanelShow={"never"}
          domLayout="autoHeight"
          rowSelection={{
            mode: "multiRow",
            masterSelects: "detail",
          }}
          masterDetail={true}
          detailCellRenderer={detailCellRenderer}
          detailRowAutoHeight={true}
          onGridReady={(params) => {
            console.log("onGridReady triggered at", new Date().toISOString());
            gridApiRef.current = params.api;
            params.api.sizeColumnsToFit();
            setIsGridReady(true);
            console.log("Grid initialized:", {
              api: !!params.api,
              columnApi: !!params.columnApi,
              enterpriseModules: params.api.isEnterprise?.()
                ? "Loaded"
                : "Not loaded",
              columns: params.columnApi
                ?.getAllColumns()
                ?.map((col) => col.getColId()),
            });
          }}
          onFirstDataRendered={onFirstDataRendered}
          pagination={false}
          overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
          overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
          className="ag-theme-quartz ag-main"
        />
      </div>
      <RightSidebar isOpen={isSidebarOpen} onClose={handleClose}>
        <div className="max-w-3xl mx-auto p-4 bg-white shadow-lg rounded-xl border border-gray-200 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Task summary</h2>
            <p className="text-sm text-gray-500">Review the access below</p>
          </div>
          <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-md">
            <div className="flex-1">
              <p className="font-medium">Tye Davis</p>
              <p className="text-sm text-gray-500">
                tye.davis@conductorone.com - User - SSO
              </p>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex-1">
              <p className="font-medium">Admin</p>
              <p className="text-sm text-gray-500">AWS - IAM role</p>
            </div>
          </div>
          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-md">
            <p className="font-semibold flex items-center text-yellow-700">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Copilot suggests taking a closer look at this access
            </p>
            <ul className="list-decimal list-inside mt-2 text-sm text-yellow-800 space-y-1">
              <li>
                This access is critical risk and this user might be
                over-permissioned
              </li>
              <li>
                Users with the job title Sales don't usually have this access
              </li>
            </ul>
          </div>
          <div className="space-y-1 text-sm">
            <p className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <strong className="m-1">Tye Davis</strong> is{" "}
              <strong className="m-1">active</strong> in Okta
            </p>
            <p className="text-gray-700">
              Tye Davis last logged into AWS on Nov 1, 2023:{" "}
              <strong>1 month ago</strong>
            </p>
            <p className="text-red-600">
              This entitlement is marked as <strong>Critical</strong> risk
            </p>
            <p className="text-gray-700">
              1 out of 11 users with the title Sales have this entitlement
            </p>
            <p className="text-gray-700">
              1 out of 2495 users in your organization have this entitlement
            </p>
            <p className="text-gray-700">
              1 out of 13 accounts in this application have this entitlement
            </p>
          </div>
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">
                Should this user have this access?
              </h3>
              <div className="space-x-2 p-2">
                <ActionButtons />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Certify or recommend removing this user’s access.
              <a href="#" className="text-blue-600 hover:underline ml-1">
                More about decisions
              </a>
            </p>
          </div>
          <div className="pt-4">
            <input
              type="text"
              placeholder="Ask me Anything"
              value={comment}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              disabled={!comment.trim()}
              className={`mt-4 px-3 py-1 rounded-lg text-sm ${
                comment.trim()
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Submit
            </button>
          </div>
        </div>
      </RightSidebar>
    </>
  );
}