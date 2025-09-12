"use client";
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams, GridApi } from "ag-grid-community";
import "@/lib/ag-grid-setup";
import EditReassignButtons from "@/components/agTable/EditReassignButtons";
import { formatDateMMDDYY } from "../access-review/page";
import { CircleCheck, CircleX, InfoIcon } from "lucide-react";

interface TabProps {
  tabs: { label: string }[];
  activeClass: string;
  buttonClass: string;
  className: string;
  activeIndex: number;
  onChange: (index: number) => void;
}

const Tabs: React.FC<TabProps> = ({
  tabs,
  activeClass,
  buttonClass,
  className,
  activeIndex,
  onChange,
}) => {
  return (
    <div className={className}>
      {tabs.map((tab, index) => (
        <button
          key={tab.label}
          className={`flex items-center justify-center ${
            index === activeIndex
              ? activeClass
              : "text-gray-500 hover:text-gray-700"
          } ${buttonClass}`}
          onClick={() => onChange(index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

const page = () => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData] = useState<any[]>([
    {
      entitlementName: "Sales Team Unique",
      description: "Access to sales team resources and tools",
      type: "Group",
      risk: "Medium",
      applicationName: "Open LDAP",
      assignment: "Direct",
      "Last Sync": "2024-01-15",
      "Last Reviewed on": "2024-01-10",
      "Total Assignments": 25,
      Requestable: "Yes",
      Certifiable: "Yes",
      "SOD Check": "Passed",
      Hierarchy: "Level 2",
      "Pre- Requisite": "No",
      "Pre-Requisite Details": "None",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "Sales Operations",
      "Business Objective": "Revenue Generation",
      "Compliance Type": "SOX",
      "Access Scope": "Global",
      Reviewed: "Yes",
      "Dynamic Tag": "Sales",
      "MFA Status": "Required",
      "Review Schedule": "Quarterly",
      "Ent Owner": "Sales Manager",
      "Created On": "2023-06-01",
    },
    {
      entitlementName: "Marketing Department Unique",
      description: "Access to marketing tools and campaigns",
      type: "Group",
      risk: "Low",
      applicationName: "Open LDAP",
      assignment: "Direct",
      "Last Sync": "2024-01-14",
      "Last Reviewed on": "2024-01-08",
      "Total Assignments": 15,
      Requestable: "Yes",
      Certifiable: "Yes",
      "SOD Check": "Passed",
      Hierarchy: "Level 1",
      "Pre- Requisite": "No",
      "Pre-Requisite Details": "None",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "Marketing Operations",
      "Business Objective": "Brand Awareness",
      "Compliance Type": "GDPR",
      "Access Scope": "Regional",
      Reviewed: "Yes",
      "Dynamic Tag": "Marketing",
      "MFA Status": "Required",
      "Review Schedule": "Monthly",
      "Ent Owner": "Marketing Manager",
      "Created On": "2023-05-15",
    },
    {
      entitlementName: "Human Resources Unique",
      description: "Access to HR systems and employee data",
      type: "Group",
      risk: "High",
      applicationName: "Open LDAP",
      assignment: "Direct",
      "Last Sync": "2024-01-13",
      "Last Reviewed on": "2024-01-05",
      "Total Assignments": 8,
      Requestable: "No",
      Certifiable: "Yes",
      "SOD Check": "Failed",
      Hierarchy: "Level 3",
      "Pre- Requisite": "Yes",
      "Pre-Requisite Details": "HR Certification Required",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "HR Operations",
      "Business Objective": "Employee Management",
      "Compliance Type": "HIPAA",
      "Access Scope": "Global",
      Reviewed: "No",
      "Dynamic Tag": "HR",
      "MFA Status": "Required",
      "Review Schedule": "Weekly",
      "Ent Owner": "HR Director",
      "Created On": "2023-04-20",
    },
    {
      entitlementName: "IT Support Unique",
      description: "Administrative access to IT systems",
      type: "Role",
      risk: "High",
      applicationName: "Open LDAP",
      assignment: "Direct",
      "Last Sync": "2024-01-12",
      "Last Reviewed on": "2024-01-03",
      "Total Assignments": 5,
      Requestable: "No",
      Certifiable: "Yes",
      "SOD Check": "Passed",
      Hierarchy: "Level 4",
      "Pre- Requisite": "Yes",
      "Pre-Requisite Details": "IT Certification Required",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "System Administration",
      "Business Objective": "System Maintenance",
      "Compliance Type": "SOX",
      "Access Scope": "Global",
      Reviewed: "Yes",
      "Dynamic Tag": "IT",
      "MFA Status": "Required",
      "Review Schedule": "Weekly",
      "Ent Owner": "IT Director",
      "Created On": "2023-03-10",
    },
    {
      entitlementName: "Finance Department Unique",
      description: "Access to financial systems and reports",
      type: "Group",
      risk: "High",
      applicationName: "Open LDAP",
      assignment: "Direct",
      "Last Sync": "2024-01-11",
      "Last Reviewed on": "2024-01-01",
      "Total Assignments": 12,
      Requestable: "No",
      Certifiable: "Yes",
      "SOD Check": "Passed",
      Hierarchy: "Level 3",
      "Pre- Requisite": "Yes",
      "Pre-Requisite Details": "Finance Certification Required",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "Financial Operations",
      "Business Objective": "Financial Management",
      "Compliance Type": "SOX",
      "Access Scope": "Global",
      Reviewed: "Yes",
      "Dynamic Tag": "Finance",
      "MFA Status": "Required",
      "Review Schedule": "Monthly",
      "Ent Owner": "CFO",
      "Created On": "2023-02-15",
    },
    {
      entitlementName: "Product Development Unique",
      description: "Access to development tools and repositories",
      type: "Group",
      risk: "Medium",
      applicationName: "Open LDAP",
      assignment: "Direct",
      "Last Sync": "2024-01-10",
      "Last Reviewed on": "2023-12-28",
      "Total Assignments": 20,
      Requestable: "Yes",
      Certifiable: "Yes",
      "SOD Check": "Passed",
      Hierarchy: "Level 2",
      "Pre- Requisite": "No",
      "Pre-Requisite Details": "None",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "Software Development",
      "Business Objective": "Product Innovation",
      "Compliance Type": "GDPR",
      "Access Scope": "Global",
      Reviewed: "Yes",
      "Dynamic Tag": "Development",
      "MFA Status": "Required",
      "Review Schedule": "Quarterly",
      "Ent Owner": "CTO",
      "Created On": "2023-01-20",
    },
    {
      entitlementName: "Customer Service Unique",
      description: "Access to customer support systems",
      type: "Group",
      risk: "Low",
      applicationName: "Open LDAP",
      assignment: "Direct",
      "Last Sync": "2024-01-09",
      "Last Reviewed on": "2023-12-25",
      "Total Assignments": 30,
      Requestable: "Yes",
      Certifiable: "Yes",
      "SOD Check": "Passed",
      Hierarchy: "Level 1",
      "Pre- Requisite": "No",
      "Pre-Requisite Details": "None",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "Customer Support",
      "Business Objective": "Customer Satisfaction",
      "Compliance Type": "GDPR",
      "Access Scope": "Regional",
      Reviewed: "Yes",
      "Dynamic Tag": "Support",
      "MFA Status": "Required",
      "Review Schedule": "Monthly",
      "Ent Owner": "Support Manager",
      "Created On": "2022-12-01",
    },
  ]);

  const [entTabIndex, setEntTabIndex] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [nodeData, setNodeData] = useState<any>(null);

  // Define tabs data
  const tabsDataEnt = [{ label: "All" }, { label: "Under Review" }];

  // Use rowData directly since no filtering is needed
  const filteredRowData = rowData;

  // Action handlers for Under Review tab
  const handleApprove = () => {
    setLastAction("Approve");
    setError(null);
    console.log("Approve action triggered");
  };

  const handleRevoke = () => {
    setLastAction("Revoke");
    setError(null);
    console.log("Revoke action triggered");
  };

  const handleComment = () => {
    setLastAction("Comment");
    setError(null);
    console.log("Comment action triggered");
  };

  const toggleSidePanel = (data: any) => {
    if (isSidePanelOpen && nodeData === data) {
      setIsSidePanelOpen(false);
      setNodeData(null);
    } else {
      setIsSidePanelOpen(true);
      setNodeData(data);
    }
  };

  // Initialize data
  useEffect(() => {
    setTotalItems(rowData.length);
    setTotalPages(Math.ceil(rowData.length / 20));
    setHasNext(currentPage < Math.ceil(rowData.length / 20));
    setHasPrevious(currentPage > 1);
  }, [rowData, currentPage]);

  // Pagination controls
  const handleNextPage = () => {
    if (hasNext) setCurrentPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (hasPrevious) setCurrentPage((prev) => prev - 1);
  };

  const handleRowClick = (event: any) => {
    const entitlementData = {
      entitlementName: event.data.entitlementName || "N/A",
      appName: event.data.applicationName || "N/A",
      appOwner: event.data["Ent Owner"] || "N/A",
      risk: event.data.risk || "N/A",
      totalAssignments: event.data["Total Assignments"] || 0,
      lastSync: event.data["Last Sync"] || "N/A"
    };
    
    console.log('Row clicked - Entitlement data:', entitlementData);
    
    // Store entitlement data in localStorage for HeaderContent
    localStorage.setItem('entitlementDetails', JSON.stringify(entitlementData));
    
    // Dispatch custom event
    const customEvent = new CustomEvent('entitlementDataChange', {
      detail: entitlementData
    });
    window.dispatchEvent(customEvent);
    console.log('Custom event dispatched from catalog page');
  };

  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "entitlementName",
        headerName: "Entitlement",
        flex: 3,
        width: 350,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex flex-col">
              {/* Row 1: entitlement name */}
              <div className="font-semibold">{params.value}</div>

              {/* Row 2: full-width description */}
              <div className="text-gray-600 text-sm w-full z-index-1">
                {params.data["description"]}
              </div>
            </div>
          );
        },
      },
      // { field:"Ent Description", headerName:"Entitlement Description", flex:2},
      { field: "type", headerName: "Type", width: 120 },
      { 
        field: "risk", 
        headerName: "Risk", 
        width: 120,
        hide:true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span className="font-medium" style={{ color: riskColor }}>{risk}</span>;
        },
      },
      { field: "applicationName", headerName: "Application", width: 150,hide:true },
      { field: "assignment", headerName: "Assignment", width: 150,hide:true },
      {
        field: "Last Sync",
        headerName: "Last Sync",
        width: 140,
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
      },
      {
        field: "Last Reviewed on",
        headerName: "Last Reviewed",
        width: 180,
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
      },
      {
        field: "Total Assignments",
        headerName: "Total Assignments",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Requestable",
        headerName: "Requestable",
        width: 100,
        hide: true,
      },
      {
        field: "Certifiable",
        headerName: "Certifiable",
        width: 100,
        hide: true,
      },
      { field: "SOD Check", headerName: "SOD Check", flex: 1.5, hide: true },
      { field: "Hierarchy", headerName: "Hierarchy", width: 100, hide: true },
      {
        field: "Pre- Requisite",
        headerName: "Pre- Requisite",
        width: 100,
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
        width: 100,
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
        width: 100,
        hide: true,
      },
      {
        field: "Access Scope",
        headerName: "Access Scope",
        flex: 1.5,
        hide: true,
      },
      { field: "Reviewed", headerName: "Reviewed", width: 100, hide: true },
      {
        field: "Dynamic Tag",
        headerName: "Dynamic Tag",
        width: 100,
        hide: true,
      },
      { field: "MFA Status", headerName: "MFA Status", flex: 1.5, hide: true },
      {
        field: "Review Schedule",
        headerName: "Review Schedule",
        width: 100,
        hide: true,
      },
      {
        field: "Ent Owner",
        headerName: "Entitlement Owner",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Created On",
        headerClass: "Created On",
        width: 100,
        hide: true,
      },
      {
        field: "actionColumn",
        headerName: "Action",
        width: 100,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <EditReassignButtons
              api={params.api}
              selectedRows={[params.data]}
              nodeData={params.data}
              reviewerId="REVIEWER_ID"
              certId="CERT_ID"
              context="entitlement"
            />
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

  const underReviewColDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "entitlementName",
        headerName: "Entitlement Name",
        width: 650,
        wrapText: true,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex flex-col">
              {/* Row 1: entitlement name */}
              <div className="font-semibold">{params.value}</div>

              <div className="text-gray-600 text-sm w-full">
                {params.data["description"]}
              </div>
            </div>
          );
        },
      },
      { field: "type", headerName: "Type", width: 120 },
      {
        field: "risk",
        headerName: "Risk",
        width: 120,
        hide:true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span className="font-medium" style={{ color: riskColor }}>{risk}</span>;
        },
      },
      { field: "applicationName", headerName: "Application", width: 150 },
      { field: "Last Reviewed on", headerName: "Last Reviewed", width: 180 },
      {
        headerName: "Actions",
        width: 250,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex space-x-4 h-full items-start">
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button
                onClick={handleApprove}
                title="Approve"
                aria-label="Approve selected rows"
                className={`p-1 rounded transition-colors duration-200 ${
                  lastAction === "Approve"
                    ? "bg-green-500"
                    : "hover:bg-green-100"
                }`}
              >
                <CircleCheck
                  className="cursor-pointer"
                  color="#1c821cff"
                  strokeWidth="1"
                  size="32"
                  fill={lastAction === "Approve" ? "#1c821cff" : "none"}
                />
              </button>
              <button
                onClick={handleRevoke}
                title="Revoke"
                aria-label="Revoke selected rows"
                className={`p-1 rounded ${
                  nodeData?.status === "Rejected" ? "bg-red-100" : ""
                }`}
              >
                <CircleX
                  className="cursor-pointer hover:opacity-80 transform rotate-90"
                  color="#FF2D55"
                  strokeWidth="1"
                  size="32"
                  fill={nodeData?.status === "Rejected" ? "#FF2D55" : "none"}
                />
              </button>
              <button
                onClick={handleComment}
                title="Comment"
                aria-label="Add comment"
                className="p-1 rounded"
              >
                <svg
                  width="30"
                  height="30"
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
                onClick={() => toggleSidePanel(params.data)}
                title="Info"
                className={`cursor-pointer rounded-sm hover:opacity-80 ${
                  isSidePanelOpen && nodeData === params.data
                    ? "bg-[#6D6E73]/20"
                    : ""
                }`}
                aria-label="View details"
              >
                <InfoIcon
                  color="#55544dff"
                  size="36"
                  className="transform scale-[0.8]"
                />
              </button>
            </div>
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    [error, lastAction, nodeData, isSidePanelOpen]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  return (
    <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
      <div className="relative mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlements</h1>
        <Tabs
          tabs={tabsDataEnt}
          activeClass="bg-[#2563eb] text-white text-sm rounded-sm"
          buttonClass="h-10 -mt-1 w-30"
          className="border border-gray-300 w-61 h-8 rounded-md flex"
          activeIndex={entTabIndex}
          onChange={setEntTabIndex}
        />
      </div>
      {/* <div className="flex justify-end mb-2">
        <button className="p-2 hover:bg-gray-300 rounded-md transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div> */}
      <div style={{ height: "calc(100% - 80px)", width: "100%" }}>
        <AgGridReact
          rowData={filteredRowData}
          columnDefs={entTabIndex === 0 ? colDefs : underReviewColDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="multiple"
          onRowClicked={handleRowClick}
        />
      </div>
    </div>
  );
};

export default page;
