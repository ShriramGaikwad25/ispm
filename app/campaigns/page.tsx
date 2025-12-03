"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Tabs from "@/components/tabs";
import {
  CheckCircleIcon,
  ChevronDown,
  ChevronUp,
  DownloadIcon,
  EyeIcon,
  Upload,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
// Type import only - component is dynamically loaded
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import {
  ColDef,
  ICellRendererParams,
  RowClickedEvent,
  IDetailCellRendererParams,
  FirstDataRenderedEvent,
} from "ag-grid-enterprise";
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import "./Champaign.css";
import TemplateTab from "./TemplateTab";

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([MasterDetailModule]);

type CampaignRow = {
  id: string;
  campaignName: string;
  description: string | null;
  instances: number;
  progress: number;
  expiryDate: string | null;
  owner: string | null;
  startDate?: string | null;
  status?: string;
};

// Progress Bar Cell Renderer
const ProgressCellRenderer = (props: ICellRendererParams) => {
  const progress = props.value || 0;
  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <span className="progress-text">
        {progress}%
      </span>
    </div>
  );
};

// Detail Cell Renderer for Description
const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const description = props.data?.description || "No description available";
  return (
    <div className="flex p-2 bg-gray-50 border-t border-gray-200">
      <div className="flex flex-row items-center gap-2">
        <span className="text-gray-800">{description}</span>
      </div>
    </div>
  );
};

