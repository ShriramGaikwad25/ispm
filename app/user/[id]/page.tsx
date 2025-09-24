"use client";
import HorizontalTabs from "@/components/HorizontalTabs";
import SegmentedControl from "@/components/SegmentedControl";
import { ChevronDown, ChevronRight, History, CircleX, CirclePlus } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { executeQuery } from "@/lib/api";
import type { ColDef } from "ag-grid-enterprise";
import dynamic from "next/dynamic";
import "@/components/scheduler/SchedulerManager.css";

// Dynamically import AgGridReact with SSR disabled
const AgGridReact = dynamic(() => import("ag-grid-react").then((mod) => mod.AgGridReact), {
  ssr: false,
});
import "@/lib/ag-grid-setup";

// Dynamically import Bar chart with SSR disabled
const Bar = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), {
  ssr: false,
});

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Register Chart.js components and plugin
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

type ProfileUser = {
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  alias: string;
  phone?: string;
  title?: string;
  department?: string;
  startDate?: string;
  userType?: string;
  managerEmail?: string;
  tags: string[];
};

const buildUserFromStorage = (): ProfileUser => {
  try {
    // Prefer the full raw user saved from the list page
    const fullStr = localStorage.getItem("selectedUserRawFull");
    if (fullStr) {
      const u = JSON.parse(fullStr);
      const displayName = u.displayname || u.displayName || `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim() || u.username || "Unknown";
      const email = u.email?.work || u.customattributes?.emails?.[0]?.value || u.username || "no-email@example.com";
      return {
        firstName: u.firstname || u.customattributes?.name?.givenName || displayName.split(" ")[0] || "",
        lastName: u.lastname || u.customattributes?.name?.familyName || displayName.split(" ").slice(1).join(" ") || "",
        email,
        displayName,
        alias: u.username || u.customattributes?.id || email,
        phone: u.phonenumber?.work || u.customattributes?.phoneNumbers?.[0]?.value || "",
        title: u.title || u.customattributes?.title || "",
        department: u.department || u.customattributes?.enterpriseUser?.department || "",
        startDate: u.startdate || u.customattributes?.["urn:ietf:params:scim:schemas:extension:custom"]?.startdate || "",
        userType: u.employeetype || u.customattributes?.userType || "",
        managerEmail: u.managername || u.customattributes?.enterpriseUser?.manager?.value || "",
        tags: [u.employeetype || u.customattributes?.userType || "User"].filter(Boolean),
      };
    }
  } catch {}
  try {
    // Fallback to the lightweight selected row
    const sel = localStorage.getItem("selectedUserRaw");
    if (sel) {
      const s = JSON.parse(sel);
      const displayName = s.name || "Unknown";
      const [fn, ...rest] = displayName.split(" ");
      return {
        firstName: fn || "",
        lastName: rest.join(" "),
        email: s.email || "no-email@example.com",
        displayName,
        alias: s.email || displayName,
        phone: "",
        title: s.title || "",
        department: s.department || "",
        startDate: "",
        userType: s.tags || "",
        managerEmail: s.managerName || "",
        tags: [s.tags || "User"].filter(Boolean),
      };
    }
  } catch {}
  // Final fallback
  return {
    firstName: "",
    lastName: "",
    email: "no-email@example.com",
    displayName: "Unknown",
    alias: "",
    phone: "",
    title: "",
    department: "",
    startDate: "",
    userType: "",
    managerEmail: "",
    tags: ["User"],
  };
};

// Sample access data
const accessData = {
  accounts: 20,
  apps: 10,
  entitlements: 60,
  violations: 5,
};

// Sample account data
const accountData = [
  {
    accountId: "ACC001",
    accountStatus: "Active",
    risk: "Low",
    appName: "CRM App",
    discoveryDate: "2023-06-01",
    lastSyncDate: "2025-08-20",
    lastAccessReview: "2025-07-15",
    insights: "High usage",
    mfa: "Enabled",
    complianceViolation: "None",
    entitlements: [
      { entName: "CRM_READ", risk: "Low", description: "Read-only access to CRM", assignedOn: "2023-06-01", lastReviewed: "2025-07-15", tags: ["Read", "CRM"] },
      { entName: "CRM_WRITE", risk: "Medium", description: "Write access to CRM", assignedOn: "2023-06-01", lastReviewed: "2025-07-15", tags: ["Write", "CRM"] },
    ],
  },
  {
    accountId: "ACC002",
    accountStatus: "Suspended",
    risk: "High",
    appName: "HR Portal",
    discoveryDate: "2023-05-10",
    lastSyncDate: "2025-08-18",
    lastAccessReview: "2025-06-30",
    insights: "Inactive account",
    mfa: "Disabled",
    complianceViolation: "SoD Violation",
    entitlements: [
      { entName: "HR_ADMIN", risk: "High", description: "Admin access to HR Portal", assignedOn: "2023-05-10", lastReviewed: "2025-06-30", tags: ["Admin", "HR"] },
    ],
  },
];

export default function UserDetailPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [userData, setUserData] = useState<ProfileUser>(() => buildUserFromStorage());

  // Ensure chart and grid render only on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Re-read after mount to ensure access to localStorage
    setUserData(buildUserFromStorage());
  }, []);

  const ProfileTab = () => {
    const initials = `${(userData.firstName || "")[0] || "U"}${(userData.lastName || "")[0] || ""}`.toUpperCase();
    const colors = ["#7f3ff0", "#0099cc", "#777", "#d7263d", "#ffae00"];
    // Ensure same color on server and initial client render to avoid hydration mismatch
    const bgColor = isMounted
      ? colors[(userData.email || "").length % colors.length]
      : colors[0];
    const displayedInitials = isMounted ? initials : "";

    return (
      <div className="flex flex-col md:flex-row gap-6 p-6 bg-white rounded-lg shadow-md">
        <div className="flex-shrink-0">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
            style={{ backgroundColor: bgColor }}
          >
            {displayedInitials}
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">First Name</label>
            <p className="text-base text-gray-900">{userData.firstName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Last Name</label>
            <p className="text-base text-gray-900">{userData.lastName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-base text-blue-600">{userData.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Display Name</label>
            <p className="text-base text-gray-900">{userData.displayName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Alias</label>
            <p className="text-base text-gray-900">{userData.alias}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phone Number</label>
            <p className="text-base text-gray-900">{userData.phone || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Title</label>
            <p className="text-base text-gray-900">{userData.title}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Department</label>
            <p className="text-base text-gray-900">{userData.department}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Start Date</label>
            <p className="text-base text-gray-900">{userData.startDate || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">User Type</label>
            <p className="text-base text-gray-900">{userData.userType}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Manager Email</label>
            <p className="text-base text-blue-600">{userData.managerEmail}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Tags</label>
            <div className="flex flex-wrap gap-2">
              {userData.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AllAccessTab = () => {
    const [rowData, setRowData] = useState<any[]>([]);
    const [dynamicCols, setDynamicCols] = useState<ColDef[]>([]);

    useEffect(() => {
      const getUserIdFromStorage = (): string => {
        try {
          const fullStr = localStorage.getItem("selectedUserRawFull");
          if (fullStr) {
            const u = JSON.parse(fullStr);
            return (
              u.userid || u.id || u.userId || u.customattributes?.id || "0109868e-b00c-4f24-ae5f-258029cce1d6"
            );
          }
        } catch {}
        try {
          const sel = localStorage.getItem("selectedUserRaw");
          if (sel) {
            const s = JSON.parse(sel);
            return s.id || s.userId || "0109868e-b00c-4f24-ae5f-258029cce1d6";
          }
        } catch {}
        return "0109868e-b00c-4f24-ae5f-258029cce1d6";
      };

      const fetchAllAccess = async () => {
        try {
          const userId = getUserIdFromStorage();
          const res: any = await executeQuery<any>(
            "select * from vw_user_with_applications_entitlements where userid = ?::uuid",
            [userId]
          );
          // Handle concrete response shape: { resultSet: [ { applications: [ { entitlements: [...] } ] } ] }
          if (Array.isArray(res?.resultSet)) {
            const flatEntRows: any[] = [];
            for (const user of res.resultSet) {
              const apps = Array.isArray(user?.applications) ? user.applications : [];
              for (const app of apps) {
                const ents = Array.isArray(app?.entitlements) ? app.entitlements : [];
                for (const ent of ents) {
                  flatEntRows.push({
                    entitlementName: ent?.entitlementname,
                    entitlementType: ent?.entitlementType,
                    application: app?.application,
                    accountName: app?.accountname,
                    lastLogin: app?.lastlogin,
                  });
                }
              }
            }

            setRowData(flatEntRows);

            const desiredCols: ColDef[] = [
              { headerName: "Entitlement Name", field: "entitlementName", flex: 1.5 },
              { headerName: "entitlementType", field: "entitlementType", flex: 1 },
              { headerName: "Application", field: "application", flex: 1.2 },
              { headerName: "Account name", field: "accountName", flex: 1.2 },
              {
                headerName: "Last Login",
                field: "lastLogin",
                flex: 1,
                valueFormatter: (p: any) => require("@/utils/utils").formatDateMMDDYYSlashes(p.value),
              },
            ];
            setDynamicCols(desiredCols);
            return;
          }
          // Normalize possible response shapes
          const items = ((): any[] => {
            if (Array.isArray(res?.items)) return res.items;
            if (Array.isArray(res?.data?.items)) return res.data.items;
            if (Array.isArray(res?.rows)) return res.rows;
            if (Array.isArray(res?.data?.rows)) return res.data.rows;
            if (Array.isArray(res?.results)) return res.results;
            if (Array.isArray(res?.data?.results)) return res.data.results;
            if (Array.isArray(res?.data)) return res.data;
            if (Array.isArray(res)) return res;
            if (res && typeof res === "object") {
              // As a last resort, try to find an array property
              const firstArray = Object.values(res).find((v: any) => Array.isArray(v));
              if (Array.isArray(firstArray)) return firstArray as any[];
            }
            return [];
          })();
          setRowData(items);
          // Helper to resolve a value from multiple possible key aliases on each row
          const valueByAliases = (data: any, aliases: string[]) => {
            for (const a of aliases) {
              if (data[a] !== undefined) return data[a];
              const lower = a.toLowerCase();
              const hit = Object.keys(data).find((k) => k.toLowerCase() === lower);
              if (hit) return data[hit];
            }
            return undefined;
          };

          const desiredCols: ColDef[] = [
            {
              headerName: "Entitlement Name",
              colId: "entitlementName",
              valueGetter: (p: any) =>
                valueByAliases(p.data, ["entitlementname", "entitlement_name", "ent_name", "entname"]),
              flex: 1.5,
            },
            {
              headerName: "entitlementType",
              colId: "entitlementType",
              valueGetter: (p: any) =>
                valueByAliases(p.data, [
                  "entitlementtype",
                  "entitlement_type",
                  "ent_type",
                  "enttype",
                  "entitlementcategory",
                ]),
              flex: 1,
            },
            {
              headerName: "Application",
              colId: "application",
              valueGetter: (p: any) =>
                valueByAliases(p.data, [
                  "application",
                  "applicationname",
                  "application_name",
                  "appname",
                  "app_name",
                  "applicationdisplayname",
                ]),
              flex: 1.2,
            },
            {
              headerName: "Account name",
              colId: "accountName",
              valueGetter: (p: any) =>
                valueByAliases(p.data, [
                  "account",
                  "accountname",
                  "account_name",
                  "username",
                  "useraccount",
                  "user_name",
                ]),
              flex: 1.2,
            },
            {
              headerName: "Last Login",
              colId: "lastLogin",
              valueGetter: (p: any) =>
                valueByAliases(p.data, [
                  "lastlogin",
                  "last_login",
                  "lastlogindate",
                  "last_login_date",
                ]),
              flex: 1,
            },
          ];
          // If none of the desired columns resolve for the first row, fall back to showing all keys
          const desiredResolved = desiredCols.some((c) => {
            try {
              const val = (c as any).valueGetter?.({ data: items[0] });
              return val !== undefined && val !== null;
            } catch {
              return false;
            }
          });
          if (desiredResolved) {
            setDynamicCols(desiredCols);
          } else {
            const keys = Object.keys(items[0] || {});
            const fallback = keys.map((k) => ({ headerName: k, field: k, flex: 1 } as ColDef));
            setDynamicCols(fallback);
          }
        } catch (e) {
          setRowData([]);
          setDynamicCols([]);
        }
      };

      fetchAllAccess();
    }, []);

    return (
      <div className="p-6 bg-gray-50 ">
        {isMounted && (
          <div className="ag-theme-alpine" style={{ height: 400, width: "100%" }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={dynamicCols}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
            />
          </div>
        )}
      </div>
    );
  };

  const UnderReviewTab = () => {
    const transientItems = [
      {
        title: "Fusion HCM Admin Account",
        description:
          "Operates core HCM administration. Provides governed workflows and traceability.",
        application: "Oracle_Fusion_HCM",
        account: "kelly.marks",
        entitlement: "HCM Admin Account",
      },
      {
        title: "SAP Finance Ops",
        description:
          "Performs financial postings, inquiries, and reconciliations under governed workflows.",
        application: "SAP_S4",
        account: "kelly.marks",
        entitlement: "Finance Analyst",
      },
    ];

    const [selectedIdx, setSelectedIdx] = useState(0);
    const selectedItem = transientItems[selectedIdx] || transientItems[0];

    // Side panel state for Start Access
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [accessMode, setAccessMode] = useState<"now" | "schedule">("now");
    const [hours, setHours] = useState<string>("");
    const [scheduleDate, setScheduleDate] = useState<string>("");
    const [startTime, setStartTime] = useState<string>("");
    const [endTime, setEndTime] = useState<string>("");
    const [justification, setJustification] = useState<string>("");

    const resetForm = () => {
      setAccessMode("now");
      setHours("");
      setScheduleDate("");
      setStartTime("");
      setEndTime("");
      setJustification("");
    };

    const openDrawer = () => {
      resetForm();
      setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
      setIsDrawerOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // TODO: Wire to API
      console.log("Start Access submit", {
        item: selectedItem,
        accessMode,
        hours,
        scheduleDate,
        startTime,
        endTime,
        justification,
      });
      setIsDrawerOpen(false);
    };

    // Get today's date in MM/DD/YYYY format
    const today = new Date();
    const todayFormatted = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;

    const historyRows = [
      { 
        date: todayFormatted, 
        requestedDuration: 4, 
        startTime: "02:00 PM", 
        endTime: null, 
        status: "Active" 
      },
      { 
        date: "09/24/2025", 
        requestedDuration: 1, 
        startTime: "11:00 AM", 
        endTime: "12:00 PM", 
        status: "Completed" 
      },
      { 
        date: "09/24/2025", 
        requestedDuration: 1, 
        startTime: "09:00 AM", 
        endTime: "10:00 AM", 
        status: "Completed" 
      },
      // { 
      //   date: "09/24/2025", 
      //   requestedDuration: 1, 
      //   startTime: "1:00 PM", 
      //   endTime: "1:30 PM", 
      //   status: "Completed" 
      // },
      // { 
      //   date: "09/23/2025", 
      //   requestedDuration: 1, 
      //   startTime: "2:00 PM", 
      //   endTime: "2:45 PM", 
      //   status: "Completed" 
      // },
      // { 
      //   date: "09/22/2025", 
      //   requestedDuration: 2, 
      //   startTime: "4:00 PM", 
      //   endTime: "5:30 PM", 
      //   status: "Completed" 
      // }
    ];

    const fmt = (d?: string | null) => (d ? require("@/utils/utils").formatDateMMDDYYSlashes(d) : "-");

    return (
      <div className="p-6 bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ gridTemplateColumns: isDrawerOpen ? "280px 1fr 0" : undefined }}>
          {/* Left: Transient Access list */}
          <div className="lg:col-span-1">
            <div className="triggers-panel" style={{ width: "100%", height: "100%" }}>
              <div className="triggers-header">
                <h3>JIT Privilege Access</h3>
                <button
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                  onClick={() => { /* TODO: open create transient access modal */ }}
                >
                  New
                </button>
              </div>
              <div className="trigger-list">
                {transientItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`trigger-item ${selectedIdx === idx ? "selected" : ""}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <div className="trigger-name">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Access History */}
          <div className="lg:col-span-2" style={{ marginRight: isDrawerOpen ? 420 : 0, transition: "margin-right 200ms ease" }}>
            {/* Top card styled like scheduler trigger card */}
            <div className="jobs-section" style={{ padding: 0, marginBottom: 20, height: "auto", gap: 0, display: "block" }}>
              <div className="trigger-card-section" style={{ height: "auto", marginBottom: 4 }}>
                <div className="trigger-card" style={{ marginBottom: 0 }}>
                  <div className="trigger-card-header" style={{ paddingTop: 6, paddingBottom: 6 }}>
                    <h4>{selectedItem?.title || "Fusion HCM Admin Account"}</h4>
                  </div>
                  <div className="trigger-card-content" style={{ padding: 8 }}>
                    <div className="trigger-info-rows" style={{ gap: 8 }}>
                      <div className="trigger-info-row">
                        <div
                          className="info-item bg-gray-100 rounded"
                          style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "row", alignItems: "center", gap: 8, padding: "8px 12px" }}
                        >
                          <span className="info-label" style={{ marginRight: 4 }}>Description:</span>
                          <span className="info-value whitespace-nowrap">{selectedItem?.description || "N/A"}</span>
                        </div>
                      </div>
                      <div className="trigger-info-row" style={{ gridTemplateColumns: "1fr 1fr auto", columnGap: 16 }}>
                        <div className="info-item">
                          <span className="info-label">Account</span>
                          <span className="info-value">{selectedItem?.account || "N/A"}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Application</span>
                          <span className="info-value">{selectedItem?.application || "N/A"}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Action</span>
                          <button
                            className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                            onClick={openDrawer}
                          >
                            Start Access
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="trigger-card-section" style={{ height: "auto" }}>
              <div className="trigger-card">
                <div className="trigger-card-header" style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <h4>Access History</h4>
                </div>
                <div className="trigger-card-content" style={{ padding: 0 }}>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Requested Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Start Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">End Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((h, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{h.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{h.requestedDuration} hours</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{h.startTime}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{h.endTime || "-"}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs ${
                                h.status === "Completed"
                                  ? "bg-gray-100 text-gray-700"
                                  : h.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {h.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {/* Activity icon first */}
                              <button
                                className="text-blue-600 hover:text-blue-800 flex items-center justify-center"
                                onClick={() => console.log('Activity', h)}
                                title="Activity"
                              >
                                <History size={24} />
                              </button>
                              {h.status === "Active" && (
                                <>
                                  <button
                                    className="text-red-600 hover:text-red-800 flex items-center justify-center ml-2"
                                    onClick={() => console.log('End Session')}
                                    title="End Session"
                                  >
                                    <CircleX size={24} />
                                  </button>
                                  <button
                                    className="text-green-600 hover:text-green-800 flex items-center justify-center ml-2"
                                    onClick={() => console.log('Extend')}
                                    title="Extend"
                                  >
                                    <CirclePlus size={24} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Right Drawer for Start Access */}
            {isDrawerOpen && (
              <>
                {/* Drawer */}
                <div className="fixed right-0 w-96 md:w-[420px] bg-white shadow-2xl z-50 flex flex-col" style={{ top: 80, height: "calc(100% - 80px)" }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div className="text-base font-semibold">Start Transient Access</div>
                    <button
                      className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                      onClick={closeDrawer}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1">
                    {/* Toggle NOW / Schedule */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Access Duration</div>
                      <div className="inline-flex bg-gray-100 rounded-md p-1">
                        <button
                          type="button"
                          onClick={() => setAccessMode("now")}
                          className={`px-3 py-1 text-sm rounded ${
                            accessMode === "now" ? "bg-blue-600 text-white" : "text-gray-600"
                          }`}
                        >
                          Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccessMode("schedule")}
                          className={`px-3 py-1 text-sm rounded ${
                            accessMode === "schedule" ? "bg-blue-600 text-white" : "text-gray-600"
                          }`}
                        >
                          Schedule for Later
                        </button>
                      </div>
                    </div>

                    {accessMode === "now" ? (
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          Duration (hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full border rounded px-3 py-2 text-sm"
                          placeholder="e.g., 4"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          required
                        />
                      </div>
                    ) : (
                      <div className="mb-4 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                          <input
                            type="date"
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Time</label>
                            <input
                              type="time"
                              className="w-full border rounded px-3 py-2 text-sm"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">End Time</label>
                            <input
                              type="time"
                              className="w-full border rounded px-3 py-2 text-sm"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Justification</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm"
                        rows={4}
                        placeholder="Why is this access needed?"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 rounded border text-sm"
                        onClick={closeDrawer}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const AccessTab = () => {
    const [accessTabIndex, setAccessTabIndex] = useState(0);

    const accessSegments = [
      {
        label: "All",
        component: AllAccessTab,
      },
    {
      label: "JIT Privilege Access",
      component: UnderReviewTab,
    },
    ];

    return (
      <div>
        <SegmentedControl
          segments={accessSegments}
          activeIndex={accessTabIndex}
          onChange={setAccessTabIndex}
        />
      </div>
    );
  };

  const tabsData = [
    {
      label: "Profile",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: ProfileTab,
    },
    {
      label: "Access",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: AccessTab,
    },
  ];

  return (
    <>
      <HorizontalTabs
        tabs={tabsData}
        activeIndex={tabIndex}
        onChange={setTabIndex}
      />
    </>
  );
}