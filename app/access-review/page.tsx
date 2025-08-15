"use client";
import React, { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { useRouter } from "next/navigation";
import { columnDefs, defaultColDef } from "@/components/dashboard/columnDefs";
import SelectAll from "@/components/agTable/SelectAll";
import CustomPagination from "@/components/agTable/CustomPagination";
import ColumnSettings from "@/components/agTable/ColumnSettings";
import { GridApi, GetRowIdParams, RowClickedEvent } from "ag-grid-community";
import { useCertifications } from "@/hooks/useApi";
import {
  CertificationRow,
  RawCertification,
  UserRowData,
} from "@/types/certification";
import { PaginatedResponse } from "@/types/api";

const reviewerId = "0089414b-fb84-4fba-8a30-afc7386eab49";

const AccessReview: React.FC = () => {
  const router = useRouter();

  // ===== AUTH STATE =====
  const [authChecked, setAuthChecked] = useState(false);

  // ===== GRID & DATA STATE =====
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<UserRowData[]>([]);
  const [filteredRowData, setFilteredRowData] = useState<UserRowData[]>([]);
  const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(
    new Map()
  );

  const pageSizeSelector = [5, 10, 20, 50, 100];
  const defaultPageSize = pageSizeSelector[0];
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // ===== API CALL =====
  const { data, error } = useCertifications(
    reviewerId,
    defaultPageSize,
    pageNumber
  );

  // ===== AUTH CHECK (runs only on client) =====
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAuthenticated = localStorage.getItem("authenticated");
      if (!isAuthenticated) {
        router.push("/");
      } else {
        setAuthChecked(true);
      }
    }
  }, [router]);

  // ===== MAP API DATA =====
  useEffect(() => {
    if (data) {
      const certificationData =
        data as unknown as PaginatedResponse<CertificationRow>;

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
  }, [data]);

  // ===== FILTER DATA =====
  useEffect(() => {
    if (filterStatus === "All") {
      setFilteredRowData(rowData);
    } else {
      setFilteredRowData(rowData.filter((row) => row.status === filterStatus));
    }
  }, [rowData, filterStatus]);

  // ===== HANDLERS =====
  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

  const handleRowClick = (e: RowClickedEvent<CertificationRow>) => {
    const clickedReviewerId = e.data?.reviewerId;
    const clickedCertificationId = e.data?.certificationId;
    if (clickedReviewerId && clickedCertificationId) {
      router.push(`/access-review/${clickedReviewerId}/${clickedCertificationId}`);
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(event.target.value);
  };

  // ===== LOADING / UNAUTH =====
  if (!authChecked) {
    return <div className="p-4">Loading...</div>;
  }

  // ===== RENDER =====
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
            <option value="All">All</option>
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
            columnDefs={columnDefs}
            gridApi={gridApi}
            visibleColumns={() => {
              const visibleCols: string[] = [];
              columnDefs.forEach((colDef) => {
                if (colDef.field) visibleCols.push(colDef.field);
              });
              return visibleCols;
            }}
          />
        </div>
      </div>
      <AgGridReact
        rowData={filteredRowData}
        getRowId={(params: GetRowIdParams) => params.data.id}
        columnDefs={columnDefs}
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
