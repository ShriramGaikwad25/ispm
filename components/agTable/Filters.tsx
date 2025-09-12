"use client";
import { useEffect, useState } from "react";
import Dropdown from "../Dropdown";
import { CircleX, Filter, FilterX, Check } from "lucide-react";

const statusOptions = [
  "Pending",
  "Certify",
  "Reject",
  "Delegated",
  "Remediated",
];

const Filters = ({
  gridApi,
  columns = [],
  appliedFilter,
}: {
  gridApi?: any;
  columns?: string[];
  appliedFilter?: (filters: string[]) => void;
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>("Pending");

  const toggleFilter = (status: string) => {
    setSelectedFilter(status);
    // Call the callback immediately when filter changes
    if (appliedFilter) {
      appliedFilter([status]);
    }
  };

  const clearFilters = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFilter("");
    // Call the callback when clearing filters
    if (appliedFilter) {
      appliedFilter([]);
    }
  };

  const isActive = !!selectedFilter;

  return (
    <div className={`relative ${isActive ? "w-48" : "w-44"}`}>
      {selectedFilter && (
        <span
          title="Clear Filters"
          className="rounded-full bg-red-700 absolute -top-1 -left-1 w-4 h-4 text-[11px] text-white text-center z-10"
        >
          1
        </span>
      )}

      <Dropdown
        Icon={
          selectedFilter
            ? () => (
                <div className="flex h-8 items-center gap-2 px-2 w-full">
                  <FilterX />
                  <small>{selectedFilter}</small>
                  <span
                    title="Clear Filters"
                    className="rounded-full bg-red-600"
                  >
                    <CircleX color="#fff" size={18} onClick={clearFilters} />
                  </span>
                </div>
              )
            : Filter
        }
        className={`h-8 w-full flex items-center justify-between ${isActive ? "bg-[#6D6E73]/20" : ""}`}
      >
        <li className="px-4 pb-2 border-b border-b-gray-300 font-semibold mb-2">
          Filter by Status
        </li>
        {statusOptions.map((status) => {
          const isSelected = selectedFilter === status;
          return (
            <li
              key={status}
              onClick={() => toggleFilter(status)}
              className={`px-2 py-2 cursor-pointer flex items-center hover:bg-gray-100 ${
                isSelected ? "bg-gray-200 font-semibold" : ""
              }`}
            >
              <Check
                size={16}
                className={`mx-2 ${
                  isSelected ? "text-green-600" : "text-gray-400"
                }`}
              />{" "}
              {status}
            </li>
          );
        })}
      </Dropdown>
    </div>
  );
};

export default Filters;