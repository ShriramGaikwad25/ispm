"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AgGridReact from "@/components/ClientOnlyAgGrid";
import "@/lib/ag-grid-setup";
import { useRouter } from "next/navigation";
import { formatDateMMDDYY as formatDateShared } from "@/utils/utils";
import { defaultColDef } from "@/components/dashboard/columnDefs";
import CustomPagination from "@/components/agTable/CustomPagination";
import ColumnSettings from "@/components/agTable/ColumnSettings";
import {
  GridApi,
  GetRowIdParams,
  RowClickedEvent,
  ColDef,
  IDetailCellRendererParams,
} from "ag-grid-enterprise";
import { useCertifications, fetchAccessDetails, useCertificationDetails } from "@/hooks/useApi";
import {
  CertificationRow,
  RawCertification,
  UserRowData,
} from "@/types/certification";
import { PaginatedResponse } from "@/types/api";
import { getCertificationDetails, getCertifications } from "@/lib/api";
import {
  CheckCircleIcon,
  DownloadIcon,
  MoreVertical,
  UserRoundCheckIcon,
  Search,
  Filter,
  Upload,
  Settings,
} from "lucide-react";
import { createPortal } from "react-dom";
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import HorizontalProgressBar from "@/components/HorizontalProgressBar";
import { useLoading } from "@/contexts/LoadingContext";
import ActionCompletedToast from "@/components/ActionCompletedToast";
import { getReviewerId, getCookie, COOKIE_NAMES } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import ProxyActionModal from "@/components/ProxyActionModal";
import SignOffModal from "@/components/SignOffModal";
import { validatePassword, signOffCertification, getAccessDetails, getLineItemDetails } from "@/lib/api";
import * as XLSX from "xlsx";
import "./AccessReview.css"

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([MasterDetailModule]);

// Horizontal Progress Renderer
const HorizontalProgressRenderer = (props: any) => {
  const value = props.value || 0;

  return (
    <div className="w-full px-2 flex justify-center items-center mt-4">
      <HorizontalProgressBar 
        value={value} 
        height={8} 
        showPercentage={true}
        className="w-full max-w-[150px]"
      />
    </div>
  );
};

// Detail Cell Renderer for Description
const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const description = props.data?.description || "No description available";
  return (
    <div className="flex p-3 bg-gray-50 border-t border-gray-200 w-full">
      <div className="flex flex-col w-full">
        <span className="text-gray-800 text-sm break-words whitespace-pre-wrap">
          {description}
        </span>
      </div>
    </div>
  );
};

// Date Formatter (delegates to shared util)
export const formatDateMMDDYY = (dateString?: string) =>
  formatDateShared(dateString);

