"use client";
import { useEffect, useState } from "react";
import Dropdown from "../Dropdown";
import { CircleX, Filter, FilterX, Check } from "lucide-react";

const statusOptions = [
  "Pending",
  "Approved",
  "Revoked",
  "Delegated",
  "Remediated",
];

const Filters = ({
  gridApi,
  columns = [],
  appliedFilter,
}: {
  gridApi: any;
  columns?: string[];
  appliedFilter?: (filters: string[]) => void;
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>(statusOptions[0]);

  // Handle AG Grid filtering when selectedFilter changes
  useEffect(() => {
    if (!gridApi || !columns) return;

    columns.forEach((colId) => {
      const filterInstance = gridApi.getFilterInstance(colId);
      if (filterInstance) {
        if (selectedFilter) {
          filterInstance.setModel({
            filterType: "set",
            values: [selectedFilter],
          });
        } else {
          filterInstance.setModel(null); // Clear filter
        }
        gridApi.onFilterChanged();
      }
    });

    appliedFilter?.([selectedFilter]);
  }, [selectedFilter, gridApi, columns, appliedFilter]);

  const toggleFilter = (status: string) => {
    setSelectedFilter(status);
  };

  const clearFilters = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFilter("");
  };

  return (
    <div className="relative">
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
                <div className="flex h-8 items-center gap-2 px-2">
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
        className={`min-w-9 h-9 flex items-center justify-center ${
          selectedFilter ? "bg-[#6D6E73]/20" : ""
        }`}
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