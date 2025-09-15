"use client";
import { useMemo, useRef, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
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
import {
  AlertTriangle,
  CheckCircle,
  CheckCircleIcon,
  MailIcon,
} from "lucide-react";
import RightSidebar from "@/components/RightSideBar";
import Accordion from "@/components/Accordion";
import ChartAppOwnerComponent from "@/components/ChartForAppOwner";
import "./AppOwner.css";
import {
  getAppOwnerDetails,
  getGroupedAppOwnerDetails,
  getAppAccounts,
  updateAction,
  getAPPOCertificationDetailsWithFilter,
} from "@/lib/api";
import { PaginatedResponse } from "@/types/api";

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
  aiInsights: string;
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
      const groupEntitlementDescription = groupEntitlement.description || "";
      const accounts = Array.isArray(group.accounts) ? group.accounts : [];

      return accounts.map((account: any, index: number) => {
        const accountInfo = account.accountInfo || {};
        const userInfo = account.userInfo || {};
        const access = account.access || {};
        const entityEntitlement = account.entityEntitlement || {};

        return {
          accountId: accountInfo.accountId || `grouped-${index}`,
          accountName: accountInfo.accountName || "",
          userId: userInfo.UserID || "",
          entitlementName: groupEntitlementName,
          entitlementDescription: groupEntitlementDescription,
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
          status: "Pending", // Default status for grouped data
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
    return item.entityEntitlements.map((entitlement: any) => ({
      accountId: item.accountInfo?.accountId || "",
      accountName: item.accountInfo?.accountName || "",
      userId: item.userInfo?.UserID || "",
      entitlementName: entitlement.entitlementInfo?.entitlementName || "",
      entitlementDescription:
        entitlement.entitlementInfo?.entitlementDescription || "",
      aiInsights: entitlement.aiassist?.recommendation || "",
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
      status: "Pending", // Default status for ungrouped data
    }));
  });
};

function AppOwnerContent() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
  const [isGridReady, setIsGridReady] = useState(false);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSizeSelector = [10, 20, 50, 100];
  const defaultPageSize = pageSizeSelector[0];
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
  const [quickFilterText, setQuickFilterText] = useState("");
  const [currentFilter, setCurrentFilter] = useState<string>("");

  // Get reviewerId and certificationId from URL parameters, with fallback to hardcoded values
  const reviewerId = searchParams.get('reviewerId') || "430ea9e6-3cff-449c-a24e-59c057f81e3d";
  const certificationId = searchParams.get('certificationId') || "4f5c20b8-1031-4114-a688-3b5be9cc2224";
  
  // Debug logging
  console.log('App Owner - URL Parameters:', {
    reviewerId,
    certificationId,
    allParams: Object.fromEntries(searchParams.entries())
  });

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
      if (!Number.isInteger(defaultPageSize) || defaultPageSize < 1) {
        throw new Error("Invalid page size: must be a positive integer");
      }

      console.log("Fetching data with:", {
        pageNumber,
        pageSize: defaultPageSize,
        reviewerId,
        certificationId,
        groupBy: groupByOption,
      });

      let response: PaginatedResponse<any>;
      const isGroupedEnts = groupByOption === "Entitlements";
      const isGroupedAccounts = groupByOption === "Accounts";
      
      // If a filter is applied, use the filtered API
      if (currentFilter) {
        response = await getAPPOCertificationDetailsWithFilter(
          reviewerId,
          certificationId,
          currentFilter,
          defaultPageSize,
          pageNumber
        );
      } else if (isGroupedEnts) {
        response = await getGroupedAppOwnerDetails(
          reviewerId,
          certificationId,
          defaultPageSize,
          pageNumber
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
            defaultPageSize,
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
              `https://preview.keyforge.ai/entities/api/v1/ACMEPOC/getApplications/${reviewerId}`
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
          defaultPageSize,
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
      const existingCampaignData = localStorage.getItem("selectedCampaignSummary");
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
  }, [pageNumber, defaultPageSize, reviewerId, certificationId, groupByOption, currentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (
    lineItemId: string,
    actionType: "Approve" | "Reject",
    justification: string
  ) => {
    try {
      const payload = {
        entitlementAction: [
          {
            lineItemIds: [lineItemId],
            actionType,
            justification,
          },
        ],
      };
      await updateAction(reviewerId, certificationId, payload);
      alert(`${actionType} action submitted successfully`);
      setPageNumber(1);
    } catch (err: any) {
      console.error("Error updating action:", err);
      setError(err.message || "Failed to submit action. Please try again.");
    }
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
    setSelectedRow(event?.data);
    setSidebarOpen(true);
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

  const autoGroupColumnDef = useMemo<ColDef>(
    () => ({
      minWidth: 200,
      cellRendererParams: {
        suppressExpand: true,
      },
    }),
    []
  );

  const detailCellRenderer = useCallback(DetailCellRenderer, []);

  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
    {
      field: "entitlementName",
      headerName: "Entitlement",
      autoHeight: true,
      wrapText: true,
      enableRowGroup: true,
      cellStyle: { whiteSpace: 'normal', lineHeight: '1.4' },
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex flex-col gap-0">
          <span className="text-gray-800 break-words">{params.value}</span>
        </div>
      ),
    },
    { field: "entitlementType", headerName: "Type", width:100},
    {
      field: "accountName",
      headerName: "Account",
      // cellRenderer: "agGroupCellRenderer",
      cellClass: "ag-cell-no-padding",
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
      hide:true,
      cellRenderer: (params: ICellRendererParams) => {
        const risk = params.data?.risk || "Low";
        const riskColor =
          risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
        return <span style={{ color: riskColor }}>{risk}</span>;
      },
    },
    { field: "userName", headerName: "Identity", width: 120 },
    {
      field: "lastLoginDate",
      headerName: "Last Login",
      enableRowGroup: true,
      width: 130,
      valueFormatter: (params) => formatDateMMDDYY(params.value),
      // cellRenderer: (params: ICellRendererParams) => (
      //   <div className="flex flex-col gap-0">
      //     <span className="text-gray-800">{params.value}</span>
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
    { field: "status", headerName: "Status", width: 120, enableRowGroup: true },
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
    if (gridApiRef.current && (gridApiRef.current as any).columnApi) {
      const columnApi = (gridApiRef.current as any).columnApi;
      // console.log("Row grouping applied successfully for:", selectedField);
      columnApi.setRowGroupColumns([]);
      if (selectedField) {
        columnApi.setRowGroupColumns([selectedField]);
      }
    } else if (retries > 0) {
      // console.warn(`Grid API not ready, retrying (${retries} attempts left)`);
      setTimeout(
        () => applyRowGrouping(selectedField, retries - 1, delay * 2),
        delay
      );
    } else {
      // console.error(
      //   "Failed to apply row grouping: Grid API or Column API not available after retries"
      // );
      // alert("Unable to group rows at this time. Please try again later.");
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
    const selectedField =
      selectedOption === "Entitlements"
        ? "entitlementName"
        : selectedOption === "Accounts"
        ? "accountName"
        : null;
    setGroupByColumn(selectedField);
    if (isGridReady) {
      applyRowGrouping(selectedField);
    }
  };

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
    setPageNumber(1); // Reset to first page when filter changes
  };

  const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    params.api.forEachNode(function (node) {
      if (node.id === "0") {
        node.setExpanded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (
      isGridReady &&
      gridApiRef.current &&
      (gridApiRef.current as any).columnApi
    ) {
      console.log("Grid API and Column API initialized successfully", {
        groupByColumn,
        columns: (gridApiRef.current as any).columnApi
          ?.getAllColumns()
          ?.map((col: any) => col.getColId()),
      });
      applyRowGrouping(groupByColumn);
    }
  }, [isGridReady, groupByColumn]);

  return (
    <div className="w-full h-screen">
      <div className="max-w-full">
        <h1 className="text-xl font-bold mb-6 border-b border-gray-300 pb-2 text-blue-950">
          Application Owner
        </h1>
        <Accordion
          iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
          open={true}
        >
          <ChartAppOwnerComponent 
            rowData={rowData} 
            onFilterChange={handleFilterChange}
          />
        </Accordion>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 relative z-10 pt-10 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={groupByOption}
              onChange={handleGroupByOptionChange}
              className="border border-gray-300 rounded-md px-3 h-8 text-sm w-44"
            >
              <option value="None">All</option>
              <option value="Entitlements">Group by Entitlements</option>
              <option value="Accounts">Group by Accounts</option>
            </select>
            {selectedRows.length > 0 && gridApiRef.current && (
              <ActionButtons
                api={gridApiRef.current as any}
                selectedRows={selectedRows}
                context="entitlement"
                reviewerId={reviewerId}
                certId={certificationId}
              />
            )}
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
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Pagination moved to bottom below the grid */}
            <Exports gridApi={gridApiRef.current} />
            <MailIcon
              size={32}
              color="#35353A"
              className="transform scale-[.6]"
            />
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
                rowData={rowData}
                getRowId={(params: GetRowIdParams) =>
                  `${params.data.accountId}-${params.data.entitlementName}`
                }
                columnDefs={columnDefs}
                groupDefaultExpanded={-1}
                defaultColDef={defaultColDef}
                autoGroupColumnDef={autoGroupColumnDef}
                rowGroupPanelShow={"never"}
                domLayout="autoHeight"
                rowSelection={{
                  mode: "multiRow",
                  masterSelects: "detail",
                }}
                masterDetail={true}
                detailCellRenderer={detailCellRenderer}
                detailRowAutoHeight={true}
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
                onSelectionChanged={() => {
                  if (gridApiRef.current) {
                    const rows =
                      gridApiRef.current.getSelectedRows() as RowData[];
                    setSelectedRows(rows || []);
                  }
                }}
                pagination={true}
                quickFilterText={quickFilterText}
                overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
                overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
                suppressHorizontalScroll={true}
                className="ag-theme-quartz ag-main"
              />
              <div className="mt-0">
                <CustomPagination
                  totalItems={totalItems}
                  currentPage={pageNumber}
                  totalPages={totalPages}
                  pageSize={defaultPageSize}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          )}
        </div>
        {isSidebarOpen && (
          <div className="fixed top-16 right-0 w-[500px] h-[calc(100vh-4rem)] flex-shrink-0 border-l border-gray-200 bg-white shadow-lg side-panel z-50">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-3 z-10 side-panel-header">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Task Summary
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-white transition-colors duration-200"
                  title="Close panel"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRow?.userName || "Tye Davis"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedRow?.accountName || "tye.davis@conductorone.com"}{" "}
                      - User - SSO
                    </p>
                  </div>
                  <span className="text-gray-400 text-lg">→</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRow?.entitlementName || "Admin"}
                    </p>
                    <p className="text-xs text-gray-600">AWS - IAM role</p>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-md">
                <p className="font-semibold flex items-center text-yellow-700 mb-2 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  Copilot suggests taking a closer look at this access
                </p>
                <ul className="list-decimal list-inside text-xs text-yellow-800 space-y-1">
                  <li>
                    This access is critical risk and this user might be
                    over-permissioned
                  </li>
                  <li>
                    Users with the job title Sales don't usually have this
                    access
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-700">
                      <strong>{selectedRow?.userName || "Tye Davis"}</strong> is{" "}
                      <strong>active</strong> in Okta
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-700">
                  <p>
                    {selectedRow?.userName || "Tye Davis"} last logged into AWS
                    on Nov 1, 2023: <strong>1 month ago</strong>
                  </p>
                </div>

                <div className="text-red-600 text-xs">
                  <p>
                    This entitlement is marked as <strong>Critical</strong> risk
                  </p>
                </div>

                <div className="text-xs text-gray-700 space-y-0.5">
                  <p>
                    1 out of 11 users with the title Sales have this entitlement
                  </p>
                  <p>
                    1 out of 2495 users in your organization have this
                    entitlement
                  </p>
                  <p>
                    1 out of 13 accounts in this application have this
                    entitlement
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold text-gray-700">
                    Should this user have this access?
                  </h3>
                  <div className="space-x-2">
                    <ActionButtons
                      api={{} as any}
                      selectedRows={selectedRow ? [selectedRow] : []}
                      context="entitlement"
                      reviewerId={reviewerId}
                      certId={certificationId}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Certify or recommend removing this user's access.
                  <a href="#" className="text-blue-600 hover:underline ml-1">
                    More about decisions
                  </a>
                </p>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <input
                  type="text"
                  placeholder="Ask me Anything"
                  value={comment}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  disabled={!comment.trim() || !selectedRow?.lineItemId}
                  className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    comment.trim() && selectedRow?.lineItemId
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (selectedRow?.lineItemId) {
                      handleAction(selectedRow.lineItemId, "Approve", comment);
                    }
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppOwner() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center py-4">
          <span className="ag-overlay-loading-center">
            ⏳ Loading application owner data...
          </span>
        </div>
      </div>
    }>
      <AppOwnerContent />
    </Suspense>
  );
}
