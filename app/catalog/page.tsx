"use client";
import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import "@/lib/ag-grid-setup";
import EditReassignButtons from "@/components/agTable/EditReassignButtons";
import { formatDateMMDDYY } from "../access-review/page";

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
  const [rowData] = useState<any[]>([
    {
      "Ent ID": "ENT101",
      "Ent Name": "Cloud Admin",
      "Ent Description": "Administrative access to AWS cloud services",
      "Total Assignments": 12,
      "Last Sync": "2025-07-12T10:15:00Z",
      Requestable: "Yes",
      Certifiable: "Yes",
      Risk: "High",
      "SOD Check": "Passed",
      Hierarchy: "Top-level",
      "Pre- Requisite": "AWS Certification",
      "Pre-Requisite Details": "AWS Certified Solutions Architect",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      appOwner: "Alice Johnson",
      appInstance: "AWS-Prod-01",
      appName: "Amazon Web Services",
      "Capability/Technical Scope": "Manage EC2 instances and S3 buckets",
      "Business Objective": "Enable cloud infrastructure management",
      "Compliance Type": "SOC2",
      "Access Scope": "Global",
      "Last Reviewed on": "2025-06-20",
      Reviewed: "Yes",
      "Dynamic Tag": "Cloud",
      "MFA Status": "Enabled",
      "Review Schedule": "Quarterly",
      "Created On": "2024-02-15",
    },
    {
      "Ent ID": "ENT102",
      "Ent Name": "GitHub Developer",
      "Ent Description": "Access to GitHub repositories for code development",
      "Total Assignments": 30,
      "Last Sync": "2025-07-13T09:00:00Z",
      Requestable: "Yes",
      Certifiable: "Yes",
      Risk: "Medium",
      "SOD Check": "Pending",
      Hierarchy: "Mid-level",
      "Pre- Requisite": "Git Training",
      "Pre-Requisite Details": "Completion of GitHub fundamentals course",
      "Revoke on Disable": "No",
      "Shared Pwd": "No",
      appOwner: "Bob Smith",
      appInstance: "GitHub-Dev-Team",
      appName: "GitHub Enterprise",
      "Capability/Technical Scope": "Read/write access to code repositories",
      "Business Objective": "Support software development",
      "Compliance Type": "ISO 27001",
      "Access Scope": "Team",
      "Last Reviewed on": "2025-05-10",
      Reviewed: "Yes",
      "Dynamic Tag": "Development",
      "MFA Status": "Enabled",
      "Review Schedule": "Bi-Annual",
      "Created On": "2024-04-10",
    },
    {
      "Ent ID": "ENT103",
      "Ent Name": "Salesforce Viewer",
      "Ent Description": "Read-only access to Salesforce CRM dashboards",
      "Total Assignments": 45,
      "Last Sync": "2025-07-11T14:20:00Z",
      Requestable: "No",
      Certifiable: "No",
      Risk: "Low",
      "SOD Check": "Not Required",
      Hierarchy: "Low-level",
      "Pre- Requisite": "None",
      "Pre-Requisite Details": "N/A",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "Yes",
      appOwner: "Clara Williams",
      appInstance: "Salesforce-Prod",
      appName: "Salesforce",
      "Capability/Technical Scope": "View customer data and reports",
      "Business Objective": "Monitor sales performance",
      "Compliance Type": "GDPR",
      "Access Scope": "Departmental",
      "Last Reviewed on": "2025-04-25",
      Reviewed: "No",
      "Dynamic Tag": "CRM",
      "MFA Status": "Disabled",
      "Review Schedule": "Annual",
      "Created On": "2024-07-01",
    },
    {
      "Ent ID": "ENT104",
      "Ent Name": "Database Manager",
      "Ent Description": "Full access to manage PostgreSQL databases",
      "Total Assignments": 10,
      "Last Sync": "2025-07-10T16:45:00Z",
      Requestable: "Yes",
      Certifiable: "Yes",
      Risk: "Critical",
      "SOD Check": "Failed",
      Hierarchy: "Top-level",
      "Pre- Requisite": "DBA Certification",
      "Pre-Requisite Details": "PostgreSQL Certified Professional",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      appOwner: "David Lee",
      appInstance: "DB-Prod-01",
      appName: "PostgreSQL",
      "Capability/Technical Scope": "Manage database schemas and queries",
      "Business Objective": "Ensure database performance and security",
      "Compliance Type": "HIPAA",
      "Access Scope": "Global",
      "Last Reviewed on": "2025-03-30",
      Reviewed: "Yes",
      "Dynamic Tag": "Database",
      "MFA Status": "Enabled",
      "Review Schedule": "Monthly",
      "Created On": "2024-01-25",
    },
    {
      "Ent ID": "ENT105",
      "Ent Name": "Network Monitor",
      "Ent Description": "Access to monitor network traffic and configurations",
      "Total Assignments": 20,
      "Last Sync": "2025-07-13T11:30:00Z",
      Requestable: "No",
      Certifiable: "No",
      Risk: "Low",
      "SOD Check": "Passed",
      Hierarchy: "Low-level",
      "Pre- Requisite": "None",
      "Pre-Requisite Details": "N/A",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "Yes",
      appOwner: "Emma Brown",
      appInstance: "Network-Monitor-01",
      appName: "SolarWinds",
      "Capability/Technical Scope": "Monitor network performance",
      "Business Objective": "Ensure network uptime",
      "Compliance Type": "PCI DSS",
      "Access Scope": "Regional",
      "Last Reviewed on": "2025-06-05",
      Reviewed: "Yes",
      "Dynamic Tag": "Network",
      "MFA Status": "Disabled",
      "Review Schedule": "Annual",
      "Created On": "2024-05-15",
    },
  ]);

  const [selectedApp, setSelectedApp] = useState<string>("All");
  const [entTabIndex, setEntTabIndex] = useState<number>(0);

  // Define tabs data
  const tabsDataEnt = [{ label: "All" }, { label: "Under Review" }];

  // Extract unique app names for dropdown
  const appNames = useMemo(() => {
    const names = Array.from(new Set(rowData.map((item) => item.appName)));
    return ["All", ...names];
  }, [rowData]);

  // Filter row data based on selected app
  const filteredRowData = useMemo(() => {
    if (selectedApp === "All") return rowData;
    return rowData.filter((item) => item.appName === selectedApp);
  }, [rowData, selectedApp]);

  const colDefs = useMemo<ColDef[]>(
    () => [
      { field: "Ent ID", headerName: "Entitlement ID", flex: 2 },
      { field: "Ent Name", headerName: "Entitlement Name", flex: 2 },
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
      {
        field: "Last Sync",
        headerName: "Last Sync",
        flex: 2,
        valueFormatter: (params) => formatDateMMDDYY(params.value),
      },
      { field: "Requestable", headerName: "Requestable", flex: 2 },
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
      { field: "appOwner", headerName: "App Owner", flex: 1.5, hide: true },
      {
        field: "appInstance",
        headerName: "App Instance",
        flex: 1.5,
        hide: true,
      },
      { field: "appName", headerName: "App Name", flex: 1.5, hide: true },
      {
        field: "Capability/Technical Scope",
        headerName: "Capability/Technical Scope",
        flex: 2,
        hide: true,
      },
      {
        field: "Business Objective",
        headerName: "Business Objective",
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
      { field: "Created On", headerName: "Created On", flex: 2, hide: true },
      {
        field: "actionColumn",
        headerName: "Action",
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

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  return (
    <div className="ag-theme-alpine" style={{ height: 500, width: "100%" }}>
      <div className="relative mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlements</h1>
        <Tabs
          tabs={tabsDataEnt}
          activeClass="bg-[#15274E] text-white text-sm rounded-sm"
          buttonClass="h-10 -mt-1 w-30"
          className="border border-gray-300 w-61 h-8 rounded-md flex"
          activeIndex={entTabIndex}
          onChange={setEntTabIndex}
        />
      </div>
      <div className="flex justify-end mb-2">
        <select
          className="border rounded p-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedApp}
          onChange={(e) => setSelectedApp(e.target.value)}
        >
          {appNames.map((app) => (
            <option key={app} value={app}>
              {app}
            </option>
          ))}
        </select>
      </div>
      <div style={{ height: "calc(100% - 80px)", width: "100%" }}>
        <AgGridReact
          rowData={filteredRowData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="multiple"
        />
      </div>
    </div>
  );
};

export default page;
