"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import Image from "next/image";
import {
  ColDef,
  GridApi,
  ICellRendererParams,
  GetRowIdParams,
  IDetailCellRendererParams,
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
import { CheckCircleIcon, Flag, User, UserCheckIcon } from "lucide-react";
import Import from "@/components/agTable/Import";
import { MasterDetailModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
ModuleRegistry.registerModules([MasterDetailModule]);

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

const UserPopup: React.FC<UserPopupProps> = ({
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

const DetailCellRenderer = (props: IDetailCellRendererParams) => {
  const { data } = props;
  return (
    <div className="flex p-4 bg-gray-50 border-t border-gray-200 ml-10">
      <div className="flex flex-row items-center gap-2">
        {/* <span className="font-bold text-md text-[#1759e4]">
          Entitlement Description:
        </span> */}
        <span className="text-gray-800">{data.entitlementDescription}</span>
      </div>
    </div>
  );
};

interface TreeClientProps {
  reviewerId: string;
  certId: string;
  onRowExpand?: () => void;
}

const TreeClient: React.FC<TreeClientProps> = ({
  reviewerId,
  certId,
  onRowExpand,
}) => {
  const gridApiRef = useRef<GridApi | null>(null);
  const [rowData, setRowData] = useState<UserRowData[]>([]);
  const [detailGridApis, setDetailGridApis] = useState<Map<string, GridApi>>(
    new Map()
  );
  const [expandedFullName, setExpandedFullName] = useState<string | null>(null);
  const [expandedUserRowId, setExpandedUserRowId] = useState<string | null>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const pageSizeSelector = [5, 10, 20, 50, 100];
  const defaultPageSize = pageSizeSelector[0];
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { data: certificationDetailsData, error } = useCertificationDetails(
    reviewerId,
    certId,
    defaultPageSize,
    pageNumber
  );

  useEffect(() => {
    if (!certificationDetailsData) return;
    console.log("Full data:", certificationDetailsData);

    const mapped = certificationDetailsData.items.map((task: any) => {
      const userInfo = task.userInfo || {};
      const access = task.access || {};
      const delta = task.deltaChanges || {};

      console.log(`Delta Changes for task ${task.taskId}:`, delta);
      const fullName = userInfo.firstname + userInfo.lastname;
      console.log(fullName);

      return {
        id: task.taskId,
        ...userInfo,
        certificationId: certId,
        taskId: task.taskId,
        jobtitle: userInfo.jobtitle,
        numOfApplications: access.numOfApplications,
        numOfEntitlements: access.numOfEntitlements,
        numOfApplicationsCertified: access.numOfApplicationsCertified,
        numOfRolesCertified: access.numOfRolesCertified,
        numOfEntitlementsCertified: access.numOfEntitlementsCertified,
        profileChange: delta.profileChange || [],
        SoDConflicts: delta.SoDConflicts || [],
        addedAccounts: delta.addedAccounts || [],
        addedEntitlements: delta.addedEntitlements || [],
        fullName: fullName,
      };
    });

    setRowData(mapped);
    setTotalItems(certificationDetailsData.total_items || 0);
    setTotalPages(certificationDetailsData.total_pages || 1);
  }, [certificationDetailsData, certId]);

  const handlePageChange = (newPage: number) => {
    if (newPage !== pageNumber) {
      setPageNumber(newPage);
    }
  };

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

  const onRowGroupOpened = (params: any) => {
    const node = params.node;
    const isExpanded = node.expanded;
    const fullName = node.data?.fullName;
    const taskId = node.data?.id;

    console.log("User row group opened:", { fullName, taskId, isExpanded });

    if (isExpanded) {
      setExpandedFullName(fullName || null);
      setExpandedUserRowId(taskId || null);
      if (typeof onRowExpand === "function") {
        onRowExpand();
      }
      setRowData((prevRowData) => {
        const newRowData = [...prevRowData];
        const expandedRowIndex = newRowData.findIndex(
          (row) => row.id === taskId
        );
        if (expandedRowIndex !== -1) {
          const [expandedRow] = newRowData.splice(expandedRowIndex, 1);
          newRowData.unshift(expandedRow);
        }
        return newRowData;
      });
      if (gridApiRef.current) {
        gridApiRef.current.ensureIndexVisible(0);
        gridApiRef.current.refreshCells();
      }
    } else {
      setExpandedFullName(null);
      setExpandedUserRowId(null);
    }
  };

  const detailCellRenderer = useCallback(DetailCellRenderer, []);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerComponent: () => "Users",
        field: "fullName",
        headerName: "User",
        width: 520,
        cellRenderer: "agGroupCellRenderer",
        cellRendererParams: {
          suppressCount: true,
          innerRenderer: (params: ICellRendererParams) => {
            const [showTooltip, setShowTooltip] = React.useState(false);

            return (
              <div className="flex items-center gap-3">
                <Image
                  src="https://avatar.iran.liara.run/public/9"
                  alt="User Avatar"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
                <span
                  className="cursor-pointer text-blue-500 hover:underline"
                  onClick={() => setSelectedUser(params.value)}
                >
                  {params.value}
                </span>
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-[#27685b] text-white text-[10px]"
                  title="SOD Violation"
                >
                  FT
                </div>
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-[#27685b] text-white text-[10px]"
                  title="SOD Violation"
                >
                  CW
                </div>
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 relative z-50"
                  title="SOD Violation"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <Flag height={10} color="red" className="text-[10px]" />
                </div>
              </div>
            );
          },
        },
      },
      {
        field: "Risk",
        headerName: "Risk",
        width: 200,
        cellRenderer: (params: ICellRendererParams) => {
          const userName = params.value;
          const risk = params.data?.Risk;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span style={{ color: riskColor }}>{userName}</span>;
        },
      },
      { field: "jobtitle", headerName: "Job Title", width: 450 },
      { field: "department", headerName: "Department", width: 450 },
      {
        field: "progress",
        headerName: "Progress",
        width: 250,
        cellRenderer: (params: ICellRendererParams) => {
          const {
            numOfApplications = 0,
            numOfEntitlements = 0,
            numOfApplicationsCertified = 0,
            numOfEntitlementsCertified = 0,
          } = params.data || {};
          const totalItems = numOfApplications + numOfEntitlements;
          const totalCertified =
            numOfApplicationsCertified + numOfEntitlementsCertified;
          const progress =
            totalItems > 0
              ? Math.round((totalCertified / totalItems) * 100)
              : 0;
          return (
            <div className="flex items-center h-full">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="ml-2">{progress}%</span>
            </div>
          );
        },
      },
      { field: "aiAssist", headerName: "AI Assist", width: 250 },
      {
        colId: "actionColumn",
        headerName: "Action",
        width: 315,
        headerComponent: () => null,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <ActionButtons
              api={params.api}
              selectedRows={[params.data]}
              context="user"
              reviewerId={reviewerId}
              certId={certId}
              onActionSuccess={() => window.location.reload()}
            />
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    [certId]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      resizable: true,
    }),
    []
  );

  const detailCellRendererParams = useMemo(
    () => ({
      detailGridOptions: {
        columnDefs: [
          {
            field: "user",
            headerName: "A/C ID",
            width: 200,
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
          { field: "entitlementType", headerName: "Ent Type", width: 150 },
          { field: "lastLogin", headerName: "Last Login", width: 150 },
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
            colId: "actionColumn",
            headerName: "Actions",
            width: 150,
            headerComponent: () => null,
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
      },
      getDetailRowData: async (params: any) => {
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
      detailRowAutoHeight: true,
    }),
    [certId, reviewerId, defaultPageSize]
  );

  return (
    <>
      {error && (
        <div style={{ color: "red", padding: 10 }}>{String(error)}</div>
      )}
      {expandedFullName && (
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded mb-3 font-medium flex items-center justify-between transition-all duration-300 animate-fade-in">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center space-x-1">
              <span>
                Expanded User:{" "}
                <span className="font-semibold">{expandedFullName}</span>
              </span>
              <button
                onClick={() => {
                  console.log("Closing user:", {
                    fullName: expandedFullName,
                    rowId: expandedUserRowId,
                  });
                  setExpandedFullName(null);
                  setExpandedUserRowId(null);
                  if (gridApiRef.current && expandedUserRowId) {
                    console.log("User grid API available");
                    const node =
                      gridApiRef.current.getRowNode(expandedUserRowId);
                    if (node) {
                      console.log("User row node found:", node.data);
                      node.setExpanded(false);
                    } else {
                      console.warn(
                        "User row node not found for ID:",
                        expandedUserRowId
                      );
                      gridApiRef.current.forEachNode((n) => {
                        if (n.expanded) n.setExpanded(false);
                      });
                    }
                  } else {
                    console.warn("User grid API or row ID not available:", {
                      gridApi: gridApiRef.current,
                      expandedUserRowId,
                    });
                  }
                }}
                className="text-red-500 hover:text-red-600 font-bold text-lg leading-none"
                aria-label="Close user"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedUser && (
        <UserPopup
          username={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <SelectAll
          gridApi={gridApiRef.current}
          detailGridApis={detailGridApis}
          clearDetailGridApis={() => setDetailGridApis(new Map())}
        />
        <div className="flex items-center">
          <CustomPagination
            totalItems={totalItems}
            currentPage={pageNumber}
            totalPages={totalPages}
            pageSize={defaultPageSize}
            onPageChange={handlePageChange}
          />
          <Filters gridApi={gridApiRef} />
          <Import gridApi={gridApiRef.current} />
          <Exports gridApi={gridApiRef.current} />
          <button
            title="Sign Off"
            aria-label="Sign off selected rows"
            className="p-1 rounded transition-colors duration-200"
          >
            <CheckCircleIcon
              className="curser-pointer"
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
      <div style={{ height: "100%", width: "100%" }}>
        <AgGridReact
          rowData={rowData}
          getRowId={(params: GetRowIdParams) => params.data.id}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout="autoHeight"
          detailRowAutoHeight={true}
          masterDetail={true}
          isRowMaster={() => true}
          rowSelection={{
            mode: "multiRow",
            masterSelects: "detail",
          }}
          onGridReady={(params) => {
            console.log("Main grid ready:", params.api);
            gridApiRef.current = params.api;
            params.api.sizeColumnsToFit();
          }}
          onFirstDataRendered={(params) => {
            console.log("Main grid data rendered:", params.api);
            gridApiRef.current = params.api;
            params.api.sizeColumnsToFit();
          }}
          onRowGroupOpened={onRowGroupOpened}
          pagination={false}
          paginationPageSize={defaultPageSize}
          paginationPageSizeSelector={pageSizeSelector}
          cacheBlockSize={defaultPageSize}
          paginateChildRows={true}
          overlayLoadingTemplate={`<span class="ag-overlay-loading-center">⏳ Loading certification data...</span>`}
          overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data to display.</span>`}
          className="ag-theme-quartz ag-main"
          detailCellRendererParams={detailCellRendererParams}
        />
      </div>
    </>
  );
};

export default TreeClient;
