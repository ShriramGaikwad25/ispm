"use client";

import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import { Edit, Calendar } from "lucide-react";
import { apiRequestWithAuth } from "@/lib/auth";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await apiRequestWithAuth<any>(
          "https://preview.keyforge.ai/campaign/api/v1/ACMECOM/getAllCampaigns",
          {
            method: "GET",
          }
        );

        // Handle different response structures
        let campaignsArray: any[] = [];
        if (Array.isArray(data)) {
          campaignsArray = data;
        } else if (data && typeof data === "object") {
          campaignsArray = data.items || data.data || data.campaigns || data.results || [];
          if (campaignsArray.length === 0 && (data.id || data.name || data.campaignID)) {
            campaignsArray = [data];
          }
        }

        // Transform API response to TemplateRow format
        const transformedRows: TemplateRow[] = campaignsArray.map((campaign: any) => {
          // Extract owner information
          const ownerInfo = campaign.campaignOwner || campaign.owner || {};
          const ownerName = Array.isArray(ownerInfo.ownerName) 
            ? ownerInfo.ownerName.join(", ") 
            : ownerInfo.ownerName || ownerInfo.ownerType || "Unknown";

          return {
            id: campaign.id || campaign.campaignID || campaign.campaignId || String(campaign.id || ""),
            name: campaign.name || campaign.campaignName || campaign.templateName || "Unnamed Campaign",
            owner: ownerName,
            createdOn: campaign.createdOn || campaign.createdDate || campaign.created || new Date().toISOString(),
            lastRun: campaign.lastRun || campaign.lastRunDate || campaign.lastExecutionDate || null,
            nextRun: campaign.nextRun || campaign.nextRunDate || campaign.scheduledDate || null,
            templateData: campaign, // Store full campaign data for editing
          };
        });

        setRows(transformedRows);
      } catch (err: any) {
        console.error("Error fetching campaigns:", err);
        setError(err.message || "Failed to fetch campaigns");
        setRows([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(params.data);
                }}
                className="p-1.5 rounded-full border-2 border-blue-600 hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-colors"
                title="Edit"
                aria-label="Edit template"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRunNow(params.data);
                }}
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

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-gray-600">Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AgGridReact
        ref={gridRef}
        rowData={rows}
        columnDefs={columnDefs}
        rowSelection="multiple"
        rowModelType="clientSide"
        animateRows={true}
        domLayout="autoHeight"
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



