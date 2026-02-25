import React, { useState, useEffect, useMemo } from "react";
import { formatDateMMDDYYSlashes } from "../utils/utils";
import ProgressDonutChart from "./ProgressDonutChart";
import AgGridReact from "./ClientOnlyAgGrid";
import type { ColDef } from "ag-grid-community";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

interface ChartAppOwnerComponentProps {
  rowData?: any[];
  onFilterChange?: (filter: string) => void;
  // When a filter is applied in the parent, pass it back so we can show the total next to the clicked item
  activeFilter?: string;
  activeCount?: number;
  analyticsData?: any;
  analyticsLoading?: boolean;
  certificationId?: string;
  // For Guided Path popup: reuse exact grid from AppOwner table
  entitlementsData?: any[];
  entitlementsColumnDefs?: ColDef[];
  entitlementsDefaultColDef?: ColDef;
  entitlementsAutoGroupColumnDef?: ColDef;
}

const ChartAppOwnerComponent: React.FC<ChartAppOwnerComponentProps> = ({
  rowData = [],
  onFilterChange,
  activeFilter,
  activeCount,
  analyticsData,
  analyticsLoading = false,
  certificationId,
  entitlementsData,
  entitlementsColumnDefs,
  entitlementsDefaultColDef,
  entitlementsAutoGroupColumnDef,
}) => {
  // Colors tuned to match the screenshot
  const allData: DataItem[] = [
    { label: "Elevated Accounts", value: 0, color: "#6EC6FF" },
    { label: "Orphan Accounts", value: 0, color: "#B3D9FF" },
    { label: "Terminated User Accounts", value: 0, color: "#D1D5DB" },
    { label: "Dormant Accounts", value: 0, color: "#B3D9FF" },
    { label: "New Access", value: 0, color: "#B3D9FF" },
    { label: "Over Privileged Users", value: 0, color: "#B3D9FF" },
    { label: "Compliance Violations", value: 0, color: "#6EC6FF" },
  ];

  // Mapping between filter labels and API filter values
  const filterMapping: { [key: string]: string } = {
    "Elevated Accounts": "iselevated eq Y",
    "Orphan Accounts": "isorphan eq Y",
    "Terminated User Accounts": "isterminated eq Y",
    "Dormant Accounts": "isdormant eq Y",
    "New Access": "isnewaccess eq Y",
    "Over Privileged Users": "isoverprivileged eq Y",
    "Compliance Violations": "iscomplianceviolation eq Y",
  };

  // Mapping between filter labels and analytics data fields
  const analyticsMapping: { [key: string]: string } = {
    "Elevated Accounts": "highriskaccount_count",
    "Orphan Accounts": "orphan_count",
    "Terminated User Accounts": "inactiveaccount_count",
    "Dormant Accounts": "dormant_count",
    "New Access": "newaccess_count",
    "Over Privileged Users": "highriskentitlement_count",
    "Compliance Violations": "violations_count",
  };

  const leftColumnFilters = allData.slice(0, 4);
  const rightColumnFilters = allData.slice(4);

  // Track selection for left and right columns separately
  const [selected, setSelected] = useState<{ [key: string]: number | null }>({});

  // Track which Guided Path card is hovered for flip animation
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  // State for localStorage data to avoid SSR issues
  const [localStorageData, setLocalStorageData] = useState<{
    selectedCampaignSummary: any;
    sharedRowData: any;
  } | null>(null);

  // Safely access localStorage only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const selectedCampaignSummary = localStorage.getItem("selectedCampaignSummary");
        const sharedRowData = localStorage.getItem("sharedRowData");
        
        setLocalStorageData({
          selectedCampaignSummary: selectedCampaignSummary ? JSON.parse(selectedCampaignSummary) : null,
          sharedRowData: sharedRowData ? JSON.parse(sharedRowData) : null,
        });
      } catch (error) {
        console.error("Error accessing localStorage:", error);
        setLocalStorageData(null);
      }
    }
  }, []);

  const handleSelect = (column: "left" | "right", index: number) => {
    const newSelection = selected[column] === index ? null : index;
    setSelected((prev) => ({
      ...prev,
      [column]: newSelection,
    }));

    // Trigger API call when a filter is selected
    if (onFilterChange) {
      if (newSelection !== null) {
        const selectedItem = column === "left" ? leftColumnFilters[newSelection] : rightColumnFilters[newSelection];
        const filterValue = filterMapping[selectedItem.label];
        if (filterValue) {
          onFilterChange(filterValue);
        }
      } else {
        // Clear filter when deselected
        onFilterChange("");
      }
    }
  };

  // Function to get analytics count for a specific filter category
  const getAnalyticsCount = (itemLabel: string): number => {
    if (!analyticsData || !analyticsData.analytics || !certificationId) {
      return 0;
    }

    const analyticsField = analyticsMapping[itemLabel];
    if (!analyticsField) {
      return 0;
    }

    // Debug logging to understand the analytics data structure
    console.log('Analytics data structure:', analyticsData);
    console.log(`Looking for field: ${analyticsField} for certificationId: ${certificationId}`);
    console.log('Available certification IDs in analytics:', Object.keys(analyticsData.analytics));

    // Get analytics data for the specific certification ID
    const analytics = analyticsData.analytics;
    const certAnalytics = analytics[certificationId];

    if (!certAnalytics) {
      console.log(`No analytics data found for certificationId: ${certificationId}`);
      return 0;
    }

    const count = certAnalytics[analyticsField];
    const result = typeof count === 'number' ? count : 0;

    console.log(`Count for ${itemLabel} (${analyticsField}) in certification ${certificationId}:`, result);
    return result;
  };

  const getDisplayValue = (
    itemLabel: string,
    isSelected: boolean
  ): number => {
    const mapped = filterMapping[itemLabel];
    if (isSelected && activeFilter && mapped === activeFilter) {
      return typeof activeCount === "number" ? activeCount : 0;
    }
    
    // If analytics data is available, use it; otherwise fall back to hardcoded values
    if (analyticsData && !analyticsLoading && certificationId) {
      console.log(`Getting display value for ${itemLabel} with certificationId: ${certificationId}`);
      return getAnalyticsCount(itemLabel);
    }
    
    return allData.find((d) => d.label === itemLabel)?.value ?? 0;
  };

  // Guided Path modal state
  const [guidedPathModalOpen, setGuidedPathModalOpen] = useState(false);
  const [guidedPathModalFilter, setGuidedPathModalFilter] = useState<"Dormant" | "Access">(
    "Dormant"
  );

  const guidedPathModalRows = useMemo(() => {
    const base = Array.isArray(entitlementsData) && entitlementsData.length > 0 ? entitlementsData : rowData;
    if (!Array.isArray(base)) return [] as any[];
    if (guidedPathModalFilter === "Dormant") {
      return base.filter((row: any) => {
        const flag = String(row.isdormant || row.isDormant || "").toLowerCase();
        return flag === "y" || flag === "yes" || flag === "true";
      });
    }
    // Access = show all rows
    return base;
  }, [rowData, entitlementsData, guidedPathModalFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Progress Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium text-gray-800">Progress Summary</h2>
          <button className="text-gray-400 hover:text-gray-600" aria-label="More">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
        {(() => {
          const data = ((): {
            totalItems: number;
            approvedCount: number;
            pendingCount: number;
            revokedCount: number;
            delegatedCount: number;
            remediatedCount: number;
          } => {
            // Try to get campaign-level progress data from localStorage first
            if (localStorageData?.selectedCampaignSummary) {
              try {
                const summary = localStorageData.selectedCampaignSummary;
                // If we have campaign data, use campaign-level progress
                // Use the detailed progress data stored in campaign summary
                if (summary.totalItems && summary.approvedCount !== undefined && summary.pendingCount !== undefined) {
                  return {
                    totalItems: summary.totalItems,
                    approvedCount: summary.approvedCount,
                    pendingCount: summary.pendingCount,
                    revokedCount: 0, // These would come from campaign analytics API
                    delegatedCount: 0,
                    remediatedCount: 0,
                  };
                }
                
                // Fallback to progress percentage calculation
                const totalItems = activeCount || rowData.length;
                const campaignProgress = summary.progress || 0; // Campaign progress percentage
                const approvedCount = Math.round((totalItems * campaignProgress) / 100);
                const pendingCount = totalItems - approvedCount;
                
                return {
                  totalItems,
                  approvedCount,
                  pendingCount,
                  revokedCount: 0, // These would come from campaign analytics
                  delegatedCount: 0,
                  remediatedCount: 0,
                };
              } catch (error) {
                console.error("Error parsing campaign summary:", error);
              }
            }

            // Fallback to row-level calculation if no campaign data
            const totalItems = rowData.length;
            let approvedCount = 0;
            let pendingCount = 0;
            let revokedCount = 0;
            let delegatedCount = 0;
            let remediatedCount = 0;

            rowData.forEach((row: any) => {
              const status = (row.status || "").toLowerCase();
              const aiInsights = (row.aiInsights || "").toLowerCase();
              const recommendation = (row.recommendation || "").toLowerCase();
              const action = (row.action || "").toLowerCase();

              if (
                status === "completed" ||
                status === "approved" ||
                aiInsights === "thumbs-up" ||
                recommendation === "certify" ||
                action === "approve"
              ) {
                approvedCount++;
              } else if (status === "revoked" || action === "reject" || recommendation === "revoke") {
                revokedCount++;
              } else if (status === "delegated" || action === "delegate") {
                delegatedCount++;
              } else if (status === "remediated" || action === "remediate") {
                remediatedCount++;
              } else {
                pendingCount++;
              }
            });

            return {
              totalItems,
              approvedCount,
              pendingCount,
              revokedCount,
              delegatedCount,
              remediatedCount,
            };
          })();

          return (
            <ProgressDonutChart data={data} showBreakdown={false} height="h-52" />
          );
        })()}
      </div>

      {/* Interactive Filters - wider than the other two */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium text-gray-800">Filters</h2>
          <button className="text-gray-400 hover:text-gray-600" aria-label="More">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-2">
            {leftColumnFilters.map((item, index) => {
              const isSelected = selected.left === index;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100"
                  }`}
                  onClick={() => handleSelect("left", index)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border-2"
                      style={{
                        borderColor: item.color,
                        backgroundColor: isSelected ? (item.color as string) : "transparent",
                      }}
                    ></div>
                    <span className={`text-xs ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? "text-blue-700 border-blue-300" : "text-gray-900 border-gray-300"
                    } bg-white border px-2 py-1 rounded min-w-[20px] text-center`}
                  >
                    {analyticsLoading ? "..." : getDisplayValue(item.label, isSelected)}
                  </span>
                </div>
              );
            })}
            <button
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-4"
              onClick={() => {
                setSelected({ left: null, right: null });
                if (onFilterChange) {
                  onFilterChange("");
                }
              }}
            >
              {selected.left == null && selected.right == null ? (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
                </svg>
              )}
              Clear Filters
            </button>
          </div>

          {/* Right column */}
          <div className="space-y-2">
            {rightColumnFilters.map((item, index) => {
              const isSelected = selected.right === index;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100"
                  }`}
                  onClick={() => handleSelect("right", index)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border-2"
                      style={{
                        borderColor: item.color,
                        backgroundColor: isSelected ? (item.color as string) : "transparent",
                      }}
                    ></div>
                    <span className={`text-xs ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? "text-blue-700 border-blue-300" : "text-gray-900 border-gray-300"
                    } bg-white border px-2 py-1 rounded min-w-[20px] text-center`}
                  >
                    {analyticsLoading ? "..." : getDisplayValue(item.label, isSelected)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Assist - Quick Wins - two numbered cards with diagonal hover sweep */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-4">
        <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-medium text-gray-800">AI Assist - Quick Wins</h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Card 1 */}
          <div
            className="relative h-28 cursor-pointer overflow-hidden rounded-lg border border-blue-200 bg-blue-50 shadow-sm"
            onMouseEnter={() => setHoveredCard("card1")}
            onMouseLeave={() => setHoveredCard((prev) => (prev === "card1" ? null : prev))}
          >
            {/* First page (default) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <p className="text-sm font-semibold text-blue-800">Speed</p>
              <span className="mt-1 text-xs font-bold text-blue-600">35% Completion</span>
            </div>
            {/* Second page content on hover with diagonal sweep from top-right to bottom-left */}
            <div className="absolute inset-0 flex pointer-events-none">
              <div
                className="w-full h-full flex flex-col justify-between px-4 py-3 text-white rounded-lg shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(59, 130, 246, 0.9))",
                  transform:
                    hoveredCard === "card1" ? "translate(0, 0)" : "translate(120%, -120%)",
                  transition: "transform 0.5s ease-out",
                }}
              >
                <p className="text-xs leading-snug">
                  Quick review of recommended access through peer analysis with 70% match. Reduce
                  effort by 3 hours.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-3 py-1 text-xs font-medium rounded bg-white/90 text-blue-700 pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuidedPathModalFilter("Dormant");
                      setGuidedPathModalOpen(true);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 text-xs font-medium rounded border border-white/80 text-white bg-transparent pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuidedPathModalFilter("Access");
                      setGuidedPathModalOpen(true);
                    }}
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="relative h-28 cursor-pointer overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm"
            onMouseEnter={() => setHoveredCard("card2")}
            onMouseLeave={() => setHoveredCard((prev) => (prev === "card2" ? null : prev))}
          >
            {/* First page (default) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <p className="text-sm font-semibold text-emerald-800">Low Risk</p>
              <span className="mt-1 text-xs font-bold text-emerald-600">25% Completion</span>
            </div>
            {/* Second page content on hover with diagonal sweep from top-right to bottom-left */}
            <div className="absolute inset-0 flex pointer-events-none">
              <div
                className="w-full h-full flex flex-col justify-between px-4 py-3 text-white rounded-lg shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(5, 150, 105, 0.95), rgba(16, 185, 129, 0.9))",
                  transform:
                    hoveredCard === "card2" ? "translate(0, 0)" : "translate(120%, -120%)",
                  transition: "transform 0.5s ease-out",
                }}
              >
                <p className="text-xs leading-snug">
                  Quick review of existing access approved in previous cycles with low risk items.
                  Reduce effort by 2 hours.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-3 py-1 text-xs font-medium rounded bg-white/90 text-emerald-700 pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuidedPathModalFilter("Dormant");
                      setGuidedPathModalOpen(true);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 text-xs font-medium rounded border border-white/80 text-white bg-transparent pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuidedPathModalFilter("Access");
                      setGuidedPathModalOpen(true);
                    }}
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assist - Quick Wins modal for Dormant / Access table */}
      {guidedPathModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="bg-white rounded-lg shadow-xl mx-auto flex flex-col"
            style={{ width: "90vw", maxWidth: "1600px", maxHeight: "95vh" }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-800">
                AI Assist - Quick Wins –{" "}
                {guidedPathModalFilter === "Dormant" ? "Dormant Access" : "All Access"}
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                onClick={() => setGuidedPathModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-b">
              <span className="text-xs font-medium text-gray-500">Filter:</span>
              <button
                className={`px-3 py-1 text-xs rounded-full border ${
                  guidedPathModalFilter === "Dormant"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
                onClick={() => setGuidedPathModalFilter("Dormant")}
              >
                Dormant Access
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-full border ${
                  guidedPathModalFilter === "Access"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
                onClick={() => setGuidedPathModalFilter("Access")}
              >
                All Access
              </button>
              <span className="ml-auto text-[11px] text-gray-500">
                {guidedPathModalRows.length} item{guidedPathModalRows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="px-4 py-3 overflow-auto">
              {guidedPathModalRows.length === 0 ? (
                <div className="text-xs text-gray-500 py-6 text-center">
                  No data available for the selected filter.
                </div>
              ) : (
                <div className="w-full ag-theme-alpine" style={{ height: "70vh" }}>
                  <AgGridReact
                    rowData={guidedPathModalRows}
                    columnDefs={entitlementsColumnDefs}
                    defaultColDef={entitlementsDefaultColDef}
                    autoGroupColumnDef={entitlementsAutoGroupColumnDef}
                    domLayout="normal"
                    suppressSizeToFit={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartAppOwnerComponent;
