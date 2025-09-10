import React, { useState } from "react";
import ProgressDonutChart from "./ProgressDonutChart";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

interface ChartAppOwnerComponentProps {
  rowData?: any[];
}

const ChartAppOwnerComponent: React.FC<ChartAppOwnerComponentProps> = ({
  rowData = [],
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

  const leftColumnFilters = allData.slice(0, 4);
  const rightColumnFilters = allData.slice(4);

  // Track selection for left and right columns separately
  const [selected, setSelected] = useState<{ [key: string]: number | null }>({});

  const handleSelect = (column: "left" | "right", index: number) => {
    setSelected((prev) => ({
      ...prev,
      [column]: prev[column] === index ? null : index,
    }));
  };

  return (
    <div className="flex gap-4">
      {/* Progress Summary - 1/3 */}
      <div className="w-1/3 bg-white border border-gray-200 rounded-lg p-4">
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

      {/* Interactive Filters - 2/3 */}
      <div className="w-2/3 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium text-gray-800">Interactive Filters</h2>
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
                    <span className={`text-sm ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-blue-700 border-blue-300" : "text-gray-900 border-gray-300"
                    } bg-white border px-2 py-1 rounded text-xs min-w-[20px] text-center`}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })}
            <button
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-4"
              onClick={() => setSelected((prev) => ({ ...prev, left: null }))}
            >
              {selected.left == null ? (
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
                    <span className={`text-sm ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-blue-700 border-blue-300" : "text-gray-900 border-gray-300"
                    } bg-white border px-2 py-1 rounded text-xs min-w-[20px] text-center`}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })}
            <button
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-4"
              onClick={() => setSelected((prev) => ({ ...prev, right: null }))}
            >
              {selected.right == null ? (
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
        </div>
      </div>
    </div>
  );
};

export default ChartAppOwnerComponent;
