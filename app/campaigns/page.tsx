"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Tabs from "@/components/tabs";
import {
  CheckCircleIcon,
  ChevronDown,
  ChevronUp,
  Upload,
  ShieldX,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
// Type import only - component is dynamically loaded
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import {
  ColDef,
  ICellRendererParams,
  RowClickedEvent,
  CellClickedEvent,
  IDetailCellRendererParams,
  FirstDataRenderedEvent,
} from "ag-grid-enterprise";
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import "./Champaign.css";
import TemplateTab from "./TemplateTab";

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([MasterDetailModule]);

type CampaignRow = {
  id: string;
  campaignName: string;
  description: string | null;
  instances: number;
  progress: number;
  expiryDate: string | null;
  owner: string | null;
  startDate?: string | null;
  status?: string;
};

// Progress Bar Cell Renderer
const ProgressCellRenderer = (props: ICellRendererParams) => {
  const progress = props.value || 0;
  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <span className="progress-text">
        {progress}%
      </span>
    </div>
  );
};

// Detail Cell Renderer for Description
const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const description = props.data?.description || "No description available";
  return (
    <div className="flex p-2 bg-gray-50 border-t border-gray-200">
      <div className="flex flex-row items-center gap-2">
        <span className="text-gray-800 ml-3">{description}</span>
      </div>
    </div>
  );
};

