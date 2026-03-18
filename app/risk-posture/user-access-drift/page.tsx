'use client';

import React, { useMemo } from "react";
import { ColDef } from "ag-grid-community";
import AgGridReact from "@/components/AgGridWrapper";

const UserAccessDriftPage = () => {
  const rows = [
    {
      entitlement: "FIN_AP_APPROVER",
      type: "Role",
      application: "Oracle EBS",
      account: "alice.williams",
      lastLogin: "2026-03-12",
    },
    {
      entitlement: "MM_CREATE_PO",
      type: "Entitlement",
      application: "SAP",
      account: "bob.smith",
      lastLogin: "2026-03-09",
    },
    {
      entitlement: "FIN_REPORT_RUN",
      type: "Entitlement",
      application: "Workday",
      account: "charlie.jones",
      lastLogin: "2026-03-01",
    },
    {
      entitlement: "HR_EMPLOYEE_READ",
      type: "Role",
      application: "SuccessFactors",
      account: "diana.lee",
      lastLogin: "2026-02-26",
    },
    {
      entitlement: "GL_JOURNAL_POST",
      type: "Entitlement",
      application: "Oracle Fusion",
      account: "ethan.miller",
      lastLogin: "2026-02-21",
    },
    {
      entitlement: "IT_TICKET_ADMIN",
      type: "Role",
      application: "ServiceNow",
      account: "frank.wilson",
      lastLogin: "2026-03-14",
    },
  ];

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Entitlement", field: "entitlement", filter: true, sortable: true, flex: 1.3 },
      { headerName: "Type", field: "type", filter: true, sortable: true, flex: 0.8 },
      { headerName: "Application", field: "application", filter: true, sortable: true, flex: 1 },
      { headerName: "Account", field: "account", filter: true, sortable: true, flex: 1 },
      { headerName: "Last Login", field: "lastLogin", filter: "agDateColumnFilter", sortable: true, flex: 0.9 },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          User Access Drift
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Users whose access has drifted from expected patterns.
        </p>
      </div>

      <div className="ag-theme-alpine h-[500px] w-full">
        <AgGridReact
          rowData={rows}
          columnDefs={columnDefs}
          suppressCellFocus={true}
          domLayout="normal"
        />
      </div>
    </div>
  );
};

export default UserAccessDriftPage;

