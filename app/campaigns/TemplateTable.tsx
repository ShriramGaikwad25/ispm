"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import { Edit, Calendar } from "lucide-react";

type TemplateRow = {
  id: string;
  name: string;
  owner: string;
  createdOn: string;
  lastRun: string | null;
  nextRun: string | null;
  templateData?: any; // Store full template data for editing
};

interface TemplateTableProps {
  onEdit: (template: TemplateRow) => void;
  onRunNow: (template: TemplateRow) => void;
}

const TemplateTable: React.FC<TemplateTableProps> = ({ onEdit, onRunNow }) => {
  const gridRef = React.useRef<AgGridReactType>(null);

  // Dummy data for templates
  const rows = useMemo<TemplateRow[]>(() => [
    {
      id: "1",
      name: "Quarterly Access Review",
      owner: "John Smith",
      createdOn: new Date(2024, 0, 15).toISOString(),
      lastRun: new Date(2024, 2, 1).toISOString(),
      nextRun: new Date(2024, 5, 1).toISOString(),
    },
    {
      id: "2",
      name: "Monthly Compliance Check",
      owner: "Sarah Johnson",
      createdOn: new Date(2024, 1, 10).toISOString(),
      lastRun: new Date(2024, 2, 10).toISOString(),
      nextRun: new Date(2024, 3, 10).toISOString(),
    },
    {
      id: "3",
      name: "Annual Security Audit",
      owner: "Michael Chen",
      createdOn: new Date(2023, 11, 1).toISOString(),
      lastRun: new Date(2023, 11, 15).toISOString(),
      nextRun: new Date(2024, 11, 1).toISOString(),
    },
    {
      id: "4",
      name: "Department Access Review",
      owner: "Emily Davis",
      createdOn: new Date(2024, 2, 5).toISOString(),
      lastRun: null,
      nextRun: new Date(2024, 3, 5).toISOString(),
    },
    {
      id: "5",
      name: "Executive Privilege Review",
      owner: "Robert Wilson",
      createdOn: new Date(2024, 0, 20).toISOString(),
      lastRun: new Date(2024, 1, 20).toISOString(),
      nextRun: null,
    },
    {
      id: "6",
      name: "IT Admin Access Review",
      owner: "Lisa Anderson",
      createdOn: new Date(2024, 1, 28).toISOString(),
      lastRun: new Date(2024, 2, 28).toISOString(),
      nextRun: new Date(2024, 3, 28).toISOString(),
    },
  ], []);

  const columnDefs = React.useMemo<ColDef[]>(
    () => [
      {
        headerName: "Name",
        field: "name",
        flex: 2,
        sortable: true,
        filter: true,
      },
      {
        headerName: "Owner",
        field: "owner",
        flex: 1.5,
        sortable: true,
        filter: true,
      },
      {
        headerName: "Created On",
        field: "createdOn",
        flex: 1.5,
        sortable: true,
        filter: true,
        valueFormatter: (params: any) => {
          if (!params.value) return "";
          return new Date(params.value).toLocaleDateString();
        },
      },
      {
        headerName: "Last Run",
        field: "lastRun",
        flex: 1.5,
        sortable: true,
        filter: true,
        valueFormatter: (params: any) => {
          if (!params.value) return "Never";
          return new Date(params.value).toLocaleDateString();
        },
      },
      {
        headerName: "Next Run",
        field: "nextRun",
        flex: 1.5,
        sortable: true,
        filter: true,
        valueFormatter: (params: any) => {
          if (!params.value) return "Not Scheduled";
          return new Date(params.value).toLocaleDateString();
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 150,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex items-center gap-3 h-full">
              <button
                onClick={() => onEdit(params.data)}
                className="p-1.5 rounded-full border-2 border-blue-600 hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-colors"
                title="Edit"
                aria-label="Edit template"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onRunNow(params.data)}
                className="p-1.5 rounded-full border-2 border-green-600 hover:bg-green-50 text-green-600 hover:text-green-800 transition-colors"
                title="Schedule"
                aria-label="Schedule template"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [onEdit, onRunNow]
  );

  return (
    <div className="h-96 w-full">
      <AgGridReact
        ref={gridRef}
        rowData={rows}
        columnDefs={columnDefs}
        rowSelection="multiple"
        rowModelType="clientSide"
        animateRows={true}
        defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true,
        }}
        onGridReady={(params) => {
          params.api.sizeColumnsToFit();
        }}
      />
    </div>
  );
};

export default TemplateTable;



