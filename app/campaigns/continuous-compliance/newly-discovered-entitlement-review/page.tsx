"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ColDef } from "ag-grid-enterprise";
import { themeQuartz } from "ag-grid-community";
import { CircleCheck, Pencil, UserRoundCheck } from "lucide-react";
import "@/lib/ag-grid-setup";
import CustomPagination from "@/components/agTable/CustomPagination";

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

type EntRow = {
  id: string;
  entitlement: string;
  type: string;
  application: string;
  lastSync: string;
  lastReviewed: string;
};

const MOCK_ROWS: EntRow[] = [
  {
    id: "nde-1",
    entitlement: "ZNEW_BILL_REVENUE_ACC",
    type: "Group",
    application: "SAP_S4",
    lastSync: "03/18/26",
    lastReviewed: "09/10/25",
  },
  {
    id: "nde-2",
    entitlement: "Z_FI_AA_TRANS",
    type: "Group",
    application: "Workday",
    lastSync: "03/15/26",
    lastReviewed: "08/22/25",
  },
  {
    id: "nde-3",
    entitlement: "ZNEW_DM_REVENUE_ACC",
    type: "Role",
    application: "Oracle_Fusion_HCM",
    lastSync: "03/12/26",
    lastReviewed: "07/01/25",
  },
];

/** Application filter dropdown values (must match row `application` when not "all"). */
const APPLICATION_FILTER_OPTIONS = [
  "all",
  "ACMECorporateDirectory",
  "Workday",
  "Oracle_Fusion_HCM",
  "SAP_S4",
  "KF_OCI",
] as const;

export default function NewlyDiscoveredEntitlementReviewPage() {
  const searchParams = useSearchParams();
  const triggerEvent =
    searchParams.get("triggerEvent") || "Newly Discovered Entitlement";
  const details = searchParams.get("details") || "";
  const assignedTo = searchParams.get("assignedTo") || "";
  const dueOn = searchParams.get("dueOn") || "";
  const actionType = searchParams.get("actionType") || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [applicationFilter, setApplicationFilter] = useState<string>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const filteredRows = useMemo(() => {
    let rows = [...MOCK_ROWS];
    if (applicationFilter !== "all") {
      rows = rows.filter((r) => r.application === applicationFilter);
    }
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [
          r.entitlement,
          r.type,
          r.application,
          r.lastSync,
          r.lastReviewed,
        ].some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [searchTerm, applicationFilter]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);

  const paginatedRows = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageNumber, pageSize]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, applicationFilter, pageSize]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Entitlement",
        field: "entitlement",
        flex: 2,
        minWidth: 220,
        cellRenderer: (params: { value?: string }) => (
          <span className="font-semibold text-gray-900">{params.value ?? ""}</span>
        ),
      },
      {
        headerName: "Type",
        field: "type",
        flex: 1,
        minWidth: 100,
      },
      {
        headerName: "Application",
        field: "application",
        flex: 1.2,
        minWidth: 130,
      },
      {
        headerName: "Last Sync",
        field: "lastSync",
        flex: 1,
        minWidth: 110,
      },
      {
        headerName: "Last Reviewed",
        field: "lastReviewed",
        flex: 1,
        minWidth: 120,
      },
      {
        headerName: "Action",
        field: "action",
        flex: 1,
        minWidth: 140,
        sortable: false,
        filter: false,
        cellRenderer: () => (
          <div
            className="flex items-center gap-3 h-full py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Edit"
              aria-label="Edit"
              className="p-1 rounded hover:bg-gray-100 text-gray-700"
            >
              <Pencil className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              title="Approve"
              aria-label="Approve"
              className="p-1 rounded hover:bg-green-50 text-emerald-700"
            >
              <CircleCheck className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              title="Reassign"
              aria-label="Reassign"
              className="p-1 rounded hover:bg-purple-50"
            >
              <UserRoundCheck
                className="w-5 h-5"
                color="#b146cc"
                strokeWidth={1}
              />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#f4f5f8] py-6 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Entitlements</h1>
            <p className="text-sm text-gray-600 mt-1">
              Newly discovered entitlement — review required (
              {totalItems === MOCK_ROWS.length
                ? `${totalItems} shown`
                : `${totalItems} of ${MOCK_ROWS.length} shown`}
              ).
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {triggerEvent}
              {details ? ` · ${details}` : ""}
              {actionType ? ` · ${actionType}` : ""}
              {dueOn ? ` · Due ${dueOn}` : ""}
              {assignedTo ? ` · Reviewer queue: ${assignedTo}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md px-3 py-1.5 w-56 max-w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search entitlements"
            />
            <select
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white min-w-[12rem] max-w-[min(100vw-2rem,20rem)]"
              value={applicationFilter}
              onChange={(e) => setApplicationFilter(e.target.value)}
              aria-label="Filter by application"
            >
              {APPLICATION_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All" : opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-2">
          <CustomPagination
            totalItems={totalItems}
            currentPage={pageNumber}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPageNumber}
            onPageSizeChange={(n) => {
              if (n === "all") {
                setPageSize(totalItems || MOCK_ROWS.length);
              } else if (typeof n === "number") {
                setPageSize(n);
              }
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm ag-theme-alpine">
          <AgGridReact
            theme={themeQuartz}
            rowData={paginatedRows}
            columnDefs={columnDefs}
            domLayout="autoHeight"
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
            }}
            getRowId={(p) => p.data.id}
            suppressRowClickSelection
          />
        </div>

        <div className="mt-3">
          <CustomPagination
            totalItems={totalItems}
            currentPage={pageNumber}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPageNumber}
            onPageSizeChange={(n) => {
              if (n === "all") {
                setPageSize(totalItems || MOCK_ROWS.length);
              } else if (typeof n === "number") {
                setPageSize(n);
              }
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </div>
    </div>
  );
}
