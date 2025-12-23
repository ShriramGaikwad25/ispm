"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const [error, setError] = useState<string | null>(null);

  // Extract fetch logic into a reusable function
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        "https://preview.keyforge.ai/campaign/api/v1/ACMECOM/getAllCampaigns",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }

      const data = await response.json();
      console.log("Campaigns API response:", data);

      // Handle different response structures
      // The API might return an array directly or an object with a data/items property
      let campaignsArray: any[] = [];
      if (Array.isArray(data)) {
        campaignsArray = data;
      } else if (data && typeof data === "object") {
        // Try common response structures
        campaignsArray = data.items || data.data || data.campaigns || data.results || [];
        // If still empty, check if response itself is a single campaign object
        if (campaignsArray.length === 0 && (data.id || data.name || data.campaignID)) {
          campaignsArray = [data];
        }
      }

      // Map API response to TemplateRow format
      const mappedTemplates: TemplateRow[] = campaignsArray.map((campaign: any) => ({
        id: campaign.id || campaign.campaignID || campaign.campaignId || String(campaign.id || ""),
        name: campaign.name || campaign.campaignName || campaign.templateName || "Unnamed Campaign",
        owner: campaign.owner || 
               campaign.ownerName || 
               (Array.isArray(campaign.campaignOwner?.ownerName) 
                 ? campaign.campaignOwner.ownerName.join(", ") 
                 : campaign.campaignOwner?.ownerName) ||
               campaign.createdBy ||
               "Unknown",
        createdOn: campaign.createdOn || 
                  campaign.createdDate || 
                  campaign.created || 
                  campaign.startDate ||
                  campaign.campaignStartDate ||
                  new Date().toISOString(),
        lastRun: campaign.lastRun || 
                campaign.lastRunDate || 
                campaign.lastExecuted ||
                null,
        nextRun: campaign.nextRun || 
                campaign.nextRunDate || 
                campaign.scheduledRun ||
                null,
        templateData: campaign, // Store full template data for editing
      }));

      setRows(mappedTemplates);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      setError(error?.message || "Failed to fetch campaigns. Please try again later.");
      // Set empty array on error instead of showing mock data
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <div className="text-red-600 mb-2">{error}</div>
        <button
          onClick={fetchTemplates}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
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



