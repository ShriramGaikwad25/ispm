"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import { AgGridReact as AgGridReactType } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import HorizontalTabs from "@/components/HorizontalTabs";
import Accordion from "@/components/Accordion";
import ProgressDonutChart from "@/components/ProgressDonutChart";
import VerticalBarChart from "@/components/VerticalBarChart";
import ChampaignActionButton from "@/components/agTable/ChampaignActionButton";
import AuditorsCorner from "../AuditorsCorner";
import Revocations from "./Revocations";

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
      label: "Manage",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        if (!campData || campData.length === 0) return <div>Loading...</div>;
        return (
          <div className="ag-theme-alpine h-72">
            <div className="flex justify-between">
              <h1 className="text-xl font-bold mb-6 border-b border-gray-200 pb-4 text-blue-950">
                Manage Campaigns
                {/* <p className="font-normal text-sm pt-4">
                  Campaigns is <strong>Running</strong>. Directory snapshot as
                  of{" "}
                  <strong className="text-blue-600">
                    29/05/2025, 10:00 AM
                  </strong>
                  ,<strong className="pl-4">Due Date :- </strong>{" "}
                  <strong className="text-blue-600">
                    29/06/2025, 10:00 AM
                  </strong>
                </p> */}
              </h1>
            </div>
            <div className="mb-4">
              <Accordion
                iconClass="absolute top-1 pb-4 right-0 rounded-full text-white bg-purple-800 mb-4"
                title="Expand/Collapse"
              >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-700">Revenue</h2>
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="px-2 pb-2">
                    <VerticalBarChart />
                  </div>
                </div>

                {/* Risk / Impact Card as Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full table-auto text-sm text-gray-700 border-collapse p-4">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-6 py-3 bg-rose-100 text-rose-700 rounded-tl-xl font-medium">Risk</th>
                        <th className="text-left px-6 py-3 bg-blue-100 text-blue-700 rounded-tr-xl font-medium border-l-2 border-gray-300">Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 last:border-b-0">
                        <td className="px-6 py-4">800+ High Risk Entitlements</td>
                        <td className="px-6 py-4 border-l-2 border-gray-300">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Medium</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 last:border-b-0">
                        <td className="px-6 py-4">50+ Privileged Accounts</td>
                        <td className="px-6 py-4 border-l-2 border-gray-300">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">High</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 last:border-b-0">
                        <td className="px-6 py-4">80+ Orphan/deleted/rogue accounts</td>
                        <td className="px-6 py-4 border-l-2 border-gray-300">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Low</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 last:border-b-0">
                        <td className="px-6 py-4">10 SoD Violations</td>
                        <td className="px-6 py-4 border-l-2 border-gray-300">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Medium</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 last:border-b-0">
                        <td className="px-6 py-4">Dormant - Accounts not used for 60+ days</td>
                        <td className="px-6 py-4 border-l-2 border-gray-300">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">High</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Progress Summary Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-700">Progress Summary</h2>
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="px-2 pb-2">
                    <ProgressDonutChart />
                  </div>
                </div>
              </div>
              </Accordion>
            </div>
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
    {
      label: "Revocations",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => <Revocations />,
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
