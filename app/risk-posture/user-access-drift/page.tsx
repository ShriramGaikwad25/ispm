'use client';

import React, { useMemo } from "react";
import { ColDef } from "ag-grid-community";
import AgGridReact from "@/components/AgGridWrapper";

const UserAccessDriftPage = () => {
  const rows = [
    {
      account: "alice.williams",
      application: "Oracle EBS",
      entitlement: "XX_HR_VIEW",
      privilege: "View HR Data",
      lastLogin: "2026-03-12",
    },
    {
      account: "bob.smith",
      application: "SAP",
      entitlement: "MM_CREATE_PO",
      privilege: "Create Purchase Orders",
      lastLogin: "2026-03-09",
    },
    {
      account: "charlie.jones",
      application: "Workday",
      entitlement: "FIN_REPORT_RUN",
      privilege: "Run Finance Reports",
      lastLogin: "2026-03-01",
    },
  ];

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Account", field: "account", filter: true, sortable: true },
      { headerName: "Application", field: "application", filter: true, sortable: true },
      { headerName: "Entitlement", field: "entitlement", filter: true, sortable: true },
      { headerName: "Privilege", field: "privilege", filter: true, sortable: true, flex: 1 },
      { headerName: "Last Login", field: "lastLogin", filter: "agDateColumnFilter", sortable: true },
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

