"use client";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";
import { ColDef, GridApi } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation"; // Updated import
import React, { useMemo, useRef, useState, useEffect } from "react";
import { executeQuery } from "@/lib/api";
import "@/lib/ag-grid-setup";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

const data: Record<string, DataItem[]> = {
  interactiveFilter: [
    { label: "Active Users", value: 0 },
    { label: "Inactive Users", value: 0 },
    { label: "Non Human Identities", value: 0 },
    { label: "Application Identities", value: 0 },
    { label: "Orphan Account Users", value: 0 },
    { label: "High Risk Users", value: 0 },
    { label: "Compliance Violation Users", value: 0 },
  ],
};

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
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
  const [rowData, setRowData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch users");
        // Fallback to default data on error
        setRowData(defaultRowData);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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

  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

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
    <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
      <div className="relative mb-4">
        <div style={{ maxWidth: '600px', maxHeight: '200px' }}>
          <Accordion
            iconClass="absolute top-1 right-0 rounded-full text-white bg-purple-800"
            title="Expand/Collapse"
            open={false}
          >
            <div className="grid grid-cols-2 gap-1 p-0.5" style={{ maxWidth: '580px' }}>
              {Object.entries(data).map(([category, items]) => (
                <div key={category} style={{ minHeight: 'auto' }}>
                  <div className="flex justify-between items-center mb-0 border-b border-gray-300 pb-0 px-0">
                    <h3 className="font-semibold text-[9px] capitalize">
                      {category.replace(/([A-Z])/g, " $1")}
                    </h3>
                    <button
                      onClick={() => {
                        setSelected((prev) => ({
                          ...prev,
                          [category]: null,
                        }));
                      }}
                      className="text-[8px] text-blue-600 hover:underline flex items-center gap-0"
                    >
                      Clear
                      {selected[category] !== undefined &&
                      selected[category] !== null ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-2 w-2 text-blue-600"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-2 w-2 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div style={{ lineHeight: '1' }}>
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className={`flex text-[8px] relative items-center p-0.5 rounded-sm cursor-pointer transition-all ${
                          selected[category] === index
                            ? "bg-[#6574BD] text-white"
                            : "bg-[#F0F2FC] hover:bg-[#e5e9f9]"
                        } ${item.color || ""}`}
                        onClick={() => handleSelect(category, index)}
                        style={{ minHeight: '16px', lineHeight: '1' }}
                      >
                        <span className="truncate text-[8px]">{item.label}</span>
                        <span
                          className={`font-semibold absolute -right-0 bg-white border p-0 text-[7px] rounded-sm ${
                            selected[category] === index
                              ? "border-[#6574BD] text-[#6574BD]"
                              : "border-[#e5e9f9]"
                          }`}
                          style={{ padding: '1px 2px' }}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        </div>
      </div>
      <AgGridReact
        columnDefs={columnDefs}
        rowData={rowData}
        domLayout="autoHeight"
        onRowClicked={handleRowClick}
      />
    </div>
  );
}
