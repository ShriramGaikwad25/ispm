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
    status: "",
    snapshotAt: "",
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

  // State for application details
  const [applicationDetails, setApplicationDetails] = useState<{
    applicationName: string;
    owner: string;
    lastSync: string;
  } | null>(null);

  // Check if we should show the header (for access-review pages, but not app-owner or individual applications)
  const shouldShowHeader =
    pathname?.includes('/access-review/') &&
    !pathname?.includes('/applications/');

  // Check if we should show campaign-specific header (only when inside a specific campaign)
  const shouldShowCampaignHeader = pathname?.includes('/campaigns/manage-campaigns/');


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
        status: "",
        snapshotAt: "",
        dueDate: firstItem.certificationExpiration || "",
        daysLeft: daysLeft,
      });

      setUserDetails({
        username: firstItem.fullName || "IAM Admin",
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
        // Prefer campaign summary if available (for campaign manage pages)
        const selectedCampaignSummary = localStorage.getItem("selectedCampaignSummary");
        if (selectedCampaignSummary) {
          const summary = JSON.parse(selectedCampaignSummary);
          const daysLeft = calculateDaysLeft(summary.dueDate || "");

          setHeaderInfo({
            campaignName: summary.campaignName || "Campaign Name",
            status: summary.status || "",
            snapshotAt: summary.snapshotAt || "",
            dueDate: summary.dueDate || "",
            daysLeft: daysLeft,
          });
        }

        const sharedRowData = localStorage.getItem("sharedRowData");
        if (sharedRowData) {
          const data = JSON.parse(sharedRowData);
          if (Array.isArray(data) && data.length > 0) {
            const firstItem = data[0];
            const daysLeft = calculateDaysLeft(firstItem.certificationExpiration || "");

            // Only update header info if we don't have campaign summary data
            if (!selectedCampaignSummary) {
              setHeaderInfo((prev) => ({
                campaignName: firstItem.certificationName || prev.campaignName || "Campaign Name",
                status: prev.status || "",
                snapshotAt: prev.snapshotAt || "",
                dueDate: firstItem.certificationExpiration || prev.dueDate || "",
                daysLeft: prev.dueDate ? prev.daysLeft : daysLeft,
              }));
            }

            setUserDetails({
              username: firstItem.fullName || "IAM Admin",
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

  // Effect to handle application details
  useEffect(() => {
    const handleApplicationDataChange = (event: CustomEvent) => {
      console.log('Application data change event received:', event.detail);
      setApplicationDetails(event.detail);
    };

    // Load application details from localStorage on mount
    const loadApplicationDetails = () => {
      try {
        const stored = localStorage.getItem('applicationDetails');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('Loaded application details from localStorage:', parsed);
          setApplicationDetails(parsed);
        }
      } catch (error) {
        console.error('Error loading application details:', error);
      }
    };

    // Initial load
    loadApplicationDetails();

    // Listen for application data changes
    window.addEventListener('applicationDataChange', handleApplicationDataChange as EventListener);

    return () => {
      window.removeEventListener('applicationDataChange', handleApplicationDataChange as EventListener);
    };
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('HeaderContent - pathname:', pathname);
    console.log('HeaderContent - applicationDetails:', applicationDetails);
    console.log('HeaderContent - shouldShowHeader:', shouldShowHeader);
    console.log('HeaderContent - shouldShowCampaignHeader:', shouldShowCampaignHeader);
  }, [pathname, applicationDetails, shouldShowHeader, shouldShowCampaignHeader]);

  return (
    <div className="flex h-[60px] w-full items-center justify-between text-sm px-4" style={{ backgroundColor: '#27B973' }}>
      {/* Left Section */}
      <div className="flex items-center h-full">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 mr-8">

          <svg width="153" height="32" viewBox="0 0 153 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.6616 6.01866L6.00958 22.6705C6.90371 23.9896 8.03687 25.1227 9.34707 25.9903L25.9725 9.3649C25.1049 8.04584 23.9718 6.91268 22.6527 6.02741L22.6616 6.01866Z" fill="#58E5A1" />
            <path d="M16.0043 4.00021C9.37365 4.00021 4 9.37375 4 16.0044C4 16.6064 4.04429 17.1995 4.13281 17.775L17.7749 4.13303C17.1994 4.0445 16.5975 4.00021 16.0043 4.00021Z" fill="white" />
            <path d="M27.8672 14.2426L14.2429 27.867C14.8183 27.9555 15.4114 27.9998 16.0045 27.9998C22.6352 27.9998 28 22.635 28 16.0043C28 15.4023 27.9557 14.8181 27.8672 14.2426Z" fill="#58E5A1" />
            <path d="M41.7216 25V7.54545H44.8835V15.5653H45.0966L51.9062 7.54545H55.767L49.017 15.3778L55.8267 25H52.0256L46.8182 17.517L44.8835 19.8011V25H41.7216ZM62.6619 25.2557C61.3494 25.2557 60.2159 24.983 59.2614 24.4375C58.3125 23.8864 57.5824 23.108 57.071 22.1023C56.5597 21.0909 56.304 19.9006 56.304 18.5312C56.304 17.1847 56.5597 16.0028 57.071 14.9858C57.5881 13.9631 58.3097 13.1676 59.2358 12.5994C60.1619 12.0256 61.25 11.7386 62.5 11.7386C63.3068 11.7386 64.0682 11.8693 64.7841 12.1307C65.5057 12.3864 66.142 12.7841 66.6932 13.3239C67.25 13.8636 67.6875 14.5511 68.0057 15.3864C68.3239 16.2159 68.483 17.2045 68.483 18.3523V19.2983H57.7528V17.2188H65.5256C65.5199 16.6278 65.392 16.1023 65.142 15.642C64.892 15.1761 64.5426 14.8097 64.0938 14.5426C63.6506 14.2756 63.1335 14.142 62.5426 14.142C61.9119 14.142 61.358 14.2955 60.8807 14.6023C60.4034 14.9034 60.0313 15.3011 59.7642 15.7955C59.5028 16.2841 59.3693 16.821 59.3636 17.4062V19.2216C59.3636 19.983 59.5028 20.6364 59.7812 21.1818C60.0597 21.7216 60.4489 22.1364 60.9489 22.4261C61.4489 22.7102 62.0341 22.8523 62.7045 22.8523C63.1534 22.8523 63.5597 22.7898 63.9233 22.6648C64.2869 22.5341 64.6023 22.3438 64.8693 22.0938C65.1364 21.8438 65.3381 21.5341 65.4744 21.1648L68.3551 21.4886C68.1733 22.25 67.8267 22.9148 67.3153 23.483C66.8097 24.0455 66.1619 24.483 65.3722 24.7955C64.5824 25.1023 63.679 25.2557 62.6619 25.2557ZM72.6357 29.9091C72.2152 29.9091 71.826 29.875 71.468 29.8068C71.1158 29.7443 70.8345 29.6705 70.6243 29.5852L71.3402 27.1818C71.7891 27.3125 72.1896 27.375 72.5419 27.3693C72.8942 27.3636 73.2038 27.2528 73.4709 27.0369C73.7436 26.8267 73.9737 26.4744 74.1612 25.9801L74.4254 25.2727L69.6783 11.9091H72.951L75.968 21.7955H76.1044L79.13 11.9091H82.4112L77.1697 26.5852C76.9254 27.2784 76.6016 27.8722 76.1982 28.3665C75.7947 28.8665 75.3004 29.2472 74.7152 29.5085C74.1357 29.7756 73.4425 29.9091 72.6357 29.9091ZM84.6825 25V7.54545H95.8643V10.196H87.8445V14.9347H95.0973V17.5852H87.8445V25H84.6825ZM103.358 25.2557C102.08 25.2557 100.972 24.9744 100.034 24.4119C99.0966 23.8494 98.3693 23.0625 97.8523 22.0511C97.3409 21.0398 97.0852 19.858 97.0852 18.5057C97.0852 17.1534 97.3409 15.9687 97.8523 14.9517C98.3693 13.9347 99.0966 13.1449 100.034 12.5824C100.972 12.0199 102.08 11.7386 103.358 11.7386C104.636 11.7386 105.744 12.0199 106.682 12.5824C107.619 13.1449 108.344 13.9347 108.855 14.9517C109.372 15.9687 109.631 17.1534 109.631 18.5057C109.631 19.858 109.372 21.0398 108.855 22.0511C108.344 23.0625 107.619 23.8494 106.682 24.4119C105.744 24.9744 104.636 25.2557 103.358 25.2557ZM103.375 22.7841C104.068 22.7841 104.648 22.5937 105.114 22.2131C105.58 21.8267 105.926 21.3097 106.153 20.6619C106.386 20.0142 106.503 19.2926 106.503 18.4972C106.503 17.696 106.386 16.9716 106.153 16.3239C105.926 15.6705 105.58 15.1506 105.114 14.7642C104.648 14.3778 104.068 14.1847 103.375 14.1847C102.665 14.1847 102.074 14.3778 101.602 14.7642C101.136 15.1506 100.787 15.6705 100.554 16.3239C100.327 16.9716 100.213 17.696 100.213 18.4972C100.213 19.2926 100.327 20.0142 100.554 20.6619C100.787 21.3097 101.136 21.8267 101.602 22.2131C102.074 22.5937 102.665 22.7841 103.375 22.7841ZM112.249 25V11.9091H115.241V14.0909H115.377C115.616 13.3352 116.025 12.7528 116.604 12.3438C117.19 11.929 117.857 11.7216 118.607 11.7216C118.778 11.7216 118.968 11.7301 119.178 11.7472C119.394 11.7585 119.573 11.7784 119.715 11.8068V14.6449C119.585 14.5994 119.377 14.5597 119.093 14.5256C118.815 14.4858 118.545 14.4659 118.283 14.4659C117.721 14.4659 117.215 14.5881 116.766 14.8324C116.323 15.071 115.974 15.4034 115.718 15.8295C115.462 16.2557 115.335 16.7472 115.335 17.304V25H112.249ZM126.919 30.1818C125.811 30.1818 124.859 30.0313 124.064 29.7301C123.268 29.4347 122.629 29.0369 122.146 28.5369C121.663 28.0369 121.328 27.483 121.141 26.875L123.919 26.2017C124.044 26.4574 124.226 26.7102 124.464 26.9602C124.703 27.2159 125.024 27.4261 125.428 27.5909C125.837 27.7614 126.351 27.8466 126.97 27.8466C127.845 27.8466 128.57 27.6335 129.143 27.2074C129.717 26.7869 130.004 26.0938 130.004 25.1278V22.6477H129.851C129.692 22.9659 129.459 23.2926 129.152 23.6278C128.851 23.9631 128.45 24.2443 127.95 24.4716C127.456 24.6989 126.834 24.8125 126.084 24.8125C125.078 24.8125 124.166 24.5767 123.348 24.1051C122.536 23.6278 121.888 22.9176 121.405 21.9744C120.928 21.0256 120.689 19.8381 120.689 18.4119C120.689 16.9744 120.928 15.7614 121.405 14.7727C121.888 13.7784 122.538 13.0256 123.357 12.5142C124.175 11.9972 125.087 11.7386 126.092 11.7386C126.859 11.7386 127.49 11.8693 127.984 12.1307C128.484 12.3864 128.882 12.696 129.178 13.0597C129.473 13.4176 129.697 13.7557 129.851 14.0739H130.021V11.9091H133.064V25.2131C133.064 26.3324 132.797 27.2585 132.263 27.9915C131.729 28.7244 130.999 29.2727 130.072 29.6364C129.146 30 128.095 30.1818 126.919 30.1818ZM126.945 22.392C127.598 22.392 128.155 22.233 128.615 21.9148C129.075 21.5966 129.425 21.1392 129.663 20.5426C129.902 19.946 130.021 19.2301 130.021 18.3949C130.021 17.571 129.902 16.8494 129.663 16.2301C129.43 15.6108 129.084 15.1307 128.624 14.7898C128.169 14.4432 127.609 14.2699 126.945 14.2699C126.257 14.2699 125.683 14.4489 125.223 14.8068C124.763 15.1648 124.416 15.6562 124.183 16.2812C123.95 16.9006 123.834 17.6051 123.834 18.3949C123.834 19.196 123.95 19.8977 124.183 20.5C124.422 21.0966 124.771 21.5625 125.232 21.8977C125.697 22.2273 126.268 22.392 126.945 22.392ZM142.021 25.2557C140.709 25.2557 139.575 24.983 138.621 24.4375C137.672 23.8864 136.942 23.108 136.43 22.1023C135.919 21.0909 135.663 19.9006 135.663 18.5312C135.663 17.1847 135.919 16.0028 136.43 14.9858C136.947 13.9631 137.669 13.1676 138.595 12.5994C139.521 12.0256 140.609 11.7386 141.859 11.7386C142.666 11.7386 143.428 11.8693 144.143 12.1307C144.865 12.3864 145.501 12.7841 146.053 13.3239C146.609 13.8636 147.047 14.5511 147.365 15.3864C147.683 16.2159 147.842 17.2045 147.842 18.3523V19.2983H137.112V17.2188H144.885C144.879 16.6278 144.751 16.1023 144.501 15.642C144.251 15.1761 143.902 14.8097 143.453 14.5426C143.01 14.2756 142.493 14.142 141.902 14.142C141.271 14.142 140.717 14.2955 140.24 14.6023C139.763 14.9034 139.391 15.3011 139.124 15.7955C138.862 16.2841 138.729 16.821 138.723 17.4062V19.2216C138.723 19.983 138.862 20.6364 139.141 21.1818C139.419 21.7216 139.808 22.1364 140.308 22.4261C140.808 22.7102 141.393 22.8523 142.064 22.8523C142.513 22.8523 142.919 22.7898 143.283 22.6648C143.646 22.5341 143.962 22.3438 144.229 22.0938C144.496 21.8438 144.697 21.5341 144.834 21.1648L147.714 21.4886C147.533 22.25 147.186 22.9148 146.675 23.483C146.169 24.0455 145.521 24.483 144.732 24.7955C143.942 25.1023 143.038 25.2557 142.021 25.2557Z" fill="white" />
          </svg>

        </div>

        {applicationDetails && pathname?.includes('/applications/') ? (
          <div className="flex h-full">
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                Application: {applicationDetails.applicationName}
              </p>
            </div>
            <div className="flex items-center px-2">
              <span className="text-blue-600 text-lg">•</span>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                Owner: {applicationDetails.owner}
              </p>
            </div>
            <div className="flex items-center px-2">
              <span className="text-blue-600 text-lg">•</span>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                Last Sync: {formatDateMMDDYY(applicationDetails.lastSync)}
              </p>
            </div>
          </div>
        ) : shouldShowHeader ? (
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
        ) : shouldShowCampaignHeader ? (
          <div className="flex h-full">
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                {headerInfo.campaignName || "Campaign"}
              </p>
            </div>
            <div className="flex items-center px-2">
              <span className="text-white text-lg">•</span>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                {headerInfo.status ? `Status: ${headerInfo.status}` : "Status: N/A"}
              </p>
            </div>
            <div className="flex items-center px-2">
              <span className="text-white text-lg">•</span>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                {headerInfo.snapshotAt ? `Data Snapshot: ${formatDateMMDDYY(headerInfo.snapshotAt)}` : "Data Snapshot: N/A"}
              </p>
            </div>
            <div className="flex items-center px-2">
              <span className="text-white text-lg">•</span>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-white">
                {headerInfo.dueDate ? `Due on ${formatDateMMDDYY(headerInfo.dueDate)}` : "Due on N/A"}
                <span className="font-bold ml-1 text-white">
                  ({headerInfo.daysLeft || 0} days left)
                </span>
              </p>
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
            {/* {userDetails?.username || "IAM Admin"} */}
            IAM Admin
          </span>
          <Dropdown
            Icon={() => (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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