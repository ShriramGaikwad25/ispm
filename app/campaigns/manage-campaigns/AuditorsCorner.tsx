import Exports from "@/components/agTable/Exports";
import { GridApi } from "ag-grid-enterprise";
import React, { useRef } from "react";

const auditorData = [
  {
    label: "High Risk Users",
    summary: "Users with elevated privileges or unusual activity...",
    color: "bg-red-100",
  },
  {
    label: "Inactive Accounts",
    summary: "Accounts not accessed for over 90 days...",
    color: "bg-yellow-100",
  },
  {
    label: "Privilege Escalation",
    summary: "Tracks users whose access level was increased...",
    color: "bg-blue-100",
  },
  {
    label: "Access Violations",
    summary: "Logs of policy violations or unauthorized access...",
    color: "bg-orange-100",
  },
  {
    label: "Shared Credentials",
    summary: "Multiple users logging into a single account...",
    color: "bg-purple-100",
  },
  {
    label: "Unreviewed Logs",
    summary: "Security logs not reviewed in the last cycle...",
    color: "bg-green-100",
  },
];

export default function AuditorsCorner() {
  const gridApiRef = useRef<GridApi | null>(null);
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Auditor&apos;s Corner</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {auditorData.map((item, idx) => (
          <div
            key={idx}
            className={`group border border-gray-300 rounded-md overflow-hidden transition-all duration-300 h-18 hover:h-30 px-4 py-3 flex flex-col justify-between ${item.color} hover:brightness-95`}
          >
            {/* Top section: Label + Buttons */}
            <div className="flex justify-between items-start">
              <span className="text-gray-900 font-semibold">{item.label}</span>
              <div className="flex space-x-2">
                <button className="bg-blue-400 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded">
                  Apply Filter
                </button>
                <div className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs px-3 py-1 rounded">
                  <Exports gridApi={gridApiRef.current} />
                </div>
              </div>
            </div>

            {/* Summary appears on hover */}
            <div className="text-sm text-gray-700 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {item.summary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
