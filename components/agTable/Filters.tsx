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

const accountFilterOptions = [
  { label: "Elevated Accounts", value: "iselevated eq Y", count: 0 },
  { label: "Orphan Accounts", value: "isorphan eq Y", count: 0 },
  { label: "Terminated User Accounts", value: "isterminated eq Y", count: 0 },
  { label: "Dormant Accounts", value: "isdormant eq Y", count: 0 },
  { label: "New Access", value: "isnewaccess eq Y", count: 0 },
  { label: "Over Privileged Users", value: "isoverprivileged eq Y", count: 0 },
  { label: "Compliance Violations", value: "iscomplianceviolation eq Y", count: 0 },
];

const Filters = ({
  gridApi,
  columns = [],
  appliedFilter,
  onFilterChange,
  context = "status",
  initialSelected,
}: {
  gridApi?: any;
  columns?: string[];
  appliedFilter?: (filters: string[]) => void;
  onFilterChange?: (filter: string) => void;
  context?: "status" | "account";
  initialSelected?: string;
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>(initialSelected || "");
  const [filterCounts, setFilterCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // Apply default selected filter on mount
    if (initialSelected) {
      setSelectedFilter(initialSelected);
      if (appliedFilter) {
        appliedFilter([initialSelected]);
      }
      if (onFilterChange) {
        if (context === "status") {
          if (gridApi && gridApi.current) {
            const filterInstance = gridApi.current.getFilterInstance('status');
            if (filterInstance) {
              filterInstance.setModel({
                filterType: 'text',
                type: 'equals',
                filter: initialSelected
              });
              gridApi.current.onFilterChanged();
            }
          }
        } else {
          onFilterChange(initialSelected);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFilter = (filterValue: string) => {
    setSelectedFilter(selectedFilter === filterValue ? "" : filterValue);
    // Call the callback immediately when filter changes
    if (appliedFilter) {
      appliedFilter(selectedFilter === filterValue ? [] : [filterValue]);
    }
    if (onFilterChange) {
      // For status filters, we don't need to call the API filter
      // Status filters are handled by the grid's built-in filtering
      if (context === "status") {
        // Apply grid filter instead of API filter
        if (gridApi && gridApi.current) {
          const filterInstance = gridApi.current.getFilterInstance('status');
          if (filterInstance) {
            if (selectedFilter === filterValue) {
              // Clear filter
              filterInstance.setModel(null);
            } else {
              // Apply filter
              filterInstance.setModel({
                filterType: 'text',
                type: 'equals',
                filter: filterValue
              });
            }
            gridApi.current.onFilterChanged();
          }
        }
      } else {
        // For account filters, use API filter
        onFilterChange(selectedFilter === filterValue ? "" : filterValue);
      }
    }
  };

  const clearFilters = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFilter("");
    // Call the callback when clearing filters
    if (appliedFilter) {
      appliedFilter([]);
    }
    if (onFilterChange) {
      if (context === "status") {
        // Clear grid filter
        if (gridApi && gridApi.current) {
          const filterInstance = gridApi.current.getFilterInstance('status');
          if (filterInstance) {
            filterInstance.setModel(null);
            gridApi.current.onFilterChanged();
          }
        }
      } else {
        // Clear API filter
        onFilterChange("");
      }
    }
  };

  const isActive = !!selectedFilter;

  const options = context === "account" ? accountFilterOptions : statusOptions.map(opt => ({ label: opt, value: opt, count: 0 }));

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
                  <small>{options.find(opt => opt.value === selectedFilter)?.label || selectedFilter}</small>
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
          {context === "account" ? "Filters" : "Filter by Status"}
        </li>
        {options.map((option) => {
          const isSelected = selectedFilter === option.value;
          const count = filterCounts[option.value] || option.count;
          return (
            <li
              key={option.value}
              onClick={() => toggleFilter(option.value)}
              className={`px-2 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                isSelected ? "bg-blue-50 font-semibold" : ""
              }`}
            >
              <div className="flex items-center">
                <Check
                  size={16}
                  className={`mx-2 ${
                    isSelected ? "text-blue-600" : "text-gray-400"
                  }`}
                />
                <span className={option.label === "Terminated User Accounts" ? "text-gray-400" : ""}>
                  {option.label}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
              }`}>
                {count}
              </span>
            </li>
          );
        })}
        {context === "account" && (
          <li className="px-2 py-2 border-t border-gray-200 mt-2">
            <button
              onClick={clearFilters}
              className="flex items-center text-gray-600 hover:text-gray-800 text-sm"
            >
              <FilterX size={14} className="mr-2" />
              Clear Filters
            </button>
          </li>
        )}
      </Dropdown>
    </div>
  );
};

export default Filters;