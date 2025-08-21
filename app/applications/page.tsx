"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { ColDef } from "ag-grid-enterprise";
import Accordion from "@/components/Accordion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const rowData = [
  {
    id: "adp",
    application: { name: "ADP", url: "#" },
    department: "Finance",
    owner: "Brian Adams",
    accounts: 1300,
    lastReview: "6/17/24",
    lastSync: "6/9/24",
    syncType: "ZUS",
    riskStatus: "Low",
    appRisk: "Low",
    appType: "Payroll",
    appDescription: "Automated payroll processing system",
    tags: ["Finance", "Payroll"],
  },
  {
    id: "aws",
    application: { name: "Amazon Web Services", url: "#" },
    department: "Engineering",
    owner: "Michael Smith",
    accounts: 389,
    lastReview: "6/17/24",
    lastSync: "6/15/24",
    syncType: "Rest API",
    riskStatus: "Medium",
    appRisk: "Medium",
    appType: "Cloud Infrastructure",
    appDescription: "Cloud computing platform for hosting services",
    tags: ["Cloud", "Infrastructure"],
  },
  {
    id: "sap",
    application: { name: "SAP ERP", url: "#" },
    department: "Operations",
    owner: "Sarah Johnson",
    accounts: 750,
    lastReview: "7/1/24",
    lastSync: "7/10/24",
    syncType: "DB",
    riskStatus: "High",
    appRisk: "High",
    appType: "ERP",
    appDescription: "Enterprise resource planning software",
    tags: ["ERP", "Operations"],
  },
  {
    id: "salesforce",
    application: { name: "Salesforce", url: "#" },
    department: "Sales",
    owner: "Emily Davis",
    accounts: 520,
    lastReview: "5/30/24",
    lastSync: "6/5/24",
    syncType: "Rest API",
    riskStatus: "Low",
    appRisk: "Low",
    appType: "CRM",
    appDescription: "Customer relationship management platform",
    tags: ["CRM", "Sales"],
  },
  {
    id: "workday",
    application: { name: "Workday", url: "#" },
    department: "HR",
    owner: "Lisa Brown",
    accounts: 900,
    lastReview: "6/20/24",
    lastSync: "6/25/24",
    syncType: "Flat File",
    riskStatus: "Medium",
    appRisk: "Medium",
    appType: "HCM",
    appDescription: "Human capital management software",
    tags: ["HR", "HCM"],
  },
  {
    id: "azure",
    application: { name: "Microsoft Azure", url: "#" },
    department: "Engineering",
    owner: "James Wilson",
    accounts: 420,
    lastReview: "7/5/24",
    lastSync: "7/8/24",
    syncType: "AD based",
    riskStatus: "Low",
    appRisk: "Low",
    appType: "Cloud Infrastructure",
    appDescription: "Cloud platform for enterprise solutions",
    tags: ["Cloud", "Infrastructure"],
  },
  {
    id: "oracle",
    application: { name: "Oracle HCM", url: "#" },
    department: "HR",
    owner: "David Kim",
    accounts: 650,
    lastReview: "6/10/24",
    lastSync: "6/12/24",
    syncType: "DB",
    riskStatus: "High",
    appRisk: "High",
    appType: "HCM",
    appDescription: "Human capital management and payroll system",
    tags: ["HR", "HCM"],
  },
  {
    id: "jira",
    application: { name: "Jira", url: "#" },
    department: "Engineering",
    owner: "Tom Harris",
    accounts: 300,
    lastReview: "6/25/24",
    lastSync: "6/30/24",
    syncType: "Rest API",
    riskStatus: "Low",
    appRisk: "Low",
    appType: "Project Management",
    appDescription: "Issue tracking and project management tool",
    tags: ["Project Management", "Engineering"],
  },
  {
    id: "netsuite",
    application: { name: "NetSuite", url: "#" },
    department: "Finance",
    owner: "Karen Taylor",
    accounts: 480,
    lastReview: "7/3/24",
    lastSync: "7/7/24",
    syncType: "Flat File",
    riskStatus: "Medium",
    appRisk: "Medium",
    appType: "ERP",
    appDescription: "Cloud-based financial management software",
    tags: ["Finance", "ERP"],
  },
  {
    id: "servicenow",
    application: { name: "ServiceNow", url: "#" },
    department: "IT",
    owner: "Paul Walker",
    accounts: 250,
    lastReview: "6/15/24",
    lastSync: "6/20/24",
    syncType: "AD based",
    riskStatus: "Low",
    appRisk: "Low",
    appType: "ITSM",
    appDescription: "IT service management platform",
    tags: ["IT", "ITSM"],
  },
];

export default function Application() {
  const router = useRouter();

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "App Name",
        field: "application.name",
        cellRenderer: (params: any) => {
          const name = params.data.application.name;
          const url = params.data.application.url;
          const riskStatus = params.data.riskStatus;
          const riskInitial =
            riskStatus === "High" ? "H" : riskStatus === "Medium" ? "M" : "L";
          const riskColor =
            riskStatus === "High"
              ? "red"
              : riskStatus === "Medium"
              ? "orange"
              : "green";
          return (
            <div className="flex items-center">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {name}
              </a>
              <span
                className="ml-2 px-2 py-1 text-xs rounded"
                style={{ backgroundColor: riskColor, color: "white" }}
              >
                {riskInitial}
              </span>
            </div>
          );
        },
      },
      { headerName: "Department", field: "department" },
      { headerName: "Owner", field: "owner" },
      {
        headerName: "#Accounts",
        field: "accounts",
        valueFormatter: (params: any) =>
          params.value?.toLocaleString("en-US") || "0",
      },
      { headerName: "Last Access Review", field: "lastReview" },
      { headerName: "Last Sync", field: "lastSync" },
      { headerName: "Sync Type", field: "syncType" },
      { headerName: "App Risk", field: "appRisk",hide:true },
      { headerName: "App Type", field: "appType",hide:true },
      { headerName: "App Description", field: "appdesc" ,hide:true},
    ],
    []
  );

  const handleRowClick = (event: any) => {
    const appId = event.data.id;
    router.push(`/applications/${appId}`);
  };

  // Data for the doughnut chart
  const syncTypeData = useMemo(() => {
    const syncTypes = ["Flat File", "DB", "Rest API", "AD based", "ZUS", "API"];
    const counts = syncTypes.map(
      (type) => rowData.filter((row) => row.syncType === type).length
    );
    return {
      labels: syncTypes,
      datasets: [
        {
          data: counts,
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
          hoverOffset: 20,
        },
      ],
    };
  }, []);

  return (
    <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
      <div className="relative mb-4">
        <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
          Manager Actions
        </h1>
        <div className="mb-1">
          <div className="bg-gray-100 p-2 rounded-lg shadow-sm">
            <p className="text-sm font-semibold text-gray-700">
              Total Number of Applications:{" "}
              <span className="text-blue-600">{rowData.length}</span>
            </p>
          </div>
        </div>
        <Accordion
          iconClass="absolute top-1 right-0 rounded-full text-white bg-purple-800"
          title="Expand/Collapse"
        >
          <div className="p-2">
            <h2 className="text-sm font-semibold">
              App Distribution by Sync Type
            </h2>
            <div className="w-100 h-100 mx-auto">
              <Doughnut
                data={syncTypeData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "right",
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${context.raw}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </Accordion>
      </div>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        domLayout="autoHeight"
        onRowClicked={handleRowClick}
      />
    </div>
  );
}
