// "use client";
// import React, { useEffect, useState } from "react";
// import { AgGridReact } from "ag-grid-react";
// import "@/lib/ag-grid-setup";
// import { useRouter } from "next/navigation";
// import { columnDefs, defaultColDef } from "@/components/dashboard/columnDefs";
// import SelectAll from "@/components/agTable/SelectAll";
// import CustomPagination from "@/components/agTable/CustomPagination";
// import ColumnSettings from "@/components/agTable/ColumnSettings";
// import { GridApi, GetRowIdParams, RowClickedEvent } from "ag-grid-community";
// import { useCertifications } from "@/hooks/useApi";
// import {
//   CertificationRow,
//   RawCertification,
//   UserRowData,
// } from "@/types/certification";
// import { PaginatedResponse } from "@/types/api";
// import { Header } from "@/components/Header";

// const reviewerId = "0089414b-fb84-4fba-8a30-afc7386eab49";

// const AccessReview: React.FC = () => {
//   const [gridApi, setGridApi] = useState<GridApi | null>(null);
//   const [rowData, setRowData] = useState<UserRowData[]>([]);
//   const [filteredRowData, setFilteredRowData] = useState<UserRowData[]>([]);
//   const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(
//     new Map()
//   );
//   const router = useRouter();
//   const pageSizeSelector = [5, 10, 20, 50, 100];
//   const defaultPageSize = pageSizeSelector[0];
//   const [pageNumber, setPageNumber] = useState(1);
//   const [totalItems, setTotalItems] = useState(0);
//   const [totalPages, setTotalPages] = useState(1);
//   const [filterStatus, setFilterStatus] = useState<string>("All");

//     const [headerInfo, setHeaderInfo] = useState({
//     campaignName: "",
//     generatedOn: "",
//     dueDate: "",
//     daysLeft: 0,
//   });

//   const { data, error } = useCertifications(
//     reviewerId,
//     defaultPageSize,
//     pageNumber
//   );
//   const [authChecked, setAuthChecked] = useState(false);

//   useEffect(() => {
//     const isAuthenticated = localStorage.getItem("authenticated");
//     if (!isAuthenticated) {
//       router.push("/");
//     } else {
//       setAuthChecked(true);
//     }
//   }, [router]);

//   const certificationData =
//     data as unknown as PaginatedResponse<CertificationRow>;
//   useEffect(() => {
//     if (certificationData) {
//       const mapped = certificationData.items.map(
//         (item: RawCertification): CertificationRow => {
//           const certInfo = item.reviewerCertificationInfo;
//           const actionInfo = item.reviewerCertificateActionInfo;
//           return {
//             id: `${item.reviewerId}-${item.certificationId}`,
//             taskId: item.campaignId ?? "",
//             reviewerId: item.reviewerId,
//             certificationId: item.certificationId,
//             campaignId: item.campaignId,
//             certificationName: certInfo?.certificationName ?? "",
//             certificationType: certInfo?.certificationType ?? "",
//             certificationCreatedOn: certInfo?.certificationCreatedOn ?? "",
//             certificationExpiration: certInfo?.certificationExpiration ?? "",
//             status: certInfo?.status ?? "",
//             certificationSignedOff: certInfo?.certificationSignedOff ?? false,
//             certificateRequester: certInfo?.certificateRequester ?? "",
//             percentageCompleted: actionInfo?.percentageCompleted ?? 0,
//             totalActions: actionInfo?.totalActions ?? 0,
//             totalActionsCompleted: actionInfo?.totalActionsCompleted ?? 0,
//           };
//         }
//       );

//       setRowData(mapped as unknown as UserRowData[]);

//       localStorage.setItem("sharedRowData", JSON.stringify(mapped));
//       setTotalItems(certificationData.total_items || 0);
//       setTotalPages(certificationData.total_pages || 1);
//     }
//   }, [certificationData]);

//   useEffect(() => {
//     if (filterStatus === "All") {
//       setFilteredRowData(rowData);
//     } else {
//       setFilteredRowData(
//         rowData.filter((row) => row.status === filterStatus)
//       );
//     }
//   }, [rowData, filterStatus]);

//   const handlePageChange = (newPage: number) => {
//     if (newPage !== pageNumber) {
//       setPageNumber(newPage);
//     }
//   };

//   const handleRowClick = (e: RowClickedEvent<CertificationRow>) => {
//     const clickedReviewerId = e.data?.reviewerId;
//     const clickedCertificationId = e.data?.certificationId;
//     if (clickedReviewerId && clickedCertificationId) {
//       router.push(
//         `/access-review/${clickedReviewerId}/${clickedCertificationId}`
//       );
//     }
//   };

//   const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setFilterStatus(event.target.value);
//   };

