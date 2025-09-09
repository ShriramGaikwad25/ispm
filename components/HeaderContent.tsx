"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Dropdown from "./Dropdown";
import { formatDateMMDDYY } from "@/utils/utils";
import { UserRowData } from "@/types/certification";
import HorizontalTabs from "@/components/HorizontalTabs";
import { ChevronDown, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartData } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "@/lib/ag-grid-setup";
import CertificationProgress from "./CertificationProgress";
import UserProgress from "./UserProgress";

// Register Chart.js components and plugin
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

// Dynamically import AgGridReact with SSR disabled
const AgGridReact = dynamic(() => import("ag-grid-react").then((mod) => mod.AgGridReact), {
  ssr: false,
});

// Dynamically import Bar chart with SSR disabled
const Bar = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), {
  ssr: false,
});

const PopupButton = ({
  username,
  userId,
  userStatus,
  manager,
  department,
  jobTitle,
  userType,
  onClose,
}: {
  username: string;
  userId: string;
  userStatus: string;
  manager: string;
  department: string;
  jobTitle: string;
  userType: "Internal" | "External";
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: username,
    email: "",
    comments: "",
  });
  const [tabIndex, setTabIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure chart and grid render only on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Sample user data adapted to PopupButton props
  const userData = {
    firstName: username.split(" ")[0] || "Unknown",
    lastName: username.split(" ")[1] || "",
    email: `${username.replace(" ", ".").toLowerCase()}@example.com`,
    displayName: username,
    alias: userId.toLowerCase(),
    phone: "+1 (555) 123-4567",
    title: jobTitle,
    department: department,
    startDate: "2023-01-15",
    userType: userType,
    managerEmail: manager.includes("@") ? manager : `${manager.replace(" ", ".").toLowerCase()}@example.com`,
    tags: ["User", userType],
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
    },
  ];

  const ProfileTab = () => {
    const initials = `${userData.firstName[0]}${userData.lastName[0] || ""}`.toUpperCase();
    const colors = ["#7f3ff0", "#0099cc", "#777", "#d7263d", "#ffae00"];
    const bgColor = colors[userData.email.length % colors.length];

    return (
      <div className="flex flex-col gap-4 p-4 bg-white rounded-lg">
        <div className="flex-shrink-0">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Name</label>
            <p className="text-sm text-gray-900">{userData.displayName}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email</label>
            <p className="text-sm text-blue-600">{userData.email}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Title</label>
            <p className="text-sm text-gray-900">{userData.title}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Department</label>
            <p className="text-sm text-gray-900">{userData.department}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Manager Email</label>
            <p className="text-sm text-blue-600">{userData.managerEmail}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">User Type</label>
            <p className="text-sm text-gray-900">{userData.userType}</p>
          </div>
        </div>
      </div>
    );
  };

  const AccessTab = () => {
    const accountColumnDefs = useMemo(
      () => [
        {
          headerName: "Account ID",
          field: "accountId",
          flex: 1,
          cellRenderer: (params: any) => (
            <span>
              {params.value} ({params.data.accountStatus})
            </span>
          ),
        },
        { headerName: "App Name", field: "appName", flex: 1 },
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
          flex: 1,
          cellRenderer: (params: any) => (
            <span className={params.value === "None" ? "text-green-600" : "text-red-600"}>
              {params.value}
            </span>
          ),
        },
      ] as any[],
      []
    );

    return (
      <div className="p-4 bg-white rounded-lg">
        <div className="ag-theme-alpine" style={{ height: 150, width: "100%" }}>
          <AgGridReact
            rowData={accountData}
            columnDefs={accountColumnDefs}
            defaultColDef={{ sortable: true, filter: true }}
          />
        </div>
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
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-gray-500 hover:text-gray-700 text-lg font-semibold"
        >
          X
        </button>
        <HorizontalTabs
          tabs={tabsData}
          activeIndex={tabIndex}
          onChange={setTabIndex}
        />
      </div>
    </div>
  );
};

