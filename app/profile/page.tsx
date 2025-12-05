"use client";
import HorizontalTabs from "@/components/HorizontalTabs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "@/lib/ag-grid-setup";

// Charts
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
import UserDisplayName from "@/components/UserDisplayName";

// Register Chart.js components and plugin
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

// Dynamically import AgGridReact and Bar with SSR disabled
const AgGridReact = dynamic(() => import("ag-grid-react").then((mod) => mod.AgGridReact), { ssr: false });
const Bar = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), { ssr: false });

type UserDetails = {
  username: string;
  userId: string;
  userStatus: string;
  manager: string;
  department: string;
  jobTitle: string;
  userType: "Internal" | "External" | string;
  email?: string;
};

export default function ProfilePage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    try {
      const shared = localStorage.getItem("sharedRowData");
      if (shared) {
        const data = JSON.parse(shared);
        if (Array.isArray(data) && data[0]) {
          const first = data[0];
          setUser({
            username: first.fullName || "Unknown User",
            userId: first.id || "N/A",
            userStatus: first.status || "Active",
            manager: first.manager || "N/A",
            department: first.department || "N/A",
            jobTitle: first.jobtitle || "N/A",
            userType: first.userType || "Internal",
            email: first.email || undefined,
          });
        }
      }
    } catch (e) {
      // ignore parse errors; fall back to null user
    }
  }, []);

  const ProfileTab = () => {
    const displayName = user?.username || "Unknown User";
    const [firstName, ...rest] = displayName.split(" ");
    const lastName = rest.join(" ");
    const initials = `${firstName?.[0] || "U"}${lastName?.[0] || ""}`.toUpperCase();
    const colors = ["#7f3ff0", "#0099cc", "#777", "#d7263d", "#ffae00"];
    const bgSource = user?.email || user?.userId || displayName;
    const bgColor = colors[(bgSource || "").length % colors.length];

    return (
      <div className="flex flex-col md:flex-row gap-6 p-6 bg-white rounded-lg shadow-md">
        <div className="flex-shrink-0">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">First Name</label>
            <p className="text-base text-gray-900">{firstName || "Unknown"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Last Name</label>
            <p className="text-base text-gray-900">{lastName || ""}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-base text-blue-600">{user?.email || "no-email@example.com"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Display Name</label>
            <p className="text-base text-gray-900">
              <UserDisplayName
                displayName={displayName}
                userType={user?.userType}
              />
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Alias</label>
            <p className="text-base text-gray-900">{user?.userId || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phone Number</label>
            <p className="text-base text-gray-900">N/A</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Title</label>
            <p className="text-base text-gray-900">{user?.jobTitle || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Department</label>
            <p className="text-base text-gray-900">{user?.department || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Start Date</label>
            <p className="text-base text-gray-900">N/A</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">User Type</label>
            <p className="text-base text-gray-900">{user?.userType || "Internal"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Manager Email</label>
            <p className="text-base text-blue-600">{user?.manager || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Tags</label>
            <div className="flex flex-wrap gap-2">
              <span className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">User</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AccessTab = () => {
    // Sample access data and accounts (same structure as user detail page)
    const accessData = { accounts: 20, apps: 10, entitlements: 60, violations: 5 };
    const rowData = [
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

    const accountColumnDefs = useMemo(
      () => [
        {
          headerName: "Account ID",
          field: "accountId",
          flex: 1.5,
          cellRenderer: (params: any) => (
            <span>
              {params.value} ({params.data.accountStatus}, {params.data.risk})
            </span>
          ),
        },
        { headerName: "App Name", field: "appName", flex: 1.5 },
        { headerName: "Discovery Date", field: "discoveryDate", flex: 1, valueFormatter: (p:any)=> require("@/utils/utils").formatDateMMDDYY(p.value) },
        { headerName: "Last Sync Date", field: "lastSyncDate", flex: 1, valueFormatter: (p:any)=> require("@/utils/utils").formatDateMMDDYY(p.value) },
        { headerName: "Last Access Review", field: "lastAccessReview", flex: 1 },
        { headerName: "Insights", field: "insights", flex: 1.5 },
        {
          headerName: "MFA",
          field: "mfa",
          flex: 1,
          cellRenderer: (params: any) => (
            <span className={params.value === "Enabled" ? "text-green-600" : "text-red-600"}>
              {params.value}
            </span>
          ),
        },
        {
          headerName: "Compliance Violation",
          field: "complianceViolation",
          flex: 1.5,
          cellRenderer: (params: any) => (
            <span className={params.value === "None" ? "text-green-600" : "text-red-600"}>
              {params.value}
            </span>
          ),
        },
      ],
      []
    );

    const entitlementColumnDefs = useMemo(
      () => [
        { headerName: "Entitlement Name", field: "entName", flex: 1.5 },
        { headerName: "Risk", field: "risk", flex: 1 },
        { headerName: "Description", field: "description", flex: 2 },
        { headerName: "Assigned On", field: "assignedOn", flex: 1 },
        { headerName: "Last Reviewed", field: "lastReviewed", flex: 1 },
        {
          headerName: "Tags",
          field: "tags",
          flex: 1.5,
          cellRenderer: (params: any) => (
            <div className="flex flex-wrap gap-1">
              {params.value?.map((tag: string, index: number) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          ),
        },
      ],
      []
    );

    const chartData: ChartData<"bar"> = {
      labels: ["Accounts", "Apps", "Entitlements", "Violations"],
      datasets: [
        {
          label: "Access Metrics",
          data: [accessData.accounts, accessData.apps, accessData.entitlements, accessData.violations],
          backgroundColor: ["#4CAF50", "#2196F3", "#FF9800", "#F44336"],
          borderColor: ["#388E3C", "#1976D2", "#F57C00", "#D32F2F"],
          borderWidth: 1,
        },
      ],
    };

    const chartOptions = {
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Count" } },
        x: { title: { display: true, text: "Categories" } },
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: "#fff",
          font: { weight: "bold" as const, size: 14 },
          formatter: (value: number) => value,
          anchor: "center" as const,
          align: "center" as const,
        },
        title: { display: true, text: "Access Metrics", font: { size: 18 } },
      },
      maintainAspectRatio: false,
    } as const;

    return (
      <div className="p-6 bg-gray-50 ">
        {isMounted && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 w-120">
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}
        {isMounted && (
          <div className="ag-theme-alpine" style={{ height: 400, width: "100%" }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={accountColumnDefs}
              masterDetail={true}
              detailCellRendererParams={{
                detailGridOptions: {
                  columnDefs: entitlementColumnDefs,
                  defaultColDef: { flex: 1 },
                },
                getDetailRowData: (params: any) => {
                  params.successCallback(params.data.entitlements);
                },
              }}
              detailRowHeight={200}
              defaultColDef={{ sortable: true, filter: true }}
            />
          </div>
        )}
      </div>
    );
  };

  const tabsData = [
    { label: "Profile", icon: ChevronDown, iconOff: ChevronRight, component: ProfileTab },
    { label: "Access", icon: ChevronDown, iconOff: ChevronRight, component: AccessTab },
  ];

  return (
    <>
      <div className="mb-4">
        <BackButton />
      </div>
      <HorizontalTabs tabs={tabsData} activeIndex={tabIndex} onChange={setTabIndex} />
    </>
  );
}


