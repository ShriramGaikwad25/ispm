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
  gridApi?: GridApi | null;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}) => {
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  const startRow = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow =
    totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="bg-white rounded-lg px-4 py-3 w-full border border-gray-200">
      <div className="flex justify-between items-center">
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
        
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
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
  );
};

export default CustomPagination;