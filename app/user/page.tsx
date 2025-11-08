"use client";
import { ColDef, GridApi } from "ag-grid-enterprise";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
import { useRouter } from "next/navigation"; // Updated import
import React, { useMemo, useRef, useState, useEffect } from "react";
import { executeQuery } from "@/lib/api";
import "@/lib/ag-grid-setup";
import CustomPagination from "@/components/agTable/CustomPagination";
import { Plus } from "lucide-react";


interface UserData {
  name: string;
  email: string;
  title: string;
  department: string;
  managerEmail: string;
  status: string;
  tags: string;
  managerName?: string;
  managerStatus?: string;
}

export default function User() {
  const router = useRouter();
  const gridApiRef = useRef<GridApi | null>(null);
  const [rowData, setRowData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const pageSizeSelector = [10, 20, 50, 100];
  const [pageSize, setPageSize] = useState(pageSizeSelector[0]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Default data for fallback
  const defaultRowData: UserData[] = [
    {
      name: "Aamod Radwan",
      email: "aamod.radwan@zillasecurity.io",
      title: "Staff",
      department: "Sales",
      managerEmail: "charlene.brattka@zillasecurity.io",
      status: "Active",
      tags: "",
    },
    {
      name: "Abdulah Thibadeau",
      email: "abdulah.thibadeau@zillasecurity.io",
      title: "Manager - IT & Security",
      department: "IT & Security",
      managerEmail: "huan.lortz@zillasecurity.io",
      status: "Active",
      tags: "",
    },
  ];


  // Fetch users data from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Execute query to get users from operations department
        const query = "SELECT * FROM usr WHERE lower(department) = ?";
        const parameters = ["operations"];
        
        const response = await executeQuery(query, parameters);
        
        // Transform API response to match our UserData interface
        if (response && typeof response === 'object' && 'resultSet' in response && Array.isArray((response as any).resultSet)) {
          const sourceArray: any[] = (response as any).resultSet;
          const transformedData: UserData[] = sourceArray.map((user: any) => ({
            name: user.displayname || user.displayName || user.firstname + " " + user.lastname || "Unknown",
            email: user.email?.work || user.customattributes?.emails?.[0]?.value || user.username || "Unknown",
            title: user.title || user.customattributes?.title || "Unknown",
            department: user.department || user.customattributes?.enterpriseUser?.department || "Unknown",
            managerEmail: user.managername || user.customattributes?.enterpriseUser?.manager?.value || "",
            status: user.status || (user.customattributes?.active ? "Active" : "Inactive"),
            tags: user.employeetype || user.customattributes?.userType || "",
            managerName: user.managername || user.customattributes?.enterpriseUser?.manager?.value || "",
            managerStatus: "Active" // Default status for manager
          }));
          setRowData(transformedData);
          setTotalItems(transformedData.length);
          setTotalPages(Math.ceil(transformedData.length / pageSize));
          // Persist a lookup map of raw users by email/username for detail page consumption
          try {
            const rawByKey: Record<string, any> = {};
            for (const u of sourceArray) {
              const key = (u.email?.work || u.customattributes?.emails?.[0]?.value || u.username || u.displayname || u.displayName || "").toString();
              if (key) rawByKey[key] = u;
            }
            localStorage.setItem("usersRawByKey", JSON.stringify(rawByKey));
          } catch {}
        } else if (response && Array.isArray(response)) {
          // Handle case where response is directly an array
          const transformedData: UserData[] = response.map((user: any) => ({
            name: user.displayname || user.displayName || user.firstname + " " + user.lastname || "Unknown",
            email: user.email?.work || user.customattributes?.emails?.[0]?.value || user.username || "Unknown",
            title: user.title || user.customattributes?.title || "Unknown",
            department: user.department || user.customattributes?.enterpriseUser?.department || "Unknown",
            managerEmail: user.managername || user.customattributes?.enterpriseUser?.manager?.value || "",
            status: user.status || (user.customattributes?.active ? "Active" : "Inactive"),
            tags: user.employeetype || user.customattributes?.userType || "",
            managerName: user.managername || user.customattributes?.enterpriseUser?.manager?.value || "",
            managerStatus: "Active" // Default status for manager
          }));
          setRowData(transformedData);
          setTotalItems(transformedData.length);
          setTotalPages(Math.ceil(transformedData.length / pageSize));
          try {
            const rawByKey: Record<string, any> = {};
            for (const u of response as any[]) {
              const key = (u.email?.work || u.customattributes?.emails?.[0]?.value || u.username || u.displayname || u.displayName || "").toString();
              if (key) rawByKey[key] = u;
            }
            localStorage.setItem("usersRawByKey", JSON.stringify(rawByKey));
          } catch {}
        } else {
          // Fallback to default data if API response is empty
          setRowData(defaultRowData);
          setTotalItems(defaultRowData.length);
          setTotalPages(Math.ceil(defaultRowData.length / pageSize));
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch users");
        // Fallback to default data on error
        setRowData(defaultRowData);
        setTotalItems(defaultRowData.length);
        setTotalPages(Math.ceil(defaultRowData.length / pageSize));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return rowData.slice(startIndex, endIndex);
  }, [rowData, pageNumber, pageSize]);

  // Update total pages when page size changes
  useEffect(() => {
    setTotalPages(Math.ceil(totalItems / pageSize));
    setPageNumber(1); // Reset to first page when page size changes
  }, [pageSize, totalItems]);

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

const columnDefs = useMemo<ColDef[]>(
  () => [
    {
      headerName: "Display Name",
      field: "name",
      flex: 1.5,
      cellRenderer: (params: any) => {
        const initials = params.value
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase();
        const colors = ["#7f3ff0", "#0099cc", "#777", "#d7263d", "#ffae00"];
        const bgColor = colors[params.rowIndex % colors.length];
        const status = params.data.status; // Access status from data
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                backgroundColor: bgColor,
                color: "darkblue",
                borderRadius: "50%",
                width: 28,
                height: 28,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials}
            </div>
            <span style={{ color: "#1677ff", cursor: "pointer" }}>
              {params.value}
            </span>
          </div>
        );
      },
    },
    { headerName: "Job Title", field: "title", flex: 1.5 },
    { headerName: "Department", field: "department", flex: 1.5 },
    {
      headerName: "Manager",
      field: "managerName",
      flex: 1.5,
      cellRenderer: (params: any) => {
        const managerName = params.value || "N/A";
        const managerStatus = params.data.managerStatus || "Unknown"; // Access managerStatus from data
        return (
          <span>
            {managerName} ({managerStatus})
          </span>
        );
      },
    },
    { headerName: "Tags", field: "tags", flex: 1 },
  ],
  []
);


  const handleRowClick = (event: any) => {
    try {
      // Persist the raw record for the detail page
      const raw = event?.data ?? {};
      // Attempt to enrich with full raw user from the last API result map
      try {
        const mapStr = localStorage.getItem("usersRawByKey");
        if (mapStr) {
          const map = JSON.parse(mapStr);
          const key = raw.email || raw.name;
          if (key && map && typeof map === 'object' && map[key]) {
            localStorage.setItem("selectedUserRawFull", JSON.stringify(map[key]));
          }
        }
      } catch {}
      // Save a single selected row and also a tiny array form for any legacy reader
      localStorage.setItem("selectedUserRaw", JSON.stringify(raw));
      localStorage.setItem("sharedRowData", JSON.stringify([{ // legacy shape consumed by profile page
        fullName: raw.name,
        id: raw.email, // using email as a stable id-like alias if no id
        status: raw.status,
        manager: raw.managerName,
        department: raw.department,
        jobtitle: raw.title,
        userType: raw.tags,
        email: raw.email,
      }]));
      try { window.dispatchEvent(new Event("localStorageChange")); } catch {}
    } catch {}
    const appId = event.data.name;
    router.push(`/user/${encodeURIComponent(appId)}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ height: 600 }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center" style={{ height: 600 }}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-2">Error loading users</p>
          <p className="text-gray-600 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ag-theme-alpine" style={{ width: "100%" }}>
      {/* Header with Create User Group Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => router.push("/user/create-group")}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create User Group
        </button>
      </div>

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
              setPageNumber(1); // Reset to first page when changing page size
            }
          }}
          pageSizeOptions={pageSizeSelector}
        />
      </div>
      
      <div style={{ minHeight: '400px' }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowData={paginatedData}
          domLayout="autoHeight"
          onRowClicked={handleRowClick}
        />
      </div>
      
      {/* Bottom pagination */}
      <div className="mt-4 mb-4">
        <CustomPagination
          totalItems={totalItems}
          currentPage={pageNumber}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={(newPageSize) => {
            if (typeof newPageSize === "number") {
              setPageSize(newPageSize);
              setPageNumber(1); // Reset to first page when changing page size
            }
          }}
          pageSizeOptions={pageSizeSelector}
        />
      </div>
    </div>
  );
}
