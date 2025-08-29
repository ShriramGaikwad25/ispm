import React, { useCallback } from "react";
import {
  ColDef,
  GridApi,
  ICellRendererParams,
  GetRowIdParams,
} from "ag-grid-community";
import { getLineItemDetails } from "@/lib/api";
import ActionButtons from "@/components/agTable/ActionButtons";
import { User } from "lucide-react";
import { EntitlementInfo } from "@/types/lineItem";
import { fetchAccessDetails } from "@/hooks/useApi";

interface DetailGridProps {
  reviewerId: string;
  certId: string;
  defaultPageSize: number;
  pageSizeSelector: number[];
  detailCellRenderer: (props: any) => JSX.Element;
}

const DetailGrid: React.FC<DetailGridProps> = ({
  reviewerId,
  certId,
  defaultPageSize,
  pageSizeSelector,
  detailCellRenderer,
}) => {
  const handleDetailPageChange = async (
    taskId: string,
    newPageNumber: number,
    detailApi: GridApi
  ) => {
    const data = await fetchAccessDetails(
      reviewerId,
      certId,
      taskId,
      undefined,
      defaultPageSize,
      newPageNumber
    );

    detailApi.applyTransaction({ update: data });
  };

  const detailGridOptions = {
    columnDefs: [
      {
        field: "entitlementName",
        headerName: "Ent Name",
        width: 250,
        cellRenderer: "agGroupCellRenderer",
        cellRendererParams: {
          suppressCount: true,
          innerRenderer: (params: ICellRendererParams) => {
            const { entitlementName, isNew, itemRisk } = params.data || {};
            const deltaLabel = isNew ? "New" : "Old";
            const riskAbbr =
              itemRisk === "High" ? "H" : itemRisk === "Medium" ? "M" : "L";
            const riskColor =
              itemRisk === "High"
                ? "red"
                : itemRisk === "Medium"
                ? "orange"
                : "green";
            return (
              <div className="flex items-center gap-4">
                <span>
                  <User size={18} />
                </span>
                <div className="flex items-center gap-2">
                  <small className="leading-4">{entitlementName}</small>
                  <span>({deltaLabel})</span>
                  <span style={{ color: riskColor }}>{riskAbbr}</span>
                </div>
              </div>
            );
          },
        },
      },
      {
        field: "user",
        headerName: "A/C ID",
        width: 180,
        cellRenderer: (params: ICellRendererParams) => {
          const { user, accountType, SoDConflicts } = params.data || {};
          const typeLabel = accountType || "Regular";
          const hasViolation = SoDConflicts && SoDConflicts.length > 0;
          const lines = user?.split?.("\n") ?? ["", ""];
          return (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <small className="leading-4">{lines[0]}</small>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-[#27685b] text-white text-[10px]"
                  title={`Account Type: ${typeLabel}`}
                >
                  {typeLabel.charAt(0)}
                </div>
                {hasViolation && (
                  <div
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 relative z-50"
                    title="Audit/SOD Violation"
                  >
                    <Flag height={10} color="red" className="text-[10px]" />
                  </div>
                )}
                <small className="leading-4">{lines[1]}</small>
              </div>
            </div>
          );
        },
      },
      {
        field: "applicationName",
        headerName: "App Name",
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
              <span
                style={{ color: riskColor }}
                title={`App Risk: ${appRisk}`}
              >
                {appRisk}
              </span>
            </div>
          );
        },
      },
      { field: "entitlementType", headerName: "Ent Type", width: 150 },
      { field: "lastLogin", headerName: "Last Login", width: 140 },
      {
        field: "recommendation",
        headerName: "AI Assist",
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const { recommendation, accessedWithinAMonth } =
            params.data || {};
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
              context="user"
              reviewerId={reviewerId}
              certId={certId}
            />
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
      { field: "risk", headerName: "A/C Risk", width: 150, hide: true },
      {
        field: "itemRisk",
        headerName: "Entitlement Risk",
        width: 150,
        hide: true,
      },
      {
        field: "deltaChange",
        headerName: "Delta Change",
        width: 150,
        hide: true,
      },
      { field: "appType", headerName: "App Type", width: 150, hide: true },
      {
        field: "accountType",
        headerName: "A/C Type",
        width: 150,
        hide: true,
      },
      {
        field: "complianceViolation",
        headerName: "Compliance Violation",
        width: 150,
        hide: true,
      },
      {
        field: "accessedWithinAMonth",
        headerName: "Review History",
        width: 150,
        hide: true,
      },
      { field: "appRisk", headerName: "App Risk", width: 150, hide: true },
    ],
    defaultColDef: {
      resizable: true,
    },
    rowSelection: {
      mode: "multiRow",
    },
    className: "account-table-detail",
    pagination: true,
    paginationPageSize: defaultPageSize,
    paginationPageSizeSelector: pageSizeSelector,
    onPaginationChanged: (params: { api: GridApi }) => {
      const detailApi = params.api;
      const taskId = detailApi.getRowNode("0")?.data?.taskId;
      const newPageNumber = detailApi.paginationGetCurrentPage() + 1;

      if (taskId) {
        handleDetailPageChange(taskId, newPageNumber, detailApi);
      }
    },
    getRowId: (params: GetRowIdParams) => {
      const taskId = params.data?.taskId;
      const lineItemId = params.data?.lineItemId;
      const entitlementName = params.data?.entitlementName;

      if (!taskId || !lineItemId || !entitlementName) {
        return `fallback-${Math.random()}`;
      }

      return `${taskId}-${lineItemId}-${entitlementName}`;
    },
    masterDetail: true,
    detailCellRenderer: detailCellRenderer,
    detailRowAutoHeight: true,
  };

  const getDetailRowData = useCallback(
    async (params: any) => {
      const taskId = params.data.taskId;
      const addedEntitlements = params.data.addedEntitlements || [];
      if (!taskId) return;
      try {
        const accounts =
          (await fetchAccessDetails(reviewerId, certId, taskId)) ?? [];
        const entitlementPromises = accounts.map(async (account: any) => {
          const lineItemId = account.lineItemId;
          if (!lineItemId) return [];
          const entitlements =
            (await getLineItemDetails(
              reviewerId,
              certId,
              taskId,
              lineItemId
            )) ?? [];
          return entitlements.map((item: any) => {
            const info: EntitlementInfo = item.entitlementInfo ?? {
              entitlementName: "",
              entitlementDescription: "",
            };
            const ai = item.aiassist ?? {};
            return {
              ...account,
              entitlementName: info.entitlementName ?? "",
              entitlementDescription: info.entitlementDescription ?? "",
              entitlementType: info.entitlementType ?? "",
              recommendation: ai.Recommendation ?? "",
              accessedWithinAMonth: ai.accessedWithinAMonth ?? "",
              itemRisk: item.entityEntitlements?.itemRisk ?? "",
              percAccessInSameDept: ai.percAccessInSameDept ?? "",
              percAccessWithSameJobtitle: ai.percAccessWithSameJobtitle ?? "",
              percAccessWithSameManager: ai.percAccessWithSameManager ?? "",
              actionInLastReview: ai.Recommendation ?? "",
              isNew: addedEntitlements.includes(info.entitlementName),
              appTag: item.appTag || "SOX",
              appRisk: item.appRisk || "Low",
              appType: item.appType || "",
              complianceViolation: item.complianceViolation || "",
              deltaChange: item.deltaChange || "",
            };
          });
        });
        const allRows = (await Promise.all(entitlementPromises)).flat();
        params.successCallback(allRows);
      } catch (err) {
        console.error("Error loading accessDetails and entitlements", err);
        params.successCallback([]);
      }
    },
    [reviewerId, certId]
  );

  return {
    detailGridOptions,
    getDetailRowData,
    detailRowAutoHeight: true,
  };
};

export default DetailGrid;