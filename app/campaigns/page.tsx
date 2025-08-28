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
    progress: "75%",
    expiryDate: "2025-04-15",
    owner: "John Doe",
  },
  {
    id: 2,
    campaignName: "Finance Role Audit",
    description:
      "Verify finance department users have appropriate access rights.",
    instances: 75,
    progress: "50%",
    expiryDate: "2025-05-01",
    owner: "Alice Johnson",
  },
  {
    id: 3,
    campaignName: "MFA Compliance Check",
    description:
      "Ensure all employees have enabled Multi-Factor Authentication.",
    instances: 200,
    progress: "90%",
    expiryDate: "2025-03-30",
    owner: "Robert Smith",
  },
  {
    id: 4,
    campaignName: "Privileged Account Review",
    description: "Identify and validate privileged users' access rights.",
    instances: 50,
    progress: "60%",
    expiryDate: "2025-04-10",
    owner: "Emily White",
  },
];

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
        cellRenderer: "agGroupCellRenderer", // Enable detail row toggle
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
      { headerName: "Progress", field: "progress", flex: 1.5 },
      { headerName: "Expiry Date", field: "expiryDate", flex: 1.5 },
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
                  color="#4a10ebff"
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
                  color="#e73c3cff"
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
          <div className="h-100">
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
    <>
      <div className="flex justify-between">
        <h1 className="text-xl font-bold mb-6 border-b border-gray-300 pb-2 text-blue-950">
          All Campaigns
          <p className="font-normal text-sm">
            Access review campaigns are used to manage the certification of
            access for your users. To start an access review campaign, click the
            ‘Create’ button at the top of this page.
          </p>
        </h1>
        <div className="pt-4 px-4 sm:px-6 md:px-8">
          <Link
            href="/campaigns/new"
            className="inline-block bg-[#15274E] text-white py-2 px-4 sm:py-3 sm:px-6 rounded-sm text-sm sm:text-base font-medium text-center w-full sm:w-auto hover:bg-[#1a3399] transition-colors duration-200"
          >
            Create Cert Definition
          </Link>
        </div>
      </div>
      <Tabs
        tabs={tabsData}
        activeClass="bg-[#15274E] text-white rounded-sm -ml-1"
        buttonClass="h-9.5 -mt-1 w-30"
        className="ml-0.5 border border-gray-300 w-80 h-8 rounded-md"
      />
    </>
  );
}