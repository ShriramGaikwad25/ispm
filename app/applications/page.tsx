"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { ColDef } from "ag-grid-enterprise";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";

const rowData = [
  {
    id: "adp",
    application: { name: "ADP", url: "#" },
    department: "Finance",
    owner: "Brian Adams",
    techOwner: "Brian Adams",
    accounts: 1300,
    lastReview: "6/17/24",
    lastSync: "6/9/24",
    syncType: "ZUS",
    status: "Monitored",
  },
  {
    id: "aws",
    application: { name: "Amazon Web Services", url: "#" },
    department: "Engineering",
    owner: "Michael Smith",
    techOwner: "Hailey Spencer",
    accounts: 389,
    lastReview: "6/17/24",
    lastSync: "6/15/24",
    syncType: "API",
    status: "Monitored",
  },
];

export default function Application() {
  const router = useRouter();

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: "Application",
      field: "application.name",
      cellRenderer: (params: any) => {
        const name = params.data.application.name;
        const url = params.data.application.url;
        return (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {name}
          </a>
        );
      },
    },
    { headerName: "Department / Owner", field: "department" },
    { headerName: "Technical Owner", field: "techOwner" },
    {
      headerName: "Accounts",
      field: "accounts",
      valueFormatter: (params: any) =>
        params.value?.toLocaleString("en-US") || "0",
    },
    { headerName: "Last Access Review", field: "lastReview" },
    { headerName: "Last Sync", field: "lastSync" },
    { headerName: "Sync Type", field: "syncType" },
    {
      headerName: "Status",
      field: "status",
      cellRenderer: (params: any) => (
        <span style={{ color: "green", fontWeight: "bold" }}>
          {params.value}
        </span>
      ),
    },
  ], []);

  const handleRowClick = (event: any) => {
    const appId = event.data.id;
    router.push(`/applications/${appId}`);
  };

  return (
    <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
      <div className="relative mb-4">
        <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
          Manager Actions
        </h1>
        <Accordion
          iconClass="absolute top-1 right-0 rounded-full text-white bg-purple-800"
          title="Expand/Collapse"
        >
          <ChartComponent />
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
