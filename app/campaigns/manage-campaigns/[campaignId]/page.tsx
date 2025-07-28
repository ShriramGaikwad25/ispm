"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import { AgGridReact as AgGridReactType } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import {
  ColDef,
  ICellRendererParams,
} from "ag-grid-enterprise";
import HorizontalTabs from "@/components/HorizontalTabs";
import Accordion from "@/components/Accordion";
import ProgressDonutChart from "@/components/ProgressDonutChart";
import VerticalBarChart from "@/components/VerticalBarChart";
import ChampaignActionButton from "@/components/agTable/ChampaignActionButton";
import AuditorsCorner from "../AuditorsCorner";

const campData = [
  {
    reviewerName: "Alice Johnson",
    title: "Senior Security Analyst",
    department: "Cybersecurity",
    progress: "80%",
    riskScore: "High",
    lastUpdate: "2025-05-20",
  },
  {
    reviewerName: "Brian Smith",
    title: "IAM Manager",
    department: "IT Governance",
    progress: "60%",
    riskScore: "Medium",
    lastUpdate: "2025-05-25",
  },
  {
    reviewerName: "Catherine Lee",
    title: "Compliance Officer",
    department: "Risk & Compliance",
    progress: "90%",
    riskScore: "Low",
    lastUpdate: "2025-05-22",
  },
  {
    reviewerName: "David Kim",
    title: "Application Owner",
    department: "Engineering",
    progress: "40%",
    riskScore: "High",
    lastUpdate: "2025-05-21",
  },
  {
    reviewerName: "Emily Chen",
    title: "Access Reviewer",
    department: "Finance",
    progress: "100%",
    riskScore: "Low",
    lastUpdate: "2025-05-26",
  },
];

export default function ManageCampaigns() {
  const gridRef = useRef<AgGridReactType>(null);
  const router = useRouter();
  const [tabIndex, setTabIndex] = useState(1);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Reviewer Name", field: "reviewerName" },
      { headerName: "Title", field: "title", flex: 2 },
      { headerName: "Department", field: "department", flex: 2 },
      {
        headerName: "Progress",
        field: "progress",
        flex: 2,
        cellRenderer: (params: ICellRendererParams) => {
          const value = parseInt(params.value.replace("%", ""));
          const bgColor = value === 100 ? "bg-green-500" : "bg-blue-500";

          return (
            <div className="w-full bg-gray-200 rounded h-4 overflow-hidden mt-3">
              <div
                className={`h-full text-xs text-white text-center ${bgColor}`}
                style={{ width: `${value}%` }}
              >
                {params.value}
              </div>
            </div>
          );
        },
      },

      { headerName: "Risk Score", field: "riskScore", flex: 2 },
      { headerName: "Last Update", field: "lastUpdate", flex: 1 },
      {
        field: "actions",
        headerName: "Actions",
        width: 200,
        cellRenderer: (params: ICellRendererParams) => {
          // const selectedRows = params.api.getSelectedNodes().map((n) => n.data);
          return <ChampaignActionButton />;
        },
      },
    ],
    []
  );

const rowSelection = useMemo<"single" | "multiple">(() => "multiple", []);
  // const handleRowClick = (e: RowClickedEvent) => {
  //   const campaignId = e.data.id;
  //   router.push(`/campaigns/manage-campaigns/${campaignId}`);
  // };

  const tabsData = [
    {
      label: "About Campaign",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => <p>Coming Soon...</p>,
    },
    {
      label: "Monitor Campaign",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        if (!campData || campData.length === 0) return <div>Loading...</div>;
        return (
          <div className="ag-theme-alpine h-72">
            <div className="flex justify-between">
              <h1 className="text-xl font-bold mb-6 border-gray-300 pb-4 text-blue-950">
                Manage Campaigns
                <p className="font-normal text-sm pt-4">
                  Campaigns is <strong>Running</strong>. Directory snapshot as
                  of{" "}
                  <strong className="text-blue-600">
                    29/05/2025, 10:00 AM
                  </strong>
                  ,<strong className="pl-4">Due Date :- </strong>{" "}
                  <strong className="text-blue-600">
                    29/06/2025, 10:00 AM
                  </strong>
                </p>
              </h1>
            </div>
            <Accordion
              iconClass="absolute top-1 pb-4 right-0 rounded-full text-white bg-purple-800"
              title="Expand/Collapse"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="">
                  <div className="flex justify-between p-4">
                    <h2 className="text-lg text-gray-700">
                      Total Entitlements
                    </h2>
                  </div>
                  <ProgressDonutChart />
                </div>

                <div className="">
                  <div className="flex justify-between p-4">
                    <h2 className="text-lg text-gray-700"></h2>
                  </div>
                  <VerticalBarChart />
                </div>
                <div className="pl-2">
                  <div className="flex justify-between p-4">
                    <h2 className="text-lg text-gray-700">Campaign Risk</h2>
                  </div>
                  <table className="min-w-full table-auto text-left border-t border-gray-200">
                    <thead className="bg-gray-100 text-sm text-gray-600">
                      <tr>
                        <th className="px-4 py-2 bg-red-600 text-white">
                          Risk
                        </th>
                        <th className="px-4 py-2 bg-blue-400 text-white">
                          Impact
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700">
                      <tr className="border-t">
                        <td className="px-4 py-2">
                          800+ High risk entitlements
                        </td>
                        <td className="px-4 py-2 text-red-600">High</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2">50+ Privileged accounts</td>
                        <td className="px-4 py-2 text-yellow-500">Medium</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2">
                          80+ Orphan/deleted/rogue accounts
                        </td>
                        <td className="px-4 py-2 text-red-600">High</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2">10 SoD violations</td>
                        <td className="px-4 py-2 text-red-600">High</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2">
                          Dormant – Accounts not used for 60+ days
                        </td>
                        <td className="px-4 py-2  text-green-700">Low</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2">
                          Users with Sensitive Data access
                        </td>
                        <td className="px-4 py-2  text-yellow-500">Medium</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Accordion>
            <AgGridReact
              ref={gridRef}
              rowData={campData}
              columnDefs={columnDefs}
              rowSelection={rowSelection}
              context={{ gridRef }}
              rowModelType="clientSide"
              animateRows={true}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              // onRowClicked={handleRowClick}
              suppressRowClickSelection={true} // ✅ recommended for checkbox clarity
            />
          </div>
        );
      },
    },
    {
      label: "Auditor's Corner",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => <AuditorsCorner />,
    },
  ];

  return (
    <>
      <HorizontalTabs
        tabs={tabsData}
        activeIndex={tabIndex}
        onChange={setTabIndex}
      />
    </>
  );
}