//   return (
//     <>
//       <h1 className="text-xl font-bold mb-6 border-b border-gray-300 pb-2 text-blue-950">
//         Access Review
//       </h1>
//       {error && (
//         <div style={{ color: "red", padding: 10 }}>{String(error)}</div>
//       )}
//       <div className="flex items-center justify-between mb-4 relative z-10">
//         <SelectAll
//           gridApi={gridApi}
//           detailGridApis={detailGridApis}
//           clearDetailGridApis={() => setDetailGridApis(new Map())}
//           key={`select-all-${pageNumber}`}
//         />
//         <div className="flex items-center gap-4">
//           <select
//             value={filterStatus}
//             onChange={handleFilterChange}
//             className="border rounded-md w-60 p-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="All">All</option>
//             <option value="Active">Active</option>
//             <option value="Expired">Expired</option>
//             <option value="Preview">Preview</option>
//           </select>
//           <CustomPagination
//             totalItems={totalItems}
//             currentPage={pageNumber}
//             totalPages={totalPages}
//             pageSize={defaultPageSize}
//             onPageChange={handlePageChange}
//           />
//           <ColumnSettings
//             columnDefs={columnDefs}
//             gridApi={gridApi}
//             visibleColumns={() => {
//               const visibleCols: string[] = [];
//               columnDefs.forEach((colDef) => {
//                 if (colDef.field) {
//                   visibleCols.push(colDef.field);
//                 }
//               });
//               return visibleCols;
//             }}
//           />
//         </div>
//       </div>
//       <AgGridReact
//         rowData={filteredRowData}
//         getRowId={(params: GetRowIdParams) => params.data.id}
//         columnDefs={columnDefs}
//         defaultColDef={defaultColDef}
//         domLayout="autoHeight"
//         detailRowAutoHeight={true}
//         masterDetail={false}
//         isRowMaster={() => true}
//         rowSelection={{
//           mode: "multiRow",
//           masterSelects: "detail",
//         }}
//         onGridReady={(params) => {
//           setGridApi(params.api);
//           params.api.sizeColumnsToFit();
//         }}
//         pagination={false}
//         paginationPageSize={defaultPageSize}
//         paginationPageSizeSelector={pageSizeSelector}
//         cacheBlockSize={defaultPageSize}
//         paginateChildRows={true}
//         overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
//         overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
//         className="ag-theme-quartz ag-main"
//         onRowClicked={handleRowClick}
//       />
//     </>
//   );
// };

// export default AccessReview;

