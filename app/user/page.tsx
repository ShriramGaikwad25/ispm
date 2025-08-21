"use client";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";
import { ColDef, GridApi } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation"; // Updated import
import React, { useMemo, useRef, useState } from "react";
import "@/lib/ag-grid-setup";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

const data: Record<string, DataItem[]> = {
  interactiveFilter: [
    { label: "Active Users", value: 0 },
    { label: "Inactive Users", value: 0 },
    { label: "Non Human Identities", value: 0 },
    { label: "Application Identities", value: 0 },
    { label: "Orphan Account Users", value: 0 },
    { label: "High Risk Users", value: 0 },
    { label: "Compliance Violation Users", value: 0 },
  ],
};

export default function User() {
  const router = useRouter();
  const gridApiRef = useRef<GridApi | null>(null);
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
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
        const status = params.data.status; // Access status from data
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
              {params.value} ({status})
            </span>
          </div>
        );
      },
    },
    { headerName: "Title", field: "title", flex: 1.5 },
    { headerName: "Department", field: "department", flex: 1.5 },
    {
      headerName: "Manager Name",
      field: "managerName",
      flex: 1.5,
      cellRenderer: (params: any) => {
        const managerName = params.value || "N/A";
        const managerStatus = params.data.managerStatus || "Unknown"; // Access managerStatus from data
        return (
          <span>
            {managerName} ({managerStatus})
          </span>
        );
      },
    },
    { headerName: "Tags", field: "tags", flex: 1 },
  ],
  []
);

  const handleRowClick = (event: any) => {
    const appId = event.data.name;
    router.push(`/user/${appId}`); // This should now work with App Router
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
          <div className="grid grid-cols-3 gap-10 p-1">
            {Object.entries(data).map(([category, items]) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1 border-b border-gray-300 pb-1 p-2">
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

                <div className="space-y-1 pl-8 pr-8">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className={`flex text-sm relative items-center p-2 rounded-sm cursor-pointer transition-all ${
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
      <AgGridReact
        columnDefs={columnDefs}
        rowData={rowData}
        domLayout="autoHeight"
        onRowClicked={handleRowClick}
      />
    </div>
  );
}
