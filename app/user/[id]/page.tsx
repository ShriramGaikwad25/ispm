"use client";
import HorizontalTabs from "@/components/HorizontalTabs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";

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

// Sample user data
const userData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  displayName: "John Doe",
  alias: "jdoe",
  phone: "+1 (555) 123-4567",
  title: "Software Engineer",
  department: "Engineering",
  startDate: "2023-01-15",
  userType: "Full-Time",
  managerEmail: "jane.smith@example.com",
  tags: ["Developer", "Team Lead", "Agile"],
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

  // Ensure chart and grid render only on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const ProfileTab = () => {
    const initials = `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    const colors = ["#7f3ff0", "#0099cc", "#777", "#d7263d", "#ffae00"];
    // Use a deterministic color based on user data to avoid server-client mismatch
    const bgColor = colors[userData.email.length % colors.length];

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
            <p className="text-base text-gray-900">{userData.phone}</p>
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
            <p className="text-base text-gray-900">{userData.startDate}</p>
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
              {userData.tags.map((tag, index) => (
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

  const AccessTab = () => {
    const [rowData] = useState(accountData);

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
        { headerName: "Discovery Date", field: "discoveryDate", flex: 1 },
        { headerName: "Last Sync Date", field: "lastSyncDate", flex: 1 },
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
                <span
                  key={index}
                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          ),
        },
      ],
      []
    );

    // Bar chart data
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
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Count",
          },
        },
        x: {
          title: {
            display: true,
            text: "Categories",
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hide legend since we have only one dataset
        },
        datalabels: {
          color: "#fff",
          font: {
            weight: "bold" as const,
            size: 14,
          },
          formatter: (value: number) => value, // Display the value on each bar
          anchor: "center" as const,
          align: "center" as const,
        },
        title: {
          display: true,
          text: "Access Metrics",
          font: {
            size: 18,
          },
        },
      },
      maintainAspectRatio: false,
    };

    return (
      <div className="p-6 bg-gray-50 ">
        {/* Bar Chart */}
        {isMounted && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 w-120">
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}
        {/* Accounts Table */}
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