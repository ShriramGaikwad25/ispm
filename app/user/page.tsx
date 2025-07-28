"use client";
import Accordion from '@/components/Accordion';
import ChartComponent from '@/components/ChartComponent';
import { ColDef } from 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react'
import React, { useMemo } from 'react'

export default function User() {
  const rowData = [
  {
    name: "Aamod Radwan",
    email: "aamod.radwan@zillasecurity.io",
    title: "Staff",
    department: "Sales",
    managerEmail: "charlene.brattka@zillasecurity.io",
    status: "Active",
    tags: "",
  },
  {
    name: "Abdulah Thibadeau",
    email: "abdulah.thibadeau@zillasecurity.io",
    title: "Manager - IT & Security",
    department: "IT & Security",
    managerEmail: "huan.lortz@zillasecurity.io",
    status: "Active",
    tags: "",
  },
  // Add more rows as needed
];

const columnDefs = useMemo<ColDef[]>(
  () => [

  {
    headerName: "User Name",
    field: "name",
    flex: 1.5,
    cellRenderer: (params: any) => {
      const initials = params.value
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase();
      const colors = ["#7f3ff0", "#0099cc", "#777", "#d7263d", "#ffae00"];
      const bgColor = colors[params.rowIndex % colors.length];
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              backgroundColor: bgColor,
              color: "darkblue",
              borderRadius: "50%",
              width: 28,
              height: 28,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {initials}
          </div>
          <span style={{ color: "#1677ff", cursor: "pointer" }}>
            {params.value}
          </span>
        </div>
      );
    },
  },
  { headerName: "Email", field: "email", flex: 2 },
  { headerName: "Title", field: "title", flex: 1.5 },
  { headerName: "Department", field: "department", flex: 1.5 },
  { headerName: "Manager Email", field: "managerEmail", flex: 2 },
  { headerName: "User Status", field: "status", flex: 1 },
  { headerName: "Tags", field: "tags", flex: 1 },
],[]);

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
        columnDefs={columnDefs}
        rowData={rowData}
        domLayout="autoHeight"
      />
    </div>
  )
}