// Terminate Modal Component
const TerminateModal = ({
  isOpen,
  onClose,
  campaignName,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  onConfirm: (justification: string) => void;
}) => {
  const [justification, setJustification] = useState("");

  const handleConfirm = () => {
    if (justification.trim()) {
      onConfirm(justification);
      setJustification("");
      onClose();
    }
  };

  const handleCancel = () => {
    setJustification("");
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900/50 px-3 z-[99]">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Terminate Campaign</h2>
        <p className="text-gray-600 mb-2">
          Are you sure you want to terminate <strong>{campaignName}</strong>?
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Please provide a reason for terminating this campaign..."
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!justification.trim()}
            className={`px-3 py-2 rounded ${
              justification.trim()
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Terminate
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function Campaigns() {
  const gridRef = useRef<AgGridReactType>(null);
  const router = useRouter();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [terminateModal, setTerminateModal] = useState<{
    isOpen: boolean;
    campaignId: string | null;
    campaignName: string;
  }>({
    isOpen: false,
    campaignId: null,
    campaignName: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    async function fetchCampaigns() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(
          "https://preview.keyforge.ai/certification/api/v1/ACMECOM/getCampaignAnalytics",
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error(`Failed to load campaigns (${res.status})`);
        }
        const data = await res.json();
        console.log(data)
        const campaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
        const mapped: CampaignRow[] = campaigns.map((c: any) => ({
          id: c.campaignID ?? String(c.id ?? ""),
          campaignName: c.name ?? "",
          description: c.description ?? null,
          instances: Number(c.totalNumOfCertificationInstance ?? 0),
          progress: Number(c.progress ?? 0),
          expiryDate: c.campaignExpiryDate ?? null,
          owner: Array.isArray(c?.campaignOwner?.ownerName)
            ? c.campaignOwner.ownerName.join(", ")
            : c?.campaignOwner?.ownerName ?? null,
          startDate: c.startDate ?? c.campaignStartDate ?? null,
          status: c.status ?? "", // Default to "Running" if not provided
        }));
        setRows(mapped);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Something went wrong loading campaigns");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCampaigns();
    return () => controller.abort();
  }, []);

  const handleRowClick = useCallback((e: RowClickedEvent | CellClickedEvent) => {
    const campaignId = e.data.id;
    try {
      // Find the full campaign data to get detailed progress information
      const fullCampaignData = rows.find(campaign => campaign.id === campaignId);
      
      // Persist selected campaign summary for header display on detail page
      const payload = {
        campaignId,
        campaignName: e.data.campaignName,
        status: "", // default/demo status; replace when real status available
        snapshotAt: new Date().toISOString(),
        dueDate: e.data.expiryDate,
        progress: e.data.progress, // Include campaign progress percentage
        // Add campaign-level progress details for app owner page
        totalItems: e.data.instances, // totalNumOfCertificationInstance
        approvedCount: Math.round((e.data.instances * e.data.progress) / 100), // calculated from progress
        pendingCount: Math.round((e.data.instances * (100 - e.data.progress)) / 100), // remaining
      };
      localStorage.setItem("selectedCampaignSummary", JSON.stringify(payload));
      // notify other tabs/components if needed
      window.dispatchEvent(new Event("localStorageChange"));
    } catch {}
    router.push(`/campaigns/manage-campaigns/${campaignId}`);
  }, [rows, router]);

  const columnDefs = useMemo<ColDef[]>(
    () => {
      const ActionsCellRenderer = (params: ICellRendererParams) => {
        const status = params.data?.status || "Running";
        const isStaging = status === "Staging";
        
        const handlePushToProduction = () => {
          // TODO: Implement push to production logic
          console.log("Push to Production clicked for campaign:", params.data?.id);
          alert(`Pushing campaign "${params.data?.campaignName}" to production...`);
        };

        const handleTerminate = () => {
          setTerminateModal({
            isOpen: true,
            campaignId: params.data?.id,
            campaignName: params.data?.campaignName || "",
          });
        };

        const handleTeamsClick = () => {
          // Get owner email or use a default - you may need to adjust this based on your data structure
          const ownerEmail = params.data?.owner?.split(",")[0]?.trim() || "";
          if (ownerEmail) {
            const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${ownerEmail}&topicName=${encodeURIComponent(params.data?.campaignName || "Campaign")}&message=Hello`;
            window.open(teamsUrl, '_blank', 'noopener,noreferrer');
          } else {
            // Fallback: open Teams without specific user
            const teamsUrl = `https://teams.microsoft.com/`;
            window.open(teamsUrl, '_blank', 'noopener,noreferrer');
          }
        };

        // Generate unique gradient ID for Teams icon
        const gradientId = `teams-gradient-${params.data?.id || params.node?.id || Math.random()}`;
        
        return (
          <div className="flex space-x-2 h-full items-center">
            <button
              title="Terminate"
              aria-label="Terminate campaign"
              onClick={(e) => {
                e.stopPropagation();
                handleTerminate();
              }}
              className="p-1 rounded transition-colors duration-200 hover:bg-red-100"
            >
              <ShieldX
                className="cursor-pointer"
                strokeWidth="1"
                size="24"
                color="#dc2626"
              />
            </button>
            <button
              title="Microsoft Teams"
              aria-label="Open in Microsoft Teams"
              onClick={(e) => {
                e.stopPropagation();
                handleTeamsClick();
              }}
              className="p-1 rounded transition-colors duration-200 hover:bg-gray-100 flex-shrink-0 cursor-pointer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
              >
                <path
                  fill="#5059C9"
                  d="M10.765 6.875h3.616c.342 0 .619.276.619.617v3.288a2.272 2.272 0 01-2.274 2.27h-.01a2.272 2.272 0 01-2.274-2.27V7.199c0-.179.145-.323.323-.323zM13.21 6.225c.808 0 1.464-.655 1.464-1.462 0-.808-.656-1.463-1.465-1.463s-1.465.655-1.465 1.463c0 .807.656 1.462 1.465 1.462z"
                />
                <path
                  fill="#7B83EB"
                  d="M8.651 6.225a2.114 2.114 0 002.117-2.112A2.114 2.114 0 008.65 2a2.114 2.114 0 00-2.116 2.112c0 1.167.947 2.113 2.116 2.113zM11.473 6.875h-5.97a.611.611 0 00-.596.625v3.75A3.669 3.669 0 008.488 15a3.669 3.669 0 003.582-3.75V7.5a.611.611 0 00-.597-.625z"
                />
                <path
                  fill={`url(#${gradientId})`}
                  d="M1.597 4.925h5.969c.33 0 .597.267.597.596v5.958a.596.596 0 01-.597.596h-5.97A.596.596 0 011 11.479V5.521c0-.33.267-.596.597-.596z"
                />
                <path
                  fill="#ffffff"
                  d="M6.152 7.193H4.959v3.243h-.76V7.193H3.01v-.63h3.141v.63z"
                />
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="2.244"
                    x2="6.906"
                    y1="4.46"
                    y2="12.548"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#5A62C3" />
                    <stop offset="1" stopColor="#7B83EB" />
                  </linearGradient>
                </defs>
              </svg>
            </button>
            <button
              title="Sign Off"
              aria-label="Sign off selected rows"
              className="p-1 rounded transition-colors duration-200"
            >
              <CheckCircleIcon
                className="cursor-pointer"
                strokeWidth="1"
                size="24"
                color="#10a13cff"
              />
            </button>
            {isStaging && (
              <button
                title="Push to Production"
                aria-label="Push to Production"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePushToProduction();
                }}
                className="p-1 rounded transition-colors duration-200 hover:bg-green-100"
              >
                <Upload
                  className="cursor-pointer"
                  strokeWidth="1"
                  size="24"
                  color="#10a13cff"
                />
              </button>
            )}
          </div>
        );
      };

      return [
      {
        headerName: "Campaign Name",
        field: "campaignName",
        // cellRenderer: "agGroupCellRenderer",
        width:400,
        onCellClicked: handleRowClick,
      },
      {
        headerName: "Description",
        field: "description",
        flex: 2,
        hide: true, // Hide in main grid, show in detail row
      },
      { 
        headerName: "Instances", 
        field: "instances", 
        width:170,
        onCellClicked: handleRowClick,
      },
      { 
        headerName: "Progress", 
        field: "progress", 
        width:180,
        cellRenderer: ProgressCellRenderer,
        onCellClicked: handleRowClick,
      },
      { 
        headerName: "Expiry Date", 
        field: "expiryDate", 
        width:180,
        flex: 1, 
        valueFormatter: (p:any)=> require("@/utils/utils").formatDateMMDDYY(p.value),
        onCellClicked: handleRowClick,
      },
      { 
        headerName: "Owner", 
        field: "owner",
        width:150, 
        flex: 1,
        onCellClicked: handleRowClick,
      },
      { 
        headerName: "Start Date", 
        field: "startDate", 
        width: 160,
        flex: 1,
        valueFormatter: (p: any) => p.value ? require("@/utils/utils").formatDateMMDDYY(p.value) : ""
      },
      { 
        headerName: "Status", 
        field: "status", 
        width: 140,
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
        width: 200,
        cellRenderer: ActionsCellRenderer,
      },
    ];
    },
    [setTerminateModal, handleRowClick]
  );

  const onFirstDataRendered = (params: FirstDataRenderedEvent) => {
    console.log("First data rendered, expanding all rows");
    params.api.forEachNode((node) => {
      if (node.master) {
        node.setExpanded(true); // Expand all master rows
      }
    });
  };

  const tabsData = [
    {
      label: "Active",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => {
        if (isLoading) return <div>Loading...</div>;
        if (error) return <div className="text-red-600">{error}</div>;
        return (
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
              onFirstDataRendered={onFirstDataRendered}
            />
          </div>
        );
      },
    },
    {
      label: "Completed",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => <p>Coming Soon...</p>,
    },
    {
      label: "Template",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => <TemplateTab />,
    },
  ];

  const handleTerminateConfirm = async (justification: string) => {
    if (!terminateModal.campaignId) return;
    
    try {
      // TODO: Implement API call to terminate campaign
      console.log("Terminating campaign:", terminateModal.campaignId, "with justification:", justification);
      
      // Example API call (uncomment and adjust when ready):
      // const response = await fetch(
      //   `https://preview.keyforge.ai/certification/api/v1/ACMECOM/terminateCampaign/${terminateModal.campaignId}`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({ justification }),
      //   }
      // );
      // if (!response.ok) throw new Error("Failed to terminate campaign");
      
      // Update local state - remove or update the terminated campaign
      setRows((prevRows) =>
        prevRows.filter((row) => row.id !== terminateModal.campaignId)
      );
      
      alert(`Campaign "${terminateModal.campaignName}" has been terminated.`);
    } catch (err: any) {
      console.error("Error terminating campaign:", err);
      alert(`Failed to terminate campaign: ${err.message}`);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              All Campaigns
            </h1>
            <p className="text-gray-600 text-sm">
              Access review campaigns are used to manage the certification of access for your users. To start an access review campaign.
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Create New
          </Link>
        </div>
        
        <div className="mb-6">
          <Tabs
            tabs={tabsData}
            activeClass="bg-blue-600 text-white rounded-lg -ml-1"
            buttonClass="h-9 -mt-1 w-26 text-sm px-2 py-1"
            className="ml-0.5 border border-gray-300 w-80 h-8 rounded-md"
          />
        </div>
      </div>
      
      <TerminateModal
        isOpen={terminateModal.isOpen}
        onClose={() => setTerminateModal({ isOpen: false, campaignId: null, campaignName: "" })}
        campaignName={terminateModal.campaignName}
        onConfirm={handleTerminateConfirm}
      />
    </div>
  );
}