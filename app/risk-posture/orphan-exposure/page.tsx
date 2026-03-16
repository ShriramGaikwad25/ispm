'use client';

import React, { useMemo } from "react";
import { ColDef } from "ag-grid-community";
import AgGridReact from "@/components/AgGridWrapper";

const OrphanExposurePage = () => {
  const rows = [
    {
      account: "john.doe",
      application: "Oracle EBS",
      entitlement: "AP_SUPER_USER",
      privilege: "Approve Invoices",
      lastLogin: "2026-03-10",
    },
    {
      account: "service-finance-01",
      application: "SAP",
      entitlement: "FI_DISPLAY",
      privilege: "View Financial Reports",
      lastLogin: "2026-02-28",
    },
    {
      account: "orphan-db-usr",
      application: "Oracle DB",
      entitlement: "DBA_ROLE",
      privilege: "Full Database Access",
      lastLogin: "2025-12-31",
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
          Orphan Exposure
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Orphaned accounts and their associated access.
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

export default OrphanExposurePage;

