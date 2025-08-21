"use client";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";
import HorizontalTabs from "@/components/HorizontalTabs";
import { ColDef, GridApi, ICellRendererParams } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import "@/lib/ag-grid-setup";
import Exports from "@/components/agTable/Exports";
import EditReassignButtons from "@/components/agTable/EditReassignButtons";
import ActionButtons from "@/components/agTable/ActionButtons";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

const data: Record<string, DataItem[]> = {
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

const dataAccount: Record<string, DataItem[]> = {
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
};
export default function ApplicationDetailPage() {
  const [tabIndex, setTabIndex] = useState(1);
  const gridApiRef = useRef<GridApi | null>(null);
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );

  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const rowData = [
    {
      account: "Adonis Salinas",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Adonis Salinas",
    },
    {
      account: "Adeline Guerrero",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Adeline Guerrero",
    },
    {
      account: "Adam Torres",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Adam Torres",
    },
    {
      account: "Adalyn Le",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Adalyn Le",
    },
    {
      account: "Abigail Gutierrez",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Abigail Gutierrez",
    },
    {
      account: "Abel Curtis",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Abel Curtis",
    },
    {
      account: "Aaliyah Munoz",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Aaliyah Munoz",
    },
    {
      account: "Adelyn Casey",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Adelyn Casey",
    },
    {
      account: "Addison Wallace",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Addison Wallace",
    },
    {
      account: "Adam St.",
      accountStatus: "Active",
      accountType: "User",
      discoveryDate: "6/17/24",
      externalDomain: "No",
      userStatus: "Active",
      user: "Adam St.",
    },
  ];

  const rowData2 = [
    {
      "Ent ID": "ENT201",
      "Ent Name": "Server Admin",
      "Ent Description":
        "Administrative access to on-premises server infrastructure",
      "Total Assignments": 8,
      "Last Sync": "2025-07-13T12:00:00Z",
      Requestable: "Yes",
      Certifiable: "Yes",
      Risk: "High",
      "SOD Check": "Passed",
      Hierarchy: "Top-level",
      "Pre- Requisite": "Server Admin Training",
      "Pre-Requisite Details": "Completion of Windows Server Admin course",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "Manage server configurations and updates",
      "Business Objective": "Maintain server uptime and security",
      "Compliance Type": "ISO 27001",
      "Access Scope": "Global",
      "Last Reviewed on": "2025-06-25",
      Reviewed: "Yes",
      "Dynamic Tag": "Infrastructure",
      "MFA Status": "Enabled",
      "Review Schedule": "Quarterly",
      "Ent Owner": "Emily Carter",
      "Created On": "2024-03-10",
    },
    {
      "Ent ID": "ENT202",
      "Ent Name": "HR Viewer",
      "Ent Description": "Read-only access to HR system reports",
      "Total Assignments": 20,
      "Last Sync": "2025-07-12T15:30:00Z",
      Requestable: "No",
      Certifiable: "No",
      Risk: "Low",
      "SOD Check": "Not Required",
      Hierarchy: "Low-level",
      "Pre- Requisite": "None",
      "Pre-Requisite Details": "N/A",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "Yes",
      "Capability/Technical Scope": "View employee data and reports",
      "Business Objective": "Support HR analytics",
      "Compliance Type": "GDPR",
      "Access Scope": "Departmental",
      "Last Reviewed on": "2025-05-15",
      Reviewed: "No",
      "Dynamic Tag": "HR",
      "MFA Status": "Disabled",
      "Review Schedule": "Annual",
      "Ent Owner": "Mark Thompson",
      "Created On": "2024-08-01",
    },
  ];

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
                // onClick={openModal}
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
            // onClick={openModal}
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
      field: "lastaction",
      headerName: "Last Action Review",

    },
    { field: "Account Type", headerName: "Account Type", flex: 2, hide: true },
    { field: "User Status", headerName: "User Status", flex: 2, hide: true },
    { field: "User ID", headerName: "User ID", flex: 2, hide: true },
    { field: "User Manager", headerName: "User Manager", flex: 2, hide: true },
    { field: "User Dept", headerName: "User Dept", flex: 2, hide: true },
    { field: "Job Title", headerName: "Job Title", flex: 2, hide: true },
    {
      field: "Access Grant Date",
      headerName: "Access Grant Date",
      flex: 2,
      hide: true,
    },
    { field: "User Type", headerName: "User Type", flex: 2, hide: true },
    {
      field: "Entitlement Type",
      headerName: "Entitlement Type",
      flex: 2,
      hide: true,
    },
    {
      field: "syncDate",
      headerName: "Sync Date",

    },
  ]);

  const colDefs = useMemo<ColDef[]>(
    () => [
      // Default 6 visible columns
      { field: "Ent ID", headerName: "Entitlement ID", flex: 2 },
      { field: "Ent Name", headerName: "Enttitlement Name", flex: 2 },
      {
        field: "Ent Description",
        headerName: "Entitlement Description",
        flex: 2,
      },
      {
        field: "Total Assignments",
        headerName: "Total Assignments",
        flex: 1.5,
      },
      { field: "Last Sync", headerName: "Last Sync", flex: 2 },
      { field: "Requestable", headerName: "Requestable", flex: 2 },

      // Remaining hidden columns (initially hidden)
      { field: "Certifiable", headerName: "Certifiable", flex: 2, hide: true },
      { field: "Risk", headerName: "Risk", flex: 1.5, hide: true },
      { field: "SOD Check", headerName: "SOD Check", flex: 1.5, hide: true },
      { field: "Hierarchy", headerName: "Hierarchy", flex: 2, hide: true },
      {
        field: "Pre- Requisite",
        headerName: "Pre- Requisite",
        flex: 2,
        hide: true,
      },
      {
        field: "Pre-Requisite Details",
        headerName: "Pre-Requisite Details",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Revoke on Disable",
        headerName: "Revoke on Disable",
        flex: 1.5,
        hide: true,
      },
      { field: "Shared Pwd", headerName: "Shared Pwd", flex: 1.5, hide: true },
      {
        field: "Capability/Technical Scope",
        headerName: "Capability/Technical Scope",
        flex: 2,
        hide: true,
      },
      {
        field: "Business Objective",
        headerName: "Busines Objective",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Compliance Type",
        headerName: "Compliance Type",
        flex: 2,
        hide: true,
      },
      {
        field: "Access Scope",
        headerName: "Access Scope",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Last Reviewed on",
        headerName: "Last Reviewed on",
        flex: 1.5,
        hide: true,
      },
      { field: "Reviewed", headerName: "Reviewed", flex: 2, hide: true },
      { field: "Dynamic Tag", headerName: "Dynamic Tag", flex: 2, hide: true },
      { field: "MFA Status", headerName: "MFA Status", flex: 1.5, hide: true },
      {
        field: "Review Schedule",
        headerName: "Review Schedule",
        flex: 2,
        hide: true,
      },
      {
        field: "Ent Owner",
        headerName: "Entitlement Owner",
        flex: 1.5,
        hide: true,
      },
      { field: "Created On", headerClass: "Created On", flex: 2, hide: true },
      {
        field: "actionColumn",
        headerName: "Action",
        flex: 2,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <EditReassignButtons api={params.api} selectedRows={params.data} />
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    []
  );

  const detailCellRendererParams = useMemo(() => {
    return {
      detailGridOptions: {
        columnDefs: [{ field: "info", headerName: "Detail Info", flex: 1 }],
        defaultColDef: {
          flex: 1,
        },
      },
      getDetailRowData: (params: any) => {
        params.successCallback([{ info: params.data.details }]);
      },
    };
  }, []);

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  const tabsData = [
    {
      label: "About",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => <p>Coming Soon...</p>,
    },
    {
      label: "Accounts",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        return (
          <div
            className="ag-theme-alpine"
            style={{ height: 500, width: "100%" }}
          >
            <div className="relative mb-4">
              <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
                Accounts
              </h1>
              <Accordion
                iconClass="absolute top-2 right-0 rounded-full text-white bg-purple-800"
                title="Expand/Collapse"
              >
                <div className="grid grid-cols-4 gap-10 p-2">
                  {Object.entries(dataAccount).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-2 p-4">
                        <h3 className="font-semibold text-sm capitalize">
                          {category.replace(/([A-Z])/g, " $1")}
                        </h3>
                        <button
                          onClick={() => {
                            setSelected((prev) => ({
                              ...prev,
                              [category]: null,
                            }));
                          }}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Clear
                          {selected[category] !== undefined &&
                          selected[category] !== null ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>

                      <div className="space-y-2 pl-8 pr-8">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className={`flex text-sm relative items-center p-3 rounded-sm cursor-pointer transition-all ${
                              selected[category] === index
                                ? "bg-[#6574BD] text-white"
                                : "bg-[#F0F2FC] hover:bg-[#e5e9f9]"
                            } ${item.color || ""}`}
                            onClick={() => handleSelect(category, index)}
                          >
                            <span>{item.label}</span>
                            <span
                              className={`font-semibold absolute -right-2 bg-white border p-1 text-[12px]  rounded-sm ${
                                selected[category] === index
                                  ? "border-[#6574BD] text-[#6574BD]"
                                  : "border-[#e5e9f9]"
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            </div>
            <div className="flex justify-end mb-4 relative z-10 pt-10">
              <Exports gridApi={gridApiRef.current} />
            </div>

            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              // rowSelection={rowSelection}
              masterDetail={true}
              detailCellRendererParams={detailCellRendererParams}
            />
          </div>
        );
      },
    },
    {
      label: "Entitlements",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        return (
          <div
            className="ag-theme-alpine"
            style={{ height: 500, width: "100%" }}
          >
            <div className="relative mb-2">
              <h1 className="text-xl font-bold pb-2 text-blue-950">
                Entitlements
              </h1>
              <Accordion
                iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
                open={true}
              >
                <div className="grid grid-cols-4 gap-10 p-2">
                  {Object.entries(data).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-2 p-4">
                        <h3 className="font-semibold text-sm capitalize">
                          {category.replace(/([A-Z])/g, " $1")}
                        </h3>
                        <button
                          onClick={() => {
                            setSelected((prev) => ({
                              ...prev,
                              [category]: null,
                            }));
                          }}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Clear
                          {selected[category] !== undefined &&
                          selected[category] !== null ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>

                      <div className="space-y-2 pl-8 pr-8">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className={`flex text-sm relative items-center p-3 rounded-sm cursor-pointer transition-all ${
                              selected[category] === index
                                ? "bg-[#6574BD] text-white"
                                : "bg-[#F0F2FC] hover:bg-[#e5e9f9]"
                            } ${item.color || ""}`}
                            onClick={() => handleSelect(category, index)}
                          >
                            <span>{item.label}</span>
                            <span
                              className={`font-semibold absolute -right-2 bg-white border p-1 text-[12px]  rounded-sm ${
                                selected[category] === index
                                  ? "border-[#6574BD] text-[#6574BD]"
                                  : "border-[#e5e9f9]"
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            </div>
            <div className="flex justify-end mb-4 relative z-10 pt-10">
              <Exports gridApi={gridApiRef.current} />
            </div>

            <AgGridReact
              rowData={rowData2}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              // rowSelection={rowSelection}
              masterDetail={true}
              detailCellRendererParams={detailCellRendererParams}
            />
          </div>
        );
      },
    },
    {
      label: "Sampling",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => <p>Coming Soon...</p>,
    },
  ];

  return (
    <>
      <HorizontalTabs
        tabs={tabsData}
        activeIndex={tabIndex}
        onChange={setTabIndex}
      />
    </>
  );
}
