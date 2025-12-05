"use client";
import SegmentedControl from "@/components/SegmentedControl";
import { History, CircleX, CirclePlus, FileText, Search, Plus, Ban, Calendar, Edit } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { executeQuery } from "@/lib/api";
import type { ColDef } from "ag-grid-enterprise";
import dynamic from "next/dynamic";
import { useReactToPrint } from "react-to-print";
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
import { BackButton } from "@/components/BackButton";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import UserDisplayName from "@/components/UserDisplayName";

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

// Add Proxy User Sidebar Component
const AddProxyUserSidebar = ({ onClose }: { onClose: () => void }) => {
  const [searchValue, setSearchValue] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [apiUsers, setApiUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [justification, setJustification] = useState("");
  const [capabilities, setCapabilities] = useState({
    requestAccess: false,
    reviewAndApprove: false,
    performAccessReviews: false,
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch users from API with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchValue.trim() !== "") {
      setIsLoadingUsers(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const query = `SELECT username, email FROM usr WHERE username ILIKE ? OR email::text ILIKE ?`;
          const response = await executeQuery(query, [`%${searchValue}%`, `%${searchValue}%`]);
          
          let usersData: any[] = [];
          if (response?.resultSet && Array.isArray(response.resultSet)) {
            usersData = response.resultSet.map((user: any) => {
              let emailValue = "";
              if (user.email) {
                if (typeof user.email === "string") {
                  emailValue = user.email;
                } else if (user.email.work) {
                  emailValue = user.email.work;
                } else if (Array.isArray(user.email) && user.email.length > 0) {
                  const primaryEmail = user.email.find((e: any) => e.primary) || user.email[0];
                  emailValue = primaryEmail?.value || "";
                }
              }
              return {
                username: user.username || "",
                email: emailValue,
              };
            });
          }
          setApiUsers(usersData);
        } catch (error) {
          console.error("Error fetching users:", error);
          setApiUsers([]);
        } finally {
          setIsLoadingUsers(false);
        }
      }, 500);
    } else {
      setApiUsers([]);
      setIsLoadingUsers(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchValue]);

  const filteredUsers = useMemo(() => {
    if (!searchValue.trim()) return [];
    return apiUsers.filter((user) => {
      const searchLower = searchValue.toLowerCase();
      return (
        user.username?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    });
  }, [apiUsers, searchValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      alert("Please select a user");
      return;
    }
    if (!startDate || !endDate) {
      alert("Please select start and end dates");
      return;
    }
    if (!justification.trim()) {
      alert("Please provide a justification");
      return;
    }
    if (!capabilities.requestAccess && !capabilities.reviewAndApprove && !capabilities.performAccessReviews) {
      alert("Please select at least one capability");
      return;
    }

    const proxyUserData = {
      identity: selectedUser.email || selectedUser.username,
      startDate,
      endDate,
      justification,
      capabilities: [
        capabilities.requestAccess && "Request Access",
        capabilities.reviewAndApprove && "Review and approve Requests",
        capabilities.performAccessReviews && "Perform Access Reviews",
      ].filter(Boolean).join(", "),
    };

    console.log("Submitting proxy user:", proxyUserData);
    // TODO: Call API to add proxy user
    alert("Proxy user added successfully!");
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Search Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Search and Select User
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="text-gray-400 w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        
        {/* User Results */}
        {isLoadingUsers && (
          <div className="mt-2 text-sm text-gray-500">Searching...</div>
        )}
        {!isLoadingUsers && searchValue.trim() && filteredUsers.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            {filteredUsers.map((user, index) => (
              <div
                key={index}
                onClick={() => {
                  setSelectedUser(user);
                  setSearchValue(user.email || user.username);
                  setApiUsers([]);
                }}
                className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                  selectedUser?.email === user.email ? "bg-blue-50 border-blue-200" : ""
                }`}
              >
                <div className="font-medium text-gray-900">{user.username || "N/A"}</div>
                <div className="text-sm text-gray-600">{user.email || "N/A"}</div>
              </div>
            ))}
          </div>
        )}
        {selectedUser && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <span className="text-sm font-medium text-blue-700">
              Selected: {selectedUser.email || selectedUser.username}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedUser(null);
                setSearchValue("");
              }}
              className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Date Section */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>
      </div>

      {/* Justification Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Justification <span className="text-red-500">*</span>
        </label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={4}
          placeholder="Enter justification for proxy access..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          required
        />
      </div>

      {/* Capabilities Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Capabilities <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={capabilities.requestAccess}
              onChange={(e) =>
                setCapabilities({ ...capabilities, requestAccess: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Request Access</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={capabilities.reviewAndApprove}
              onChange={(e) =>
                setCapabilities({ ...capabilities, reviewAndApprove: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Review and approve Requests</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={capabilities.performAccessReviews}
              onChange={(e) =>
                setCapabilities({ ...capabilities, performAccessReviews: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Perform Access Reviews</span>
          </label>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Proxy User
        </button>
      </div>
    </form>
  );
};

export default function UserDetailPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [userData, setUserData] = useState<ProfileUser>(() => buildUserFromStorage());
  const { openSidebar, closeSidebar } = useRightSidebar();

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
      <div className="bg-white rounded-lg shadow-md p-3">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Profile Picture - Centered */}
          <div className="flex-shrink-0 flex justify-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
              style={{ backgroundColor: bgColor }}
            >
              {displayedInitials}
            </div>
          </div>
          
          {/* User Details - Right Side */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">First Name</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.firstName}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.lastName}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">{userData.email}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Display Name</label>
              <div className="text-xs font-semibold text-gray-900 mt-0.5">
                <UserDisplayName
                  displayName={userData.displayName}
                  userType={userData.userType}
                  tags={userData.tags}
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alias</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.alias}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.phone || "N/A"}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.title}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.department}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.startDate || "N/A"}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Type</label>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">{userData.userType}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manager Email</label>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">{userData.managerEmail}</p>
            </div>
            
            {userData.tags && userData.tags.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</label>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {userData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 border border-blue-300 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const AllAccessTab = () => {
    const [rowData, setRowData] = useState<any[]>([]);
    const [dynamicCols, setDynamicCols] = useState<ColDef[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const gridRef = useRef<any>(null);

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
              { headerName: "Entitlement ", field: "entitlementName", flex: 1.5 },
              { headerName: "Type", field: "entitlementType", flex: 1 },
              { headerName: "Application", field: "application", flex: 1.2 },
              { headerName: "Account", field: "accountName", flex: 1.2 },
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

    // Filter data based on search term
    const filteredData = useMemo(() => {
      if (!searchTerm.trim()) {
        return rowData;
      }
      const searchLower = searchTerm.toLowerCase();
      return rowData.filter((row) => {
        // Helper to get cell value for search
        const getValue = (col: ColDef, data: any): string => {
          if (col.field) return String(data[col.field] || '').toLowerCase();
          if ((col as any).valueGetter) {
            try {
              return String((col as any).valueGetter({ data }) || '').toLowerCase();
            } catch {
              return '';
            }
          }
          if ((col as any).colId) {
            const colId = (col as any).colId;
            if (colId === 'entitlementName') {
              return String(data.entitlementName || data.entitlementname || data.entitlement_name || '').toLowerCase();
            }
            if (colId === 'entitlementType') {
              return String(data.entitlementType || data.entitlementtype || data.entitlement_type || '').toLowerCase();
            }
            if (colId === 'application') {
              return String(data.application || data.applicationname || data.application_name || '').toLowerCase();
            }
            if (colId === 'accountName') {
              return String(data.accountName || data.accountname || data.account_name || '').toLowerCase();
            }
            if (colId === 'lastLogin') {
              const date = data.lastLogin || data.lastlogin || data.last_login || '';
              return date ? require("@/utils/utils").formatDateMMDDYYSlashes(date).toLowerCase() : '';
            }
            return String(data[colId] || '').toLowerCase();
          }
          return '';
        };

        // Search across all columns
        return dynamicCols.some((col) => {
          const value = getValue(col, row);
          return value.includes(searchLower);
        });
      });
    }, [rowData, searchTerm, dynamicCols]);

      // Print-friendly table version
      const PrintTable = () => {
        if (!filteredData || filteredData.length === 0) return null;
      
        const getCellValue = (row: any, col: ColDef) => {
          if (col.field) return row[col.field] || '';
          if ((col as any).valueGetter) {
            try {
              return (col as any).valueGetter({ data: row }) || '';
            } catch {
              return '';
            }
          }
          if ((col as any).colId) {
            const colId = (col as any).colId;
            if (colId === 'entitlementName') {
              return row.entitlementName || row.entitlementname || row.entitlement_name || '';
            }
            if (colId === 'entitlementType') {
              return row.entitlementType || row.entitlementtype || row.entitlement_type || '';
            }
            if (colId === 'application') {
              return row.application || row.applicationname || row.application_name || '';
            }
            if (colId === 'accountName') {
              return row.accountName || row.accountname || row.account_name || '';
            }
            if (colId === 'lastLogin') {
              const date = row.lastLogin || row.lastlogin || row.last_login || '';
              return date ? require("@/utils/utils").formatDateMMDDYYSlashes(date) : '';
            }
            return row[colId] || '';
          }
          return '';
        };

        return (
          <div className="print-table-only" style={{ display: 'none' }}>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {dynamicCols.map((col, idx) => (
                    <th key={idx} className="border border-gray-300 px-3 py-2 text-left font-semibold">
                      {col.headerName || ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50">
                    {dynamicCols.map((col, colIdx) => (
                      <td key={colIdx} className="border border-gray-300 px-3 py-2">
                        {getCellValue(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      };

      return (
        <div className="bg-white rounded-lg shadow-md p-3 print-ag-grid-container">
          {/* Search Box */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="text-gray-400 w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search by entitlement, application, account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredData.length} result(s) for "{searchTerm}"
              </p>
            )}
          </div>

          {/* AG Grid - hidden in print */}
          <div className="screen-only">
            {isMounted && (
              <div className="ag-theme-alpine print-ag-grid" style={{ height: 400, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={filteredData}
                  columnDefs={dynamicCols}
                  defaultColDef={{ sortable: true, filter: true, resizable: true }}
                  suppressRowVirtualisation={false}
                />
              </div>
            )}
          </div>
          {/* Print-friendly table - visible only in print */}
          <PrintTable />
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
                <h3>JIT Access</h3>
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

  const ProxyUsersTab = () => {
    const [proxyUsers, setProxyUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState<string>("");

    useEffect(() => {
      // TODO: Replace with actual API call to fetch proxy users
      // For now, using sample data
      const fetchProxyUsers = async () => {
        try {
          setLoading(true);
          // Sample data - replace with actual API call
          const sampleData = [
            {
              identity: "john.doe@example.com",
              startDate: "2024-01-15",
              endDate: "2024-12-31",
              status: "Active",
              capabilities: "Full Access, Read, Write",
              comments: "Primary proxy user for operations",
            },
            {
              identity: "jane.smith@example.com",
              startDate: "2024-02-20",
              endDate: "2024-11-30",
              status: "Active",
              capabilities: "Read Only",
              comments: "Backup proxy user",
            },
            {
              identity: "bob.jones@example.com",
              startDate: "2024-03-10",
              endDate: "2024-10-15",
              status: "Disabled",
              capabilities: "Read, Write",
              comments: "Temporarily disabled",
            },
          ];
          setProxyUsers(sampleData);
        } catch (error) {
          console.error("Error fetching proxy users:", error);
          setProxyUsers([]);
        } finally {
          setLoading(false);
        }
      };

      fetchProxyUsers();
    }, []);

    // Filter data based on search term
    const filteredData = useMemo(() => {
      if (!searchTerm.trim()) {
        return proxyUsers;
      }
      const searchLower = searchTerm.toLowerCase();
      return proxyUsers.filter((user) => {
        return (
          user.identity?.toLowerCase().includes(searchLower) ||
          user.status?.toLowerCase().includes(searchLower) ||
          user.capabilities?.toLowerCase().includes(searchLower) ||
          user.comments?.toLowerCase().includes(searchLower)
        );
      });
    }, [proxyUsers, searchTerm]);

    const handleDisable = (rowData: any) => {
      console.log("Disable proxy user:", rowData);
      // TODO: Implement disable functionality
    };

    const handleExtendEndDate = (rowData: any) => {
      console.log("Extend end date for:", rowData);
      // TODO: Implement extend end date functionality
    };

    const handleEditStartDate = (rowData: any) => {
      console.log("Edit start date for:", rowData);
      // TODO: Implement edit start date functionality
    };

    const columnDefs: ColDef[] = [
      { 
        headerName: "Identity", 
        field: "identity", 
        flex: 2,
        cellRenderer: (params: any) => (
          <span className="text-blue-600 font-medium">{params.value || "-"}</span>
        ),
      },
      {
        headerName: "Start Date",
        field: "startDate",
        flex: 1.5,
        valueFormatter: (p: any) => p.value ? require("@/utils/utils").formatDateMMDDYYSlashes(p.value) : "-",
      },
      {
        headerName: "End Date",
        field: "endDate",
        flex: 1.5,
        valueFormatter: (p: any) => p.value ? require("@/utils/utils").formatDateMMDDYYSlashes(p.value) : "-",
      },
      { 
        headerName: "Status", 
        field: "status", 
        flex: 1,
        cellRenderer: (params: any) => {
          const status = params.value || "Unknown";
          const statusColor = status === "Active" 
            ? "bg-green-100 text-green-700" 
            : status === "Disabled"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-700";
          return (
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
              {status}
            </span>
          );
        },
      },
      { 
        headerName: "Capabilities", 
        field: "capabilities", 
        flex: 2,
        cellRenderer: (params: any) => (
          <span className="text-gray-700">{params.value || "-"}</span>
        ),
      },
      { 
        headerName: "Comments", 
        field: "comments", 
        flex: 2,
        cellRenderer: (params: any) => (
          <span className="text-gray-600 text-sm">{params.value || "-"}</span>
        ),
      },
      {
        headerName: "Actions",
        field: "actions",
        flex: 2,
        cellRenderer: (params: any) => {
          const rowData = params.data;
          return (
            <div className="flex items-center gap-2 h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDisable(rowData);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors"
                title="Disable"
              >
                <Ban className="w-3 h-3" />
                Disable
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExtendEndDate(rowData);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                title="Extend End Date"
              >
                <Calendar className="w-3 h-3" />
                Extend
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStartDate(rowData);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
                title="Edit Start Date"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
            </div>
          );
        },
      },
    ];

    if (loading) {
      return (
        <div className="flex justify-center items-center" style={{ height: 400 }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading proxy users...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-3">
        {/* Search Box */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="text-gray-400 w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search proxy users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredData.length} result(s) for "{searchTerm}"
            </p>
          )}
        </div>

        {/* AG Grid */}
        <div className="screen-only">
          {isMounted && (
            <div className="ag-theme-alpine" style={{ height: 400, width: "100%" }}>
              <AgGridReact
                rowData={filteredData}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, filter: true, resizable: true }}
                suppressRowVirtualisation={false}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const CombinedView = ({ printRef }: { printRef: React.RefObject<HTMLDivElement> }) => {
    const [accessTabIndex, setAccessTabIndex] = useState(0);

    const accessSegments = [
      {
        label: "All",
        component: AllAccessTab,
      },
      {
        label: "JIT Access",
        component: UnderReviewTab,
      },
      {
        label: "Proxy Users",
        component: ProxyUsersTab,
      },
    ];

    return (
      <div className="space-y-6" ref={printRef}>
        {/* Profile Card */}
        <ProfileTab />
        
        {/* Access Tabs */}
        <div>
          <SegmentedControl
            segments={accessSegments}
            activeIndex={accessTabIndex}
            onChange={setAccessTabIndex}
          />
        </div>

      </div>
    );
  };

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `User_Profile_${userData.displayName || userData.email}_${new Date().toISOString().split('T')[0]}`,
    onBeforeGetContent: () => {
      // Expand AG Grid containers to show all rows
      const gridContainers = printRef.current?.querySelectorAll('.ag-theme-alpine');
      gridContainers?.forEach((container: any) => {
        if (container.style) {
          container.style.height = 'auto';
          container.style.maxHeight = 'none';
        }
        const viewport = container.querySelector('.ag-body-viewport');
        if (viewport && viewport.style) {
          viewport.style.height = 'auto';
          viewport.style.maxHeight = 'none';
          viewport.style.overflow = 'visible';
        }
      });
      return Promise.resolve();
    },
    pageStyle: `
      @page {
        size: A4;
        margin: 15mm;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
        .screen-only {
          display: none !important;
        }
        .print-table-only {
          display: block !important;
        }
        .print-ag-grid-container {
          page-break-inside: avoid;
        }
        .print-ag-grid,
        .ag-theme-alpine {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
          min-height: auto !important;
        }
        .ag-root-wrapper {
          overflow: visible !important;
          height: auto !important;
          display: block !important;
        }
        .ag-body-viewport {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
          position: relative !important;
        }
        .ag-center-cols-container {
          height: auto !important;
          min-height: auto !important;
          position: relative !important;
        }
        .ag-center-cols-viewport {
          overflow: visible !important;
          height: auto !important;
          position: relative !important;
        }
        .ag-body-horizontal-scroll,
        .ag-body-vertical-scroll,
        .ag-horizontal-scroll {
          display: none !important;
        }
        .ag-header {
          position: relative !important;
        }
        .ag-row {
          break-inside: avoid;
        }
        div > div.flex.items-center.justify-end.mb-4 {
          display: none !important;
        }
        .space-y-6 > * {
          page-break-inside: avoid;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table th,
        table td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
        }
        table th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
      }
    `,
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackButton />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              openSidebar(
                <AddProxyUserSidebar onClose={closeSidebar} />,
                { widthPx: 480, title: "Add Proxy User" }
              );
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded-md font-medium transition-colors no-print"
            title="Add Proxy User"
          >
            <Plus className="w-4 h-4" />
            Add Proxy User
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center text-red-600 hover:text-red-700 transition-colors no-print"
            title="Export to PDF"
          >
            <FileText size={20} />
          </button>
        </div>
      </div>
      <CombinedView printRef={printRef} />
    </>
  );
}