const OpenTab: React.FC = () => {
  const reviewerId = getReviewerId() || "";
  const { user } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<UserRowData[]>([]);
  const [filteredRowData, setFilteredRowData] = useState<UserRowData[]>([]);
  const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(
    new Map()
  );
  const router = useRouter();
  const pageSizeSelector = [10, 20, 50, 100];
  const [pageSize, setPageSize] = useState(pageSizeSelector[0]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("Active");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedCertificationRow, setSelectedCertificationRow] = useState<CertificationRow | null>(null);
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [selectedSignOffRow, setSelectedSignOffRow] = useState<CertificationRow | null>(null);
  const [signOffError, setSignOffError] = useState<string | null>(null);
  
  const { showApiLoader, hideApiLoader } = useLoading();
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const activeColumnDefs = useMemo<ColDef[]>(() =>[
    {
      headerName: "Campaign Name",
      field: "certificationName",
      width: 400,
      wrapText: true,
      autoHeight: true,
      cellStyle: { fontWeight: 'bold' },
      onCellClicked: handleRowClick,
    },
    { 
      headerName: "Type", 
      field: "certificationType", 
      width: 150,
      onCellClicked: handleRowClick,
    },
    { 
      headerName: "Owner", 
      field: "certificateOwner", 
      width: 140,
      onCellClicked: handleRowClick,
    },
    {
      headerName: "Progress",
      field: "progress",
      width: 180,
      cellRenderer: HorizontalProgressRenderer,
      onCellClicked: handleRowClick,
    },
    { headerName: "Due On", field: "certificationExpiration", width: 140,valueFormatter: (params) => formatDateMMDDYY(params.value), },
    {
      headerName: "Estimated time to completion",
      field: "estimatedTimeToCompletion",
      width: 250,
      hide: true,
    },
    { headerName: "Tags", field: "tags", width: 250, hide: true },
    {
      headerName: "Created On",
      field: "certificationCreatedOn",
      width: 160,
      valueFormatter: (params) => formatDateMMDDYY(params.value),
    },
    {
      headerName: "Actions",
      width: 200,
      cellRenderer: (params: any) => (
        <div
          className="flex space-x-4 h-full items-start"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            title="Reassign"
            aria-label="Reassign selected rows"
            className="p-1 rounded transition-colors duration-200"
            onClick={() => handleReassign(params.data)}
            disabled={isActionLoading}
          >
            <UserRoundCheckIcon
              className="cursor-pointer"
              color="#b146ccff"
              strokeWidth="1"
              size="24"
            />
          </button>
          <button
            title="Sign Off"
            aria-label="Sign off selected rows"
            className="p-1 rounded transition-colors duration-200"
            onClick={() => handleSignOff(params.data)}
            disabled={isActionLoading}
          >
            <CheckCircleIcon
              className="cursor-pointer"
              strokeWidth="1"
              size="24"
              color="#e73c3cff"
            />
          </button>
          <button
            title="Download Excel"
            aria-label="Download Excel"
            className="p-1 rounded transition-colors duration-200"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Download Excel button clicked!");
              console.log("isActionLoading:", isActionLoading);
              console.log("Button should not be disabled");
              try {
                await handleDownloadExcel();
              } catch (error) {
                console.error("Error in handleDownloadExcel:", error);
                alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
              }
            }}
            disabled={isActionLoading}
          >
            <DownloadIcon
              className="cursor-pointer"
              strokeWidth="1"
              size="24"
            />
          </button>
          <button
            title="Upload"
            aria-label="Upload file"
            className="p-1 rounded transition-colors duration-200"
            onClick={handleUpload}
            disabled={isActionLoading}
          >
            <Upload
              className="cursor-pointer"
              strokeWidth="1"
              size="24"
            />
          </button>
          <button
            ref={menuButtonRef}
            onClick={toggleMenu}
            title="More Actions"
            className={`cursor-pointer rounded-sm hover:opacity-80 ${
              isMenuOpen ? "bg-[#6D6E73]/20" : ""
            }`}
            aria-label="More actions"
          >
            <MoreVertical
              color="#35353A"
              size="32"
              className="transform scale-[0.6]"
            />
          </button>
          <div className="relative flex items-center">
            {isMenuOpen &&
              createPortal(
                <div
                  ref={menuRef}
                  className="absolute bg-white border border-gray-300 shadow-lg rounded-md z-50"
                  style={{
                    position: "fixed",
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                    minWidth: "160px",
                    padding: "8px",
                  }}
                >
                  <ul className="py-2 text-sm text-gray-700">
                    <li 
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={handleReleaseClaim}
                    >
                      Release/Claim
                    </li>
                  </ul>
                </div>,
                document.body
              )}
          </div>
        </div>
      ),
    },
    ],
    []
  );

  const { data, error } = useCertifications(
    reviewerId,
    pageSize,
    pageNumber
  );
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const isAuthenticated = true; // Replace with actual auth check
    if (!isAuthenticated) {
      router.push("/");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const toggleFilterMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFilterMenuOpen((prev) => !prev);
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterMenuPosition({
        top: rect.bottom,
        left: rect.left,
      });
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom,
        left: rect.left - 128,
      });
    }
  };

  // Generic action handler for all buttons
  const handleAction = async (actionName: string) => {
    try {
      setIsActionLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // End local loading state quickly (no overlay)
      setTimeout(() => {
        setIsActionLoading(false);
      }, 100);
      
      // Show completion toast immediately
      setShowCompletionToast(true);
      
    } catch (error) {
      console.error(`Error performing ${actionName}:`, error);
      setIsActionLoading(false);
    }
  };

  const handleReassign = (rowData: CertificationRow) => {
    setSelectedCertificationRow(rowData);
    setIsReassignModalOpen(true);
  };

  const handleSignOff = (rowData: CertificationRow) => {
    setSelectedSignOffRow(rowData);
    setSignOffError(null);
    setIsSignOffModalOpen(true);
  };

  const handleSignOffConfirm = async (password: string, comments: string) => {
    if (!selectedSignOffRow) {
      setSignOffError("No certification selected");
      return;
    }

    try {
      setIsActionLoading(true);
      setSignOffError(null);
      showApiLoader?.(true, "Validating password...");

      // Get current user's username from logged-in user
      // Try auth context first (user.email contains the userid/username)
      let userName = user?.email;
      
      // Fallback to cookie if auth context doesn't have it
      if (!userName) {
        try {
          const uidTenant = getCookie(COOKIE_NAMES.UID_TENANT);
          if (uidTenant) {
            const parsed = JSON.parse(uidTenant);
            userName = parsed?.userid;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Final fallback to reviewerId
      if (!userName) {
        userName = reviewerId;
      }
      
      if (!userName) {
        throw new Error("Unable to determine user name");
      }

      // Step 1: Validate password
      const isPasswordValid = await validatePassword(userName, password);
      
      if (!isPasswordValid) {
        setSignOffError("Invalid password. Please try again.");
        setIsActionLoading(false);
        hideApiLoader?.();
        return;
      }

      // Step 2: Sign off certification
      showApiLoader?.(true, "Signing off certification...");
      await signOffCertification(
        selectedSignOffRow.reviewerId,
        selectedSignOffRow.certificationId,
        comments
      );

      // Success
      setIsSignOffModalOpen(false);
      setSelectedSignOffRow(null);
      setSignOffError(null);
      setShowCompletionToast(true);
      
      // Optionally refresh the data
      // You might want to refetch certifications here
    } catch (error) {
      console.error("Error signing off certification:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sign off certification";
      setSignOffError(errorMessage);
    } finally {
      setIsActionLoading(false);
      hideApiLoader?.();
    }
  };

  const handleDownloadExcel = async () => {
    console.log("=== handleDownloadExcel START ===");
    console.log("rowData length:", rowData.length);
    console.log("filteredRowData length:", filteredRowData.length);
    console.log("data:", data);
    console.log("data?.certifications:", data?.certifications);
    console.log("data?.certifications?.items:", data?.certifications?.items);
    console.log("data?.certifications?.items?.length:", data?.certifications?.items?.length);
    console.log("reviewerId:", reviewerId);
    
    // Get certifications from the API data directly, or use rowData/filteredRowData
    let certsToProcess: CertificationRow[] = [];
    
    if (filteredRowData.length > 0) {
      certsToProcess = filteredRowData as CertificationRow[];
      console.log("Using filteredRowData, count:", certsToProcess.length);
    } else if (rowData.length > 0) {
      certsToProcess = rowData as CertificationRow[];
      console.log("Using rowData, count:", certsToProcess.length);
    } else if (data?.certifications?.items && data.certifications.items.length > 0) {
      // Map the raw API data to CertificationRow format (same as useEffect at line 732)
      console.log("Using data from API directly, items count:", data.certifications.items.length);
      const certificationData = data.certifications;
      certsToProcess = certificationData.items.map((item: RawCertification): CertificationRow => {
        // Match the exact mapping from useEffect (line 732-764) - these are accessed directly
        const certInfo = item.reviewerCertificationInfo as any;
        const actionInfo = item.reviewerCertificateActionInfo as any;
        
        const totalActions = actionInfo?.totalActions ?? 0;
        const totalActionsCompleted = actionInfo?.totalActionsCompleted ?? 0;
        const progress = totalActions > 0 ? Math.round((totalActionsCompleted / totalActions) * 100) : 0;
        
        return {
          id: `${item.reviewerId}-${item.certificationId}`,
          taskId: item.campaignId ?? "",
          reviewerId: item.reviewerId,
          certificationId: item.certificationId,
          campaignId: item.campaignId,
          certificationName: certInfo?.certificationName ?? "",
          certificationType: certInfo?.certificationType ?? "",
          certificationCreatedOn: certInfo?.certificationCreatedOn ?? "",
          certificationExpiration: certInfo?.certificationExpiration ?? "",
          status: certInfo?.status ?? "",
          certificationSignedOff: certInfo?.certificationSignedOff ?? false,
          certificateRequester: certInfo?.certificateRequester ?? "",
          certificateOwner: certInfo?.certificateRequester ?? "",
          percentageCompleted: actionInfo?.percentageCompleted ?? 0,
          progress: progress,
          description: certInfo?.certificationDescription ?? "No description provided",
          reviewerName: certInfo?.reviewerName ?? "",
          dueIn: certInfo?.dueIn ?? "",
          estimatedTimeToCompletion: certInfo?.estimatedTimeToCompletion ?? "",
        } as CertificationRow;
      });
      console.log("Mapped certifications from API, count:", certsToProcess.length);
    } else {
      // If no data is available, try to fetch it directly
      console.warn("No data available in state, fetching directly from API...");
      try {
        setIsActionLoading(true);
        showApiLoader?.(true, "Loading certifications...");
        const freshData = await getCertifications(reviewerId, pageSize, pageNumber);
        console.log("Fetched fresh data:", freshData);
        if (freshData?.certifications?.items && freshData.certifications.items.length > 0) {
          console.log("Fetched fresh data, items count:", freshData.certifications.items.length);
          const certificationData = freshData.certifications;
          certsToProcess = certificationData.items.map((item: RawCertification): CertificationRow => {
            // Match the exact mapping from useEffect (line 732-764)
            const certInfo = item.reviewerCertificationInfo as any;
            const actionInfo = item.reviewerCertificateActionInfo as any;
            const totalActions = actionInfo?.totalActions ?? 0;
            const totalActionsCompleted = actionInfo?.totalActionsCompleted ?? 0;
            const progress = totalActions > 0 ? Math.round((totalActionsCompleted / totalActions) * 100) : 0;
            
            return {
              id: `${item.reviewerId}-${item.certificationId}`,
              taskId: item.campaignId ?? "",
              reviewerId: item.reviewerId,
              certificationId: item.certificationId,
              campaignId: item.campaignId,
              certificationName: certInfo?.certificationName ?? "",
              certificationType: certInfo?.certificationType ?? "",
              certificationCreatedOn: certInfo?.certificationCreatedOn ?? "",
              certificationExpiration: certInfo?.certificationExpiration ?? "",
              status: certInfo?.status ?? "",
              certificationSignedOff: certInfo?.certificationSignedOff ?? false,
              certificateRequester: certInfo?.certificateRequester ?? "",
              certificateOwner: certInfo?.certificateRequester ?? "",
              percentageCompleted: actionInfo?.percentageCompleted ?? 0,
              progress: progress,
              description: certInfo?.certificationDescription ?? "No description provided",
              reviewerName: certInfo?.reviewerName ?? "",
              dueIn: certInfo?.dueIn ?? "",
              estimatedTimeToCompletion: certInfo?.estimatedTimeToCompletion ?? "",
            } as CertificationRow;
          });
          console.log("Mapped fresh certifications, count:", certsToProcess.length);
        } else {
          console.error("Fresh data fetch returned no items");
        }
      } catch (fetchError) {
        console.error("Error fetching fresh data:", fetchError);
        alert(`Failed to load certifications: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`);
        setIsActionLoading(false);
        hideApiLoader?.();
        return;
      }
    }
    
    console.log("certsToProcess length:", certsToProcess.length);
    console.log("certsToProcess:", certsToProcess);
    
    if (certsToProcess.length === 0) {
      console.error("No certifications to process! All data sources are empty.");
      console.error("Debug info - reviewerId:", reviewerId, "pageSize:", pageSize, "pageNumber:", pageNumber);
      alert("No certifications available to download. Please wait for data to load or refresh the page.");
      return;
    }

    console.log("Starting API calls...");
    try {
      setIsActionLoading(true);
      showApiLoader?.(true, "Fetching pending entitlements...");
      console.log("Loading state set, about to start processing certifications...");

      const pendingEntitlements: any[] = [];
      let processedCerts = 0;
      let totalAccounts = 0;
      let totalEntitlements = 0;

      // Process each certification - use the same API flow as TreeClient
      for (const cert of certsToProcess) {
        try {
          const certRow = cert as CertificationRow;
          console.log(`Processing certification: ${certRow.certificationName} (${certRow.certificationId})`);
          
          // Step 1: Get certification details (users/tasks) - same as TreeClient uses
          console.log(`Calling getCertificationDetails for cert ${certRow.certificationId}`);
          const certDetailsResponse = await getCertificationDetails(
            certRow.reviewerId,
            certRow.certificationId,
            1000, // Large page size
            1
          );
          
          const users = certDetailsResponse.items || [];
          console.log(`Found ${users.length} users/tasks for certification ${certRow.certificationName}`);

          // Step 2: For each user/task, get access details (accounts) - same as TreeClient
          for (const user of users as any[]) {
            const taskId = user.taskId || user.campaignId || certRow.taskId || certRow.campaignId;
            if (!taskId) {
              console.log(`Skipping user - no taskId`);
              continue;
            }

            console.log(`Calling fetchAccessDetails for taskId: ${taskId}`);
            const accounts = await fetchAccessDetails(
              certRow.reviewerId,
              certRow.certificationId,
              taskId,
              undefined,
              1000, // Large page size
              1
            );
            
            console.log(`Found ${accounts.length} accounts for taskId: ${taskId}`);
            totalAccounts += accounts.length;

            // Step 3: For each account, get pending entitlements - same as TreeClient
            for (const account of accounts) {
              const lineItemId = account.lineItemId;
              
              if (!lineItemId) {
                console.log(`Skipping account - no lineItemId`);
                continue;
              }

              try {
                console.log(`[API CALL 3] Calling getLineItemDetails(${certRow.reviewerId}, ${certRow.certificationId}, ${taskId}, ${lineItemId}, filter: "action eq Pending")`);
                // Get pending entitlements for this line item using the same API as TreeClient
                const entitlements = await getLineItemDetails(
                  certRow.reviewerId,
                  certRow.certificationId,
                  taskId,
                  lineItemId,
                  undefined,
                  undefined,
                  "action eq Pending" // Filter for pending entitlements
                );
                console.log(`[API CALL 3] getLineItemDetails completed, returned ${entitlements.length} entitlements`);

                totalEntitlements += entitlements.length;

                // Add each pending entitlement to the list
                for (const entitlement of entitlements) {
                  // Use the same pattern as TreeClient (matching TreeClient.tsx line 667-670)
                  const entitlementInfo = (entitlement.entitlementInfo && Array.isArray(entitlement.entitlementInfo)) 
                    ? entitlement.entitlementInfo[0] 
                    : (entitlement.entitlementInfo || (entitlement as any).entityEntitlement || {});
                  const aiAssist = entitlement.AIAssist?.[0];
                  
                  // Match TreeClient's entitlement name/description extraction
                  const entitlementName = (entitlement as any).entitlementName 
                    || entitlementInfo?.entitlementName 
                    || (entitlement as any).name 
                    || (entitlement as any).entitlement_name 
                    || "Unknown";
                  const entitlementDescription = (entitlement as any).entitlementDescription 
                    || entitlementInfo?.entitlementDescription 
                    || (entitlement as any).description 
                    || (entitlement as any).entitlement_description 
                    || "";
                  
                  pendingEntitlements.push({
                    "Campaign Name": certRow.certificationName || "",
                    "Campaign Type": certRow.certificationType || "",
                    "User": account.user || "Unknown",
                    "Application": account.applicationName || "Unknown",
                    "Account": account.accountname || account.accountName || "Unknown",
                    "Entitlement Name": entitlementName,
                    "Entitlement Description": entitlementDescription,
                    "Risk": entitlement.itemRisk || entitlement.entityRisk || account.risk || "Unknown",
                    "Recommendation": entitlement.recommendation || aiAssist?.Recommendation || account.recommendation || "",
                    "Last Login": account.lastLogin || "",
                    "Action": "Pending",
                    "Due Date": certRow.certificationExpiration || "",
                  });
                }
              } catch (err) {
                console.error(`Error fetching entitlements for lineItem ${lineItemId}:`, err);
                // Continue with next account
              }
            }
          }
          processedCerts++;
        } catch (err) {
          const certRow = cert as CertificationRow;
          console.error(`Error processing cert ${certRow.certificationId}:`, err);
          // Continue with next certification
        }
      }

      console.log(`Processed ${processedCerts} certifications, ${totalAccounts} accounts, ${totalEntitlements} entitlements`);
      console.log(`Total pending entitlements collected: ${pendingEntitlements.length}`);

      if (pendingEntitlements.length === 0) {
        alert("No pending entitlements found. Please check the console for details.");
        setIsActionLoading(false);
        hideApiLoader?.();
        return;
      }

      console.log("Creating Excel file...");
      // Create Excel workbook
      const worksheet = XLSX.utils.json_to_sheet(pendingEntitlements);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Entitlements");

      // Generate Excel file buffer
      console.log("Generating Excel buffer...");
      const excelBuffer = XLSX.write(workbook, { 
        bookType: "xlsx", 
        type: "array" 
      });

      console.log(`Excel buffer size: ${excelBuffer.length} bytes`);

      // Create blob and download
      const blob = new Blob([excelBuffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      
      console.log(`Blob created, size: ${blob.size} bytes`);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = `pending-entitlements-${new Date().toISOString().split('T')[0]}.xlsx`;
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

  const handleReleaseClaim = () => handleAction('Release/Claim');

  const handleUpload = () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Uploading file:', file.name);
        // Here you would typically upload the file to your server
        // For now, we'll just show a success message
        setShowCompletionToast(true);
      }
    };
    input.click();
  };

  const handleDownload = () => {
    // Create a sample Excel file download
    const data = filteredRowData.map(row => ({
      'Campaign Name': row.certificationName,
      'Type': row.certificationType,
      'Owner': row.certificateOwner,
      'Progress': `${row.progress}%`,
      'Due On': row.certificationExpiration,
      'Status': row.status
    }));
    
    // Convert to CSV
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-review-open-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const certificationData = data?.certifications;
  useEffect(() => {
    if (certificationData) {
      console.log("API Response:", certificationData); // Debug API response
      const mapped = certificationData.items.map(
        (item: RawCertification): CertificationRow => {
          const certInfo = item.reviewerCertificationInfo;
          const actionInfo = item.reviewerCertificateActionInfo;
          const totalActions = actionInfo?.totalActions ?? 0;
          const totalActionsCompleted = actionInfo?.totalActionsCompleted ?? 0;
          const progress =
            totalActions > 0
              ? Math.round((totalActionsCompleted / totalActions) * 100)
              : 0;
          return {
            id: `${item.reviewerId}-${item.certificationId}`,
            taskId: item.campaignId ?? "",
            reviewerId: item.reviewerId,
            certificationId: item.certificationId,
            campaignId: item.campaignId,
            certificationName: certInfo?.certificationName ?? "",
            certificationType: certInfo?.certificationType ?? "",
            certificationCreatedOn: certInfo?.certificationCreatedOn ?? "",
            certificationExpiration: certInfo?.certificationExpiration ?? "",
            status: certInfo?.status ?? "",
            certificationSignedOff: certInfo?.certificationSignedOff ?? false,
            certificateRequester: certInfo?.certificateRequester ?? "",
            certificateOwner: certInfo?.certificateRequester ?? "", // Map certificateRequester to certificateOwner for the Owner column
            percentageCompleted: actionInfo?.percentageCompleted ?? 0,
            totalActions: totalActions,
            totalActionsCompleted: totalActionsCompleted,
            progress: progress,
            description: certInfo?.certificationDescription ?? "No description provided",
            reviewerName: certInfo?.reviewerName ?? "",
            dueIn: certInfo?.dueIn ?? "",
            estimatedTimeToCompletion: certInfo?.estimatedTimeToCompletion ?? "",
          };
        }
      );
      console.log("Mapped Row Data:", mapped); // Debug mapped data
      setRowData(mapped as unknown as UserRowData[]);
      localStorage.setItem("sharedRowData", JSON.stringify(mapped));
      try { window.dispatchEvent(new Event("localStorageChange")); } catch {}
      setTotalItems(certificationData.total_items || 0);
      setTotalPages(certificationData.total_pages || 1);
      
      // Progress data will be sent to header when a certification row is clicked
    }
  }, [certificationData]);

  useEffect(() => {
    let filtered = rowData;
    
    // Filter by status - only show Active/Open items
    filtered = filtered.filter((row) => row.status === "Active");
    
    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter((row) =>
        row.certificationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.certificationType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.reviewerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredRowData(filtered);
  }, [rowData, searchTerm]);

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

  function handleRowClick(e: RowClickedEvent<CertificationRow>) {
    const clickedReviewerId = e.data?.reviewerId;
    const clickedCertificationId = e.data?.certificationId;
    const certificationType = e.data?.certificationType;
    
    // Send progress data to header for the clicked certification
    if (e.data) {
      const progressEvent = new CustomEvent('progressDataChange', {
        detail: {
          total: e.data.totalActions,
          approved: e.data.totalActionsCompleted,
          pending: e.data.totalActions - e.data.totalActionsCompleted,
          percentage: e.data.progress
        }
      });
      window.dispatchEvent(progressEvent);
    }
    
    // Store campaign summary data for navigation to App Owner or User Access Review
    if (e.data && (certificationType === "App Owner" || certificationType === "User Manager")) {
      const campaignSummary = {
        campaignName: e.data.certificationName,
        status: e.data.status,
        snapshotAt: e.data.certificationCreatedOn,
        dueDate: e.data.certificationExpiration,
        progress: e.data.progress, // Include campaign progress percentage
        // Add campaign-level progress details for app owner page
        totalItems: e.data.totalActions, // Total actions in the campaign
        approvedCount: e.data.totalActionsCompleted, // Completed actions
        pendingCount: e.data.totalActions - e.data.totalActionsCompleted, // Remaining actions
      };
      localStorage.setItem("selectedCampaignSummary", JSON.stringify(campaignSummary));
      try { window.dispatchEvent(new Event("localStorageChange")); } catch {}
    }
    
    if (clickedReviewerId && clickedCertificationId) {
      if (certificationType === "User Manager") {
        router.push(
          `/access-review/${clickedReviewerId}/${clickedCertificationId}`
        );
      } else if (certificationType === "App Owner") {
        console.log('Navigating to App Owner with parameters:', {
          reviewerId: clickedReviewerId,
          certificationId: clickedCertificationId
        });
        router.push(`/app-owner?reviewerId=${clickedReviewerId}&certificationId=${clickedCertificationId}`);
      }
    }
  }


  return (
    <>
      {error && (
        <div style={{ color: "red", padding: 10 }}>{String(error)}</div>
      )}
      <div className="bg-white rounded-lg px-4 py-3 mb-2 flex items-center justify-between border border-gray-200">
        <div className="flex items-center gap-3">
          <div 
            className="relative bg-white rounded-md border border-gray-300"
            style={{
              display: 'flex',
              padding: '6px 10px',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'stretch'
            }}
          >
            <Search className="text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent text-gray-700 focus:outline-none flex-1"
            />
          </div>
          <button 
            ref={filterButtonRef}
            onClick={toggleFilterMenu}
            className="p-2 hover:bg-gray-300 rounded-md transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          {isFilterMenuOpen &&
            createPortal(
              <div
                ref={filterMenuRef}
                className="absolute bg-white border border-gray-300 shadow-lg rounded-md z-50"
                style={{
                  position: "fixed",
                  top: `${filterMenuPosition.top}px`,
                  left: `${filterMenuPosition.left}px`,
                  minWidth: "120px",
                  padding: "8px",
                }}
              >
                <ul className="py-2 text-sm text-gray-700">
                  <li 
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filterStatus === "Active" ? "bg-blue-50 text-blue-600" : ""}`}
                    onClick={() => {
                      setFilterStatus("Active");
                      setIsFilterMenuOpen(false);
                    }}
                  >
                    Active
                  </li>
                  <li 
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filterStatus === "Expired" ? "bg-blue-50 text-blue-600" : ""}`}
                    onClick={() => {
                      setFilterStatus("Expired");
                      setIsFilterMenuOpen(false);
                    }}
                  >
                    Expired
                  </li>
                  <li 
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filterStatus === "Preview" ? "bg-blue-50 text-blue-600" : ""}`}
                    onClick={() => {
                      setFilterStatus("Preview");
                      setIsFilterMenuOpen(false);
                    }}
                  >
                    Preview
                  </li>
                </ul>
              </div>,
              document.body
            )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleUpload}
            className="p-2 hover:bg-gray-300 rounded-md transition-colors"
            title="Upload File"
          >
            <Upload className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            onClick={handleDownload}
            className="p-2 hover:bg-gray-300 rounded-md transition-colors"
            title="Download CSV"
          >
            <DownloadIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-300 rounded-md transition-colors">
            <CheckCircleIcon className="w-4 h-4 text-gray-600" />
          </button>
          <ColumnSettings
            columnDefs={activeColumnDefs}
            gridApi={gridApi}
            visibleColumns={() => {
              const visibleCols: string[] = [];
              activeColumnDefs.forEach((colDef) => {
                if (colDef.field) {
                  visibleCols.push(colDef.field);
                }
              });
              return visibleCols;
            }}
            customButton={
              <button className="p-2 hover:bg-gray-300 rounded-md transition-colors">
                <Settings className="w-4 h-4 text-gray-600" />
              </button>
            }
          />
        </div>
      </div>
      
      {/* Top pagination */}
      <div className="mb-2">
        <CustomPagination
          totalItems={totalItems}
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
      
      <div className="w-full">
        <AgGridReact
          rowData={filteredRowData}
          getRowId={(params: GetRowIdParams) => params.data.id}
          columnDefs={activeColumnDefs}
          defaultColDef={defaultColDef}
          domLayout="autoHeight"
          detailRowAutoHeight={true}
          masterDetail={true}
          detailCellRenderer={DetailCellRenderer}
          detailRowHeight={80}
          groupDefaultExpanded={-1} // Expand all groups by default
          onGridReady={(params) => {
            console.log("Grid initialized:", {
              api: !!params.api,
              columnApi: !!params.columnApi,
              enterpriseModules: params.api.isEnterprise?.() ? "Loaded" : "Not loaded",
            });
            setGridApi(params.api);
            params.api.sizeColumnsToFit();
            const handleResize = () => {
              try {
                params.api.sizeColumnsToFit();
              } catch {}
            };
            window.addEventListener("resize", handleResize);
            // Clean up listener when grid is destroyed
            params.api.addEventListener('gridPreDestroyed', () => {
              window.removeEventListener("resize", handleResize);
            });
          }}
          pagination={false}
          paginationPageSize={pageSize}
          paginationPageSizeSelector={pageSizeSelector}
          cacheBlockSize={pageSize}
          paginateChildRows={true}
          overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
          overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
          className="ag-main"
        />
        <div className="flex justify-center">
          <CustomPagination
            totalItems={totalItems}
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

      {/* Action Completed Toast */}
      <ActionCompletedToast
        isVisible={showCompletionToast}
        message={"Action completed"}
        onClose={() => setShowCompletionToast(false)}
        duration={1500}
      />

      {/* Reassign Modal */}
      <ProxyActionModal
        isModalOpen={isReassignModalOpen}
        closeModal={() => {
          setIsReassignModalOpen(false);
          setSelectedCertificationRow(null);
        }}
        heading="Reassign"
        users={[
          { username: "john", email: "john@example.com", role: "admin" },
          { username: "jane", email: "jane@example.com", role: "user" },
        ]}
        groups={[
          { name: "admins", email: "admins@corp.com", role: "admin" },
          { name: "devs", email: "devs@corp.com", role: "developer" },
        ]}
        userAttributes={[
          { value: "username", label: "Username" },
          { value: "email", label: "Email" },
        ]}
        groupAttributes={[
          { value: "name", label: "Group Name" },
          { value: "role", label: "Role" },
        ]}
        onSelectOwner={async (owner) => {
          if (!selectedCertificationRow) {
            console.error("No certification row selected");
            return;
          }

          try {
            setIsActionLoading(true);
            showApiLoader?.(true, "Reassigning certification...");

            // Determine owner type and ID
            // Check if owner has username (User) or name (Group)
            const ownerType = owner.username ? "User" : "Group";
            // For users, prefer username as ID, fallback to email
            // For groups, use name as ID
            const ownerId = owner.id || (ownerType === "User" ? (owner.username || owner.email || "") : (owner.name || ""));

            // Construct the payload
            const rowData = selectedCertificationRow as any; // Type assertion to access reviewerName
            const payload = {
              reviewerName: rowData.reviewerName || "",
              reviewerId: selectedCertificationRow.reviewerId,
              certificationId: selectedCertificationRow.certificationId,
              taskId: selectedCertificationRow.taskId || selectedCertificationRow.campaignId || "",
              lineItemId: "", // Not available at certification level
              assignmentEntity: "Cert",
              newOwnerDetails: {
                id: ownerId,
                type: ownerType,
              },
              justification: "Reassignment requested", // Default justification
            };

            // Make the API call
            const response = await fetch(
              `https://preview.keyforge.ai/certification/api/v1/ACMECOM/reassign/${selectedCertificationRow.reviewerId}/${selectedCertificationRow.certificationId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              }
            );

            if (!response.ok) {
              throw new Error(`Reassign failed: ${response.statusText}`);
            }

            // Success
            setIsReassignModalOpen(false);
            setSelectedCertificationRow(null);
            setShowCompletionToast(true);
            
            // Optionally refresh the data
            // You might want to refetch certifications here
          } catch (error) {
            console.error("Error reassigning certification:", error);
            alert(`Failed to reassign: ${error instanceof Error ? error.message : "Unknown error"}`);
          } finally {
            setIsActionLoading(false);
            hideApiLoader?.();
          }
        }}
      />

      {/* Sign Off Modal */}
      <SignOffModal
        isOpen={isSignOffModalOpen}
        onClose={() => {
          setIsSignOffModalOpen(false);
          setSelectedSignOffRow(null);
          setSignOffError(null);
        }}
        onConfirm={handleSignOffConfirm}
        userName={
          (() => {
            // Try auth context first (user.email contains the userid/username)
            if (user?.email) return user.email;
            
            // Fallback to cookie if auth context doesn't have it
            try {
              const uidTenant = getCookie(COOKIE_NAMES.UID_TENANT);
              if (uidTenant) {
                const parsed = JSON.parse(uidTenant);
                if (parsed?.userid) return parsed.userid;
              }
            } catch (e) {
              // Ignore parsing errors
            }
            
            // Final fallback to reviewerId
            return reviewerId || "";
          })()
        }
        isLoading={isActionLoading}
        error={signOffError}
      />
    </>
  );
};

export default OpenTab;
