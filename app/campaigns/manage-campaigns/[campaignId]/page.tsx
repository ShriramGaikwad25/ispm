"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
// Type import only - component is dynamically loaded
type AgGridReactType = any;
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import HorizontalTabs from "@/components/HorizontalTabs";
import Accordion from "@/components/Accordion";
import ProgressDonutChart from "@/components/ProgressDonutChart";
import VerticalBarChart from "@/components/VerticalBarChart";
import ChampaignActionButton from "@/components/agTable/ChampaignActionButton";
import AuditorsCorner from "../AuditorsCorner";
import Revocations from "./Revocations";

type CampaignReviewer = {
  reviewerId: string;
  totalNumOfAccess: number;
  totalNumOfUsers: number;
  numOfPendingActions: number;
  certifications: Array<{
    percentageCompleted: number;
    certificationId: string;
    certificationName: string;
    status: string;
  }>;
  totalActions: number;
  totalNumOfAccounts: number;
  numOfAccessRevoked: number;
  numOfAccessCertified: number;
  reviewerName: string;
  reviewerUserName: string;
  lastUpdateOn: string | null;
  percentageOfCompletedAction: number;
  customProperty: any;
};

type CampaignData = {
  campaigns: Array<{
    campaignID: string;
    name: string;
    description: string;
    campaignReviewers: CampaignReviewer[];
    numOfHighRiskEntitlements: number | null;
    totalNumOfAccess: number;
    numOfDormantAccounts: number | null;
    totalNumOfUsers: number;
    numOfPendingActions: number;
    numOfPrivilegedAccounts: number | null;
    totalNumOfAccounts: number;
    numOfAccessRevoked: number;
    numOfOrphanAccounts: number | null;
    numOfAccessCertified: number;
    numOfSODViolations: number | null;
    progress: number;
    campaignExpiryDate: string | null;
    totalNumOfCertificationInstance: number;
    campaignType: string;
    rangeOfPercentageCompletion: Record<string, number>;
    campaignOwner: {
      ownerType: string;
      ownerName: string[];
    };
  }>;
};

type ReviewerRow = {
  reviewerName: string;
  title: string;
  department: string;
  progress: string;
  riskScore: string;
  lastUpdate: string;
  totalNumOfAccess: number;
  totalNumOfUsers: number;
  numOfPendingActions: number;
  percentageOfCompletedAction: number;
};

