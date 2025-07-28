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

// const reviewerId = "S276692"; // You can make this dynamic later
const reviewerId = "0089414b-fb84-4fba-8a30-afc7386eab49";

const Home: React.FC = () => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<UserRowData[]>([]);
  const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(
    new Map()
  );
  const router = useRouter();
  const pageSizeSelector = [5, 10, 20, 50, 100];
  const defaultPageSize = pageSizeSelector[0]; // Default page size
  const [pageNumber, setPageNumber] = useState(1); // Default page number
  const [totalItems, setTotalItems] = useState(0); // Total items from the server
  const [totalPages, setTotalPages] = useState(1); // Total pages from the server
  const [authChecked, setAuthChecked] = useState(false);

  const { data, error } = useCertifications(
    reviewerId,
    defaultPageSize,
    pageNumber
  );

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("authenticated");
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
          const certInfo = item.reviewerCertificationInfo?.[0]; // Fix here
          const actionInfo = item.reviewerCertificateActionInfo?.[0];
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
      setTotalItems(certificationData.total_items || 0);
      setTotalPages(certificationData.total_pages || 1);
    }
  }, [certificationData]);

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
        `/manager-action/${clickedReviewerId}/${clickedCertificationId}`
      );
    }
  };

  return (
    <>
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

        <div className="flex items-center">
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
        rowData={rowData}
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

export default Home;
