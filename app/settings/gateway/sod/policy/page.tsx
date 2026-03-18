"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import SodTabs from "@/components/SodTabs";
import dynamic from "next/dynamic";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-enterprise";
import "@/lib/ag-grid-setup";
import { useLeftSidebar } from "@/contexts/LeftSidebarContext";

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

const DUMMY_OWNERS = ["RiskAdmin", "SysAdm", "AccessOps", "AuditLead"];

type SodPolicyJson = {
  Policy_ID?: string;
  Policy_Name?: string;
  Description?: string;
  Owner?: string;
  "Mitigating Control ID"?: string;
};

type SodPolicyRow = {
  name: string;
  description: string;
  owner: string;
  riskDefinition: string;
  businessProcess: string;
};

const inferBusinessProcess = (policyName: string): string => {
  const name = policyName.toLowerCase();

  if (name.includes("supplier") || name.includes("invoice") || name.includes("payment")) {
    return "Procure to Pay";
  }
  if (name.includes("revenue") || name.includes("credit")) {
    return "Revenue and Credit Management";
  }
  if (name.includes("directory")) {
    return "Directory Access Administration";
  }
  if (name.includes("access") || name.includes("identity governance")) {
    return "Identity Governance and Access App";
  }
  if (name.includes("recruiting") || name.includes("worker") || name.includes("payroll")) {
    return "HR Lifecycle Management";
  }
  if (name.includes("hcm")) {
    return "HCM Platform Operations";
  }

  return "N/A";
};

export default function SodPolicyPage() {
  const { isVisible, sidebarWidthPx } = useLeftSidebar();
  const gridApiRef = useRef<GridApi | null>(null);
  const [rowData, setRowData] = useState<SodPolicyRow[]>([]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Name",
        field: "name",
        minWidth: 220,
        flex: 1,
      },
      {
        headerName: "Description",
        field: "description",
        minWidth: 260,
        flex: 2,
      },
      {
        headerName: "Owner",
        field: "owner",
        minWidth: 180,
      },
      {
        headerName: "Mitigating Controls",
        field: "riskDefinition",
        minWidth: 200,
      },
      {
        headerName: "Business Process",
        field: "businessProcess",
        minWidth: 220,
      },
      {
        headerName: "Actions",
        field: "actions",
        width: 140,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const fitColumns = useCallback(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.sizeColumnsToFit();
  }, []);

  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      gridApiRef.current = params.api;
      fitColumns();
    },
    [fitColumns]
  );

  useEffect(() => {
    let cancelled = false;

    const loadPolicyData = async () => {
      try {
        const response = await fetch("/SODPolicy.json");
        if (!response.ok) {
          throw new Error(`Failed to load SODPolicy.json: ${response.status}`);
        }

        const json = (await response.json()) as SodPolicyJson[];
        if (cancelled) return;

        const mappedRows: SodPolicyRow[] = json.map((policy, index) => {
          const name = (policy.Policy_Name ?? "").trim();
          const description = (policy.Description ?? "").trim();
          const owner = (policy.Owner ?? "").trim();
          const mitigatingControlIds = (policy["Mitigating Control ID"] ?? "").trim();

          return {
            name,
            description,
            owner: owner || DUMMY_OWNERS[index % DUMMY_OWNERS.length],
            riskDefinition: mitigatingControlIds || name || "N/A",
            businessProcess: inferBusinessProcess(name),
          };
        });

        setRowData(mappedRows);
      } catch (error) {
        console.error("Error loading SoD policy data:", error);
      }
    };

    loadPolicyData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gridApiRef.current) return;
    const timer = window.setTimeout(() => {
      fitColumns();
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fitColumns, isVisible, sidebarWidthPx]);

  return (
    <div className="h-[calc(100vh-60px)] w-full">
      <div className="h-full w-full flex flex-col space-y-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SoD</h1>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col">
          <SodTabs />

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">SoD Policy</h2>
            <Link
              href="/settings/gateway/sod/policy/new"
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
            </Link>
          </div>

          <div className="flex-1 min-h-0">
            <div className="h-full w-full">
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                rowSelection="multiple"
                rowModelType="clientSide"
                animateRows={true}
                onGridReady={handleGridReady}
                onGridSizeChanged={fitColumns}
                onFirstDataRendered={fitColumns}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