export default function Campaigns() {
  const gridRef = useRef<AgGridReactType>(null);
  const router = useRouter();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchCampaigns() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(
          "https://preview.keyforge.ai/certification/api/v1/ACMECOM/getCampaignAnalytics",
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error(`Failed to load campaigns (${res.status})`);
        }
        const data = await res.json();
        console.log(data)
        const campaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
        const mapped: CampaignRow[] = campaigns.map((c: any) => ({
          id: c.campaignID ?? String(c.id ?? ""),
          campaignName: c.name ?? "",
          description: c.description ?? null,
          instances: Number(c.totalNumOfCertificationInstance ?? 0),
          progress: Number(c.progress ?? 0),
          expiryDate: c.campaignExpiryDate ?? null,
          owner: Array.isArray(c?.campaignOwner?.ownerName)
            ? c.campaignOwner.ownerName.join(", ")
            : c?.campaignOwner?.ownerName ?? null,
          startDate: c.startDate ?? c.campaignStartDate ?? null,
          status: c.status ?? "", // Default to "Running" if not provided
        }));
        setRows(mapped);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Something went wrong loading campaigns");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCampaigns();
    return () => controller.abort();
  }, []);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Campaign Name",
        field: "campaignName",
        // cellRenderer: "agGroupCellRenderer",
        width:300,
      },
      {
        headerName: "Description",
        field: "description",
        flex: 2,
        hide: true, // Hide in main grid, show in detail row
      },
      { headerName: "Instances", field: "instances", width:100,},
      { 
        headerName: "Progress", 
        field: "progress", 
        width:200,
        cellRenderer: ProgressCellRenderer
      },
      { headerName: "Expiry Date", field: "expiryDate", width:200,flex: 1, valueFormatter: (p:any)=> require("@/utils/utils").formatDateMMDDYY(p.value) },
      { headerName: "Owner", field: "owner", flex: 1 },
      { 
        headerName: "Start Date", 
        field: "startDate", 
        width: 150,
        flex: 1,
        valueFormatter: (p: any) => p.value ? require("@/utils/utils").formatDateMMDDYY(p.value) : ""
      },
      { 
        headerName: "Status", 
        field: "status", 
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value || "";
          const statusColors: Record<string, string> = {
            "Staging": "bg-yellow-100 text-yellow-800",
            "Running": "bg-blue-100 text-blue-800",
            "Completed": "bg-green-100 text-green-800",
            "Paused": "bg-gray-100 text-gray-800",
          };
          const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>
              {status}
            </span>
          );
        }
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 250,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.data?.status || "Running";
          const isStaging = status === "Staging";
          
          const handlePushToProduction = () => {
            // TODO: Implement push to production logic
            console.log("Push to Production clicked for campaign:", params.data?.id);
            alert(`Pushing campaign "${params.data?.campaignName}" to production...`);
          };
          
          return (
            <div className="flex space-x-4 h-full items-center">
              <button
                title="Download"
                aria-label="Download selected rows"
                className="p-1 rounded transition-colors duration-200"
              >
                <DownloadIcon
                  className="cursor-pointer"
                  strokeWidth="1"
                  size="24"
                  color="#6f3d1cff"
                />
              </button>
              <button
                title="View"
                aria-label="View selected rows"
                className="p-1 rounded transition-colors duration-200"
              >
                <EyeIcon
                  className="cursor-pointer"
                  strokeWidth="1"
                  size="24"
                  color="#2563eb"
                />
              </button>
              <button
                title="Sign Off"
                aria-label="Sign off selected rows"
                className="p-1 rounded transition-colors duration-200"
              >
                <CheckCircleIcon
                  className="cursor-pointer"
                  strokeWidth="1"
                  size="24"
                  color="#10a13cff"
                />
              </button>
              {isStaging && (
                <button
                  title="Push to Production"
                  aria-label="Push to Production"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePushToProduction();
                  }}
                  className="p-1 rounded transition-colors duration-200 hover:bg-green-100"
                >
                  <Upload
                    className="cursor-pointer"
                    strokeWidth="1"
                    size="24"
                    color="#10a13cff"
                  />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  const handleRowClick = (e: RowClickedEvent) => {
    const campaignId = e.data.id;
    try {
      // Find the full campaign data to get detailed progress information
      const fullCampaignData = rows.find(campaign => campaign.id === campaignId);
      
      // Persist selected campaign summary for header display on detail page
      const payload = {
        campaignId,
        campaignName: e.data.campaignName,
        status: "", // default/demo status; replace when real status available
        snapshotAt: new Date().toISOString(),
        dueDate: e.data.expiryDate,
        progress: e.data.progress, // Include campaign progress percentage
        // Add campaign-level progress details for app owner page
        totalItems: e.data.instances, // totalNumOfCertificationInstance
        approvedCount: Math.round((e.data.instances * e.data.progress) / 100), // calculated from progress
        pendingCount: Math.round((e.data.instances * (100 - e.data.progress)) / 100), // remaining
      };
      localStorage.setItem("selectedCampaignSummary", JSON.stringify(payload));
      // notify other tabs/components if needed
      window.dispatchEvent(new Event("localStorageChange"));
    } catch {}
    router.push(`/campaigns/manage-campaigns/${campaignId}`);
  };

  const onFirstDataRendered = (params: FirstDataRenderedEvent) => {
    console.log("First data rendered, expanding all rows");
    params.api.forEachNode((node) => {
      if (node.master) {
        node.setExpanded(true); // Expand all master rows
      }
    });
  };

  const tabsData = [
    {
      label: "Active",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => {
        if (isLoading) return <div>Loading...</div>;
        if (error) return <div className="text-red-600">{error}</div>;
        return (
          <div className="h-96 w-full">
            <AgGridReact
              ref={gridRef}
              rowData={rows}
              columnDefs={columnDefs}
              rowSelection="multiple"
              context={{ gridRef }}
              rowModelType="clientSide"
              animateRows={true}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              masterDetail={true}
              detailCellRenderer={DetailCellRenderer}
              detailRowAutoHeight={true}
              detailRowHeight={80}
              onRowClicked={handleRowClick}
              onGridReady={(params) => {
                params.api.sizeColumnsToFit();
              }}
              onFirstDataRendered={onFirstDataRendered}
            />
          </div>
        );
      },
    },
    {
      label: "Completed",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => <p>Coming Soon...</p>,
    },
    {
      label: "Template",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => <TemplateTab />,
    },
  ];

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              All Campaigns
            </h1>
            <p className="text-gray-600 text-sm">
              Access review campaigns are used to manage the certification of access for your users. To start an access review campaign.
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Create New
          </Link>
        </div>
        
        <div className="mb-6">
          <Tabs
            tabs={tabsData}
            activeClass="bg-blue-600 text-white rounded-lg -ml-1"
            buttonClass="h-9 -mt-1 w-26 text-sm px-2 py-1"
            className="ml-0.5 border border-gray-300 w-80 h-8 rounded-md"
          />
        </div>
      </div>
    </div>
  );
}