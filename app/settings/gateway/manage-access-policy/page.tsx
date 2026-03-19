"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
// Type import only - component is dynamically loaded
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import { executeQuery } from "@/lib/api";
import { ColDef, ICellRendererParams, IDetailCellRendererParams, RowClickedEvent } from "ag-grid-enterprise";
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import "./AccessPolicy.css";

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([MasterDetailModule]);

type AccessPolicyRow = {
  id: string;
  policy_name: string;
  policy_description: string | null;
  priority: number | null;
  created_by: string | null;
  status: string | null;
};

type PendingStatusChange = {
  id: string;
  policyName: string;
  nextStatus: "Active" | "Inactive";
};

// Detail Cell Renderer for Description
const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const description = props.data?.policy_description || "No description available";
  return (
    <div className="flex p-2 bg-gray-50 border-t border-gray-200">
      <div className="flex flex-row items-center gap-2">
        <span className="text-gray-800 pl-2">{description}</span>
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
  const [pendingStatusChange, setPendingStatusChange] =
    useState<PendingStatusChange | null>(null);

  const isRowActive = useCallback((status: string | null | undefined) => {
    return (status || "").trim().toLowerCase() === "active";
  }, []);

  const handleStatusToggleRequest = useCallback(
    (row: AccessPolicyRow) => {
      const currentlyActive = isRowActive(row.status);
      const nextStatus: "Active" | "Inactive" = currentlyActive
        ? "Inactive"
        : "Active";

      setPendingStatusChange({
        id: row.id,
        policyName: row.policy_name,
        nextStatus,
      });
    },
    [isRowActive],
  );

  const confirmStatusToggle = useCallback(() => {
    if (!pendingStatusChange) return;

    setRows((prev) =>
      prev.map((r) =>
        r.id === pendingStatusChange.id
          ? { ...r, status: pendingStatusChange.nextStatus }
          : r,
      ),
    );
    setPendingStatusChange(null);
  }, [pendingStatusChange]);

  const cancelStatusToggle = useCallback(() => {
    setPendingStatusChange(null);
  }, []);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const query = "select * from kf_ap_access_policies_vw order by ?";
        const parameters = [" "];

        const response = await executeQuery<any>(query, parameters);
        const rowsFromApi: any[] =
          Array.isArray(response)
            ? response
            : Array.isArray((response as any).resultSet)
            ? (response as any).resultSet
            : Array.isArray((response as any).rows)
            ? (response as any).rows
            : [];

        const normalized: AccessPolicyRow[] = rowsFromApi.map((row, idx) => ({
          id:
            String(
              row.id ??
                row.policy_id ??
                row.policyid ??
                row.policy_name ??
                idx
            ) || String(idx),
          policy_name:
            row.policy_name ??
            row.POLICY_NAME ??
            row.name ??
            "Unnamed Policy",
          policy_description:
            row.policy_description ??
            row.POLICY_DESCRIPTION ??
            row.description ??
            null,
          priority:
            row.priority !== undefined && row.priority !== null
              ? Number(row.priority)
              : null,
          created_by:
            row.created_by ??
            row.CREATED_BY ??
            row.owner ??
            row.createdby ??
            null,
          status:
            row.status ??
            row.STATUS ??
            row.policy_status ??
            row.state ??
            null,
        }));

        setRows(normalized);
      } catch (e: any) {
        console.error("Failed to load access policies:", e);
        setError(
          e?.message || "Failed to load access policies from executeQuery API."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Policy Name",
        field: "policy_name",
        width: 300,
      },
      {
        headerName: "Description",
        field: "policy_description",
        flex: 2,
        hide: false,
      },
      { headerName: "Created By", field: "created_by", flex: 1 },
      {
        headerName: "Status",
        field: "status",
        width: 180,
        minWidth: 180,
        maxWidth: 180,
        suppressSizeToFit: true,
        cellRenderer: (params: ICellRendererParams) => {
          const row = params.data as AccessPolicyRow;
          const isActive = isRowActive(row?.status);
          const statusLabel = isActive ? "Active" : "Inactive";

          return (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!row) return;
                  handleStatusToggleRequest(row);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? "bg-green-500" : "bg-gray-300"
                }`}
                title={`Set policy to ${isActive ? "Inactive" : "Active"}`}
                aria-label={`Toggle status. Current status ${statusLabel}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-green-700" : "text-gray-700"
                }`}
                style={{ display: "inline-block", minWidth: 70, textAlign: "left" }}
              >
                {statusLabel}
              </span>
            </div>
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 120,
        minWidth: 120,
        maxWidth: 120,
        suppressSizeToFit: true,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex space-x-4 h-full items-center">
              <button
                title="Edit Policy"
                aria-label="Edit policy"
                className="p-1 rounded transition-colors duration-200 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  const id = params.data?.id;
                  if (!id) return;
                  router.push(`/settings/gateway/manage-access-policy/new?policyId=${encodeURIComponent(id)}`);
                }}
              >
                <SquarePen className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          );
        },
      },
    ],
    [handleStatusToggleRequest, isRowActive, router]
  );

  const handleRowClick = (e: RowClickedEvent) => {
    const policyId = e.data.id;
    router.push(`/settings/gateway/manage-access-policy/${policyId}`);
  };

  return (
    <div className="p-6 bg-white min-h-screen access-policy-page">
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
        
        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="ag-theme-quartz w-full"
              style={{ width: "100%", minWidth: 0 }}
            >
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
                  filter: false,
                  resizable: true,
                  cellStyle: {
                    display: "flex",
                    alignItems: "center",      // vertical center
                    justifyContent: "flex-start", // left-align content
                  },
                }}
                masterDetail={true}
                detailCellRenderer={DetailCellRenderer}
                detailRowAutoHeight={true}
                detailRowHeight={80}
                domLayout="autoHeight"
                onGridReady={(params) => {
                  params.api.sizeColumnsToFit();
                  const handleResize = () => {
                    try {
                      params.api.sizeColumnsToFit();
                    } catch {
                      // ignore
                    }
                  };
                  window.addEventListener("resize", handleResize);
                  params.api.addEventListener("gridPreDestroyed", () => {
                    window.removeEventListener("resize", handleResize);
                  });
                }}
                onGridSizeChanged={(params) => {
                  try {
                    params.api.sizeColumnsToFit();
                  } catch {
                    // ignore
                  }
                }}
                onFirstDataRendered={(params) => {
                  params.api.sizeColumnsToFit();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {pendingStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Status Change
            </h2>
            <p className="text-sm text-gray-700 mb-5">
              Change policy <span className="font-medium">"{pendingStatusChange.policyName}"</span> to{" "}
              <span className="font-medium">{pendingStatusChange.nextStatus}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelStatusToggle}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusToggle}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
