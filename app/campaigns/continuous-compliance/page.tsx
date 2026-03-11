"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FileText, UserRoundCheckIcon } from "lucide-react";
import "@/lib/ag-grid-setup";

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

const rows = [
  // User events
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Job Title Change",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Manager Change",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Privileged Access Assigned (Directly)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "New Account Discovered (Directly/Target System recon)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "SoD Violation Detected",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Account Inactive (>90 days)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Conditional Access Expiry (in 7 days)",
    actionType: "Access Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Manager Inactive",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Contractor Expiring in 7 days",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType: "Sensitive Data Access (Advanced, for later phases)",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType:
      "User Risk Score Breach (Advanced, can we integrated with SIEM/UEBA for input, later phases)",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "User",
    details: "Ssharma",
    eventType:
      "Privilege Escalation Chain Detection (user acquires multiple privilege accesses through either request or directly in end system)",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  // Entitlement events
  {
    entity: "Entitlement",
    details: "ZNew_Comp_PP4",
    eventType: "Newly Discovered Entitlement",
    actionType: "Review Details",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "Entitlement",
    details: "ZNew_Comp_PP4",
    eventType: "Owner Inactive",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  {
    entity: "Entitlement",
    details: "No assigned user for more than X days",
    eventType: "No Assigned User",
    actionType: "Review",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  // Service account events
  {
    entity: "Service Account",
    details: "svc_148",
    eventType: "Owner Inactive",
    actionType: "Reassign",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
  // Account events
  {
    entity: "Account",
    details: "Multiple",
    eventType: "Newly Discovered Unlinked Accounts",
    actionType: "Classify",
    dueOn: "03/15/2026",
    actions: ["Review", "Reassign"],
  },
];

const columnDefs: ColDef[] = [
  { headerName: "Entity", field: "entity", flex: 1 },
  { headerName: "Details", field: "details", flex: 1 },
  {
    headerName: "Event Type",
    field: "eventType",
    flex: 2,
    wrapText: true,
    autoHeight: true,
  },
  { headerName: "Action Type", field: "actionType", flex: 1 },
  { headerName: "Due On / Expires In", field: "dueOn", flex: 1.2 },
  {
    headerName: "Actions",
    field: "actions",
    flex: 1,
    width: 180,
    sortable: false,
    filter: false,
    cellRenderer: (params: ICellRendererParams) => {
      const value = params.value as string[] | string | undefined;
      const hasReview = Array.isArray(value)
        ? value.includes("Review")
        : typeof value === "string"
          ? value.includes("Review")
          : true;
      const hasReassign = Array.isArray(value)
        ? value.includes("Reassign")
        : typeof value === "string"
          ? value.includes("Reassign")
          : true;

      return (
        <div className="flex items-center gap-2 h-full" onClick={(e) => e.stopPropagation()}>
          {hasReview && (
            <button
              type="button"
              title="Review"
              aria-label="Review"
              className="p-1 rounded transition-colors duration-200 hover:bg-green-50"
              onClick={() => {
                // placeholder handler – wire to review workflow later
                // eslint-disable-next-line no-console
                console.log("Review clicked", params.data);
              }}
            >
              <FileText
                className="cursor-pointer"
                color="#2563eb"
                strokeWidth={1}
                size={22}
              />
            </button>
          )}
          {hasReassign && (
            <button
              type="button"
              title="Reassign"
              aria-label="Reassign"
              className="p-1 rounded transition-colors duration-200 hover:bg-purple-50"
              onClick={() => {
                // placeholder handler – wire to reassign workflow later
                // eslint-disable-next-line no-console
                console.log("Reassign clicked", params.data);
              }}
            >
              <UserRoundCheckIcon
                className="cursor-pointer"
                color="#b146ccff"
                strokeWidth={1}
                size={22}
              />
            </button>
          )}
        </div>
      );
    },
  },
];

export default function ContinuousCompliancePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Continuous Compliance
              </h1>
            </div>
          </div>

          <div className="mt-4">
            <div className="ag-theme-alpine w-full">
              <AgGridReact
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                  flex: 1,
                }}
                domLayout="autoHeight"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

