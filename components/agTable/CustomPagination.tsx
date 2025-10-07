"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GridApi } from "ag-grid-enterprise";

export interface CustomPaginationProps {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  gridApi?: GridApi | null;
  pageSizeOptions?: number[];
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(event.target.value);
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  const startRow = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow =
    totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="bg-white rounded-lg px-3 py-2 w-full border border-gray-200">
      <div className="flex justify-between items-center">
        {/* Prev Button - Left */}
        <button
          className={`flex items-center gap-1 text-sm ${
            currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:text-gray-800 cursor-pointer"
          }`}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        {/* Right cluster: Show entries then Next */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="text-sm border border-gray-300 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!onPageSizeChange}
              style={{ minWidth: '60px' }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">entries</span>
          </div>
          <button
            className={`flex items-center gap-1 text-sm ${
              currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:text-gray-800 cursor-pointer"
            }`}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPagination;