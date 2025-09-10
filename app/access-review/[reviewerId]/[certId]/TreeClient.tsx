"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import "@/lib/ag-grid-setup"; // Ensure Enterprise modules and license are loaded
import Image from "next/image";
import {
  ColDef,
  GridApi,
  ICellRendererParams,
  GetRowIdParams,
} from "ag-grid-community";
import SelectAll from "@/components/agTable/SelectAll";
import CustomPagination from "@/components/agTable/CustomPagination";
import ColumnSettings from "@/components/agTable/ColumnSettings";
import Filters from "@/components/agTable/Filters";
import Exports from "@/components/agTable/Exports";
import ActionButtons from "@/components/agTable/ActionButtons";
import { useCertificationDetails, fetchAccessDetails } from "@/hooks/useApi";
import { getLineItemDetails } from "@/lib/api";
import { EntitlementInfo } from "@/types/lineItem";
import { UserRowData } from "@/types/certification";
import {
  CheckCircleIcon,
  Flag,
  User,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Import from "@/components/agTable/Import";

interface UserPopupProps {
  username: string;
  userId: string;
  userStatus: string;
  manager: string;
  department: string;
  jobTitle: string;
  userType: "Internal" | "External";
  onClose: () => void;
}

export const UserPopup: React.FC<UserPopupProps> = ({
  username,
  userId,
  userStatus,
  manager,
  department,
  jobTitle,
  userType,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-[#d9d7d3] p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">User Details: {username}</h2>
        <div className="mb-4 space-y-2">
          <p>
            <strong>User ID:</strong> {userId}
          </p>
          <p>
            <strong>Status:</strong> {userStatus}
          </p>
          <p>
            <strong>Manager:</strong> {manager}
          </p>
          <p>
            <strong>Department:</strong> {department}
          </p>
          <p>
            <strong>Job Title:</strong> {jobTitle}
          </p>
          <p>
            <strong>User Type:</strong> {userType}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const DetailCellRenderer = (props: ICellRendererParams) => {
  const { data } = props;
  const description = data.entitlementDescription;
  const hasDescription = description && description.trim().length > 0;

  return (
    <div className="flex flex-col p-4 bg-gray-50 border-t border-gray-200 ml-10">
      <div className="flex flex-row items-center gap-2 mb-2">
        <span className="text-gray-600 text-sm font-medium">
          Entitlement Description:
        </span>
      </div>
      <div className="ml-4">
        <span
          className={hasDescription ? "text-gray-800" : "text-gray-500 italic"}
        >
          {hasDescription ? description : "No description available"}
        </span>
      </div>
    </div>
  );
};

interface TreeClientProps {
  reviewerId: string;
  certId: string;
  onRowExpand?: () => void;
  onProgressDataChange?: (progressData: any) => void;
}

const TreeClient: React.FC<TreeClientProps> = ({
  reviewerId,
  certId,
  onRowExpand,
  onProgressDataChange,
}) => {
  const entitlementsGridApiRef = useRef<GridApi | null>(null);
  const [users, setUsers] = useState<UserRowData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRowData | null>(null);
  const [entitlementsData, setEntitlementsData] = useState<any[]>([]);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [progressData, setProgressData] = useState({
    totalItems: 0,
    approvedCount: 0,
    pendingCount: 0,
    revokedCount: 0,
    delegatedCount: 0,
    remediatedCount: 0,
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const pageSizeSelector = [10, 20, 50, 100];
  const defaultPageSize = pageSizeSelector[0];
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Entitlements pagination
  const [entitlementsPageNumber, setEntitlementsPageNumber] = useState(1);
  const [entitlementsTotalItems, setEntitlementsTotalItems] = useState(0);
  const [entitlementsTotalPages, setEntitlementsTotalPages] = useState(1);

  const { data: certificationDetailsData, error } = useCertificationDetails(
    reviewerId,
    certId,
    defaultPageSize,
    pageNumber
  );

  useEffect(() => {
    if (!certificationDetailsData) {
      console.log("No certificationDetailsData available");
      return;
    }
    console.log("certificationDetailsData:", certificationDetailsData);

    const mapped = certificationDetailsData.items.map((task: any) => {
      const userInfo = task.userInfo || {};
      const access = task.access || {};
      const delta = task.deltaChanges || {};
      const fullName = userInfo.firstname + userInfo.lastname;

      return {
        id: task.taskId,
        ...userInfo,
        status: userInfo.status || "Unknown",
        manager: userInfo.manager || "Unknown",
        userType: userInfo.userType || "Internal",
        certificationId: certId,
        taskId: task.taskId,
        jobtitle: userInfo.jobtitle || "Unknown",
        department: userInfo.department || "Unknown",
        numOfApplications: access.numOfApplications || 0,
        numOfEntitlements: access.numOfEntitlements || 0,
        numOfApplicationsCertified: access.numOfApplicationsCertified || 0,
        numOfRolesCertified: access.numOfRolesCertified || 0,
        numOfEntitlementsCertified: access.numOfEntitlementsCertified || 0,
        profileChange: delta.profileChange || [],
        SoDConflicts: delta.SoDConflicts || [],
        addedAccounts: delta.addedAccounts || [],
        addedEntitlements: delta.addedEntitlements || [],
        fullName: fullName || "",
      };
    });

    console.log("Mapped users:", mapped);
    setUsers(mapped);
    setTotalItems(certificationDetailsData.total_items || 0);
    setTotalPages(certificationDetailsData.total_pages || 1);
  }, [certificationDetailsData, certId]);

  // Auto-select first user when users are loaded or page changes
  useEffect(() => {
    if (users.length > 0) {
      // If no user is selected or the selected user is not in the current page, select the first user
      const isSelectedUserInCurrentPage =
        selectedUser && users.some((user) => user.id === selectedUser.id);
      if (!selectedUser || !isSelectedUserInCurrentPage) {
        const firstUser = users[0];
        setSelectedUser(firstUser);
        setEntitlementsPageNumber(1);

        // Don't send progress data to header from TreeClient

        loadUserEntitlements(firstUser, 1);
        if (typeof onRowExpand === "function") {
          onRowExpand();
        }
      }
    }
  }, [users, selectedUser, onRowExpand]);

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

  const handleEntitlementsPageChange = (newPage: number) => {
    if (newPage !== entitlementsPageNumber) {
      setEntitlementsPageNumber(newPage);
      if (selectedUser) {
        loadUserEntitlements(selectedUser, newPage);
      }
    }
  };

  const loadUserEntitlements = async (user: UserRowData, page: number = 1) => {
    if (!user.taskId) return;

    setLoadingEntitlements(true);
    try {
      const accounts = await fetchAccessDetails(
        reviewerId,
        certId,
        user.taskId,
        undefined,
        defaultPageSize,
        page
      );

      const entitlementPromises = accounts.map(async (account: any) => {
        const lineItemId = account.lineItemId;
        if (!lineItemId) return [];
        const entitlements = await getLineItemDetails(
          reviewerId,
          certId,
          user.taskId,
          lineItemId
        );
        return entitlements.map((item: any, index: number) => ({
          ...account,
          entitlementName: item.entitlementInfo?.entitlementName ?? "",
          entitlementDescription:
            item.entitlementInfo?.entitlementDescription ?? "",
          entitlementType: item.entitlementInfo?.entitlementType ?? "",
          recommendation: item.aiassist?.Recommendation ?? "",
          accessedWithinAMonth: item.aiassist?.accessedWithinAMonth ?? "",
          itemRisk: item.entityEntitlements?.itemRisk ?? "",
          percAccessInSameDept: item.aiassist?.percAccessInSameDept ?? "",
          percAccessWithSameJobtitle:
            item.aiassist?.percAccessWithSameJobtitle ?? "",
          percAccessWithSameManager:
            item.aiassist?.percAccessWithSameManager ?? "",
          actionInLastReview: item.aiassist?.Recommendation ?? "",
          isNew:
            user.addedEntitlements?.includes(
              item.entitlementInfo?.entitlementName
            ) ?? false,
          appTag: item.appTag || "SOX",
          appRisk: item.appRisk || "Low",
          appType: item.appType || "",
          complianceViolation: item.complianceViolation || "",
          deltaChange: item.deltaChange || "",
          // Use the original lineItemId from account data - don't override it
          lineItemId: lineItemId,
        }));
      });

      const allRows = (await Promise.all(entitlementPromises)).flat();
      setEntitlementsData(allRows);
      setEntitlementsTotalItems(allRows.length);
      setEntitlementsTotalPages(Math.ceil(allRows.length / defaultPageSize));

      // Calculate and update progress data
      const progress = calculateProgressData(allRows);
      setProgressData(progress);

      // Don't send progress data to header from TreeClient
      // The header should get progress data from the page level
      onProgressDataChange?.(progress);
    } catch (error) {
      console.error("Error loading entitlements:", error);
      setEntitlementsData([]);
    } finally {
      setLoadingEntitlements(false);
    }
  };

  const handleUserSelect = (user: UserRowData) => {
    setSelectedUser(user);
    setEntitlementsPageNumber(1);

    // Don't send progress data to header from TreeClient

    loadUserEntitlements(user, 1);
    if (typeof onRowExpand === "function") {
      onRowExpand();
    }
  };

  const getUserInitials = (fullName: string) => {
    if (!fullName) return "??";
    const names = fullName.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // Calculate progress for a user based on their entitlements
  const getUserProgress = (user: UserRowData) => {
    const total = user.numOfEntitlements || 0;
    const approved = user.numOfEntitlementsCertified || 0;
    const pending = total - approved; // Remaining entitlements are pending
    const revoked = 0; // This would need to come from actual revocation data

    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
      total,
      approved,
      pending,
      revoked,
      percentage,
    };
  };

  // Calculate progress data from entitlements
  const calculateProgressData = (entitlements: any[]) => {
    const totalItems = entitlements.length;
    let approvedCount = 0;
    let pendingCount = 0;
    let revokedCount = 0;
    let delegatedCount = 0;
    let remediatedCount = 0;

    entitlements.forEach((entitlement) => {
      const action = entitlement.action?.toLowerCase() || "";
      const status = entitlement.status?.toLowerCase() || "";

      if (action === "approve" || status === "approved") {
        approvedCount++;
      } else if (action === "revoke" || status === "revoked") {
        revokedCount++;
      } else if (action === "delegate" || status === "delegated") {
        delegatedCount++;
      } else if (action === "remediate" || status === "remediated") {
        remediatedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalItems,
      approvedCount,
      pendingCount,
      revokedCount,
      delegatedCount,
      remediatedCount,
    };
  };

  const handleScrollUp = async () => {
    if (pageNumber > 1 && !sidebarLoading) {
      setSidebarLoading(true);
      try {
        const newPage = pageNumber - 1;
        setPageNumber(newPage);
        // The useCertificationDetails hook will automatically refetch with the new page number
      } catch (error) {
        console.error("Error loading previous page:", error);
      } finally {
        setSidebarLoading(false);
      }
    }
  };

  const handleScrollDown = async () => {
    if (pageNumber < totalPages && !sidebarLoading) {
      setSidebarLoading(true);
      try {
        const newPage = pageNumber + 1;
        setPageNumber(newPage);
        // The useCertificationDetails hook will automatically refetch with the new page number
      } catch (error) {
        console.error("Error loading next page:", error);
      } finally {
        setSidebarLoading(false);
      }
    }
  };

  const canScrollUp = pageNumber > 1;
  const canScrollDown = pageNumber < totalPages;

  // Handle filter selection
  const handleFilterToggle = useCallback((filterName: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterName)
        ? prev.filter((f) => f !== filterName)
        : [...prev, filterName]
    );
  }, []);

  const filterOptions = [
    {
      name: "Dormant Access",
      color: "bg-yellow-100 border-yellow-300 text-yellow-800",
    },
    { name: "Violation", color: "bg-red-100 border-red-300 text-red-800" },
    {
      name: "High Risk",
      color: "bg-orange-100 border-orange-300 text-orange-800",
    },
    {
      name: "Delta Access",
      color: "bg-blue-100 border-blue-300 text-blue-800",
    },
  ];

  // Entitlements column definitions
  const entitlementsColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "entitlementName",
        headerName: "Ent Name",
        width: 400,
        cellRenderer: (params: ICellRendererParams) => {
          const { entitlementName, isNew, itemRisk, entitlementDescription } =
            params.data || {};
          const deltaLabel = isNew ? "New" : '';
          const riskAbbr =
            itemRisk === "High" ? "H" : itemRisk === "Medium" ? "M" : "L";
          const riskColor =
            itemRisk === "High"
              ? "red"
              : itemRisk === "Medium"
              ? "orange"
              : "green";
          return (
            <div className="flex flex-col gap-1 font-normal text-sm h-full justify-start py-2">
              <div className="flex items-center gap-2">
                <span className="font-normal text-sm">{entitlementName}</span>
                {/* <span>({deltaLabel})</span> */}
                <span style={{ color: riskColor }}>{riskAbbr}</span>
              </div>
              {entitlementDescription ? (
                <div
                  className="text-xs text-gray-600 break-words leading-relaxed entitlement-description w-full"
                  title={entitlementDescription}
                >
                  {entitlementDescription}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic w-full">
                  No description available
                </div>
              )}
            </div>
          );
        },
      },
      { field: "entitlementType", headerName: "Ent Type", width: 150 },
      {
        field: "user",
        headerName: "Account",
        width: 180,
        cellRenderer: (params: ICellRendererParams) => {
          const { user, accountType, SoDConflicts } = params.data || {};
          const typeLabel = accountType || "Regular";
          const hasViolation = SoDConflicts && SoDConflicts.length > 0;
          const lines = user?.split?.("\n") ?? ["", ""];
          return (
            <div className="flex items-center gap-4 font-normal text-sm mt-2">
              <div className="flex items-center gap-2">
                <span className="font-normal text-sm">{lines[0]}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-[#27685b] text-white text-sm"
                  title={`Account Type: ${typeLabel}`}
                >
                  {typeLabel.charAt(0)}
                </div>
                {hasViolation && (
                  <div
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 relative z-50"
                    title="Audit/SOD Violation"
                  >
                    <Flag height={10} color="red" className="text-sm" />
                  </div>
                )}
                <span className="font-normal text-sm">{lines[1]}</span>
              </div>
            </div>
          );
        },
      },
      {
        field: "applicationName",
        headerName: "Application",
        width: 250,
        cellRenderer: (params: ICellRendererParams) => {
          const { applicationName, appTag, appRisk } = params.data || {};
          const tag = appTag || "SOX";
          const riskColor =
            appRisk === "High"
              ? "red"
              : appRisk === "Medium"
              ? "orange"
              : "green";
          return (
            <div className="flex items-center gap-2">
              <span>{applicationName}</span>
              <div
                className="flex items-center justify-center w-5 h-5 rounded-full bg-[#27685b] text-white text-[10px]"
                title={`App Tag: ${tag}`}
              >
                {tag}
              </div>
              <span style={{ color: riskColor }} title={`App Risk: ${appRisk}`}>
                {appRisk}
              </span>
            </div>
          );
        },
      },
      { field: "lastLogin", headerName: "Last Login", width: 140 },
      {
        field: "recommendation",
        headerName: "AI Assist",
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const { recommendation, accessedWithinAMonth } = params.data || {};
          return (
            <div className="leading-3.5 flex items-center justify-center h-full flex-col">
              <span>
                {recommendation === "Certify" ? (
                  <svg
                    width="21"
                    height="18"
                    viewBox="0 0 21 18"
                    className="m-auto"
                  >
                    <path
                      fill="#34C759"
                      d="M3.76 7.5V18.76H0V7.5H3.76ZM18.76 6.24C18.9277 6.23138 19.0954 6.25807 19.2522 6.31834C19.409 6.37861 19.5513 6.47112 19.6701 6.58989C19.7889 6.70866 19.8814 6.85103 19.9417 7.00781C20.0019 7.16458 20.0286 7.33226 20.02 7.5V12.16C19.9961 12.3819 19.9353 12.5982 19.84 12.8L17 17.54C16.772 17.9044 16.4571 18.2066 16.0837 18.4195C15.7102 18.6324 15.2898 18.7494 14.86 18.76H7.5C6.83696 18.76 6.20107 18.4966 5.73223 18.0278C5.26339 17.5589 5 16.923 5 16.26V7.12C5.00576 6.55515 5.19531 6.00753 5.54 5.56L10 0C10.3342 0 10.6547 0.13275 10.891 0.369045C11.1273 0.605341 11.26 0.925827 11.26 1.26V6.26L18.76 6.24Z"
                    />
                  </svg>
                ) : (
                  <svg
                    width="21"
                    height="19"
                    viewBox="0 0 21 19"
                    fill="none"
                    className="m-auto"
                  >
                    <path
                      fill="#FF2D55"
                      d="M3.76 11.24V0H0V11.26L3.76 11.24ZM18.76 12.5C18.9277 12.5086 19.0954 12.4819 19.2522 12.4217C19.409 12.3614 19.5513 12.2689 19.6701 12.1501C19.7889 12.0313 19.8814 11.889 19.9417 11.7322C20.0019 11.5754 20.0286 11.4077 20.02 11.24V6.58C19.9961 6.35812 19.9353 6.1418 19.84 5.94L17 1.2C16.7678 0.836499 16.4487 0.53649 16.0717 0.327006C15.6946 0.117522 15.2713 0.00514447 14.84 0H7.5C6.83696 0 6.20107 0.263392 5.73223 0.732233C5.26339 1.20107 5 1.83696 5 2.5V11.62C5 12.1933 5.18 12.7133 5.54 13.18L10 18.74C10.3342 18.74 10.6547 18.6073 10.891 18.371C11.1273 18.1347 11.26 17.8142 11.26 17.48V12.48L18.76 12.5Z"
                    />
                  </svg>
                )}
              </span>
              <small className="text-xs" title="Review History">
                {accessedWithinAMonth}
              </small>
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        width: 220,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <ActionButtons
              api={params.api}
              selectedRows={[params.data]}
              context="entitlement"
              reviewerId={reviewerId}
              certId={certId}
              onActionSuccess={() => {
                // Refresh the entitlements data after action
                if (selectedUser) {
                  loadUserEntitlements(selectedUser, entitlementsPageNumber);
                }
              }}
            />
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    [certId, reviewerId]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      resizable: true,
    }),
    []
  );

  return (
    <div className="flex h-[calc(100vh-120px)] relative">
      {error && (
        <div style={{ color: "red", padding: 10 }}>{String(error)}</div>
      )}

      {/* Users Sidebar */}
      <div
        className={`absolute left-0 top-0 bottom-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-30 shadow-lg ${
          isSidebarHovered
            ? "w-64 translate-x-0 pr-0"
            : "w-12 -translate-x-0 pr-2"
        }`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        {/* Navigation Arrow - Up */}
        <div className="px-1 py-1 border-b border-gray-200">
          <button
            onClick={handleScrollUp}
            disabled={!canScrollUp || sidebarLoading}
            className={`w-full py-1 px-2 rounded transition-all duration-200 ${
              canScrollUp && !sidebarLoading
                ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
            title={sidebarLoading ? "Loading..." : "Previous page"}
          >
            {sidebarLoading ? (
              <div className="w-3 h-3 mx-auto animate-spin border-2 border-gray-400 border-t-transparent rounded-full"></div>
            ) : (
              <ChevronUp className="w-3 h-3 mx-auto" />
            )}
          </button>
        </div>

        {/* User Search (visible when expanded) */}
        {isSidebarHovered && (
          <div className="px-2 py-2 border-b border-gray-200">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        )}

        {/* Users List - Fixed Height */}
        <div
          className={`flex-1 flex flex-col justify-start pt-0 pb-1 ${
            isSidebarHovered ? "overflow-y-auto" : "overflow-hidden"
          }`}
        >
          {sidebarLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 text-sm">Loading users...</div>
            </div>
          ) : (
            users
              .filter((user) =>
                (user.fullName || "")
                  .toLowerCase()
                  .includes(userSearch.trim().toLowerCase())
              )
              .map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`px-3 py-2 rounded-none cursor-pointer hover:bg-blue-50 transition-all duration-200 ${
                    index === 0 ? "mt-0" : "mt-0"
                  } ${
                    selectedUser?.id === user.id
                      ? "bg-blue-100 border-l-4 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`flex items-center ${
                      isSidebarHovered
                        ? "gap-3 justify-start"
                        : "justify-center"
                    }`}
                  >
                    {/* User Avatar/Initials */}
                    <div
                      className={`relative flex-shrink-0 ${
                        !isSidebarHovered ? "mx-auto" : ""
                      }`}
                    >
                      {!isSidebarHovered ? (
                        <div
                          className={`w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs ${
                            selectedUser?.id === user.id
                              ? "bg-blue-700 ring-2 ring-blue-300"
                              : ""
                          }`}
                        >
                          {getUserInitials(user.fullName || "")}
                        </div>
                      ) : (
                        <Image
                          src="https://avatar.iran.liara.run/public/9"
                          alt="User Avatar"
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full"
                        />
                      )}
                    </div>

                    {/* User Details - only visible when expanded */}
                    <div
                      className={`flex-1 min-w-0 transition-all duration-300 ${
                        isSidebarHovered ? "opacity-100" : "opacity-0 w-0"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className={`font-medium text-sm ${
                              selectedUser?.id === user.id
                                ? "text-blue-800 font-semibold"
                                : "text-gray-900"
                            }`}
                          >
                            {user.fullName}
                          </span>
                          {/* Progress Summary - percentage only */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {(() => {
                              const progress = getUserProgress(user);
                              return (
                                <span className="text-xs text-gray-500 font-medium">
                                  {progress.percentage}%
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        {selectedUser?.id === user.id && (
                          <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      {/* Additional user info when expanded */}
                      <div
                        className={`text-xs text-gray-500 mt-1 transition-all duration-300 ${
                          isSidebarHovered ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {user.department || "Unknown Dept"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Navigation Arrow - Down */}
        <div className="px-1 py-1 border-t border-gray-200">
          <button
            onClick={handleScrollDown}
            disabled={!canScrollDown || sidebarLoading}
            className={`w-full py-1 px-2 rounded transition-all duration-200 ${
              canScrollDown && !sidebarLoading
                ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
            title={sidebarLoading ? "Loading..." : "Next page"}
          >
            {sidebarLoading ? (
              <div className="w-3 h-3 mx-auto animate-spin border-2 border-gray-400 border-t-transparent rounded-full"></div>
            ) : (
              <ChevronDown className="w-3 h-3 mx-auto" />
            )}
          </button>
        </div>
      </div>

      {/* Entitlements Table */}
      <div className="flex-1 flex flex-col ml-12">
        {selectedUser ? (
          <>
            {/* Selected User Header */}
            {/* User Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm w-full">
              {/* Upper section: Name, Status, Buttons */}
              <div className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {selectedUser.fullName
                      ? selectedUser.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "??"}
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 truncate">
                    {selectedUser.fullName || "Unknown User"}
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-500">
                      Status:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                      {selectedUser.status || "Unknown"}
                    </span>
                  </div>
                  <button
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-xs font-medium"
                    title="Open in Microsoft Teams"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.4 7.2c-.4-.2-.8-.3-1.2-.3-.4 0-.8.1-1.2.3L12 10.8 6 7.2c-.4-.2-.8-.3-1.2-.3-.4 0-.8.1-1.2.3C3.2 7.8 2.8 8.4 2.8 9.2v5.6c0 .8.4 1.4 1.2 1.8.4.2.8.3 1.2.3.4 0 .8-.1 1.2-.3L12 13.2l6 3.6c.4.2.8.3 1.2.3.4 0 .8-.1 1.2-.3.8-.4 1.2-1 1.2-1.8V9.2c0-.8-.4-1.4-1.2-1.8z" />
                    </svg>
                  </button>
                  <button
                    className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all duration-200 text-xs font-medium"
                    title="AI Assist Analysis"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span>AI Assist</span>
                  </button>
                </div>
              </div>

              {/* Lower section: Job Title, Department, Risk and Filters */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-500">
                      Job Title:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedUser.jobtitle || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-500">
                      Department:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                      {selectedUser.department || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-500">
                      Risk:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                      {selectedUser.risk || "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-xs font-bold text-gray-500">
                      Filters:
                    </span>
                  </div>
                  {filterOptions.map((filter) => {
                    const isSelected = selectedFilters.includes(filter.name);
                    return (
                      <div
                        key={filter.name}
                        onClick={() => handleFilterToggle(filter.name)}
                        className={`
                          px-2 py-1 rounded-md border cursor-pointer transition-all duration-200 text-xs ml-2
                          ${
                            isSelected
                              ? `${filter.color} shadow-sm`
                              : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                          }
                        `}
                      >
                        <span className="font-medium">{filter.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Entitlements Table Controls */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <SelectAll
                  gridApi={entitlementsGridApiRef.current}
                  detailGridApis={new Map()}
                  clearDetailGridApis={() => {}}
                />
                <input
                  type="text"
                  placeholder="Search entitlements..."
                  className="border rounded px-3 py-1"
                  onChange={(e) => {
                    if (entitlementsGridApiRef.current) {
                      entitlementsGridApiRef.current.setGridOption(
                        "quickFilterText",
                        e.target.value
                      );
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filters gridApi={entitlementsGridApiRef} />
                <Import gridApi={entitlementsGridApiRef.current} />
                <Exports gridApi={entitlementsGridApiRef.current} />
                <button
                  title="Sign Off"
                  aria-label="Sign off selected rows"
                  className="p-1 rounded transition-colors duration-200"
                >
                  <CheckCircleIcon
                    className="cursor-pointer"
                    strokeWidth="1"
                    size="24"
                    color="#e73c3cff"
                  />
                </button>
                <ColumnSettings
                  columnDefs={entitlementsColumnDefs}
                  gridApi={entitlementsGridApiRef.current}
                  visibleColumns={() => {
                    const visibleCols: string[] = [];
                    entitlementsColumnDefs.forEach((colDef) => {
                      if (colDef.field) {
                        visibleCols.push(colDef.field);
                      }
                    });
                    return visibleCols;
                  }}
                />
              </div>
            </div>

            {/* Entitlements Grid */}
            <div className="flex-1 p-4">
              {loadingEntitlements ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">
                    ⏳ Loading entitlements...
                  </div>
                </div>
              ) : entitlementsData.length > 0 ? (
                <AgGridReact
                  rowData={entitlementsData}
                  columnDefs={entitlementsColumnDefs}
                  defaultColDef={defaultColDef}
                  domLayout="autoHeight"
                  rowSelection={{ mode: "multiRow" }}
                  rowHeight={50}
                  getRowId={(params: GetRowIdParams) => params.data.lineItemId}
                  getRowClass={() => "ag-row-custom"}
                  onGridReady={(params) => {
                    entitlementsGridApiRef.current = params.api;
                    params.api.sizeColumnsToFit();
                  }}
                  pagination={true}
                  paginationPageSize={defaultPageSize}
                  paginationPageSizeSelector={pageSizeSelector}
                  overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading entitlements...</span>`}
                  overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No entitlements found for this user.</span>`}
                  className="ag-main"
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">
                    No entitlements found for this user.
                  </div>
                </div>
              )}
            </div>

            {/* Pagination at bottom of table */}
            {entitlementsData.length > 0 && (
              <div className="flex justify-center">
                <CustomPagination
                  totalItems={entitlementsTotalItems}
                  currentPage={entitlementsPageNumber}
                  totalPages={entitlementsTotalPages}
                  pageSize={defaultPageSize}
                  onPageChange={handleEntitlementsPageChange}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a User</h3>
              <p>Choose a user from the sidebar to view their entitlements</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeClient;
