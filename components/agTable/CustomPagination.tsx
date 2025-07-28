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
      <span className="text-gray-700">
        {startRow} - {endRow} of {totalItems}
      </span>
      <div className="flex items-center">
        <button
          className={`p-2 cursor-pointer ${
            currentPage === 1 ? "text-gray-400" : "text-blue-600"
          }`}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 mx-2 flex items-center justify-center">
          {currentPage} / {totalPages}
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
