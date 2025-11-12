"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import { Edit, Play } from "lucide-react";

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
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch templates from API or localStorage
    // For now, using mock data - replace with actual API call
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API endpoint
        // const response = await fetch("YOUR_TEMPLATES_API_ENDPOINT");
        // const data = await response.json();
        
        // Mock data for now
        const mockTemplates: TemplateRow[] = [
          {
            id: "1",
            name: "Quarterly Access Review",
            owner: "John Doe",
            createdOn: "2024-01-15",
            lastRun: "2024-03-15",
            nextRun: "2024-06-15",
          },
          {
            id: "2",
            name: "Monthly Privileged Access Review",
            owner: "Jane Smith",
            createdOn: "2024-02-01",
            lastRun: "2024-03-01",
            nextRun: "2024-04-01",
          },
        ];
        setRows(mockTemplates);
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

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
                className="p-1.5 rounded hover:bg-gray-100 text-blue-600 hover:text-blue-800 transition-colors"
                title="Edit"
                aria-label="Edit template"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onRunNow(params.data)}
                className="p-1.5 rounded hover:bg-gray-100 text-green-600 hover:text-green-800 transition-colors"
                title="Run Now"
                aria-label="Run template now"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [onEdit, onRunNow]
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-96">Loading templates...</div>;
  }

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

