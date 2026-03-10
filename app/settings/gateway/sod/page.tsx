"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Shield, Plus } from "lucide-react";
import SodTabs from "@/components/SodTabs";
import dynamic from "next/dynamic";
import type { ColDef } from "ag-grid-enterprise";
import "@/lib/ag-grid-setup";

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

const BusinessProcessTab: React.FC = () => {
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Name",
        field: "name",
        minWidth: 220,
        flex: 1,
      },
      {
        headerName: "Description",
        field: "description",
        minWidth: 260,
        flex: 2,
      },
      {
        headerName: "Owner",
        field: "owner",
        minWidth: 180,
      },
      {
        headerName: "Created On",
        field: "createdOn",
        minWidth: 160,
      },
      {
        headerName: "Actions",
        field: "actions",
        width: 120,
        cellRenderer: () => (
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
          >
            Edit
          </button>
        ),
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Business Processes</h2>
        <Link
          href="/settings/gateway/sod/business-process/new"
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New</span>
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        <div className="h-full w-full">
          <AgGridReact
            rowData={[]}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="multiple"
            rowModelType="clientSide"
            animateRows={true}
            onGridReady={(params) => {
              params.api.sizeColumnsToFit();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default function GatewaySoDSettings() {
  return (
    <div className="h-[calc(100vh-60px)] w-full ">
      <div className="h-full w-full flex flex-col space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SoD</h1>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col">
          <SodTabs />
          <BusinessProcessTab />
        </div>
      </div>
    </div>
  );
}

