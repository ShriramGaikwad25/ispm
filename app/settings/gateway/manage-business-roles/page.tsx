"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Pencil } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import CustomPagination from "@/components/agTable/CustomPagination";

interface BusinessRoleRow {
  roleName: string;
  description: string;
  owner: string;
  noOfUsers: number;
  tags: string;
}

const fallbackBusinessRoles: BusinessRoleRow[] = [
  {
    roleName: "Finance - Approvers",
    description:
      "Business role for Finance approvers responsible for purchase approvals and financial controls.",
    owner: "finance.approver@acme.com",
    noOfUsers: 18,
    tags: "Finance",
  },
];

export default function ManageBusinessRolesSettings() {
  const pageSizeSelector = [10, 20, 50, 100];
  const router = useRouter();

  const [rows, setRows] = useState<BusinessRoleRow[]>(fallbackBusinessRoles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(pageSizeSelector[0]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(fallbackBusinessRoles.length);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil(fallbackBusinessRoles.length / pageSizeSelector[0]))
  );

  useEffect(() => {
    setTotalItems(rows.length);
    setTotalPages(Math.max(1, Math.ceil(rows.length / pageSize)));
    setPageNumber(1);
  }, [rows.length, pageSize]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) => {
      return (
        r.roleName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)
      );
    });
  }, [rows, searchTerm]);

  const paginatedRows = useMemo(() => {
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, pageNumber, pageSize]);

  useEffect(() => {
    const newTotal = filteredRows.length;
    setTotalItems(newTotal);
    setTotalPages(Math.max(1, Math.ceil(newTotal / pageSize)));
    setPageNumber(1);
  }, [filteredRows.length, pageSize]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Business Role",
        field: "roleName",
        flex: 2,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (params: any) => {
          return (
            <span
              style={{ color: "#1677ff", cursor: "pointer", fontWeight: 500 }}
            >
              {params.value}
            </span>
          );
        },
      },
      {
        headerName: "Category",
        field: "tags",
        flex: 1,
      },
      {
        headerName: "Tags",
        field: "tags",
        flex: 1,
      },
      {
        headerName: "Owner",
        field: "owner",
        flex: 1.5,
      },
      {
        headerName: "No of Permissions",
        field: "noOfPermissions",
        flex: 1,
      },
      {
        headerName: "Actions",
        field: "actions",
        flex: 1,
        cellRenderer: () => {
          return (
            <button
              type="button"
              className="inline-flex items-center justify-center px-2 py-1 text-sm rounded-md border border-gray-300 text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="w-4 h-4" />
            </button>
          );
        },
      },
    ],
    []
  );

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

  const handleAddBusinessRole = () => {
    router.push("/settings/gateway/manage-business-roles/new");
  };

  return (
    <div className="h-full p-2">
      <div className="mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              Manage Business Roles
            </h1>
          </div>

          <div className="bg-white rounded-md shadow p-4">
            {/* Header with Add Business Role button */}
            <div className="mb-4 flex justify-between items-center gap-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="text-gray-400 w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search business roles by name, description, tags, owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                {searchTerm && (
                  <p className="text-sm text-gray-600 mt-1">
                    Showing {filteredRows.length} result(s) for "{searchTerm}"
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={handleAddBusinessRole}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Business Role
                </button>
              </div>
            </div>

            <div className="ag-theme-alpine" style={{ width: "100%" }}>
              {/* Top pagination */}
              <div className="mb-2">
                <CustomPagination
                  totalItems={totalItems}
                  currentPage={pageNumber}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={(newPageSize) => {
                    if (typeof newPageSize === "number") {
                      setPageSize(newPageSize);
                      setPageNumber(1);
                    }
                  }}
                  pageSizeOptions={pageSizeSelector}
                />
              </div>

              <div style={{ minHeight: "400px" }}>
                <AgGridReact
                  columnDefs={columnDefs}
                  rowData={paginatedRows}
                  domLayout="autoHeight"
                  rowHeight={60}
                />
              </div>

              {/* Bottom pagination */}
              <div className="mt-4 mb-2">
                <CustomPagination
                  totalItems={totalItems}
                  currentPage={pageNumber}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={(newPageSize) => {
                    if (typeof newPageSize === "number") {
                      setPageSize(newPageSize);
                      setPageNumber(1);
                    }
                  }}
                  pageSizeOptions={pageSizeSelector}
                />
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
