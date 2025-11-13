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
import "./AccessPolicy.css";
import { BackButton } from "@/components/BackButton";
import TemplateTab from "./TemplateTab";

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([MasterDetailModule]);

type AccessPolicyRow = {
  id: string;
  policyName: string;
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

export default function ManageAccessPolicyPage() {
  const gridRef = useRef<AgGridReactType>(null);
  const router = useRouter();
  const [rows, setRows] = useState<AccessPolicyRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock data for UI display only
    const mockData: AccessPolicyRow[] = [
      {
        id: "1",
        policyName: "Quarterly Access Policy Review 0917",
        description: "Review user access for Q4 2025",
        instances: 0,
        progress: 100,
        expiryDate: "12/13/25",
        owner: "System Admin",
        startDate: null,
        status: "Running",
      },
      {
        id: "2",
        policyName: "Q4 2025 Finance Business Unit App Owner Review",
        description: "Q4 2025 Finance Business Unit App Owner Review",
        instances: 0,
        progress: 100,
        expiryDate: "12/13/25",
        owner: "System Admin",
        startDate: null,
        status: "Running",
      },
      {
        id: "3",
        policyName: "Q4 2025 - SAP App Owner Certification",
        description: "Policy to certify SAP user access by application owners.",
        instances: 0,
        progress: 100,
        expiryDate: "12/13/25",
        owner: "System Admin",
        startDate: null,
        status: "Running",
      },
    ];
    
    setIsLoading(false);
    setRows(mockData);
  }, []);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Policy Name",
        field: "policyName",
        width: 300,
      },
      {
        headerName: "Description",
        field: "description",
        flex: 2,
        hide: true, // Hide in main grid, show in detail row
      },
      { headerName: "Instances", field: "instances", width: 100 },
      { 
        headerName: "Progress", 
        field: "progress", 
        width: 200,
        cellRenderer: ProgressCellRenderer
      },
      { 
        headerName: "Expiry Date", 
        field: "expiryDate", 
        width: 200,
        flex: 1, 
        valueFormatter: (p: any) => require("@/utils/utils").formatDateMMDDYY(p.value) 
      },
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
    const policyId = e.data.id;
    router.push(`/settings/gateway/manage-access-policy/${policyId}`);
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
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              All Access Policies
            </h1>
            <p className="text-gray-600 text-sm">
              Access policies are used to manage and configure access permissions for your users. To start a new access policy.
            </p>
          </div>
          <Link
            href="/settings/gateway/manage-access-policy/new"
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
