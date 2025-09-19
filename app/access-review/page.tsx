"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { useRouter } from "next/navigation";
import { formatDateMMDDYY as formatDateShared } from "@/utils/utils";
import { defaultColDef } from "@/components/dashboard/columnDefs";
import CustomPagination from "@/components/agTable/CustomPagination";
import ColumnSettings from "@/components/agTable/ColumnSettings";
import IndividualRowSelection from "@/components/agTable/IndividualRowSelection";
import {
  GridApi,
  GetRowIdParams,
  RowClickedEvent,
  ColDef,
  IDetailCellRendererParams,
} from "ag-grid-enterprise"; // Use ag-grid-enterprise
import { useCertifications } from "@/hooks/useApi";
import {
  CertificationRow,
  RawCertification,
  UserRowData,
} from "@/types/certification";
import { PaginatedResponse } from "@/types/api";
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
    <div className="flex p-2 bg-gray-40 border-b border-gray-200 ml-16">
      <div className="flex flex-row items-center gap-2">
        <span className="text-gray-800 text-sm break-words break-all whitespace-pre-wrap">
          {description}
        </span>
      </div>
    </div>
  );
};

// Date Formatter (delegates to shared util)
export const formatDateMMDDYY = (dateString?: string) =>
  formatDateShared(dateString);

// const reviewerId = "430ea9e6-3cff-449c-a24e-59c057f81e3d";
// const reviewerId = "1bf73ddb-c95d-4716-8e14-f7cf0f2e5922";
  //  const reviewerId = "d4cc2173-7471-4e26-8c72-a27be88ff6cb";
  //  const reviewerId = "ec527a50-0944-4b31-b239-05518c87a743";
  const reviewerId = "d4cc2173-7471-4e26-8c72-a27be88ff6cb";

const AccessReview: React.FC = () => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<UserRowData[]>([]);
  const [filteredRowData, setFilteredRowData] = useState<UserRowData[]>([]);
  const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(
    new Map()
  );
  const router = useRouter();
  const pageSizeSelector = [10, 20, 50, 100];
  const defaultPageSize = pageSizeSelector[0];
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("Active");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
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
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

const activeColumnDefs = useMemo<ColDef[]>(() =>[
    {
      headerName: "Campaign Name",
      field: "certificationName",
      width: 400,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: any) => (
        <div className="flex flex-col gap-2">
          <span className="text-gray-800 font-medium">{params.value}</span>
          <span className="text-gray-500 text-sm leading-tight">
            {params.data?.description || "No description available"}
          </span>
        </div>
      ),
    },
    { headerName: "Type", field: "certificationType", width: 150 },
    { headerName: "Owner", field: "reviewerName", width: 150 },
    {
      headerName: "Progress",
      field: "progress",
      width: 200,
      cellRenderer: HorizontalProgressRenderer,
    },
    { headerName: "Due On", field: "dueIn", width: 150 },
    {
      headerName: "Estimated time to completion",
      field: "estimatedTimeToCompletion",
      width: 250,
      hide: true,
    },
    { headerName: "Description", field: "description", width: 250, hide: true },
    { headerName: "Tags", field: "tags", width: 250, hide: true },
    {
      headerName: "Created On",
      field: "certificationCreatedOn",
      width: 200,
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
            onClick={handleReassign}
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
            onClick={handleSignOff}
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
            onClick={handleDownloadExcel}
            disabled={isActionLoading}
          >
            <DownloadIcon
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

  const expiredColumnDefs: ColDef[] = [
    {
      headerName: "Campaign Name",
      field: "certificationName",
      width: 300,
      wrapText: true,
      autoHeight: true,
      cellRenderer: "agGroupCellRenderer",
    },
    { headerName: "Type", field: "certificationType", width: 150 },
    { headerName: "Owner", field: "certificateRequester", width: 150 },
    {
      headerName: "Assigned On",
      field: "certificationCreatedOn",
      width: 150,
      valueFormatter: (params) => formatDateMMDDYY(params.value),
    },
    {
      headerName: "Completed On",
      field: "certificationSignedOff",
      width: 150,
      valueFormatter: (params) => formatDateMMDDYY(params.value),
    },
    { headerName: "Reports", field: "reports", width: 150 },
    { headerName: "Description", field: "description", width: 250, hide: true },
    { headerName: "Tags", field: "tags", width: 250, hide: true },
  ];

  const [currentColumnDefs, setCurrentColumnDefs] =
    useState<ColDef[]>(activeColumnDefs);

  const { data, error } = useCertifications(
    reviewerId,
    defaultPageSize,
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
      showApiLoader(`Performing ${actionName.toLowerCase()} action...`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show completion message for 2 seconds
      setShowCompletionToast(true);
      
      // Keep loader visible for 2 seconds, then hide it
      setTimeout(() => {
        hideApiLoader();
        setIsActionLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error(`Error performing ${actionName}:`, error);
      hideApiLoader();
      setIsActionLoading(false);
    }
  };

  const handleReassign = () => handleAction('Reassign');
  const handleSignOff = () => handleAction('Sign Off');
  const handleDownloadExcel = () => handleAction('Download Excel');
  const handleReleaseClaim = () => handleAction('Release/Claim');

  const certificationData =
    data as unknown as PaginatedResponse<CertificationRow>;
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
            percentageCompleted: actionInfo?.percentageCompleted ?? 0,
            totalActions: totalActions,
            totalActionsCompleted: totalActionsCompleted,
            progress: progress,
            description: certInfo?.description ?? "No description provided",
            reviewerName: certInfo?.reviewerName ?? "",
            dueIn: certInfo?.dueIn ?? "",
            estimatedTimeToCompletion: certInfo?.estimatedTimeToCompletion ?? "",
          };
        }
      );
      console.log("Mapped Row Data:", mapped); // Debug mapped data
      setRowData(mapped as unknown as UserRowData[]);
      localStorage.setItem("sharedRowData", JSON.stringify(mapped));
      setTotalItems(certificationData.total_items || 0);
      setTotalPages(certificationData.total_pages || 1);
      
      // Progress data will be sent to header when a certification row is clicked
    }
  }, [certificationData]);

  useEffect(() => {
    let filtered = rowData;
    
    // Filter by status
    if (filterStatus !== "All") {
      filtered = filtered.filter((row) => row.status === filterStatus);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter((row) =>
        row.certificationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.certificationType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.reviewerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredRowData(filtered);
  }, [rowData, filterStatus, searchTerm]);

  useEffect(() => {
    if (filterStatus === "Active") {
      setCurrentColumnDefs(activeColumnDefs);
    } else if (filterStatus === "Expired") {
      setCurrentColumnDefs(expiredColumnDefs);
    } else {
      setCurrentColumnDefs(activeColumnDefs);
    }
  }, [filterStatus]);

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

  const handleRowClick = (e: RowClickedEvent<CertificationRow>) => {
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
      };
      localStorage.setItem("selectedCampaignSummary", JSON.stringify(campaignSummary));
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
  };

  const handleSelectionChanged = () => {
    if (gridApi) {
      const selectedNodes = gridApi.getSelectedNodes();
      const selectedData = selectedNodes.map(node => node.data);
      setSelectedRows(selectedData);
    }
  };


  return (
    <>
      <h1 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2 text-blue-950">
        Access Review
      </h1>
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
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
              <span className="text-sm text-gray-600">{selectedRows.length} selected</span>
              <button 
                title="Sign Off Selected"
                className="p-2 hover:bg-gray-300 rounded-md transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 text-red-600" />
              </button>
              <button 
                title="Download Selected"
                className="p-2 hover:bg-gray-300 rounded-md transition-colors"
              >
                <DownloadIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
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
          <button className="p-2 hover:bg-gray-300 rounded-md transition-colors">
            <Upload className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-300 rounded-md transition-colors">
            <DownloadIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-300 rounded-md transition-colors">
            <CheckCircleIcon className="w-4 h-4 text-gray-600" />
          </button>
          <ColumnSettings
            columnDefs={currentColumnDefs}
            gridApi={gridApi}
            visibleColumns={() => {
              const visibleCols: string[] = [];
              currentColumnDefs.forEach((colDef) => {
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
      
      <div className="flex items-center justify-end mb-2 relative z-10">
        <IndividualRowSelection
          gridApi={gridApi}
          detailGridApis={detailGridApis}
        />
      </div>
      <div className="w-full">
        <AgGridReact
          rowData={filteredRowData}
          getRowId={(params: GetRowIdParams) => params.data.id}
          columnDefs={currentColumnDefs}
          defaultColDef={defaultColDef}
          domLayout="autoHeight"
          detailRowAutoHeight={true}
          masterDetail={true}
          // detailCellRenderer={DetailCellRenderer}
          detailRowHeight={80}
          groupDefaultExpanded={-1} // Expand all groups by default
          rowSelection={{
            mode: "multiRow",
            masterSelects: "detail",
          }}
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
          paginationPageSize={defaultPageSize}
          paginationPageSizeSelector={pageSizeSelector}
          cacheBlockSize={defaultPageSize}
          paginateChildRows={true}
          overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
          overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
          className="ag-main"
          onRowClicked={handleRowClick}
          onSelectionChanged={handleSelectionChanged}
        />
        <div className="flex justify-center">
          <CustomPagination
            totalItems={totalItems}
            currentPage={pageNumber}
            totalPages={totalPages}
            pageSize={defaultPageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Action Completed Toast */}
      <ActionCompletedToast
        isVisible={showCompletionToast}
        messages={['Action success', 'Action completed']}
        onClose={() => setShowCompletionToast(false)}
        messageDuration={1000}
      />
    </>
  );
};

export default AccessReview;