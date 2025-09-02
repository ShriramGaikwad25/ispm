import React, { useMemo, useState } from "react";
import ProgressDonutChart from "./ProgressDonutChart";
import VennChart from "./VennChart";
import FilterPanel from "./FilterPannel";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

interface ChartAppOwnerComponentProps {
  rowData?: any[];
}

const ChartAppOwnerComponent: React.FC<ChartAppOwnerComponentProps> = ({ 
  rowData = [] 
}) => {

  const allData: DataItem[] = [
    { label: "Elevated Accounts", value: 0 },
    { label: "Orphan Accounts", value: 0 },
    { label: "Terminated user accounts", value: 0 },
    { label: "Dormant Accounts", value: 0 },
    { label: "New Access", value: 0 },
    { label: "Over Privileged users", value: 0 },
    { label: "Compliance Violations", value: 0 },
  ];

  const data: Record<string, DataItem[]> = {
    "InteractiveFilters": allData.slice(0, 4), // First 4 records
    " ": allData.slice(4),   // Remaining 3 records
  };
  
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
  
  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      <div className="w-90">
        <FilterPanel
          data={{ "InteractiveFilters": data["InteractiveFilters"] }}
          selected={selected}
          onSelect={handleSelect}
          onClear={(category) =>
            setSelected((prev) => ({ ...prev, [category]: null }))
          }
        />
      </div>
      <div className="mt-3 w-90">
        <FilterPanel
          data={{ " ": data[" "] }}
          selected={selected}
          onSelect={handleSelect}
          onClear={(category) =>
            setSelected((prev) => ({ ...prev, [category]: null }))
          }
        />
      </div>

      <div className="">
        <div className="flex justify-between p-2">
          <h2 className="text-lg text-gray-700">Progress Summary</h2>
        </div>
        {(() => {
          const data = ((): { totalItems: number; approvedCount: number; pendingCount: number; revokedCount: number; delegatedCount: number; remediatedCount: number } => {
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

            return { totalItems, approvedCount, pendingCount, revokedCount, delegatedCount, remediatedCount };
          })();

          return (
            <ProgressDonutChart 
              data={data}
              showBreakdown={false}
              height="h-64"
            />
          );
        })()}
      </div>
    </div>
  );
};

export default ChartAppOwnerComponent;
