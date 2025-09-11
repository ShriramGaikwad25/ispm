"use client";

import React, { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Tabs from "@/components/tabs";
import {
  CheckCircleIcon,
  ChevronDown,
  ChevronRight,
  DownloadIcon,
  EyeIcon,
} from "lucide-react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import { AgGridReact as AgGridReactType } from "ag-grid-react";
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
import "./Champaign.css"

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([MasterDetailModule]);

const campData = [
  {
    id: 1,
    campaignName: "Quarterly Access Review",
    description:
      "Review user permissions and access levels across departments.",
    instances: 150,
    progress: 75,
    expiryDate: "2025-04-15",
    owner: "John Doe",
  },
  {
    id: 2,
    campaignName: "Finance Role Audit",
    description:
      "Verify finance department users have appropriate access rights.",
    instances: 75,
    progress: 75,
    expiryDate: "2025-04-15",
    owner: "Alice Johnson",
  },
  {
    id: 3,
    campaignName: "MFA Compliance Check",
    description:
      "Ensure all employees have enabled Multi-Factor Authentication",
    instances: 200,
    progress: 75,
    expiryDate: "2025-04-15",
    owner: "Robert Smith",
  },
  {
    id: 4,
    campaignName: "Privileged Access Review",
    description: "Identify and validate privileged users' access rights.",
    instances: 50,
    progress: 75,
    expiryDate: "2025-04-15",
    owner: "Emily White",
  },
];

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

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Campaign Name",
        field: "campaignName",
        // cellRenderer: "agGroupCellRenderer",
        width: 250,
        wrapText: true,
        autoHeight: true,
      },
      {
        headerName: "Description",
        field: "description",
        flex: 2,
        hide: true, // Hide in main grid, show in detail row
      },
      { headerName: "Instances", field: "instances", flex: 1 },
      { 
        headerName: "Progress", 
        field: "progress", 
        flex: 1.5,
        cellRenderer: ProgressCellRenderer
      },
      { headerName: "Expiry Date", field: "expiryDate", flex: 1.5, valueFormatter: (p:any)=> require("@/utils/utils").formatDateMMDDYY(p.value) },
      { headerName: "Owner", field: "owner", flex: 1 },
      {
        field: "actions",
        headerName: "Actions",
        width: 250,
        cellRenderer: (params: ICellRendererParams) => {
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
      // Persist selected campaign summary for header display on detail page
      const payload = {
        campaignId,
        campaignName: e.data.campaignName,
        status: "Running", // default/demo status; replace when real status available
        snapshotAt: new Date().toISOString(),
        dueDate: e.data.expiryDate,
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
      iconOff: ChevronRight,
      component: () => {
        if (!campData || campData.length === 0) return <div>Loading...</div>;
        console.log("Row Data:", campData); // Debug row data
        return (
          <div className="h-96 w-full">
            <AgGridReact
              ref={gridRef}
              rowData={campData}
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
                console.log("Grid initialized:", {
                  api: !!params.api,
                  columnApi: !!params.columnApi,
                  enterpriseModules: params.api.isEnterprise?.() ? "Loaded" : "Not loaded",
                });
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
      iconOff: ChevronRight,
      component: () => <p>Coming Soon...</p>,
    },
    {
      label: "Template",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => <p>Coming Soon...</p>,
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
            Create Cert Definition
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