"use client";
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import AgGridReact from "@/components/ClientOnlyAgGrid";
import "@/lib/ag-grid-setup";
import CustomPagination from "@/components/agTable/CustomPagination";
import Filters from "@/components/agTable/Filters";
import Exports from "@/components/agTable/Exports";
import ColumnSettings from "@/components/agTable/ColumnSettings";
import {
  ColDef,
  GetRowIdParams,
  GridApi,
  ICellRendererParams,
  IDetailCellRendererParams,
  FirstDataRenderedEvent,
} from "ag-grid-enterprise";
import ActionButtons from "@/components/agTable/ActionButtons";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle,
  CheckCircleIcon,
  MailIcon,
} from "lucide-react";
import RightSidebar from "@/components/RightSideBar";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import TaskSummaryPanel from "@/components/TaskSummaryPanel";
import Accordion from "@/components/Accordion";
import ChartAppOwnerComponent from "@/components/ChartForAppOwner";
import UserProgress from "@/components/UserProgress";
import "./AppOwner.css";
import {
  getAppOwnerDetails,
  getGroupedAppOwnerDetails,
  getAppAccounts,
  getAPPOCertificationDetailsWithFilter,
  getCertAnalytics,
  executeQuery,
} from "@/lib/api";
import { getReviewerId } from "@/lib/auth";
import { useActionPanel } from "@/contexts/ActionPanelContext";
import { PaginatedResponse } from "@/types/api";
import { BackButton } from "@/components/BackButton";
import { useRouter } from "next/navigation";
import { useLoading } from "@/contexts/LoadingContext";
import ExcelJS from "exceljs";
import ActionCompletedToast from "@/components/ActionCompletedToast";

// Register AG Grid Enterprise modules
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import { formatDateMMDDYY } from "../access-review/page";
ModuleRegistry.registerModules([MasterDetailModule]);

type DataItem = {
  label: string;
  value: number | string;
  color?: string;
};

type RowData = {
  accountId: string;
  accountName: string;
  userId: string;
  userName: string;
  entitlementName: string;
  entitlementDescription: string;
  entitlementType?: string;
  aiInsights: string;
  recommendation?: string;
  accountSummary: string;
  accountActivity: string;
  changeSinceLastReview: string;
  accountType: string;
  userType: string;
  lastLoginDate: string;
  department: string;
  manager: string;
  risk: string;
  applicationName: string;
  applicationInstanceId?: string;
  numOfEntitlements: number;
  lineItemId?: string;
  status?: string;
};

const data: {
  accountSummary: DataItem[];
  accountActivity: DataItem[];
  changeSinceLastReview: DataItem[];
} = {
  accountSummary: [
    { label: "Regular Accounts", value: 0 },
    { label: "Elevated Accounts", value: 0 },
    { label: "Orphan Accounts", value: 0 },
    { label: "Terminated User Accounts", value: 0 },
  ],
  accountActivity: [
    { label: "Active in past 30 days", value: 0 },
    { label: "Active in past 30-60 days", value: 0 },
    { label: "Active in past more than 90 days", value: 0 },
  ],
  changeSinceLastReview: [
    { label: "New accounts", value: 0 },
    { label: "Old accounts", value: 0 },
    { label: "New entitlements", value: 0 },
  ],
};

const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const { data } = props;
  return (
    <div className="flex p-4 bg-gray-50 border-t border-gray-200 ml-10">
      <div className="flex flex-row items-center gap-2">
        <span className="text-gray-800">{data.entitlementDescription}</span>
      </div>
    </div>
  );
};

const isValidUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Format usernames like "tamara.schaefer" to "Tamara Schaefer"
const formatDisplayName = (raw: string | undefined | null): string => {
  if (!raw || typeof raw !== "string") return "";
  const normalized = raw.replace(/[._]+/g, " ").trim();
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const transformApiData = (items: any[], isGrouped: boolean): RowData[] => {
  if (!Array.isArray(items)) {
    console.error("transformApiData: items is not an array", items);
    return [];
  }

  if (isGrouped) {
    // Handle grouped data from getGroupedAppOwnerDetails
    return items.flatMap((group) => {
      const groupEntitlement = group.entitlementInfo || {};
      const groupEntitlementName =
        groupEntitlement.entitlementName || "Unknown Entitlement";
      // Try multiple possible field names for description
      const groupEntitlementDescription = 
        groupEntitlement.description ||
        groupEntitlement.entitlementDescription ||
        groupEntitlement.entitlement_description ||
        groupEntitlement.details ||
        groupEntitlement.summary ||
        group.description ||
        group.entitlementDescription ||
        "";
      const accounts = Array.isArray(group.accounts) ? group.accounts : [];

      return accounts.map((account: any, index: number) => {
        const accountInfo = account.accountInfo || {};
        const userInfo = account.userInfo || {};
        const access = account.access || {};
        const entityEntitlement = account.entityEntitlement || {};
        const recommendation = entityEntitlement.action || undefined;
        const normalizedAction = String(entityEntitlement.action || "").trim();
        const normalizedStatus = (() => {
          const a = normalizedAction.toLowerCase();
          if (a === "approve") return "approved";
          if (a === "reject") return "revoked";
          if (a === "delegate") return "delegated";
          if (a === "remediate") return "remediated";
          if (a === "pending") return "pending";
          return "pending";
        })();

        return {
          accountId: accountInfo.accountId || `grouped-${index}`,
          accountName: accountInfo.accountName || "",
          userId: userInfo.UserID || "",
          entitlementName: groupEntitlementName,
          entitlementDescription: groupEntitlementDescription,
          entitlementType:
            groupEntitlement.entitlementType ||
            entityEntitlement.entitlementType ||
            account.entitlementType ||
            account.type ||
            "",
          aiInsights: entityEntitlement.aiassist?.recommendation || "",
          accountSummary: accountInfo.accountName?.includes("@")
            ? "Regular Accounts"
            : "Other",
          changeSinceLastReview:
            entityEntitlement.isNewAccess === "Y"
              ? "New entitlements"
              : "Existing entitlements",
          accountType: group.campaignType || "",
          userName: userInfo.UserName || "",
          lastLoginDate: access.lastLogonDate || "2025-05-25",
          department: userInfo.department || "Unknown",
          manager: userInfo.manager || "Unknown",
          risk: userInfo.Risk || access.risk || "Low",
          applicationName: account.applicationInfo?.applicationName || "",
          applicationInstanceId:
            account.applicationInfo?.applicationInstanceId ||
            account.applicationInfo?.applicationinstanceid ||
            "",
          numOfEntitlements:
            group.access?.numOfAccounts || accounts.length || 0,
          lineItemId: entityEntitlement.lineItemId || "",
          recommendation,
          status: normalizedStatus,
        };
      });
    });
  }

  // Handle ungrouped data from getAppOwnerDetails
  return items.flatMap((item) => {
    if (!item?.entityEntitlements || !Array.isArray(item.entityEntitlements)) {
      console.warn(
        "transformApiData: invalid entityEntitlements for item",
        item
      );
      return [];
    }
    return item.entityEntitlements.map((entitlement: any) => {
      const entityEnt = entitlement.entityEntitlement || {};
      const normalizedAction = String(entityEnt.action || "").trim();
      const normalizedStatus = (() => {
        const a = normalizedAction.toLowerCase();
        if (a === "approve") return "approved";
        if (a === "reject") return "revoked";
        if (a === "delegate") return "delegated";
        if (a === "remediate") return "remediated";
        if (a === "pending") return "pending";
        return "pending";
      })();
      return {
        accountId: item.accountInfo?.accountId || "",
        accountName: item.accountInfo?.accountName || "",
        userId: item.userInfo?.UserID || "",
        entitlementName: entitlement.entitlementInfo?.entitlementName || "",
        entitlementDescription: entitlement.entitlementInfo?.description || "",
        entitlementType:
          entitlement.entitlementInfo?.entitlementType ||
          entitlement.entitlementType ||
          entitlement.type ||
          "",
        aiInsights: entitlement.aiassist?.recommendation || "",
        recommendation: entityEnt.action || undefined,
        accountSummary: item.accountInfo?.accountName?.includes("@")
          ? "Regular Accounts"
          : "Other",
        changeSinceLastReview: "New entitlements",
        accountType: item.campaignType || "",
        userName: item.userInfo?.UserName || "",
        lastLoginDate: "2025-05-25",
        department: "Unknown",
        manager: "Unknown",
        risk: item.userInfo?.Risk || "Low",
        applicationName: item.applicationInfo?.applicationName || "",
        applicationInstanceId:
          item.applicationInfo?.applicationInstanceId ||
          item.applicationInfo?.applicationinstanceid ||
          "",
        numOfEntitlements: item.access?.numOfEntitlements || 0,
        lineItemId: entitlement.lineItemId || "",
        status: normalizedStatus,
        action: normalizedAction,
      };
    });
  });
};

function AppOwnerContent() {
  const { queueAction, isVisible: isActionPanelVisible } = useActionPanel();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
  const { openSidebar } = useRightSidebar();
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
  const [isGridReady, setIsGridReady] = useState(false);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSizeSelector = [10, 20, 50, 100];
  const [pageSize, setPageSize] = useState(pageSizeSelector[0]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const gridApiRef = useRef<GridApi | null>(null);
  const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(
    new Map()
  );
  const [comment, setComment] = useState("");
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);
  const [groupByOption, setGroupByOption] = useState<string>("None");
  const [selectedRows, setSelectedRows] = useState<RowData[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState<string>("");
  // Server-side status filter used when grouping by Entitlements
  const [statusFilterQuery, setStatusFilterQuery] = useState<string | undefined>(undefined);
  // Client-side AG Grid row grouping by entitlement name (checkbox control)
  const [isGroupedByEntitlementCheckbox, setIsGroupedByEntitlementCheckbox] = useState<boolean>(false);
  // Ref to store latest rowData for cell renderer access
  const rowDataRef = useRef<RowData[]>([]);
  // Ref to store entitlement description map for fast lookup
  const entitlementDescriptionMapRef = useRef<Map<string, string>>(new Map());

  // State for header info and user progress
  const [headerInfo, setHeaderInfo] = useState({
    campaignName: "",
    status: "",
    snapshotAt: "",
    dueDate: "",
    daysLeft: 0,
  });

  const [userProgressData, setUserProgressData] = useState({
    totalItems: 0,
    approvedCount: 0,
    pendingCount: 0,
    percentage: 0,
  });

  // State for analytics data
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // State for download functionality
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const { showApiLoader, hideApiLoader } = useLoading();

  // Get reviewerId and certificationId from URL parameters, with fallback to hardcoded values
  const reviewerId =
    searchParams.get("reviewerId") || getReviewerId() || "";
  const certificationId =
    searchParams.get("certificationId") ||
    "4f5c20b8-1031-4114-a688-3b5be9cc2224";

  // Debug logging
  console.log("App Owner - URL Parameters:", {
    reviewerId,
    certificationId,
    allParams: Object.fromEntries(searchParams.entries()),
  });

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const analytics = await getCertAnalytics(reviewerId);
      console.log("Fetched analytics data:", analytics);
      setAnalyticsData(analytics);
    } catch (err: any) {
      console.error("Error fetching analytics data:", err);
      // Don't set error state for analytics, just log it
    } finally {
      setAnalyticsLoading(false);
    }
  }, [reviewerId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isValidUUID(reviewerId)) {
        throw new Error("Invalid reviewerId: must be a valid UUID");
      }
      if (!isValidUUID(certificationId)) {
        throw new Error("Invalid certificationId: must be a valid UUID");
      }
      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new Error("Invalid page number: must be a positive integer");
      }
      if (!Number.isInteger(pageSize) || pageSize < 1) {
        throw new Error("Invalid page size: must be a positive integer");
      }

      console.log("Fetching data with:", {
        pageNumber,
        pageSize: pageSize,
        reviewerId,
        certificationId,
        groupBy: groupByOption,
      });

      let response: PaginatedResponse<any>;
      const isGroupedEnts = groupByOption === "Entitlements";
      const isGroupedAccounts = groupByOption === "Accounts";

      // If a chart-based filter is applied, use the filtered certification API
      if (currentFilter) {
        response = await getAPPOCertificationDetailsWithFilter(
          reviewerId,
          certificationId,
          currentFilter,
          pageSize,
          pageNumber
        );
      } else if (isGroupedEnts) {
        response = await getGroupedAppOwnerDetails(
          reviewerId,
          certificationId,
          pageSize,
          pageNumber,
          statusFilterQuery
        );
      } else if (isGroupedAccounts) {
        // For Accounts grouping, call entities API getAppAccounts
        // Determine applicationInstanceId: prefer from current state else from first of response of ungrouped data
        let applicationInstanceId =
          rowData.find((r) => r.applicationInstanceId)?.applicationInstanceId ||
          "";
        const tryExtractFromRawItems = (items: any[]): string | undefined => {
          for (const item of items || []) {
            // Top-level variants
            const top1 =
              item?.applicationInfo?.applicationInstanceId ||
              item?.applicationInfo?.applicationinstanceid;
            if (top1) return top1 as string;
            const top2 =
              item?.applicationInstanceId || item?.applicationinstanceid;
            if (top2) return top2 as string;
            // Ungrouped entityEntitlements path
            const entAppId =
              item?.entityEntitlements?.[0]?.applicationInfo
                ?.applicationInstanceId ||
              item?.entityEntitlements?.[0]?.applicationInfo
                ?.applicationinstanceid;
            if (entAppId) return entAppId as string;
            // Grouped structure paths (accounts array)
            const accounts = Array.isArray(item?.accounts) ? item.accounts : [];
            for (const acc of accounts) {
              const accAppId =
                acc?.applicationInfo?.applicationInstanceId ||
                acc?.applicationInfo?.applicationinstanceid;
              if (accAppId) return accAppId as string;
            }
          }
          return undefined;
        };
        if (!applicationInstanceId) {
          const ungResp = await getAppOwnerDetails(
            reviewerId,
            certificationId,
            pageSize,
            pageNumber
          );
          console.log(
            "Ungrouped response for appId extraction:",
            JSON.stringify(ungResp, null, 2)
          );

          // First try fast transform path
          const transformedUng = transformApiData(ungResp.items || [], false);
          applicationInstanceId =
            transformedUng.find((r) => r.applicationInstanceId)
              ?.applicationInstanceId || "";
          console.log("Transformed data appId:", applicationInstanceId);

          // Then try raw items exhaustive scan for various shapes/casings
          if (!applicationInstanceId) {
            const extracted = tryExtractFromRawItems(ungResp.items || []);
            if (extracted) applicationInstanceId = extracted;
            console.log("Raw extraction appId:", extracted);
          }
        }

        console.log(
          "Final applicationInstanceId for accounts:",
          applicationInstanceId
        );

        if (!applicationInstanceId) {
          // Try to get applications list and use the first one as fallback
          try {
            console.log("Trying to fetch applications list as fallback...");
            const appsResponse = await fetch(
              `https://preview.keyforge.ai/entities/api/v1/ACMECOM/getApplications/${reviewerId}`
            );
            const appsData = await appsResponse.json();
            console.log("Applications fallback response:", appsData);

            if (
              appsData.executionStatus === "success" &&
              appsData.items &&
              appsData.items.length > 0
            ) {
              const firstApp = appsData.items[0];
              applicationInstanceId =
                firstApp.applicationinstanceid ||
                firstApp.applicationInstanceId;
              console.log(
                "Using first application as fallback:",
                applicationInstanceId
              );
            }
          } catch (fallbackErr) {
            console.error("Fallback applications fetch failed:", fallbackErr);
          }
        }

        if (!applicationInstanceId) {
          // Provide user-friendly message instead of throwing hard error
          setError(
            "Unable to determine application to load accounts. Open an application first or try 'Group by Entitlements'."
          );
          setRowData([]);
          setLoading(false);
          return;
        }
        const accountsResp: any = await getAppAccounts(
          reviewerId,
          applicationInstanceId
        );
        console.log("Raw accounts response:", accountsResp);

        // Normalize to PaginatedResponse-like shape for rendering
        response = (
          Array.isArray(accountsResp)
            ? {
                items: accountsResp,
                total_pages: 1,
                total_items: accountsResp.length,
              }
            : accountsResp
        ) as PaginatedResponse<any>;

        console.log("Normalized accounts response:", response);
      } else {
        response = await getAppOwnerDetails(
          reviewerId,
          certificationId,
          pageSize,
          pageNumber
        );
      }

      console.log("API Response:", JSON.stringify(response, null, 2));

      // Check if response has error properties (for backward compatibility)
      if ((response as any).executionStatus === "error") {
        throw new Error(
          (response as any).errorMessage || "API returned an error"
        );
      }

      if (!response.items || !Array.isArray(response.items)) {
        console.error("Invalid response.items:", response.items);
        throw new Error("Invalid data format received from API");
      }

      let transformedData: RowData[];

      if (isGroupedAccounts) {
        // For accounts data, transform differently since it has a different structure
        console.log("First account item structure:", response.items?.[0]);

        transformedData = (response.items || []).map(
          (account: any, index: number) => {
            // Map using the actual field names from the API response
            const mappedAccount = {
              accountId: account.accountId || `account-${index}`,
              accountName: account.accountName || "",
              userId: account.userId || "",
              userName: account.userDisplayName || "", // This is the key field for Display Name
              entitlementName: account.entitlementName || "Account Access",
              entitlementDescription: account.entitlementDescription || "",
              entitlementType: account.entitlementType || account.type || "",
              aiInsights: "",
              accountSummary: (account.accountName || "").includes("@")
                ? "Regular Accounts"
                : "Other",
              accountActivity: "Active",
              changeSinceLastReview: "Existing accounts",
              accountType: account.jobTitle || "", // Use jobTitle for account type
              userType: account.userType || "Internal",
              lastLoginDate: account.lastlogindate || "2025-05-25",
              department: account.userDepartment || "Unknown", // Use userDepartment
              manager: account.userManager || "Unknown", // Use userManager
              risk: account.risk || "Low",
              applicationName: account.applicationName || "",
              applicationInstanceId: account.applicationInstanceId || "",
              numOfEntitlements: 1,
              lineItemId: account.accountId || "",
              status: account.userStatus || "Pending",
            };

            console.log(`Mapped account ${index}:`, mappedAccount);
            return mappedAccount;
          }
        );
      } else {
        // Use existing transform for other cases (including filtered API response)
        transformedData = transformApiData(
          response.items,
          isGroupedEnts /* grouped shape only for Entitlements path */
        );
      }
      console.log(
        "Transformed Data:",
        JSON.stringify(transformedData, null, 2)
      );
      setRowData(transformedData);
      setTotalPages(response.total_pages || 1);
      setTotalItems(response.total_items || 0);

      // Store header data in localStorage for header component
      // Only update if we don't have existing campaign data from access review
      const existingCampaignData = localStorage.getItem(
        "selectedCampaignSummary"
      );
      if (!existingCampaignData) {
        const headerData = transformedData.map((item: any) => ({
          id: item.accountId,
          certificationName: "App Owner Review",
          certificationExpiration: "2025-12-31",
          status: item.risk === "High" ? "Pending" : "Completed",
          fullName: item.userName,
          manager: item.manager,
          department: item.department,
          jobtitle: item.accountType,
          userType: "Internal",
        }));

        localStorage.setItem("sharedRowData", JSON.stringify(headerData));
        // Dispatch custom event to notify header component
        window.dispatchEvent(new Event("localStorageChange"));
      }
    } catch (err: any) {
      console.error("Error fetching app owner details:", err);
      setError(err.message || "Failed to load data. Please try again later.");
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [
    pageNumber,
    pageSize,
    reviewerId,
    certificationId,
    groupByOption,
    currentFilter,
    statusFilterQuery,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadExcel = async (certificationId: string) => {
    console.log("=== handleDownloadExcel START ===");
    console.log("certificationId:", certificationId);
    
    try {
      setIsActionLoading(true);
      showApiLoader?.(true, "Downloading certification data...");

      // Call the executeQuery API
      const query = "select * from vw_download_cert_access_by_certid where certificationid = ?::uuid LIMIT 3000";
      const parameters = [certificationId];
      
      console.log("Calling executeQuery with:", { query, parameters });
      const response = await executeQuery<any>(query, parameters);
      
      console.log("executeQuery response:", response);
      console.log("Response type:", typeof response);
      console.log("Is array:", Array.isArray(response));
      
      // Handle different response structures
      let dataArray: any[] = [];
      
      if (response) {
        // Check if response has resultSet property (common in SQL query responses)
        if (response.resultSet && Array.isArray(response.resultSet)) {
          dataArray = response.resultSet;
          console.log("Using resultSet from response, length:", dataArray.length);
        } 
        // Check if response is directly an array
        else if (Array.isArray(response)) {
          dataArray = response;
          console.log("Response is direct array, length:", dataArray.length);
        }
        // Check if response has data property
        else if (response.data && Array.isArray(response.data)) {
          dataArray = response.data;
          console.log("Using data property from response, length:", dataArray.length);
        }
        // If response is a single object, wrap it in an array
        else if (typeof response === 'object' && response !== null) {
          dataArray = [response];
          console.log("Response is single object, wrapping in array");
        }
      }
      
      if (dataArray.length === 0) {
        alert("No data found for this certification.");
        return;
      }

      console.log(`Processing ${dataArray.length} rows from query result`);
      console.log("First row sample:", dataArray[0]);

      // Create Excel workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Certification Access Data");
      
      // Extract headers and data rows
      let headers: string[] = [];
      let rows: any[][] = [];
      
      const firstRow = dataArray[0];
      
      if (firstRow && typeof firstRow === 'object' && firstRow !== null && !Array.isArray(firstRow)) {
        // Response is an array of objects - use object keys as headers
        const allHeaders = Object.keys(firstRow);
        console.log("All headers from object keys:", allHeaders);
        
        // Filter out unwanted columns (case-insensitive)
        const excludedColumns = ['lineitemid', 'certificationid', 'taskid'];
        headers = allHeaders.filter(header => 
          !excludedColumns.some(excluded => header.toLowerCase() === excluded.toLowerCase())
        );
        console.log("Filtered headers (excluding lineitemid, certificationid, taskid):", headers);
        
        // Filter rows where comment is "NONE" (case-insensitive) and map to values
        rows = dataArray
          .filter((row: any) => {
            // Check if comment column exists and is not "NONE"
            const commentKey = allHeaders.find(h => h.toLowerCase() === 'comment');
            if (commentKey) {
              const commentValue = String(row[commentKey] || '').trim().toUpperCase();
              return commentValue !== 'NONE';
            }
            return true; // Include row if no comment column found
          })
          .map((row: any) => {
            return headers.map(header => {
              const value = row[header];
              // Handle null, undefined, and complex objects
              if (value === null || value === undefined) {
                return "";
              }
              // If value is an object or array, stringify it
              if (typeof value === 'object') {
                return JSON.stringify(value);
              }
              return value;
            });
          });
      } else if (Array.isArray(firstRow)) {
        // Response is an array of arrays - first row might be headers
        // Check if first row looks like headers (all strings) or data
        const allStrings = firstRow.every((cell: any) => typeof cell === 'string');
        if (allStrings && dataArray.length > 1) {
          const allHeaders = firstRow as string[];
          // Filter out unwanted columns (case-insensitive)
          const excludedColumns = ['lineitemid', 'certificationid', 'taskid'];
          const excludedIndices: number[] = [];
          headers = allHeaders.filter((header, index) => {
            const shouldExclude = excludedColumns.some(excluded => header.toLowerCase() === excluded.toLowerCase());
            if (shouldExclude) {
              excludedIndices.push(index);
            }
            return !shouldExclude;
          });
          
          // Filter rows where comment is "NONE" and exclude unwanted columns
          const commentIndex = allHeaders.findIndex(h => h.toLowerCase() === 'comment');
          rows = dataArray.slice(1)
            .filter((row: any[]) => {
              if (commentIndex >= 0 && commentIndex < row.length) {
                const commentValue = String(row[commentIndex] || '').trim().toUpperCase();
                return commentValue !== 'NONE';
              }
              return true;
            })
            .map((row: any[]) => {
              return row.filter((_, index) => !excludedIndices.includes(index));
            });
        } else {
          // No headers, generate generic ones
          headers = firstRow.map((_: any, index: number) => `Column ${index + 1}`);
          rows = dataArray;
        }
      } else {
        // Fallback: single column
        headers = ["Data"];
        rows = dataArray.map(row => [String(row)]);
      }
      
      console.log("Final headers:", headers);
      console.log("Number of data rows after filtering:", rows.length);
      
      // Add header row
      const headerRow = worksheet.addRow(headers);
      
      // Style the header row
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      
      // Add borders to header row
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Add data rows
      rows.forEach((rowData) => {
        const row = worksheet.addRow(rowData);
        // Add borders to data rows
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        });
      });
      
      // Set column widths based on content
      headers.forEach((header, index) => {
        const column = worksheet.getColumn(index + 1);
        
        // Calculate max width based on header and data
        let maxLength = header.length;
        rows.forEach(row => {
          const cellValue = String(row[index] || '');
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });
        
        // Set width with min/max constraints
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });
      
      // Freeze header row
      worksheet.views = [
        {
          state: 'frozen',
          ySplit: 1
        }
      ];
      
      // Generate Excel file buffer
      console.log("Generating Excel buffer...");
      const excelBuffer = await workbook.xlsx.writeBuffer();

      console.log(`Excel buffer size: ${excelBuffer.byteLength} bytes`);

      // Create blob and download
      const blob = new Blob([excelBuffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      
      console.log(`Blob created, size: ${blob.size} bytes`);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = `certification-access-${certificationId}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.download = fileName;
      document.body.appendChild(a);
      console.log(`Triggering download: ${fileName}`);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log("Download completed successfully");
      setShowCompletionToast(true);
    } catch (error) {
      console.error("Error downloading Excel file:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      alert(`Failed to download Excel file: ${error instanceof Error ? error.message : "Unknown error"}\n\nCheck console for details.`);
    } finally {
      setIsActionLoading(false);
      hideApiLoader?.();
    }
  };

  // Restore previously selected grouping from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("appOwnerGroupBy");
      if (stored) {
        setGroupByOption(stored);
        const selectedField =
          stored === "Entitlements"
            ? "entitlementName"
            : stored === "Accounts"
            ? "accountName"
            : null;
        setGroupByColumn(selectedField);
        applyRowGrouping(selectedField);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Effect to populate header info from localStorage
  useEffect(() => {
    const updateHeaderData = () => {
      try {
        // Prefer campaign summary if available (for campaign manage pages)
        const selectedCampaignSummary = localStorage.getItem(
          "selectedCampaignSummary"
        );
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
            const daysLeft = calculateDaysLeft(
              firstItem.certificationExpiration || ""
            );

            // Only update header info if we don't have campaign summary data
            if (!selectedCampaignSummary) {
              setHeaderInfo((prev) => ({
                campaignName:
                  firstItem.certificationName ||
                  prev.campaignName ||
                  "Campaign Name",
                status: prev.status || "",
                snapshotAt: prev.snapshotAt || "",
                dueDate:
                  firstItem.certificationExpiration || prev.dueDate || "",
                daysLeft: prev.dueDate ? prev.daysLeft : daysLeft,
              }));
            }

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

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleLocalStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageChange",
        handleLocalStorageChange
      );
    };
  }, []);

  // Calculate days left helper function
  const calculateDaysLeft = (expirationDateStr: string): number => {
    if (!expirationDateStr) return 0;
    const expiration = new Date(expirationDateStr);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
  };

  // Calculate user-based progress helper function
  const calculateUserProgress = (userData: any) => {
    // First try to get campaign-level progress data
    const selectedCampaignSummary = localStorage.getItem(
      "selectedCampaignSummary"
    );
    if (selectedCampaignSummary) {
      try {
        const summary = JSON.parse(selectedCampaignSummary);
        if (
          summary.totalItems &&
          summary.approvedCount !== undefined &&
          summary.pendingCount !== undefined
        ) {
          const rejectedCount = summary.rejectedCount || 0;
          const revokedCount = summary.revokedCount || 0;
          const completedCount =
            summary.approvedCount + rejectedCount + revokedCount; // Certified, rejected, and revoked all count as progress
          const percentage =
            summary.totalItems > 0
              ? Math.round((completedCount / summary.totalItems) * 100)
              : 0;
          return {
            totalItems: summary.totalItems,
            approvedCount: summary.approvedCount,
            rejectedCount: rejectedCount,
            revokedCount: revokedCount,
            completedCount: completedCount,
            pendingCount: summary.pendingCount,
            percentage: percentage,
          };
        }
      } catch (error) {
        console.error(
          "Error parsing campaign summary in calculateUserProgress:",
          error
        );
      }
    }

    // Fallback to user-level progress calculation
    const total = userData.numOfEntitlements || 0;
    const approved = userData.numOfEntitlementsCertified || 0;
    const rejected = userData.numOfEntitlementsRejected || 0;
    const revoked = userData.numOfEntitlementsRevoked || 0;
    const completed = approved + rejected + revoked; // Certified, rejected, and revoked all count as progress
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalItems: total,
      approvedCount: approved,
      rejectedCount: rejected,
      revokedCount: revoked,
      completedCount: completed,
      pendingCount: pending,
      percentage: percentage,
    };
  };

  const handleAction = async (
    lineItemId: string,
    actionType: "Approve" | "Reject",
    justification: string
  ) => {
    const payload = {
      entitlementAction: [
        {
          lineItemIds: [lineItemId],
          actionType,
          justification,
        },
      ],
    };
    // Queue instead of sending now; submit will flush and refresh
    queueAction({ reviewerId, certId: certificationId, payload, count: 1 });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber && newPage >= 1 && newPage <= totalPages) {
      setPageNumber(newPage);
    }
  };

  const handleOpen = (event: any) => {
    const row = event?.data;
    setSelectedRow(row);
    const panel = (
      <div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-3 z-10 side-panel-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-800">Task Summary</h2>
            </div>
          </div>
        </div>
        <TaskSummaryPanel
          headerLeft={{
            primary: row?.userName || "",
            secondary: row?.accountName || "",
          }}
          headerRight={{
            primary: row?.entitlementName || "",
            secondary: row?.applicationName || "Application",
          }}
          riskLabel={row?.risk || "Critical"}
          jobTitle={row?.accountType}
          applicationName={row?.applicationName}
          reviewerId={reviewerId}
          certId={certificationId}
          selectedRow={row}
          onActionSuccess={() => {
            fetchData();
          }}
        />
      </div>
    );
    openSidebar(panel, { widthPx: 500 });
  };

  const handleClose = () => {
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const openModal = () => {
    alert("Modal opened");
  };

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 100,
    }),
    []
  );

  const detailCellRenderer = useCallback(DetailCellRenderer, []);

  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
    {
      field: "status",
      headerName: "Status",
      hide: true,
      filter: true,
    },
    {
      field: "entitlementName",
      headerName: "Entitlement",
      wrapText: true,
      enableRowGroup: true,
      cellRenderer: (params: ICellRendererParams) => {
        // Check if this is a group row
        if (params.node.group) {
          return (
            <div className="flex flex-col">
              <span className="ag-group-value">{params.value}</span>
              {params.data?.entitlementDescription && (
                <span className="entitlement-description">
                  {params.data.entitlementDescription}
                </span>
              )}
            </div>
          );
        }
        // Regular row
        return (
          <div className="flex flex-col gap-0">
            <span className="text-gray-800 break-words font-bold">
              {params.value}
            </span>
          </div>
        );
      },
    },
    { field: "entitlementType", headerName: "Type", width: 100 },
    {
      field: "accountName",
      headerName: "Account",
      width: 150,
      // cellRenderer: "agGroupCellRenderer",
      // cellClass: "ag-cell-no-padding",
      cellRenderer: (params: ICellRendererParams) => {
        const risk = params.data?.accountName || "Low";
        const riskColor =
          risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
        return <span style={{ color: riskColor }}>{risk}</span>;
      },
    },
    {
      field: "risk",
      headerName: "Risk",
      width: 100,
      hide: true,
      cellRenderer: (params: ICellRendererParams) => {
        const risk = params.data?.risk || "Low";
        const riskColor =
          risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
        return <span style={{ color: riskColor }}>{risk}</span>;
      },
    },
    {
      field: "userName",
      headerName: "Identity",
      width: 120,
      valueFormatter: (params) => formatDisplayName(params.value),
    },
    {
      field: "lastLoginDate",
      headerName: "Last Login",
      enableRowGroup: true,
      width: 130,
      valueFormatter: (params) => formatDateMMDDYY(params.value),
      // cellRenderer: (params: ICellRendererParams) => (
      //   </div>
      // ),
    },
    {
      field: "aiInsights",
      headerName: "Insights",
      width: 100,
      cellRenderer: (params: ICellRendererParams) => {
        const icon =
          params.value === "thumbs-up" ? (
            <svg width="21" height="16" viewBox="0 0 21 18" className="m-auto">
              <path
                fill="#34C759"
                d="M3.76 7.5V18.76H0V7.5H3.76ZM18.76 6.24C18.9277 6.23138 19.0954 6.25807 19.2522 6.31834C19.409 6.37861 19.5513 6.47112 19.6701 6.58989C19.7889 6.70866 19.8814 6.85103 19.9417 7.00781C20.0019 7.16458 20.0286 7.33226 20.02 7.5V12.16C19.9961 12.3819 19.9353 12.5982 19.84 12.8L17 17.54C16.772 17.9044 16.4571 18.2066 16.0837 18.4195C15.7102 18.6324 15.2898 18.7494 14.86 18.76H7.5C6.83696 18.76 6.20107 18.4966 5.73223 18.0278C5.26339 17.5589 5 16.923 5 16.26V7.12C5.00576 6.55515 5.19531 6.00753 5.54 5.56L10 0C10.3342 0 10.6547 0.13275 10.891 0.369045C11.1273 0.605341 11.26 0.925827 11.26 1.26V6.26L18.76 6.24Z"
              />
            </svg>
          ) : (
            <svg
              width="21"
              height="16"
              viewBox="0 0 21 18"
              fill="none"
              className="m-auto"
            >
              <path
                fill="#FF2D55"
                d="M3.76 11.24V0H0V11.26L3.76 11.24ZM18.76 12.5C18.9277 12.5086 19.0954 12.4819 19.2522 12.4217C19.409 12.3614 19.5513 12.2689 19.6701 12.1501C19.7889 12.0313 19.8814 11.889 19.9417 11.7322C20.0019 11.5754 20.0286 11.4077 20.02 11.24V6.58C19.9961 6.35812 19.9353 6.1418 19.84 5.94L17 1.2C16.7678 0.836499 16.4487 0.53649 16.0717 0.327006C15.6946 0.117522 15.2713 0.00514447 14.84 0H7.5C6.83696 0 6.20107 0.263392 5.73223 0.732233C5.26339 1.20107 5 1.83696 5 2.5V11.62C5 12.1933 5.18 12.7133 5.54 13.18L10 18.74C10.3342 18.74 10.6547 18.6073 10.891 18.371C11.1273 18.1347 11.26 17.8142 11.26 17.48V12.48L18.76 12.5Z"
              />
            </svg>
          );
        return (
          <div
            className="flex flex-col gap-0 mt-2 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors duration-200 ai-insights-cell"
            title="Click to view details"
          >
            <span className="text-gray-800">{icon}</span>
          </div>
        );
      },
      onCellClicked: handleOpen,
    },
    { field: "userType", headerName: "User Status", flex: 2, hide: true },
    { field: "department", headerName: "User Dept", flex: 2, hide: true },
    { field: "manager", headerName: "User Manager", flex: 2, hide: true },
    {
      field: "actions",
      headerName: "Actions",
      flex: 2,
      cellRenderer: (params: ICellRendererParams) => {
        return (
          <ActionButtons
            api={params.api}
            selectedRows={[params.data]}
            context="entitlement"
            reviewerId={reviewerId}
            certId={certificationId}
            // Removed onActionSuccess to prevent table refresh on action button clicks
            // Table will refresh only when actions are actually submitted via the Submit button
          />
        );
      },
    },
  ]);

  const groupableColumns = useMemo(() => {
    return columnDefs
      .filter((col) => col.enableRowGroup && col.field)
      .map((col) => ({
        field: col.field!,
        headerName: col.headerName || col.field!,
      }));
  }, [columnDefs]);

  const applyRowGrouping = (
    selectedField: string | null,
    retries = 5,
    delay = 500
  ) => {
    console.log(
      `Attempting to apply row grouping for: ${selectedField}, retries left: ${retries}`
    );
    if (gridApiRef.current) {
      try {
        const api = gridApiRef.current as any;
        
        // Check available methods
        console.log("Grid API methods:", {
          hasSetRowGroupColumns: typeof api.setRowGroupColumns === 'function',
          hasColumnApi: !!api.columnApi,
          hasColumnApiSetRowGroupColumns: api.columnApi && typeof api.columnApi.setRowGroupColumns === 'function',
        });
        
        // Try new API first (AG Grid v31+)
        if (typeof api.setRowGroupColumns === 'function') {
          console.log("Using gridApi.setRowGroupColumns");
          api.setRowGroupColumns(selectedField ? [selectedField] : []);
          console.log("Row grouping applied successfully for:", selectedField);
          return;
        } 
        // Fallback to columnApi (older versions)
        if (api.columnApi && typeof api.columnApi.setRowGroupColumns === 'function') {
          console.log("Using columnApi.setRowGroupColumns");
          api.columnApi.setRowGroupColumns(selectedField ? [selectedField] : []);
          console.log("Row grouping applied successfully for:", selectedField);
          return;
        }
        
        console.error("No valid grouping method found on grid API");
        if (retries > 0) {
          setTimeout(
            () => applyRowGrouping(selectedField, retries - 1, delay * 2),
            delay
          );
        }
      } catch (error) {
        console.error("Error applying row grouping:", error);
        if (retries > 0) {
          setTimeout(
            () => applyRowGrouping(selectedField, retries - 1, delay * 2),
            delay
          );
        }
      }
    } else if (retries > 0) {
      console.warn(`Grid API not ready, retrying (${retries} attempts left)`);
      setTimeout(
        () => applyRowGrouping(selectedField, retries - 1, delay * 2),
        delay
      );
    } else {
      console.error(
        "Failed to apply row grouping: Grid API not available after retries"
      );
    }
  };

  const handleGroupByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedField = event.target.value || null;
    console.log("Group by changed to:", selectedField);
    setGroupByColumn(selectedField);
    setGroupByOption(
      selectedField === "entitlementName"
        ? "Entitlements"
        : selectedField === "accountName"
        ? "Accounts"
        : "None"
    );
    if (isGridReady) {
      applyRowGrouping(selectedField);
    } else {
      console.log("Grid not ready, deferring group change to onGridReady");
    }
  };

  const handleGroupByOptionChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedOption = event.target.value;
    setGroupByOption(selectedOption);
    try {
      localStorage.setItem("appOwnerGroupBy", selectedOption);
    } catch {}
    const selectedField =
      selectedOption === "Entitlements"
        ? "entitlementName"
        : selectedOption === "Accounts"
        ? "accountName"
        : null;
    setGroupByColumn(selectedField);
    // Always try to apply grouping; helper will retry if grid isn't ready yet
    applyRowGrouping(selectedField);
  };

  const handleAppliedFilter = (filters: string[]) => {
    setSelectedFilters(filters);

    // Map status filter (Pending / Certify / Reject) to server-side query for grouped-by-entitlements API
    const selected = filters[0];
    let nextStatusFilterQuery: string | undefined;
    if (selected === "Pending") {
      nextStatusFilterQuery = "action eq Pending";
    } else if (selected === "Certify") {
      nextStatusFilterQuery = "action eq Approve";
    } else if (selected === "Reject") {
      nextStatusFilterQuery = "action eq Reject";
    } else {
      nextStatusFilterQuery = undefined;
    }
    setStatusFilterQuery(nextStatusFilterQuery);
    setPageNumber(1);
  };

  useEffect(() => {
    setPageNumber(1);
  }, [selectedFilters]);

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
    setPageNumber(1);
  };

  const filteredRowData = useMemo(() => {
    if (!selectedFilters || selectedFilters.length === 0) return rowData;
    const normalized = selectedFilters.map((f) => f.trim().toLowerCase());
    return rowData.filter((r) => {
      const action = String((r as any).action || "")
        .trim()
        .toLowerCase();
      const status = String((r as any).status || "")
        .trim()
        .toLowerCase();
      return normalized.some((f) => {
        if (f === "pending")
          return action === "pending" || status === "pending";
        if (f === "certify")
          return action === "approve" || status === "approved";
        if (f === "reject")
          return (
            action === "reject" || status === "revoked" || status === "rejected"
          );
        if (f === "delegated")
          return action === "delegate" || status === "delegated";
        if (f === "remediated")
          return action === "remediate" || status === "remediated";
        return false;
      });
    });
  }, [rowData, selectedFilters]);

  // Update ref when filteredRowData changes
  useEffect(() => {
    rowDataRef.current = filteredRowData;
  }, [filteredRowData]);

  // Create a map of entitlementName -> description for fast lookup
  const entitlementDescriptionMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredRowData.forEach((row) => {
      if (row.entitlementName) {
        const key = String(row.entitlementName).trim().toLowerCase();
        const desc = 
          row.entitlementDescription ||
          (row as any).description ||
          (row as any).entitlement_description ||
          "";
        // Store the description if we don't have one for this key, or if this one is longer (more complete)
        if (!map.has(key) || (desc && desc.length > (map.get(key) || "").length)) {
          map.set(key, desc);
        }
      }
    });
    // Update ref for cell renderer access
    entitlementDescriptionMapRef.current = map;
    
    // Debug logging
    console.log(`[entitlementDescriptionMap] Built map with ${map.size} entries`, {
      sampleEntries: Array.from(map.entries()).slice(0, 3),
      filteredRowDataLength: filteredRowData.length,
    });
    
    // Refresh group cells when map updates (if grouping is active)
    if (isGridReady && gridApiRef.current && (groupByOption === "Entitlements" || isGroupedByEntitlementCheckbox)) {
      setTimeout(() => {
        if (gridApiRef.current) {
          const groupNodes: any[] = [];
          gridApiRef.current.forEachNode((node: any) => {
            if (node.group) {
              groupNodes.push(node);
            }
          });
          if (groupNodes.length > 0) {
            gridApiRef.current.refreshCells({
              rowNodes: groupNodes,
              force: true,
            });
          }
        }
      }, 50);
    }
    
    return map;
  }, [filteredRowData, isGridReady, groupByOption, isGroupedByEntitlementCheckbox]);

  // Helper function to get description from rowData by entitlementName
  const getDescriptionForEntitlement = useCallback((entitlementName: string): string => {
    if (!entitlementName) return "";
    
    // Normalize the search key (trim and handle case)
    const normalizedKey = String(entitlementName).trim().toLowerCase();
    
    // First, try the map (fastest and most reliable)
    if (entitlementDescriptionMap.has(normalizedKey)) {
      return entitlementDescriptionMap.get(normalizedKey) || "";
    }
    
    // Fallback: Search in rowDataRef
    let row = rowDataRef.current.find((r) => {
      const rName = String(r.entitlementName || "").trim().toLowerCase();
      return rName === normalizedKey;
    });
    
    // If not found, try partial match
    if (!row) {
      row = rowDataRef.current.find((r) => {
        const rName = String(r.entitlementName || "").trim().toLowerCase();
        return rName.includes(normalizedKey) || normalizedKey.includes(rName);
      });
    }
    
    // Get description from various possible fields
    if (row) {
      const desc = 
        row.entitlementDescription ||
        (row as any).description ||
        (row as any).entitlement_description ||
        "";
      return desc;
    }
    
    return "";
  }, [entitlementDescriptionMap]);

  // React component for group cell renderer that always shows description
  // Using useCallback to create a stable function reference for AG Grid
  const GroupCellRenderer = useCallback((props: ICellRendererParams) => {
    const groupKey = props.value;
    const node: any = props.node;
    const isEntitlementGrouping = groupByOption === "Entitlements" || isGroupedByEntitlementCheckbox;
    
    // Always compute description fresh from refs - no memoization to ensure we get latest data
    let description = "";
    
    if (groupKey && isEntitlementGrouping && props.node.group) {
      const normalizedKey = String(groupKey).trim().toLowerCase();
      
      // PRIORITY 1: Direct lookup from the map (most reliable)
      description = entitlementDescriptionMapRef.current.get(normalizedKey) || "";
      
      // PRIORITY 2: From first leaf child node
      if (!description && node?.allLeafChildren?.length > 0) {
        for (const child of node.allLeafChildren) {
          if (child?.data && !child.group) {
            const childDesc = 
              child.data.entitlementDescription ||
              child.data.description ||
              child.data.entitlement_description ||
              "";
            if (childDesc && childDesc.trim()) {
              description = childDesc;
              break;
            }
          }
        }
      }
      
      // PRIORITY 3: From aggregated group data
      if (!description) {
        const aggData = props.data?.aggData || props.aggData || (props as any).aggData;
        description = 
          aggData?.entitlementDescription ||
          props.data?.entitlementDescription ||
          props.data?.description ||
          "";
      }
      
      // PRIORITY 4: Search in rowDataRef directly
      if (!description && rowDataRef.current.length > 0) {
        const matchingRow = rowDataRef.current.find((row: any) => {
          const rowEntitlementName = String(row.entitlementName || "").trim().toLowerCase();
          return rowEntitlementName === normalizedKey;
        });
        if (matchingRow) {
          description = 
            matchingRow.entitlementDescription ||
            matchingRow.description ||
            matchingRow.entitlement_description ||
            "";
        }
      }
      
      // Debug logging
      console.log(`[GroupCellRenderer] "${groupKey}"`, {
        foundDescription: !!description,
        descriptionLength: description.length,
        descriptionPreview: description ? description.substring(0, 50) : 'EMPTY',
        mapHasKey: entitlementDescriptionMapRef.current.has(normalizedKey),
        mapValue: entitlementDescriptionMapRef.current.get(normalizedKey) || 'NOT IN MAP',
        leafChildrenCount: node?.allLeafChildren?.length || 0,
        rowDataRefSize: rowDataRef.current.length,
      });
    }

    if (!props.node.group || !isEntitlementGrouping) {
      return <span className="ag-group-value">{props.value}</span>;
    }

    // Always show description if available
    const shouldShowDescription = description && description.trim().length > 0;
    
    return (
      <div 
        className="flex flex-col gap-1 py-2 w-full" 
        style={{ 
          minHeight: 'auto', 
          width: '100%',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="ag-group-value font-semibold text-base" style={{ fontWeight: 600 }}>{groupKey}</span>
        </div>
        {shouldShowDescription ? (
          <div 
            className="text-gray-600 text-sm break-words whitespace-pre-wrap leading-relaxed w-full mt-1" 
            style={{ 
              display: 'block',
              color: '#4b5563',
              fontSize: '13px',
              lineHeight: '1.6',
              wordBreak: 'break-word',
              fontWeight: 400,
              paddingLeft: '0px',
            }}
          >
            {description}
          </div>
        ) : (
          <div 
            className="text-gray-400 text-xs italic w-full mt-1" 
            style={{ 
              display: 'block',
              paddingLeft: '0px',
            }}
          >
            (No description available)
          </div>
        )}
      </div>
    );
  }, [groupByOption, isGroupedByEntitlementCheckbox]);

  const autoGroupColumnDef = useMemo<ColDef>(
    () => {
      console.log('[autoGroupColumnDef] Creating column def with GroupCellRenderer', {
        groupByOption,
        isGroupedByEntitlementCheckbox,
        mapSize: entitlementDescriptionMapRef.current.size,
      });
      return {
        minWidth: 300,
        flex: 1,
        autoHeight: true, // Allow row to expand to show description
        wrapText: true,
        cellRendererParams: {
          suppressExpand: true,
        },
        cellRenderer: GroupCellRenderer,
        cellStyle: {
          display: 'flex',
          alignItems: 'flex-start',
          padding: '8px',
        },
      };
    },
    [GroupCellRenderer, groupByOption, isGroupedByEntitlementCheckbox]
  );

  const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    params.api.forEachNode(function (node) {
      if (node.id === "0") {
        node.setExpanded(true);
      }
    });
    
    // Refresh all group cells to show descriptions when grouping by entitlement
    if (groupByOption === "Entitlements" || isGroupedByEntitlementCheckbox) {
      const refreshGroupCells = (delay: number) => {
        setTimeout(() => {
          const groupNodes: any[] = [];
          params.api.forEachNode((node: any) => {
            if (node.group) {
              groupNodes.push(node);
            }
          });
          if (groupNodes.length > 0) {
            params.api.refreshCells({
              rowNodes: groupNodes,
              force: true,
            });
          }
        }, delay);
      };
      
      // Refresh at multiple intervals
      refreshGroupCells(100);
      refreshGroupCells(300);
      refreshGroupCells(500);
    }
  }, [groupByOption, isGroupedByEntitlementCheckbox]);

  useEffect(() => {
    if (isGridReady && gridApiRef.current) {
      console.log("Grid API initialized, applying grouping", {
        groupByColumn,
        isGroupedByEntitlementCheckbox,
      });
      // If checkbox is checked, use checkbox grouping; otherwise use dropdown grouping
      const fieldToGroup = isGroupedByEntitlementCheckbox ? "entitlementName" : groupByColumn;
      applyRowGrouping(fieldToGroup);
      
      // If grouping by entitlement (checkbox), refresh group rows after a delay to show descriptions
      if (isGroupedByEntitlementCheckbox && fieldToGroup === "entitlementName") {
        setTimeout(() => {
          if (gridApiRef.current) {
            // Refresh all group rows to ensure descriptions are displayed
            const groupNodes: any[] = [];
            gridApiRef.current.forEachNode((node: any) => {
              if (node.group) {
                groupNodes.push(node);
              }
            });
            if (groupNodes.length > 0) {
              gridApiRef.current.refreshCells({
                rowNodes: groupNodes,
                force: true,
              });
            }
          }
        }, 200);
      }
    }
  }, [isGridReady, groupByColumn, rowData, isGroupedByEntitlementCheckbox]);

  // Refresh group cells when filteredRowData changes and grouping is active
  useEffect(() => {
    if (
      isGridReady &&
      gridApiRef.current &&
      filteredRowData.length > 0 &&
      (groupByOption === "Entitlements" || isGroupedByEntitlementCheckbox)
    ) {
      // Refresh multiple times with increasing delays to catch all cases
      const refreshGroupCells = (delay: number) => {
        setTimeout(() => {
          if (gridApiRef.current) {
            const groupNodes: any[] = [];
            gridApiRef.current.forEachNode((node: any) => {
              if (node.group) {
                groupNodes.push(node);
              }
            });
            if (groupNodes.length > 0) {
              // Force refresh to trigger cell renderer re-evaluation
              gridApiRef.current.refreshCells({
                rowNodes: groupNodes,
                force: true,
                columns: ['ag-Grid-AutoColumn'], // Refresh the auto group column specifically
              });
            }
          }
        }, delay);
      };
      
      // Refresh at multiple intervals to ensure all descriptions are found
      refreshGroupCells(100);
      refreshGroupCells(200);
      refreshGroupCells(300);
      refreshGroupCells(500);
      refreshGroupCells(1000);
    }
  }, [isGridReady, filteredRowData, groupByOption, isGroupedByEntitlementCheckbox]);

  return (
    <div className="w-full h-screen">
      <div className="mb-4">
        <BackButton text="Back" onClick={() => router.push("/access-review")} />
      </div>
      <div className="max-w-full">
        {}
        <Accordion
          iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
          open={true}
        >
          <ChartAppOwnerComponent
            rowData={rowData}
            onFilterChange={handleFilterChange}
            activeFilter={currentFilter}
            activeCount={totalItems}
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            certificationId={certificationId}
          />
        </Accordion>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 relative z-10 pt-10 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={groupByOption}
              onChange={handleGroupByOptionChange}
              className="border border-gray-300 rounded-md px-3 h-8 text-sm w-48"
            >
              <option value="None">Group by Accounts</option>
              <option value="Entitlements">Group by Entitlements</option>
              {}
            </select>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search..."
                className="border rounded px-3 h-8 text-sm w-44"
                onChange={(e) => {
                  setQuickFilterText(e.target.value);
                }}
              />
              <Filters
                gridApi={gridApiRef}
                context="status"
                appliedFilter={handleAppliedFilter}
                initialSelected="Pending"
              />
              <label className="flex items-center gap-2 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={isGroupedByEntitlementCheckbox}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    console.log("Checkbox clicked, isChecked:", isChecked);
                    console.log("Grid API available:", !!gridApiRef.current);
                    console.log("Is grid ready:", isGridReady);
                    setIsGroupedByEntitlementCheckbox(isChecked);
                    // Toggle AG Grid's row grouping on entitlementName column
                    const selectedField = isChecked ? "entitlementName" : null;
                    console.log("Applying row grouping for field:", selectedField);
                    applyRowGrouping(selectedField);
                    
                    // Refresh group rows after grouping is applied to show descriptions
                    if (isChecked && gridApiRef.current) {
                      // Multiple refreshes with delays to ensure descriptions appear
                      [100, 300, 500, 1000].forEach((delay) => {
                        setTimeout(() => {
                          if (gridApiRef.current) {
                            const groupNodes: any[] = [];
                            gridApiRef.current.forEachNode((node: any) => {
                              if (node.group) {
                                groupNodes.push(node);
                              }
                            });
                            if (groupNodes.length > 0) {
                              gridApiRef.current.refreshCells({
                                rowNodes: groupNodes,
                                force: true,
                              });
                              console.log(`[Checkbox] Refreshed ${groupNodes.length} group cells at ${delay}ms`);
                            }
                          }
                        }, delay);
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 whitespace-nowrap">Group by Entitlement</span>
              </label>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Exports 
              gridApi={gridApiRef.current} 
              certificationId={certificationId}
              onDownloadExcel={handleDownloadExcel}
              isActionLoading={isActionLoading}
            />
            <button
              className="flex items-center px-3 py-2 text-white rounded-md hover:bg-blue-400 transition-colors duration-200 text-xs font-medium"
              title="Open in Microsoft Teams"
            >
              <svg
                width="32px"
                height="32px"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
              >
                <path
                  fill="#5059C9"
                  d="M10.765 6.875h3.616c.342 0 .619.276.619.617v3.288a2.272 2.272 0 01-2.274 2.27h-.01a2.272 2.272 0 01-2.274-2.27V7.199c0-.179.145-.323.323-.323zM13.21 6.225c.808 0 1.464-.655 1.464-1.462 0-.808-.656-1.463-1.465-1.463s-1.465.655-1.465 1.463c0 .807.656 1.462 1.465 1.462z"
                />
                <path
                  fill="#7B83EB"
                  d="M8.651 6.225a2.114 2.114 0 002.117-2.112A2.114 2.114 0 008.65 2a2.114 2.114 0 00-2.116 2.112c0 1.167.947 2.113 2.116 2.113zM11.473 6.875h-5.97a.611.611 0 00-.596.625v3.75A3.669 3.669 0 008.488 15a3.669 3.669 0 003.582-3.75V7.5a.611.611 0 00-.597-.625z"
                />
                <path
                  fill="#000000"
                  d="M8.814 6.875v5.255a.598.598 0 01-.596.595H5.193a3.951 3.951 0 01-.287-1.476V7.5a.61.61 0 01.597-.624h3.31z"
                  opacity=".1"
                />
                <path
                  fill="#000000"
                  d="M8.488 6.875v5.58a.6.6 0 01-.596.595H5.347a3.22 3.22 0 01-.267-.65 3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z"
                  opacity=".2"
                />
                <path
                  fill="#000000"
                  d="M8.488 6.875v4.93a.6.6 0 01-.596.595H5.08a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z"
                  opacity=".2"
                />
                <path
                  fill="#000000"
                  d="M8.163 6.875v4.93a.6.6 0 01-.596.595H5.079a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.66z"
                  opacity=".2"
                />
                <path
                  fill="#000000"
                  d="M8.814 5.195v1.024c-.055.003-.107.006-.163.006-.055 0-.107-.003-.163-.006A2.115 2.115 0 016.593 4.6h1.625a.598.598 0 01.596.594z"
                  opacity=".1"
                />
                <path
                  fill="#000000"
                  d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z"
                  opacity=".2"
                />
                <path
                  fill="#000000"
                  d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z"
                  opacity=".2"
                />
                <path
                  fill="#000000"
                  d="M8.163 5.52v.647a2.115 2.115 0 01-1.465-1.242h.87a.598.598 0 01.595.595z"
                  opacity=".2"
                />
                <path
                  fill="url(#microsoft-teams-color-16__paint0_linear_2372_494)"
                  d="M1.597 4.925h5.969c.33 0 .597.267.597.596v5.958a.596.596 0 01-.597.596h-5.97A.596.596 0 011 11.479V5.521c0-.33.267-.596.597-.596z"
                />
                <path
                  fill="#ffffff"
                  d="M6.152 7.193H4.959v3.243h-.76V7.193H3.01v-.63h3.141v.63z"
                />
                <defs>
                  <linearGradient
                    id="microsoft-teams-color-16__paint0_linear_2372_494"
                    x1="2.244"
                    x2="6.906"
                    y1="4.46"
                    y2="12.548"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#5A62C3" />
                    <stop offset=".5" stopColor="#4D55BD" />
                    <stop offset="1" stopColor="#3940AB" />
                  </linearGradient>
                </defs>
              </svg>
            </button>
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
              columnDefs={columnDefs}
              gridApi={gridApiRef.current}
              visibleColumns={() => {
                const visibleCols: string[] = [];
                columnDefs.forEach((colDef) => {
                  if (colDef.field) {
                    visibleCols.push(colDef.field);
                  }
                });
                return visibleCols;
              }}
            />
          </div>
        </div>

        {/* Pagination at the top */}
        {!loading && !error && rowData.length > 0 && (
          <div className="mb-4">
            <CustomPagination
              totalItems={filteredRowData.length || totalItems}
              currentPage={pageNumber}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={(newPageSize) => {
                setPageSize(newPageSize);
                setPageNumber(1); // Reset to first page when changing page size
              }}
              pageSizeOptions={pageSizeSelector}
            />
          </div>
        )}
      </div>

      <div className="flex w-full relative">
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-4">
              <span className="ag-overlay-loading-center">
                ⏳ Loading certification data...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-600">
              {error}
              <button
                onClick={() => fetchData()}
                className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          ) : rowData.length === 0 ? (
            <div className="text-center py-4">
              <span className="ag-overlay-loading-center">
                No data to display.
              </span>
            </div>
          ) : (
            <div className="w-full">
              <AgGridReact
                rowData={filteredRowData}
                getRowId={(params: GetRowIdParams) =>
                  `${params.data.accountId}-${params.data.entitlementName}`
                }
                columnDefs={columnDefs}
                groupDefaultExpanded={-1}
                groupDisplayType="groupRows"
                defaultColDef={defaultColDef}
                autoGroupColumnDef={autoGroupColumnDef}
                rowGroupPanelShow={"never"}
                domLayout="autoHeight"
                rowSelection={{
                  mode: "multiRow",
                  masterSelects: "detail",
                }}
                masterDetail={groupByOption !== "Entitlements" && !isGroupedByEntitlementCheckbox}
                detailCellRenderer={detailCellRenderer}
                detailRowAutoHeight={true}
                getGroupRowAgg={(params: any) => {
                  // Aggregate entitlementDescription for group rows
                  // params.nodes contains all nodes in this group
                  let description = "";
                  
                  console.log('[getGroupRowAgg] Called for key:', params.key, {
                    nodesCount: params.nodes?.length || 0,
                    mapSize: entitlementDescriptionMapRef.current.size,
                    mapHasKey: params.key ? entitlementDescriptionMapRef.current.has(String(params.key).trim().toLowerCase()) : false
                  });
                  
                  if (params.nodes && Array.isArray(params.nodes) && params.nodes.length > 0) {
                    // Try to find description from any child node (leaf nodes first)
                    for (const node of params.nodes) {
                      if (node && node.data && !node.group) {
                        const desc = 
                          node.data.entitlementDescription ||
                          node.data.description ||
                          node.data.entitlement_description ||
                          "";
                        if (desc && desc.trim()) {
                          description = desc;
                          console.log('[getGroupRowAgg] Found description from leaf node:', desc.substring(0, 50));
                          break; // Use first non-empty description found
                        }
                      }
                    }
                    
                    // If still no description, try from group nodes
                    if (!description) {
                      for (const node of params.nodes) {
                        if (node && node.data) {
                          const desc = 
                            node.data.entitlementDescription ||
                            node.data.description ||
                            node.data.entitlement_description ||
                            "";
                          if (desc && desc.trim()) {
                            description = desc;
                            console.log('[getGroupRowAgg] Found description from group node:', desc.substring(0, 50));
                            break;
                          }
                        }
                      }
                    }
                  }
                  
                  // Also try to get from the entitlement description map using the group key
                  if (!description && params.key) {
                    const normalizedKey = String(params.key).trim().toLowerCase();
                    description = entitlementDescriptionMapRef.current.get(normalizedKey) || "";
                    if (description) {
                      console.log('[getGroupRowAgg] Found description from map:', description.substring(0, 50));
                    }
                  }
                  
                  console.log('[getGroupRowAgg] Returning:', description ? description.substring(0, 50) : 'EMPTY');
                  return { entitlementDescription: description };
                }}
                onGridReady={(params: any) => {
                  console.log(
                    "onGridReady triggered at",
                    new Date().toISOString()
                  );
                  gridApiRef.current = params.api;
                  params.api.sizeColumnsToFit();
                  setIsGridReady(true);
                  console.log("Grid initialized:", {
                    api: !!params.api,
                    columnApi: !!(params.api as any).columnApi,
                    enterpriseModules: (params.api as any).isEnterprise?.()
                      ? "Loaded"
                      : "Not loaded",
                    columns: (gridApiRef.current as any)?.columnApi
                      ?.getAllColumns()
                      ?.map((col: any) => col.getColId()),
                  });
                }}
                onFirstDataRendered={onFirstDataRendered as any}
                onModelUpdated={(params: any) => {
                  // Refresh group cells when model updates (e.g., when grouping is applied)
                  if ((groupByOption === "Entitlements" || isGroupedByEntitlementCheckbox) && params.api) {
                    const refreshGroupCells = (delay: number) => {
                      setTimeout(() => {
                        const groupNodes: any[] = [];
                        params.api.forEachNode((node: any) => {
                          if (node.group) {
                            groupNodes.push(node);
                          }
                        });
                        if (groupNodes.length > 0) {
                          params.api.refreshCells({
                            rowNodes: groupNodes,
                            force: true,
                          });
                        }
                      }, delay);
                    };
                    
                    // Refresh at multiple intervals
                    refreshGroupCells(100);
                    refreshGroupCells(300);
                    refreshGroupCells(500);
                  }
                }}
                onRowGroupOpened={(params: any) => {
                  // Refresh group row cells when expanded to show description
                  if (params.node.group && gridApiRef.current) {
                    setTimeout(() => {
                      gridApiRef.current.refreshCells({
                        rowNodes: [params.node],
                        force: true,
                      });
                    }, 0);
                  }
                }}
                onSelectionChanged={() => {
                  if (gridApiRef.current) {
                    const rows =
                      gridApiRef.current.getSelectedRows() as RowData[];
                    setSelectedRows(rows || []);
                    
                    // Check if all visible rows are selected
                    let totalVisible = 0;
                    let totalSelected = 0;
                    gridApiRef.current.forEachNodeAfterFilter((node) => {
                      // Only count non-group rows
                      if (!node.group) {
                        totalVisible++;
                        if (node.isSelected()) {
                          totalSelected++;
                        }
                      }
                    });
                    
                    setIsAllSelected(totalSelected === totalVisible && totalVisible > 0);
                  }
                }}
                pagination={true}
                quickFilterText={quickFilterText}
                overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
                overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
                suppressHorizontalScroll={true}
                className="ag-theme-quartz ag-main"
              />
              <div className="mt-4">
                <CustomPagination
                  totalItems={filteredRowData.length || totalItems}
                  currentPage={pageNumber}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={(newPageSize) => {
                    setPageSize(newPageSize);
                    setPageNumber(1); // Reset to first page when changing page size
                  }}
                  pageSizeOptions={pageSizeSelector}
                />
              </div>
            </div>
          )}
        </div>
        {/* Right sidebar content is rendered globally via RightSideBarHost */}
      </div>

      {/* Floating ActionButtons when any rows are selected (individual or all) */}
      {selectedRows.length > 0 && gridApiRef.current &&
        createPortal(
          <div
            className={`fixed left-1/2 transform -translate-x-1/2 z-50 rounded-lg shadow-2xl px-4 py-3 flex items-center gap-2 transition-all duration-300 ${
              isActionPanelVisible ? "bottom-24" : "bottom-6"
            }`}
            style={{
              backgroundColor: "#d3d3d3",
              border: "1px solid #b0b0b0",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
            }}
          >
            <ActionButtons
              api={gridApiRef.current as any}
              selectedRows={selectedRows}
              context="entitlement"
              reviewerId={reviewerId}
              certId={certificationId}
            />
          </div>,
          document.body
        )}

      {/* Action Completed Toast */}
      <ActionCompletedToast
        isVisible={showCompletionToast}
        message={"Action completed"}
        onClose={() => setShowCompletionToast(false)}
        duration={1500}
      />
    </div>
  );
}

export default function AppOwner() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center">
          <div className="text-center py-4">
            <span className="ag-overlay-loading-center">
              ⏳ Loading application owner data...
            </span>
          </div>
        </div>
      }
    >
      <AppOwnerContent />
    </Suspense>
  );
}
