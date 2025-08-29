"use client";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";
import HorizontalTabs from "@/components/HorizontalTabs";
import { ColDef, GridApi, ICellRendererParams } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  InfoIcon,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect, use } from "react";
import { createPortal } from "react-dom";
import "@/lib/ag-grid-setup";
import Exports from "@/components/agTable/Exports";
import EditReassignButtons from "@/components/agTable/EditReassignButtons";
import ActionButtons from "@/components/agTable/ActionButtons";
import Link from "next/link";
import Tabs from "@/components/tabs";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

const data: Record<string, DataItem[]> = {
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

const dataAccount: Record<string, DataItem[]> = {
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
};

export default function ApplicationDetailPage( { params }: { params: Promise<{ appId: string }> } ) {

  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [tabIndex, setTabIndex] = useState(1);
  const [entTabIndex, setEntTabIndex] = useState(1); // Set to 1 for "Under Review"
  const gridApiRef = useRef<GridApi | null>(null);
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [nodeData, setNodeData] = useState<any>(null);
  const [expandedFrames, setExpandedFrames] = useState({
    general: false,
    business: false,
    technical: false,
    security: false,
    lifecycle: false,
  });
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
    const [rowData, setRowData] = useState([]);
  

  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const toggleSidePanel = (data: any) => {
    setNodeData(data);
    setIsSidePanelOpen((prev) => !prev);
  };

  const toggleFrame = (frame: keyof typeof expandedFrames) => {
    setExpandedFrames((prev) => ({ ...prev, [frame]: !prev[frame] }));
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!gridApiRef.current || !nodeData) return;
    await updateActions("Approve", comment || "Approved via UI");
  };

  const handleRevoke = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!gridApiRef.current || !nodeData) return;
    await updateActions("Reject", comment || "Revoked via UI");
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nodeData || !comment.trim()) return;
    alert(
      `Comment added: ${comment} for ${nodeData["Ent Name"] || "selected row"}`
    );
    setComment("");
  };

  const updateActions = async (actionType: string, justification: string) => {
    const payload = {
      entitlementAction: [
        {
          actionType,
          lineItemIds: [nodeData?.["Ent ID"]].filter(Boolean),
          justification,
        },
      ],
    };

    try {
      const response = await fetch(
        `https://preview.keyforge.ai/certification/api/v1/CERTTEST/updateAction/REVIEWER_ID/CERT_ID`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      gridApiRef.current?.applyTransaction({
        update: [{ ...nodeData, status: actionType }],
      });
      setLastAction(actionType);
      setError(null);
      setComment("");
      return await response.json();
    } catch (err: any) {
      setError(`Failed to update actions: ${err.message}`);
      console.error("API error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidePanelOpen(false);
    };
    if (isSidePanelOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidePanelOpen]);

  useEffect(() => {
    setLastAction(null);
  }, [nodeData]);

  const formatDate = (date: string | undefined) => {
    return date
      ? new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";
  };

  const renderSideBySideField = (
    label1: string,
    value1: any,
    label2: string,
    value2: any
  ) => (
    <div className="flex space-x-4 text-sm text-gray-700">
      <div className="flex-1">
        <strong>{label1}:</strong> {value1?.toString() || "N/A"}
      </div>
      <div className="flex-1">
        <strong>{label2}:</strong> {value2?.toString() || "N/A"}
      </div>
    </div>
  );

  const renderSingleField = (label: string, value: any) => (
    <div className="text-sm text-gray-700">
      <strong>{label}:</strong> {value?.toString() || "N/A"}
    </div>
  );

  // const rowData = [
  //   {
  //     account: "Aaliyah Munoz",
  //     accountStatus: "Active",
  //     accountType: "User",
  //     discoveryDate: "6/17/24",
  //     externalDomain: "No",
  //     userStatus: "Active",
  //     user: "Aaliyah Munoz",
  //   }
  // ];
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(`https://preview.keyforge.ai/entities/api/v1/CERTTEST/getAppAccounts/430ea9e6-3cff-449c-a24e-59c057f81e3d/${id}`);
          const data = await response.json();
          console.log(data);
          if (data.executionStatus === "success") {
            setRowData(data.items);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
      fetchData();
    }, []);

  const rowData2 = [
    {
      "Ent ID": "ENT201",
      "Ent Name": "Server Admin",
      "Ent Description":
        "Administrative access to on-premises server infrastructure",
      "Total Assignments": 8,
      "Last Sync": "2025-07-13T12:00:00Z",
      Requestable: "Yes",
      Certifiable: "Yes",
      Risk: "High",
      "SOD Check": "Passed",
      Hierarchy: "Top-level",
      "Pre- Requisite": "Server Admin Training",
      "Pre-Requisite Details": "Completion of Windows Server Admin course",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "No",
      "Capability/Technical Scope": "Manage server configurations and updates",
      "Business Objective": "Maintain server uptime and security",
      "Compliance Type": "ISO 27001",
      "Access Scope": "Global",
      "Last Reviewed on": "2025-06-25",
      Reviewed: "Yes",
      "Dynamic Tag": "Infrastructure",
      "MFA Status": "Enabled",
      "Review Schedule": "Quarterly",
      "Ent Owner": "Emily Carter",
      "Created On": "2024-03-10",
    },
    {
      "Ent ID": "ENT202",
      "Ent Name": "HR Viewer",
      "Ent Description": "Read-only access to HR system reports",
      "Total Assignments": 20,
      "Last Sync": "2025-07-12T15:30:00Z",
      Requestable: "No",
      Certifiable: "No",
      Risk: "Low",
      "SOD Check": "Not Required",
      Hierarchy: "Low-level",
      "Pre- Requisite": "None",
      "Pre-Requisite Details": "N/A",
      "Revoke on Disable": "Yes",
      "Shared Pwd": "Yes",
      "Capability/Technical Scope": "View employee data and reports",
      "Business Objective": "Support HR analytics",
      "Compliance Type": "GDPR",
      "Access Scope": "Departmental",
      "Last Reviewed on": "2025-05-15",
      Reviewed: "No",
      "Dynamic Tag": "HR",
      "MFA Status": "Disabled",
      "Review Schedule": "Annual",
      "Ent Owner": "Mark Thompson",
      "Created On": "2024-08-01",
    },
  ];

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "accountName",
        headerName: "accountId",
        flex:2,
        cellRenderer: "agGroupCellRenderer",
        cellRendererParams: {
          suppressExpand: false,
          innerRenderer: (params: ICellRendererParams) => {
            const { accountType } = params.data || {};
            const accountTypeLabel = accountType ? `(${accountType})` : "";
            return (
              <div className="flex items-center space-x-2">
                <div className="flex flex-col gap-0 cursor-pointer hover:underline">
                  <span className="text-gray-800 font-bold text-[14px]">
                    {params.value}{" "}
                    {accountType && (
                      <span
                        className="text-[#175AE4] font-normal"
                        title={`Account Type: ${accountType}`}
                      >
                        {accountTypeLabel}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          },
        },
        cellClass: "ag-cell-no-padding",
      },
      {
        field: "risk",
        headerName: "Risk",
        width: 100,
        cellRenderer: (params: ICellRendererParams) => {
          const userName = params.value;
          const risk = params.data?.risk;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span style={{ color: riskColor }}>{userName}</span>;
        },
      },
      {
        field: "userDisplayName",
        headerName: "Display Name",
        flex:2,
        cellRenderer: (params: ICellRendererParams) => {
          const { userType } = params.data || {};
          const userTypeLabel = userType ? `(${userType})` : "";
          return (
            <div className="flex flex-col gap-0 cursor-pointer hover:underline">
              <span className="text-gray-800">
                {params.value}{" "}
                {userType && (
                  <span
                    className="text-[#175AE4] font-normal"
                    title={`User Type: ${userType}`}
                  >
                    {userTypeLabel}
                  </span>
                )}
              </span>
            </div>
          );
        },
      },
      {
        field: "entitlementName",
        headerName: "Entitlement Name",
        enableRowGroup: true,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex flex-col gap-0">
            <span className="text-gray-800">{params.value}</span>
          </div>
        ),
      },
      {
        field: "lastlogindate",
        headerName: "Last Login Date",
        enableRowGroup: true,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex flex-col gap-0">
            <span className="text-gray-800">{params.value}</span>
          </div>
        ),
      },
      {
        field: "lastAccessReview",
        headerName: "Last Access Review",
      },
      {
        field: "accountType",
        headerName: "Account Type",
        flex: 2,
        hide: true,
      },
      { field: "userStatus", headerName: "User Status", flex: 2, hide: true },
      { field: "userId", headerName: "User ID", flex: 2, hide: true },
      {
        field: "userManager",
        headerName: "User Manager",
        flex: 2,
        hide: true,
      },
      { field: "userDepartment", headerName: "User Dept", flex: 2, hide: true },
      { field: "jobTitle", headerName: "Job Title", flex: 2, hide: true },
      {
        field: "accessGrantDate",
        headerName: "Access Grant Date",
        flex: 2,
        hide: true,
      },
      { field: "userType", headerName: "User Type", flex: 2, hide: true },
      {
        field: "entitlementType",
        headerName: "Entitlement Type",
        flex: 2,
        hide: true,
      },
      {
        field: "syncDate",
        headerName: "Sync Date",
        flex:1
      },
    ],
    []
  );

  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "Ent Name",
        headerName: "Entitlement Name",
        flex: 2.5,
        wrapText: true,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex flex-col">
              {/* Row 1: entitlement name */}
              <div className="font-semibold">{params.value}</div>

              {/* Row 2: full-width description */}
              <div className="text-gray-600 text-sm w-100">
                {params.data["Ent Description"]}
              </div>
            </div>
          );
        },
      },
      // { field:"Ent Description", headerName:"Entitlement Description", flex:2},
      { field: "Ent Type", headerName: "Enttitlement Type", flex: 2.5 },
      { field: "Risk", headerName: "Risk", flex: 1.5 },
      { field: "App Name", headerName: "Application Name", flex: 2.5 },
      { field: "assignment", headerName: "Assignment", flex: 2 },
      { field: "Last Sync", headerName: "Last Sync", flex: 2 },
      {
        field: "Last Reviewed on",
        headerName: "Last Reviewed",
        flex: 2,
      },
      {
        field: "Total Assignments",
        headerName: "Total Assignments",
        flex: 1.5,
        hide: true,
      },
      { field: "Requestable", headerName: "Requestable", flex: 2, hide: true },
      { field: "Certifiable", headerName: "Certifiable", flex: 2, hide: true },
      { field: "SOD Check", headerName: "SOD Check", flex: 1.5, hide: true },
      { field: "Hierarchy", headerName: "Hierarchy", flex: 2, hide: true },
      {
        field: "Pre- Requisite",
        headerName: "Pre- Requisite",
        flex: 2,
        hide: true,
      },
      {
        field: "Pre-Requisite Details",
        headerName: "Pre-Requisite Details",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Revoke on Disable",
        headerName: "Revoke on Disable",
        flex: 1.5,
        hide: true,
      },
      { field: "Shared Pwd", headerName: "Shared Pwd", flex: 1.5, hide: true },
      {
        field: "Capability/Technical Scope",
        headerName: "Capability/Technical Scope",
        flex: 2,
        hide: true,
      },
      {
        field: "Business Objective",
        headerName: "Busines Objective",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Compliance Type",
        headerName: "Compliance Type",
        flex: 2,
        hide: true,
      },
      {
        field: "Access Scope",
        headerName: "Access Scope",
        flex: 1.5,
        hide: true,
      },
      { field: "Reviewed", headerName: "Reviewed", flex: 2, hide: true },
      { field: "Dynamic Tag", headerName: "Dynamic Tag", flex: 2, hide: true },
      { field: "MFA Status", headerName: "MFA Status", flex: 1.5, hide: true },
      {
        field: "Review Schedule",
        headerName: "Review Schedule",
        flex: 2,
        hide: true,
      },
      {
        field: "Ent Owner",
        headerName: "Entitlement Owner",
        flex: 1.5,
        hide: true,
      },
      { field: "Created On", headerClass: "Created On", flex: 2, hide: true },
      {
        field: "actionColumn",
        headerName: "Action",
        flex: 2,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <EditReassignButtons
              api={params.api}
              selectedRows={[params.data]}
              nodeData={params.data}
              reviewerId="REVIEWER_ID"
              certId="CERT_ID"
              context="entitlement"
            />
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    []
  );

  const underReviewColDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "Ent Name",
        headerName: "Entitlement Name",
        flex: 2.5,
        wrapText: true,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex flex-col">
              {/* Row 1: entitlement name */}
              <div className="font-semibold">{params.value}</div>

              {/* Row 2: full-width description */}
              <div className="text-gray-600 text-sm w-100">
                {params.data["Ent Description"]}
              </div>
            </div>
          );
        },
      },
      { field: "Ent Type", headerName: "Ent Type", flex: 2 },
      {
        field: "Risk",
        headerName: "Ent Risk",
        flex: 2,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span style={{ color: riskColor }}>{risk}</span>;
        },
      },
      { field: "App Name", headerName: "Application Name", flex: 2.5 },
      { field: "Last Reviewed on", headerName: "Last Reviewed", flex: 2.5 },
      {
        headerName: "Actions",
        width: 500,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex space-x-4 h-full items-center">
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button
                onClick={handleApprove}
                title="Approve"
                aria-label="Approve selected rows"
                className={`p-1 rounded transition-colors duration-200 ${
                  lastAction === "Approve"
                    ? "bg-green-500"
                    : "hover:bg-green-100"
                }`}
              >
                <CircleCheck
                  className="cursor-pointer"
                  color="#1c821cff"
                  strokeWidth="1"
                  size="32"
                  fill={lastAction === "Approve" ? "#1c821cff" : "none"}
                />
              </button>
              <button
                onClick={handleRevoke}
                title="Revoke"
                aria-label="Revoke selected rows"
                className={`p-1 rounded ${
                  nodeData?.status === "Rejected" ? "bg-red-100" : ""
                }`}
              >
                <CircleX
                  className="cursor-pointer hover:opacity-80 transform rotate-90"
                  color="#FF2D55"
                  strokeWidth="1"
                  size="32"
                  fill={nodeData?.status === "Rejected" ? "#FF2D55" : "none"}
                />
              </button>
              <button
                onClick={handleComment}
                title="Comment"
                aria-label="Add comment"
                className="p-1 rounded"
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 32 32"
                  className="cursor-pointer hover:opacity-80"
                >
                  <path
                    d="M0.700195 0V19.5546H3.5802V25.7765C3.57994 25.9525 3.62203 26.1247 3.70113 26.2711C3.78022 26.4176 3.89277 26.5318 4.02449 26.5992C4.15621 26.6666 4.30118 26.6842 4.44101 26.6498C4.58085 26.6153 4.70926 26.5304 4.80996 26.4058C6.65316 24.1232 10.3583 19.5546 10.3583 19.5546H25.1802V0H0.700195ZM2.1402 1.77769H23.7402V17.7769H9.76212L5.0202 23.6308V17.7769H2.1402V1.77769ZM5.0202 5.33307V7.11076H16.5402V5.33307H5.0202ZM26.6202 5.33307V7.11076H28.0602V23.11H25.1802V28.9639L20.4383 23.11H9.34019L7.9002 24.8877H19.8421C19.8421 24.8877 23.5472 29.4563 25.3904 31.7389C25.4911 31.8635 25.6195 31.9484 25.7594 31.9828C25.8992 32.0173 26.0442 31.9997 26.1759 31.9323C26.3076 31.8648 26.4202 31.7507 26.4993 31.6042C26.5784 31.4578 26.6204 31.2856 26.6202 31.1096V24.8877H29.5002V5.33307H26.6202ZM5.0202 8.88845V10.6661H10.7802V8.88845H5.0202ZM5.0202 12.4438V14.2215H19.4202V12.4438H5.0202Z"
                    fill="#2684FF"
                  />
                </svg>
              </button>
              <button
                onClick={() => toggleSidePanel(params.data)}
                title="Info"
                className={`cursor-pointer rounded-sm hover:opacity-80 ${
                  isSidePanelOpen && nodeData === params.data
                    ? "bg-[#6D6E73]/20"
                    : ""
                }`}
                aria-label="View details"
              >
                <InfoIcon
                  color="#55544dff"
                  size="48"
                  className="transform scale-[0.6]"
                />
              </button>
            </div>
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    []
  );

  const detailCellRendererParams = useMemo(() => {
    return {
      detailGridOptions: {
        columnDefs: [{ field: "info", headerName: "Detail Info", flex: 1 }],
        defaultColDef: {
          flex: 1,
        },
      },
      getDetailRowData: (params: any) => {
        params.successCallback([{ info: params.data.details }]);
      },
    };
  }, []);

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  const tabsDataEnt = [
    {
      label: "All",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        return (
          <div
            className="ag-theme-alpine"
            style={{ height: 500, width: "100%" }}
          >
            {/* <div className="relative mb-2">
              <Accordion
                iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
                open={true}
              >
                <div className="grid grid-cols-4 gap-10">
                  {Object.entries(data).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-2 p-4">
                        <h3 className="font-semibold text-sm capitalize">
                          {category.replace(/([A-Z])/g, " $1")}
                        </h3>
                        <button
                          onClick={() => {
                            setSelected((prev) => ({
                              ...prev,
                              [category]: null,
                            }));
                          }}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Clear
                          {selected[category] !== undefined &&
                          selected[category] !== null ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="space-y-2 pl-8 pr-8">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className={`flex text-sm relative items-center p-3 rounded-sm cursor-pointer transition-all ${
                              selected[category] === index
                                ? "bg-[#6574BD] text-white"
                                : "bg-[#F0F2FC] hover:bg-[#e5e9f9]"
                            } ${item.color || ""}`}
                            onClick={() => handleSelect(category, index)}
                          >
                            <span>{item.label}</span>
                            <span
                              className={`font-semibold absolute -right-2 bg-white border p-1 text-[12px] rounded-sm ${
                                selected[category] === index
                                  ? "border-[#6574BD] text-[#6574BD]"
                                  : "border-[#e5e9f9]"
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            </div> */}
            <div className="flex justify-end mb-4 relative z-10">
              <Exports gridApi={gridApiRef.current} />
            </div>
            <AgGridReact
              rowData={rowData2}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              masterDetail={true}
              getRowHeight={() => 70}
              detailCellRendererParams={detailCellRendererParams}
            />
          </div>
        );
      },
    },
    {
      label: "Under Review",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => (
        <div className="ag-theme-alpine" style={{ height: 500, width: "100%" }}>
          <div className="relative mb-4"></div>
          {/* <div className="relative mb-2">
            <Accordion
              iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
              open={true}
            >
              <div className="grid grid-cols-4 gap-10">
                {Object.entries(data).map(([category, items]) => (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-2 p-4">
                      <h3 className="font-semibold text-sm capitalize">
                        {category.replace(/([A-Z])/g, " $1")}
                      </h3>
                      <button
                        onClick={() => {
                          setSelected((prev) => ({
                            ...prev,
                            [category]: null,
                          }));
                        }}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Clear
                        {selected[category] !== undefined &&
                        selected[category] !== null ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-blue-600"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="space-y-2 pl-8 pr-8">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className={`flex text-sm relative items-center p-3 rounded-sm cursor-pointer transition-all ${
                            selected[category] === index
                              ? "bg-[#6574BD] text-white"
                              : "bg-[#F0F2FC] hover:bg-[#e5e9f9]"
                          } ${item.color || ""}`}
                          onClick={() => handleSelect(category, index)}
                        >
                          <span>{item.label}</span>
                          <span
                            className={`font-semibold absolute -right-2 bg-white border p-1 text-[12px] rounded-sm ${
                              selected[category] === index
                                ? "border-[#6574BD] text-[#6574BD]"
                                : "border-[#e5e9f9]"
                            }`}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Accordion>
          </div> */}
          <div className="flex justify-end mb-4 relative z-10">
            <Exports gridApi={gridApiRef.current} />
          </div>
          <AgGridReact
            rowData={rowData2}
            columnDefs={underReviewColDefs}
            defaultColDef={defaultColDef}
            masterDetail={true}
            getRowHeight={() => 70}
            detailCellRendererParams={detailCellRendererParams}
          />
          {isSidePanelOpen &&
            createPortal(
              <div
                className="fixed top-0 right-0 h-full w-150 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
                style={{
                  transform: isSidePanelOpen
                    ? "translateX(0)"
                    : "translateX(100%)",
                }}
              >
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold">
                        Entitlement Details
                      </h2>
                      <h3 className="text-md font-medium mt-2">
                        {nodeData?.["Ent Name"] || "Name: -"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {nodeData?.["Ent Description"] || "Ent Description: -"}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsSidePanelOpen(false)}
                      className="text-gray-600 hover:text-gray-800"
                      aria-label="Close panel"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={handleApprove}
                      title="Approve"
                      aria-label="Approve entitlement"
                      className={`p-1 rounded transition-colors duration-200 ${
                        lastAction === "Approve"
                          ? "bg-green-500"
                          : "hover:bg-green-100"
                      }`}
                    >
                      <CircleCheck
                        className="cursor-pointer"
                        color="#1c821cff"
                        strokeWidth="1"
                        size="32"
                        fill={lastAction === "Approve" ? "#1c821cff" : "none"}
                      />
                    </button>
                    <button
                      onClick={handleRevoke}
                      title="Revoke"
                      aria-label="Revoke entitlement"
                      className={`p-1 rounded ${
                        nodeData?.status === "Rejected" ? "bg-red-100" : ""
                      }`}
                    >
                      <CircleX
                        className="cursor-pointer hover:opacity-80 transform rotate-90"
                        color="#FF2D55"
                        strokeWidth="1"
                        size="32"
                        fill={
                          nodeData?.status === "Rejected" ? "#FF2D55" : "none"
                        }
                      />
                    </button>
                    <button
                      onClick={handleComment}
                      title="Comment"
                      aria-label="Add comment"
                      className="p-1 rounded"
                    >
                      <svg
                        width="30"
                        height="30"
                        viewBox="0 0 32 32"
                        className="cursor-pointer hover:opacity-80"
                      >
                        <path
                          d="M0.700195 0V19.5546H3.5802V25.7765C3.57994 25.9525 3.62203 26.1247 3.70113 26.2711C3.78022 26.4176 3.89277 26.5318 4.02449 26.5992C4.15621 26.6666 4.30118 26.6842 4.44101 26.6498C4.58085 26.6153 4.70926 26.5304 4.80996 26.4058C6.65316 24.1232 10.3583 19.5546 10.3583 19.5546H25.1802V0H0.700195ZM2.1402 1.77769H23.7402V17.7769H9.76212L5.0202 23.6308V17.7769H2.1402V1.77769ZM5.0202 5.33307V7.11076H16.5402V5.33307H5.0202ZM26.6202 5.33307V7.11076H28.0602V23.11H25.1802V28.9639L20.4383 23.11H9.34019L7.9002 24.8877H19.8421C19.8421 24.8877 23.5472 29.4563 25.3904 31.7389C25.4911 31.8635 25.6195 31.9484 25.7594 31.9828C25.8992 32.0173 26.0442 31.9997 26.1759 31.9323C26.3076 31.8648 26.4202 31.7507 26.4993 31.6042C26.5784 31.4578 26.6204 31.2856 26.6202 31.1096V24.8877H29.5002V5.33307H26.6202ZM5.0202 8.88845V10.6661H10.7802V8.88845H5.0202ZM5.0202 12.4438V14.2215H19.4202V12.4438H5.0202Z"
                          fill="#2684FF"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                    <button
                      className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                      onClick={() => toggleFrame("general")}
                    >
                      {expandedFrames.general ? (
                        <ChevronDown size={20} className="mr-2" />
                      ) : (
                        <ChevronRight size={20} className="mr-2" />
                      )}
                      General
                    </button>
                    {expandedFrames.general && (
                      <div className="p-4 space-y-2">
                        {renderSideBySideField(
                          "Ent Type",
                          nodeData?.["Ent Type"],
                          "#Assignments",
                          nodeData?.["Total Assignments"]
                        )}
                        {renderSideBySideField(
                          "App Name",
                          nodeData?.["App Name"],
                          "Tag(s)",
                          nodeData?.["Dynamic Tag"]
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                    <button
                      className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                      onClick={() => toggleFrame("business")}
                    >
                      {expandedFrames.business ? (
                        <ChevronDown size={20} className="mr-2" />
                      ) : (
                        <ChevronRight size={20} className="mr-2" />
                      )}
                      Business
                    </button>
                    {expandedFrames.business && (
                      <div className="p-4 space-y-2">
                        {renderSingleField(
                          "Objective",
                          nodeData?.["Business Objective"]
                        )}
                        {renderSideBySideField(
                          "Business Unit",
                          nodeData?.["Business Unit"],
                          "Business Owner",
                          nodeData?.["Ent Owner"]
                        )}
                        {renderSingleField(
                          "Regulatory Scope",
                          nodeData?.["Compliance Type"]
                        )}
                        {renderSideBySideField(
                          "Data Classification",
                          nodeData?.["Data Classification"],
                          "Cost Center",
                          nodeData?.["Cost Center"]
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                    <button
                      className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                      onClick={() => toggleFrame("technical")}
                    >
                      {expandedFrames.technical ? (
                        <ChevronDown size={20} className="mr-2" />
                      ) : (
                        <ChevronRight size={20} className="mr-2" />
                      )}
                      Technical
                    </button>
                    {expandedFrames.technical && (
                      <div className="p-4 space-y-2">
                        {renderSideBySideField(
                          "Created On",
                          formatDate(nodeData?.["Created On"]),
                          "Last Sync",
                          formatDate(nodeData?.["Last Sync"])
                        )}
                        {renderSideBySideField(
                          "App Name",
                          nodeData?.["App Name"],
                          "App Instance",
                          nodeData?.["App Instance"]
                        )}
                        {renderSideBySideField(
                          "App Owner",
                          nodeData?.["App Owner"],
                          "Ent Owner",
                          nodeData?.["Ent Owner"]
                        )}
                        {renderSideBySideField(
                          "Hierarchy",
                          nodeData?.["Hierarchy"],
                          "MFA Status",
                          nodeData?.["MFA Status"]
                        )}
                        {renderSingleField(
                          "Assigned to/Member of",
                          nodeData?.["assignment"]
                        )}
                        {renderSingleField(
                          "License Type",
                          nodeData?.["License Type"]
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                    <button
                      className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                      onClick={() => toggleFrame("security")}
                    >
                      {expandedFrames.security ? (
                        <ChevronDown size={20} className="mr-2" />
                      ) : (
                        <ChevronRight size={20} className="mr-2" />
                      )}
                      Security
                    </button>
                    {expandedFrames.security && (
                      <div className="p-4 space-y-2">
                        {renderSideBySideField(
                          "Risk",
                          nodeData?.["Risk"],
                          "Certifiable",
                          nodeData?.["Certifiable"]
                        )}
                        {renderSideBySideField(
                          "Revoke on Disable",
                          nodeData?.["Revoke on Disable"],
                          "Shared Pwd",
                          nodeData?.["Shared Pwd"]
                        )}
                        {renderSingleField(
                          "SoD/Toxic Combination",
                          nodeData?.["SOD Check"]
                        )}
                        {renderSingleField(
                          "Access Scope",
                          nodeData?.["Access Scope"]
                        )}
                        {renderSideBySideField(
                          "Review Schedule",
                          nodeData?.["Review Schedule"],
                          "Last Reviewed On",
                          formatDate(nodeData?.["Last Reviewed on"])
                        )}
                        {renderSideBySideField(
                          "Privileged",
                          nodeData?.["Privileged"],
                          "Non Persistent Access",
                          nodeData?.["Non Persistent Access"]
                        )}
                        {renderSingleField(
                          "Audit Comments",
                          nodeData?.["Audit Comments"]
                        )}
                        {renderSingleField(
                          "Account Type Restriction",
                          nodeData?.["Account Type Restriction"]
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                    <button
                      className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                      onClick={() => toggleFrame("lifecycle")}
                    >
                      {expandedFrames.lifecycle ? (
                        <ChevronDown size={20} className="mr-2" />
                      ) : (
                        <ChevronRight size={20} className="mr-2" />
                      )}
                      Lifecycle
                    </button>
                    {expandedFrames.lifecycle && (
                      <div className="p-4 space-y-2">
                        {renderSideBySideField(
                          "Requestable",
                          nodeData?.["Requestable"],
                          "Pre-Requisite",
                          nodeData?.["Pre- Requisite"]
                        )}
                        {renderSingleField(
                          "Pre-Req Details",
                          nodeData?.["Pre-Requisite Details"]
                        )}
                        {renderSingleField(
                          "Auto Assign Access Policy",
                          nodeData?.["Auto Assign Access Policy"]
                        )}
                        {renderSingleField(
                          "Provisioner Group",
                          nodeData?.["Provisioner Group"]
                        )}
                        {renderSingleField(
                          "Provisioning Steps",
                          nodeData?.["Provisioning Steps"]
                        )}
                        {renderSingleField(
                          "Provisioning Mechanism",
                          nodeData?.["Provisioning Mechanism"]
                        )}
                        {renderSingleField(
                          "Action on Native Change",
                          nodeData?.["Action on Native Change"]
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}
        </div>
      ),
    },
  ];

  const tabsData = [
    {
      label: "About",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => <p>Coming Soon...</p>,
    },
    {
      label: "Accounts",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        return (
          <div
            className="ag-theme-alpine"
            style={{ height: 500, width: "100%" }}
          >
            <div className="relative mb-4">
              <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
                Accounts
              </h1>
              <Accordion
                iconClass="absolute top-2 right-0 rounded-full text-white bg-purple-800"
                title="Expand/Collapse"
              >
                <div className="grid grid-cols-4 gap-10 p-2">
                  {Object.entries(dataAccount).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-2 p-4">
                        <h3 className="font-semibold text-sm capitalize">
                          {category.replace(/([A-Z])/g, " $1")}
                        </h3>
                        <button
                          onClick={() => {
                            setSelected((prev) => ({
                              ...prev,
                              [category]: null,
                            }));
                          }}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Clear
                          {selected[category] !== undefined &&
                          selected[category] !== null ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.6 7.5V18a1 1 0 01-.45.84l-4 2.5A1 1 0 019 20.5v-8.4L3.2 5.6A1 1 0 013 4z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="space-y-2 pl-8 pr-8">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className={`flex text-sm relative items-center p-3 rounded-sm cursor-pointer transition-all ${
                              selected[category] === index
                                ? "bg-[#6574BD] text-white"
                                : "bg-[#F0F2FC] hover:bg-[#e5e9f9]"
                            } ${item.color || ""}`}
                            onClick={() => handleSelect(category, index)}
                          >
                            <span>{item.label}</span>
                            <span
                              className={`font-semibold absolute -right-2 bg-white border p-1 text-[12px] rounded-sm ${
                                selected[category] === index
                                  ? "border-[#6574BD] text-[#6574BD]"
                                  : "border-[#e5e9f9]"
                              }`}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            </div>
            <div className="flex justify-end mb-4 relative z-10 pt-10">
              <Exports gridApi={gridApiRef.current} />
            </div>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              masterDetail={true}
              detailCellRendererParams={detailCellRendererParams}
            />
          </div>
        );
      },
    },
    {
      label: "Entitlements",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        return (
          <div
            className="ag-theme-alpine"
            style={{ height: 500, width: "100%" }}
          >
            <div className="relative mb-2">
              <h1 className="text-xl font-bold pb-2 text-blue-950">
                Entitlements
              </h1>
              <Tabs
                tabs={tabsDataEnt}
                activeClass="bg-[#15274E] text-white text-sm rounded-sm "
                buttonClass="h-10 -mt-1 w-40"
                className="ml-0.5 border border-gray-300 w-65 h-8 rounded-md"
                activeIndex={entTabIndex}
                onChange={setEntTabIndex}
              />
            </div>
          </div>
        );
      },
    },
{
  label: "Sampling",
  icon: ChevronDown,
  iconOff: ChevronRight,
  component: () => (
    <div className="sampling-tab-content flex justify-center">
      <div className="search-container" style={{ display: 'flex', gap: '10px', margin: '20px' }}>
        <input
          type="text"
          placeholder="Search by User Name Or Email Id"
          style={{
            padding: '8px',
            width: '300px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Get Result
        </button>
      </div>
    </div>
  ),
},
  ];

  return (
    <>
      <HorizontalTabs
        tabs={tabsData}
        activeClass="bg-[#15274E] text-white rounded-sm -ml-1"
        buttonClass="h-10 -mt-1 w-50"
        className="ml-0.5 border border-gray-300 w-80 h-8 rounded-md"
        activeIndex={tabIndex}
        onChange={setTabIndex}
      />
    </>
  );
}
