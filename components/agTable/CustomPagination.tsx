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
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <button
          className={`p-2 cursor-pointer ${
            currentPage === 1 ? "text-gray-400" : "text-blue-600"
          }`}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-row items-center justify-center">
          <span className="w-9 h-9 flex items-center justify-center">
            {currentPage}
          </span>
          <span className="mx-1">/</span>
          <span className="w-9 h-9 flex items-center justify-center">
            {totalPages}
          </span>
        </div>
        <button
          className={`p-2 cursor-pointer ${
            currentPage === totalPages ? "text-gray-400" : "text-blue-600"
          }`}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CustomPagination;