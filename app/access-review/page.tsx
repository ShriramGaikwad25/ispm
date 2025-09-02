"use client";
import React, { useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { useRouter } from "next/navigation";
import { formatDateMMDDYY as formatDateShared } from "@/utils/utils";
import { defaultColDef } from "@/components/dashboard/columnDefs";
import SelectAllAR from "@/components/agTable/SelectAllAR";
import CustomPagination from "@/components/agTable/CustomPagination";
import ColumnSettings from "@/components/agTable/ColumnSettings";
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
} from "lucide-react";
import { createPortal } from "react-dom";
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import "./AccessReview.css"

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([MasterDetailModule]);

// Circular Progress Renderer
const CircularProgressRenderer = (props: any) => {
  const value = props.value || 0;
  const radius = 16;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#3b82f6"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.35s" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="10" fill="#111">
          {value}%
        </text>
      </svg>
    </div>
  );
};

// Detail Cell Renderer for Description
const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const description = props.data?.description || "No description available";
  return (
    <div className="flex p-2 bg-gray-40 border-b border-gray-200 ml-16">
      <div className="flex flex-row items-center gap-2">
        <span className="text-gray-800 text-sm">{description}</span>
      </div>
    </div>
  );
};

// Date Formatter (delegates to shared util)
export const formatDateMMDDYY = (dateString?: string) =>
  formatDateShared(dateString);

const reviewerId = "430ea9e6-3cff-449c-a24e-59c057f81e3d";

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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const activeColumnDefs: ColDef[] = [
    {
      headerName: "Campaign Name",
      field: "certificationName",
      width: 300,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: any) => (
        <div className="flex flex-col gap-1">
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
      width: 150,
      cellRenderer: CircularProgressRenderer,
    },
    { headerName: "Due In", field: "dueIn", width: 150 },
    {
      headerName: "Estimated time to completion",
      field: "estimatedTimeToCompletion",
      width: 250,
      hide: true,
    },
    { headerName: "Description", field: "description", width: 250, hide: true },
    { headerName: "Tags", field: "tags", width: 250, hide: true },
    {
      headerName: "Create On",
      field: "certificationCreatedOn",
      width: 150,
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
                    <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
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
  ];

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
    }
  }, [certificationData]);

  useEffect(() => {
    if (filterStatus === "All") {
      setFilteredRowData(rowData);
    } else {
      setFilteredRowData(rowData.filter((row) => row.status === filterStatus));
    }
  }, [rowData, filterStatus]);

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
    if (clickedReviewerId && clickedCertificationId) {
      if (certificationType === "UserAccessReview") {
        router.push(
          `/access-review/${clickedReviewerId}/${clickedCertificationId}`
        );
      } else if (certificationType === "AppOwnerReview") {
        router.push(`/app-owner`);
      }
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(event.target.value);
  };

  return (
    <>
      <h1 className="text-xl font-bold mb-6 border-b border-gray-300 pb-2 text-blue-950">
        Access Review
      </h1>
      {error && (
        <div style={{ color: "red", padding: 10 }}>{String(error)}</div>
      )}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <SelectAllAR
          gridApi={gridApi}
          detailGridApis={detailGridApis}
          clearDetailGridApis={() => setDetailGridApis(new Map())}
          key={`select-all-${pageNumber}`}
        />
        <div className="flex items-center gap-4">
          <select
            value={filterStatus}
            onChange={handleFilterChange}
            className="border rounded-md w-60 p-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Preview">Preview</option>
          </select>
          <CustomPagination
            totalItems={totalItems}
            currentPage={pageNumber}
            totalPages={totalPages}
            pageSize={defaultPageSize}
            onPageChange={handlePageChange}
          />
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
          />
        </div>
      </div>
      <div style={{ height: "100%", width: "100%" }}>
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
          }}
          pagination={false}
          paginationPageSize={defaultPageSize}
          paginationPageSizeSelector={pageSizeSelector}
          cacheBlockSize={defaultPageSize}
          paginateChildRows={true}
          overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
          overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
          className="ag-theme-quartz ag-main"
          onRowClicked={handleRowClick}
        />
      </div>
    </>
  );
};

export default AccessReview;