const HeaderContent = () => {
  const pathname = usePathname();
  const router = useRouter();

  // State for header info and user details
  const [headerInfo, setHeaderInfo] = useState({
    campaignName: "",
    dueDate: "",
    daysLeft: 0,
  });

  const [userDetails, setUserDetails] = useState<{
    username: string;
    userId: string;
    userStatus: string;
    manager: string;
    department: string;
    jobTitle: string;
    userType: "Internal" | "External";
  } | null>(null);

  // State for certification progress
  const [progressData, setProgressData] = useState({
    totalItems: 0,
    approvedCount: 0,
    pendingCount: 0,
    revokedCount: 0,
    delegatedCount: 0,
    remediatedCount: 0,
  });

  // State for user-based progress (matching access review page)
  const [userProgressData, setUserProgressData] = useState({
    totalItems: 0,
    approvedCount: 0,
    pendingCount: 0,
    percentage: 0,
  });

  // State for PopupButton
  const [showPopupButton, setShowPopupButton] = useState(false);

  // Check if we should show the header (for access-review and app-owner pages)
  const shouldShowHeader = pathname?.includes('/access-review/') || pathname?.includes('/app-owner');
  

  // Calculate days left
  const calculateDaysLeft = (expirationDateStr: string): number => {
    if (!expirationDateStr) return 0;
    const expiration = new Date(expirationDateStr);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
  };

  // Handler for Profile click in dropdown
  const handleProfileClick = () => {
    if (userDetails) {
      router.push(`/profile`);
    }
  };

  // Update header data function
  const updateHeaderData = (data: UserRowData[]) => {
    if (data.length > 0) {
      const firstItem = data[0];
      const daysLeft = calculateDaysLeft(firstItem.certificationExpiration || "");
      
      setHeaderInfo({
        campaignName: firstItem.certificationName || "Campaign Name",
        dueDate: firstItem.certificationExpiration || "",
        daysLeft: daysLeft,
      });

      setUserDetails({
        username: firstItem.fullName || "Unknown User",
        userId: firstItem.id || "N/A",
        userStatus: firstItem.status || "Active",
        manager: firstItem.manager || "N/A",
        department: firstItem.department || "N/A",
        jobTitle: firstItem.jobtitle || "N/A",
        userType: firstItem.userType || "Internal",
      });
    }
  };

  // Update progress data function
  const updateProgressData = (data: any) => {
    setProgressData(data);
  };

  // Calculate user-based progress (matching access review page)
  const calculateUserProgress = (userData: any) => {
    const total = userData.numOfEntitlements || 0;
    const approved = userData.numOfEntitlementsCertified || 0;
    const pending = total - approved;
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    return {
      totalItems: total,
      approvedCount: approved,
      pendingCount: pending,
      percentage: percentage,
    };
  };

  // Effect to populate header info from localStorage
  useEffect(() => {
    const updateHeaderData = () => {
      try {
        const sharedRowData = localStorage.getItem("sharedRowData");
        if (sharedRowData) {
          const data = JSON.parse(sharedRowData);
          if (Array.isArray(data) && data.length > 0) {
            const firstItem = data[0];
            const daysLeft = calculateDaysLeft(firstItem.certificationExpiration || "");
            
            setHeaderInfo({
              campaignName: firstItem.certificationName || "Campaign Name",
              dueDate: firstItem.certificationExpiration || "",
              daysLeft: daysLeft,
            });

            setUserDetails({
              username: firstItem.fullName || "Unknown User",
              userId: firstItem.id || "N/A",
              userStatus: firstItem.status || "Active",
              manager: firstItem.manager || "N/A",
              department: firstItem.department || "N/A",
              jobTitle: firstItem.jobtitle || "N/A",
              userType: firstItem.userType || "Internal",
            });

            // Calculate user-based progress
            const userProgress = calculateUserProgress(firstItem);
            setUserProgressData(userProgress);
          }
        }
      } catch (error) {
        console.error("Error parsing localStorage data:", error);
      }
    };

    // Initial call
    updateHeaderData();

    // Listen for storage changes
    const handleStorageChange = () => {
      updateHeaderData();
    };

    // Listen for custom localStorage change event
    const handleLocalStorageChange = () => {
      updateHeaderData();
    };

  // Listen for progress data changes
  const handleProgressDataChange = (event: CustomEvent) => {
    updateProgressData(event.detail);
    
    // Check if it's user-based progress data (from getUserProgress)
    if (event.detail && event.detail.percentage !== undefined) {
      // This is user-based progress data
      const userProgress = {
        totalItems: event.detail.total || 0,
        approvedCount: event.detail.approved || 0,
        pendingCount: event.detail.pending || 0,
        percentage: event.detail.percentage || 0
      };
      setUserProgressData(userProgress);
    } else if (event.detail && event.detail.totalItems !== undefined) {
      // This is entitlement-based progress data (fallback)
      const userProgress = {
        totalItems: event.detail.totalItems,
        approvedCount: event.detail.approvedCount,
        pendingCount: event.detail.pendingCount,
        percentage: event.detail.totalItems > 0 ? 
          Math.round(((event.detail.approvedCount + event.detail.revokedCount + event.detail.delegatedCount + event.detail.remediatedCount) / event.detail.totalItems) * 100) : 0
      };
      setUserProgressData(userProgress);
    }
  };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleLocalStorageChange);
    window.addEventListener('progressDataChange', handleProgressDataChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleLocalStorageChange);
      window.removeEventListener('progressDataChange', handleProgressDataChange as EventListener);
    };
  }, []);

  return (
    <div className="flex h-[60px] w-full items-center justify-between text-sm px-4" style={{ backgroundColor: '#27B973' }}>
      {/* Left Section */}
      <div className="flex items-center h-full">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 mr-8">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="28" 
            height="23" 
            viewBox="0 0 28 23" 
            fill="none"
          >
            <path d="M14.5404 22.6392C20.7986 21.0898 24.5947 14.8443 23.0193 8.68939C21.4438 2.5345 15.0934 -1.199 8.8352 0.350432C2.577 1.89986 -1.21912 8.14548 0.356317 14.3004C1.93175 20.4552 8.28216 24.1887 14.5404 22.6392Z" fill="#F5CB39"/>
            <path d="M23.322 0.00923857V23H28V0.00923857H23.322Z" fill="#FCA311"/>
          </svg>
          <span className="text-white font-semibold text-lg">KeyForge</span>
        </div>
        
        {shouldShowHeader ? (
          <div className="flex h-full">
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                {headerInfo.campaignName || "Quarterly Access Review - Megan Jackson"}
              </p>
            </div>
            <div className="flex items-center px-2">
              <span className="text-white text-lg">•</span>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                Generated On N/A
              </p>
            </div>
            <div className="flex items-center px-2">
              <span className="text-white text-lg">•</span>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                Due on N/A
                <span className="font-bold ml-1 text-white">
                  (0 days left)
                </span>
              </p>
            </div>
            {/* User Progress */}
            <div className="flex items-center px-4">
              <UserProgress progressData={userProgressData} />
            </div>
          </div>
        ) : (
          <div className="flex items-center px-4">
            {/* <p className="text-sm font-medium text-gray-600">
              Welcome to ISPM
            </p> */}
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center h-full justify-end gap-4 px-4">
        <div className="flex items-center gap-3">
          <Image
            src="https://avatar.iran.liara.run/public/2"
            alt="User Avatar"
            width={28}
            height={28}
            className="object-cover rounded-full"
          />
          <span className="text-white font-medium text-sm">
            {userDetails?.username || "Unknown User"}
          </span>
          <Dropdown
            Icon={() => (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            className="!p-0 !bg-transparent !border-0"
            title="User profile"
          >
          <button
            onClick={handleProfileClick}
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
          >
            Profile
          </button>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Settings
          </a>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Logout
          </a>
          </Dropdown>
        </div>
      </div>

      {/* PopupButton */}
      {showPopupButton && userDetails && (
        <PopupButton
          username={userDetails.username}
          userId={userDetails.userId}
          userStatus={userDetails.userStatus}
          manager={userDetails.manager}
          department={userDetails.department}
          jobTitle={userDetails.jobTitle}
          userType={userDetails.userType}
          onClose={() => setShowPopupButton(false)}
        />
      )}
    </div>
  );
};

export default HeaderContent;