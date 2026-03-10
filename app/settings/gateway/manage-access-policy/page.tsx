"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
        hide: true,
      },
      { 
        headerName: "Priority",
        field: "priority",
        width: 120,
      },
      { headerName: "Created By", field: "created_by", flex: 1 },
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
        width: 120,
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
    []
  );

  const handleRowClick = (e: RowClickedEvent) => {
    const policyId = e.data.id;
    router.push(`/settings/gateway/manage-access-policy/${policyId}`);
  };

  return (
    <div className="p-6 bg-white min-h-screen">
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
              onGridReady={(params) => {
                params.api.sizeColumnsToFit();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