export default function ManageCampaigns() {
  const gridRef = useRef<AgGridReactType>(null);
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [tabIndex, setTabIndex] = useState(0);
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [reviewerRows, setReviewerRows] = useState<ReviewerRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchCampaignData() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(
          "https://preview.keyforge.ai/certification/api/v1/CERTTEST/getCampaignAnalytics",
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error(`Failed to load campaign data (${res.status})`);
        }
        const data: CampaignData = await res.json();
        setCampaignData(data);
        
        // Find the specific campaign by ID
        const selectedCampaign = data.campaigns.find(campaign => campaign.campaignID === campaignId);
        
        if (selectedCampaign && selectedCampaign.campaignReviewers) {
          // Transform campaignReviewers data to match the table structure
          const transformedRows: ReviewerRow[] = selectedCampaign.campaignReviewers.map((reviewer: CampaignReviewer) => ({
            reviewerName: reviewer.reviewerName,
            title: reviewer.reviewerUserName, // Using username as title for now
            department: "IT Governance", // Default department since not in API
            progress: `${reviewer.percentageOfCompletedAction}%`,
            riskScore: reviewer.numOfPendingActions > 0 ? "High" : "Low", // Risk based on pending actions
            lastUpdate: reviewer.lastUpdateOn ? new Date(reviewer.lastUpdateOn).toLocaleDateString() : "N/A",
            totalNumOfAccess: reviewer.totalNumOfAccess,
            totalNumOfUsers: reviewer.totalNumOfUsers,
            numOfPendingActions: reviewer.numOfPendingActions,
            percentageOfCompletedAction: reviewer.percentageOfCompletedAction,
          }));
          setReviewerRows(transformedRows);
        } else {
          setReviewerRows([]);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Something went wrong loading campaign data");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (campaignId) {
      fetchCampaignData();
    }
    
    return () => controller.abort();
  }, [campaignId]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Reviewer Name", field: "reviewerName" },
      { headerName: "Title", field: "title", flex: 1.5 },
      { headerName: "Department", field: "department", flex: 1.5 },
      {
        headerName: "Progress",
        field: "progress",
        flex: 1.5,
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

      { headerName: "Risk Score", field: "riskScore", flex: 1 },
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
        if (isLoading) return <div className="flex justify-center items-center h-72">Loading campaign data...</div>;
        if (error) return <div className="text-red-600 text-center h-72 flex items-center justify-center">{error}</div>;
        if (!reviewerRows || reviewerRows.length === 0) return <div className="text-gray-500 text-center h-72 flex items-center justify-center">No reviewers found for this campaign</div>;
        
        return (
          <div className="ag-theme-alpine h-72">

            <div className="mb-4">
              <Accordion
                iconClass="absolute top-1 pb-4 right-0 rounded-full text-white bg-purple-800 mb-4"
                title="Expand/Collapse"
              >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Progress Distribution Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-700">Progress Distribution</h2>
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="px-2 pb-2">
                    <VerticalBarChart 
                      data={(() => {
                        const selectedCampaign = campaignData?.campaigns.find(c => c.campaignID === campaignId);
                        if (!selectedCampaign?.rangeOfPercentageCompletion) {
                          return {
                            labels: ["0-10%", "10-30%", "30-60%", "60-80%", "80+ %"],
                            datasets: [{ data: [0, 0, 0, 0, 0] }]
                          };
                        }
                        
                        const rangeData = selectedCampaign.rangeOfPercentageCompletion;
                        return {
                          labels: ["0-10%", "10-30%", "30-60%", "60-80%", "80+ %"],
                          datasets: [{
                            data: [
                              rangeData["10"] || 0,
                              rangeData["30"] || 0,
                              rangeData["60"] || 0,
                              rangeData["80"] || 0,
                              rangeData["100"] || 0,
                            ]
                          }]
                        };
                      })()}
                    />
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
                      {(() => {
                        const selectedCampaign = campaignData?.campaigns.find(c => c.campaignID === campaignId);
                        const totalPendingActions = reviewerRows.reduce((sum, reviewer) => sum + reviewer.numOfPendingActions, 0);
                        const totalAccess = selectedCampaign?.totalNumOfAccess || 0;
                        const totalUsers = selectedCampaign?.totalNumOfUsers || 0;
                        const totalAccounts = selectedCampaign?.totalNumOfAccounts || 0;
                        
                        return (
                          <>
                            <tr className="border-b border-gray-200 last:border-b-0">
                              <td className="px-6 py-4">
                                {selectedCampaign?.numOfHighRiskEntitlements ? 
                                  `${selectedCampaign.numOfHighRiskEntitlements}+ High Risk Entitlements` : 
                                  'High Risk Entitlements - N/A'
                                }
                              </td>
                              <td className="px-6 py-4 border-l-2 border-gray-300">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Medium</span>
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 last:border-b-0">
                              <td className="px-6 py-4">
                                {selectedCampaign?.numOfPrivilegedAccounts ? 
                                  `${selectedCampaign.numOfPrivilegedAccounts}+ Privileged Accounts` : 
                                  'Privileged Accounts - N/A'
                                }
                              </td>
                              <td className="px-6 py-4 border-l-2 border-gray-300">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">High</span>
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 last:border-b-0">
                              <td className="px-6 py-4">
                                {selectedCampaign?.numOfOrphanAccounts ? 
                                  `${selectedCampaign.numOfOrphanAccounts}+ Orphan/deleted/rogue accounts` : 
                                  'Orphan/deleted/rogue accounts - N/A'
                                }
                              </td>
                              <td className="px-6 py-4 border-l-2 border-gray-300">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Low</span>
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 last:border-b-0">
                              <td className="px-6 py-4">
                                {selectedCampaign?.numOfSODViolations ? 
                                  `${selectedCampaign.numOfSODViolations} SoD Violations` : 
                                  'SoD Violations - N/A'
                                }
                              </td>
                              <td className="px-6 py-4 border-l-2 border-gray-300">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Medium</span>
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 last:border-b-0">
                              <td className="px-6 py-4">
                                {selectedCampaign?.numOfDormantAccounts ? 
                                  `${selectedCampaign.numOfDormantAccounts} Dormant Accounts` : 
                                  'Dormant Accounts - N/A'
                                }
                              </td>
                              <td className="px-6 py-4 border-l-2 border-gray-300">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">High</span>
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200 last:border-b-0">
                              <td className="px-6 py-4">
                                {totalPendingActions} Pending Actions
                              </td>
                              <td className="px-6 py-4 border-l-2 border-gray-300">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  totalPendingActions > 0 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {totalPendingActions > 0 ? 'High' : 'Low'}
                                </span>
                              </td>
                            </tr>
                          </>
                        );
                      })()}
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
                    <ProgressDonutChart 
                      data={(() => {
                        const selectedCampaign = campaignData?.campaigns.find(c => c.campaignID === campaignId);
                        if (!selectedCampaign) {
                          return {
                            totalItems: 0,
                            approvedCount: 0,
                            pendingCount: 0,
                            revokedCount: 0,
                            delegatedCount: 0,
                            remediatedCount: 0,
                          };
                        }
                        
                        // Calculate pending certifications: total - approved - revoked
                        const totalItems = selectedCampaign.totalNumOfCertificationInstance;
                        const approvedCount = selectedCampaign.numOfAccessCertified;
                        const revokedCount = selectedCampaign.numOfAccessRevoked;
                        
                        // Ensure counts don't exceed total items
                        const validatedApprovedCount = Math.min(approvedCount, totalItems);
                        const validatedRevokedCount = Math.min(revokedCount, totalItems);
                        const pendingCount = Math.max(0, totalItems - validatedApprovedCount - validatedRevokedCount);
                        
                        return {
                          totalItems: totalItems,
                          approvedCount: validatedApprovedCount,
                          pendingCount: pendingCount,
                          revokedCount: validatedRevokedCount,
                          delegatedCount: 0, // Not available in API
                          remediatedCount: 0, // Not available in API
                        };
                      })()}
                    />
                  </div>
                </div>
              </div>
              </Accordion>
            </div>
            <AgGridReact
              ref={gridRef}
              rowData={reviewerRows}
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