"use client";
import React, { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { useRouter } from "next/navigation";
import { defaultColDef } from "@/components/dashboard/columnDefs";
import SelectAll from "@/components/agTable/SelectAll";
import CustomPagination from "@/components/agTable/CustomPagination";
import ColumnSettings from "@/components/agTable/ColumnSettings";
import {
  GridApi,
  GetRowIdParams,
  RowClickedEvent,
  ColDef,
} from "ag-grid-community";
import { useCertifications } from "@/hooks/useApi";
import {
  CertificationRow,
  RawCertification,
  UserRowData,
} from "@/types/certification";
import { PaginatedResponse } from "@/types/api";
import { Header } from "@/components/Header";
import ActionButtons from "@/components/agTable/ActionButtons";
import {
  CheckCircleIcon,
  ClipboardIcon,
  DownloadIcon,
  UserIcon,
  UserRoundCheckIcon,
} from "lucide-react";

// Define column definitions for Active and Expired statuses
const activeColumnDefs: ColDef[] = [
  { headerName: "Campaign Name", field: "certificationName", width: 250 },
  { headerName: "Type", field: "certificationType", width: 150 },
  { headerName: "Owner", field: "reviewerName", width: 150 },
  { headerName: "Progress", field: "progress", width: 150 },
  { headerName: "Due In", field: "dueIn", width: 250 },
  {
    headerName: "Estimated time to completion",
    field: "Estimated time to completion",
    width: 250,
    hide: true,
  },
  { headerName: "Description", field: "description", width: 250, hide: true },
  { headerName: "Tags", field: "tags", width: 250, hide: true },
  { headerName: "Create On", field: "certificationCreatedOn", width: 250 },
  {
    headerName: "Actions",
    width: 250,
    cellRenderer: (params: any) => (
      <div className="flex space-x-4 h-full items-center">
        {/* {error && <div className="text-red-500 text-sm">{error}</div>} */}
        <button
          // onClick={handleReassign}
          title="Reassign"
          aria-label="Reassign selected rows"
          className="p-1 rounded transition-colors duration-200"
        >
          <UserRoundCheckIcon
            className="cursor-pointer"
            color="#b146ccff"
            strokeWidth="1"
            size="32"
          />
        </button>
        <button
          // onClick={handleClaimRelease}
          title={"Release/Claim"}
          // aria-label={`${isClaimed ? "Release" : "Claim"} selected rows`}
          className="py-1 rounded transition-colors duration-200"
        >
          <ClipboardIcon
            className="curser-pointer"
            strokeWidth="1"
            size="32"
            color="#ca7e2cff"
          />
          {/* {isClaimed ? "Release" : "Claim"} */}
        </button>
        <button
          // onClick={handleSignOff}
          title="Sign Off"
          aria-label="Sign off selected rows"
          className="p-1 rounded transition-colors duration-200"
        >
          <CheckCircleIcon
            className="curser-pointer"
            strokeWidth="1"
            size="32"
            color="#e73c3cff"
          />
        </button>
        <button
          title="Download Excel"
          aria-label="Sign off selected rows"
          className="p-1 rounded transition-colors duration-200"
        >
          <DownloadIcon className="curser-pointer" strokeWidth="1" size="32" />
        </button>
      </div>
    ),
  },
];

const expiredColumnDefs: ColDef[] = [
  { headerName: "Campaign Name", field: "certificationName" },
  { headerName: "Type", field: "certificationType" }, // Updated to match CertificationRow
  { headerName: "Owner", field: "certificateRequester" }, // Updated to match CertificationRow
  { headerName: "Assigned On", field: "certificationCreatedOn" }, // Updated to match CertificationRow
  { headerName: "Completed On", field: "certificationSignedOff" }, // Adjust if there's a specific completed date field
  { headerName: "Reports", field: "reports" }, // Adjust field if available
    { headerName: "Description", field: "description", width: 250, hide: true },
  { headerName: "Tags", field: "tags", width: 250, hide: true },
];

const reviewerId = "0089414b-fb84-4fba-8a30-afc7386eab49";

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
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [currentColumnDefs, setCurrentColumnDefs] =
    useState<ColDef[]>(activeColumnDefs);

  const [headerInfo, setHeaderInfo] = useState({
    campaignName: "",
    generatedOn: "",
    dueDate: "",
    daysLeft: 0,
  });

  const { data, error } = useCertifications(
    reviewerId,
    defaultPageSize,
    pageNumber
  );
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // const isAuthenticated = localStorage.getItem("authenticated");
    const isAuthenticated = true;
    if (!isAuthenticated) {
      router.push("/");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const certificationData =
    data as unknown as PaginatedResponse<CertificationRow>;
  useEffect(() => {
    if (certificationData) {
      const mapped = certificationData.items.map(
        (item: RawCertification): CertificationRow => {
          const certInfo = item.reviewerCertificationInfo;
          const actionInfo = item.reviewerCertificateActionInfo;
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
            totalActions: actionInfo?.totalActions ?? 0,
            totalActionsCompleted: actionInfo?.totalActionsCompleted ?? 0,
          };
        }
      );

      setRowData(mapped as unknown as UserRowData[]);
      localStorage.setItem("sharedRowData", JSON.stringify(mapped));
      setTotalItems(certificationData.total_items || 0);
      setTotalPages(certificationData.total_pages || 1);
    }
  }, [certificationData]);

  // Update column definitions based on filterStatus
  useEffect(() => {
    if (filterStatus === "Active") {
      setCurrentColumnDefs(activeColumnDefs);
    } else if (filterStatus === "Expired") {
      setCurrentColumnDefs(expiredColumnDefs);
    } else {
      setCurrentColumnDefs(activeColumnDefs); // Default for "All" and "Preview"
    }
  }, [filterStatus]);

  useEffect(() => {
    if (filterStatus === "All") {
      setFilteredRowData(rowData);
    } else {
      setFilteredRowData(rowData.filter((row) => row.status === filterStatus));
    }
  }, [rowData, filterStatus]);

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

  const handleRowClick = (e: RowClickedEvent<CertificationRow>) => {
    const clickedReviewerId = e.data?.reviewerId;
    const clickedCertificationId = e.data?.certificationId;
    if (clickedReviewerId && clickedCertificationId) {
      router.push(
        `/access-review/${clickedReviewerId}/${clickedCertificationId}`
      );
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
        <SelectAll
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
            {/* <option value="All">All</option> */}
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
            columnDefs={currentColumnDefs} // Use currentColumnDefs
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
      <AgGridReact
        rowData={filteredRowData}
        getRowId={(params: GetRowIdParams) => params.data.id}
        columnDefs={currentColumnDefs} // Use dynamic columnDefs
        defaultColDef={defaultColDef}
        domLayout="autoHeight"
        detailRowAutoHeight={true}
        masterDetail={false}
        isRowMaster={() => true}
        rowSelection={{
          mode: "multiRow",
          masterSelects: "detail",
        }}
        onGridReady={(params) => {
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
    </>
  );
};

export default AccessReview;
