"use client";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";
import HorizontalTabs from "@/components/HorizontalTabs";
import {
  ColDef,
  GridApi,
  ICellRendererParams,
  IDetailCellRendererParams,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  ArrowRightCircle,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect, use } from "react";
import { createPortal } from "react-dom";
import { formatDateMMDDYY } from "@/utils/utils";
import "@/lib/ag-grid-setup";
import Exports from "@/components/agTable/Exports";
import CustomPagination from "@/components/agTable/CustomPagination";
import EditReassignButtons from "@/components/agTable/EditReassignButtons";
import ActionButtons from "@/components/agTable/ActionButtons";
import { getAllRegisteredApps, searchUsers } from "@/lib/api";
import Link from "next/link";
import Tabs from "@/components/tabs";
import EntitlementRiskSidebar from "@/components/EntitlementRiskSidebar";

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
    { label: "Dormant for past 30-60 days", value: 0 },
    { label: "Dormant for more than 90 days", value: 0 },
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
    { label: "Dormant for past 30-60 days", value: 0 },
    { label: "Dormant for more than 90 days", value: 0 },
  ],
};

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
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
  const [isEntitlementSidebarOpen, setIsEntitlementSidebarOpen] = useState(false);
  const [selectedEntitlement, setSelectedEntitlement] = useState<any>(null);
  const [expandedFrames, setExpandedFrames] = useState({
    general: false,
    business: false,
    technical: false,
    security: false,
    lifecycle: false,
  });
  const [comment, setComment] = useState("");
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [accountsRowData, setAccountsRowData] = useState<any[]>([]);
  const [entRowData, setEntRowData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [entitlementDetails, setEntitlementDetails] = useState<any>(null);
  const [entitlementDetailsError, setEntitlementDetailsError] = useState<string | null>(null);

  // Build separate row for description under each entitlement row (for Entitlements tab)
  const entRowsWithDesc = useMemo(() => {
    if (!entRowData || entRowData.length === 0) return [] as any[];
    const rows: any[] = [];
    for (const item of entRowData) {
      rows.push(item);
      rows.push({ ...item, __isDescRow: true });
    }
    return rows;
  }, [entRowData]);

  // Helper function to map catalogDetails to nodeData fields
  const mapApiDataToNodeData = (catalogDetails: any, originalNodeData: any) => {
    if (!catalogDetails) return originalNodeData;
    
    // Create a mapping object that handles various possible field names
    const fieldMappings = {
      // Entitlement basic info
      "Ent Name": catalogDetails.name || catalogDetails.entitlementName || catalogDetails.entitlement_name || originalNodeData?.["Ent Name"],
      "Ent Description": catalogDetails.description || catalogDetails.entitlementDescription || catalogDetails.entitlement_description || originalNodeData?.["Ent Description"],
      "Ent Type": catalogDetails.type || catalogDetails.entitlementType || catalogDetails.entitlement_type || originalNodeData?.["Ent Type"],
      
      // Application info
      "App Name": catalogDetails.applicationname || catalogDetails.appName || catalogDetails.application_name || originalNodeData?.["App Name"],
      "App Instance": catalogDetails.appInstanceId || catalogDetails.appinstanceid || catalogDetails.applicationInstanceId || originalNodeData?.["App Instance"],
      "App Owner": catalogDetails.applicationOwner || catalogDetails.applicationowner || catalogDetails.app_owner || originalNodeData?.["App Owner"],
      "Ent Owner": catalogDetails.entitlementOwner || catalogDetails.entitlementowner || catalogDetails.entitlement_owner || originalNodeData?.["Ent Owner"],
      
      // Business info
      "Business Objective": catalogDetails.businessObjective || catalogDetails.business_objective || catalogDetails.businessObjective || originalNodeData?.["Business Objective"],
      "Business Unit": catalogDetails.businessUnit || catalogDetails.businessunit_department || catalogDetails.business_unit || originalNodeData?.["Business Unit"],
      "Compliance Type": catalogDetails.complianceType || catalogDetails.regulatory_scope || catalogDetails.compliance_type || originalNodeData?.["Compliance Type"],
      "Data Classification": catalogDetails.dataClassification || catalogDetails.data_classification || catalogDetails.data_classification || originalNodeData?.["Data Classification"],
      "Cost Center": catalogDetails.costCenter || catalogDetails.cost_center || catalogDetails.cost_center || originalNodeData?.["Cost Center"],
      
      // Dates
      "Created On": catalogDetails.createdOn || catalogDetails.created_on || catalogDetails.createdOn || originalNodeData?.["Created On"],
      "Last Sync": catalogDetails.lastSync || catalogDetails.last_sync || catalogDetails.lastSync || originalNodeData?.["Last Sync"],
      "Last Reviewed on": catalogDetails.lastReviewedOn || catalogDetails.last_reviewed_on || catalogDetails.lastReviewedOn || originalNodeData?.["Last Reviewed on"],
      
      // Technical details
      "Hierarchy": catalogDetails.hierarchy || catalogDetails.hierarchy || originalNodeData?.["Hierarchy"],
      "MFA Status": catalogDetails.mfaStatus || catalogDetails.mfa_status || catalogDetails.mfaStatus || originalNodeData?.["MFA Status"],
      "assignment": catalogDetails.assignment || catalogDetails.assigned_to || catalogDetails.assignment || originalNodeData?.["assignment"],
      "License Type": catalogDetails.licenseType || catalogDetails.license_type || catalogDetails.licenseType || originalNodeData?.["License Type"],
      
      // Risk and security
      "Risk": catalogDetails.risk || catalogDetails.riskLevel || catalogDetails.risk || originalNodeData?.["Risk"],
      "Certifiable": catalogDetails.certifiable || catalogDetails.certifiable || originalNodeData?.["Certifiable"],
      "Revoke on Disable": catalogDetails.revokeOnDisable || catalogDetails.revoke_on_disable || catalogDetails.revokeOnDisable || originalNodeData?.["Revoke on Disable"],
      "Shared Pwd": catalogDetails.sharedPassword || catalogDetails.shared_pwd || catalogDetails.sharedPassword || originalNodeData?.["Shared Pwd"],
      "SOD Check": catalogDetails.sodCheck || catalogDetails.toxic_combination || catalogDetails.sodCheck || originalNodeData?.["SOD Check"],
      "Access Scope": catalogDetails.accessScope || catalogDetails.access_scope || catalogDetails.accessScope || originalNodeData?.["Access Scope"],
      "Review Schedule": catalogDetails.reviewSchedule || catalogDetails.review_schedule || catalogDetails.reviewSchedule || originalNodeData?.["Review Schedule"],
      "Privileged": catalogDetails.privileged || catalogDetails.privileged || originalNodeData?.["Privileged"],
      "Non Persistent Access": catalogDetails.nonPersistentAccess || catalogDetails.non_persistent_access || catalogDetails.nonPersistentAccess || originalNodeData?.["Non Persistent Access"],
      
      // Additional details
      "Audit Comments": catalogDetails.auditComments || catalogDetails.audit_comments || catalogDetails.auditComments || originalNodeData?.["Audit Comments"],
      "Account Type Restriction": catalogDetails.accountTypeRestriction || catalogDetails.account_type_restriction || catalogDetails.accountTypeRestriction || originalNodeData?.["Account Type Restriction"],
      "Requestable": catalogDetails.requestable || catalogDetails.requestable || originalNodeData?.["Requestable"],
      "Pre- Requisite": catalogDetails.prerequisite || catalogDetails.prerequisite || originalNodeData?.["Pre- Requisite"],
      "Pre-Requisite Details": catalogDetails.prerequisiteDetails || catalogDetails.prerequisite_details || catalogDetails.prerequisiteDetails || originalNodeData?.["Pre-Requisite Details"],
      "Auto Assign Access Policy": catalogDetails.autoAssignAccessPolicy || catalogDetails.auto_assign_access_policy || catalogDetails.autoAssignAccessPolicy || originalNodeData?.["Auto Assign Access Policy"],
      "Provisioner Group": catalogDetails.provisionerGroup || catalogDetails.provisioner_group || catalogDetails.provisionerGroup || originalNodeData?.["Provisioner Group"],
      "Provisioning Steps": catalogDetails.provisioningSteps || catalogDetails.provisioning_steps || catalogDetails.provisioningSteps || originalNodeData?.["Provisioning Steps"],
      "Provisioning Mechanism": catalogDetails.provisioningMechanism || catalogDetails.provisioning_mechanism || catalogDetails.provisioningMechanism || originalNodeData?.["Provisioning Mechanism"],
      "Action on Native Change": catalogDetails.actionOnNativeChange || catalogDetails.action_on_native_change || catalogDetails.actionOnNativeChange || originalNodeData?.["Action on Native Change"],
      "Total Assignments": catalogDetails.totalAssignments || catalogDetails.total_assignments || catalogDetails.totalAssignments || originalNodeData?.["Total Assignments"],
      "Dynamic Tag": catalogDetails.tags || catalogDetails.dynamicTag || catalogDetails.tags || originalNodeData?.["Dynamic Tag"],
    };
    
    // Return the original data with the mapped fields
    return {
      ...originalNodeData,
      ...fieldMappings
    };
  };

  // Client-side pagination logic
  const totalItems = accountsRowData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = accountsRowData.slice(startIndex, endIndex);

  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const toggleSidePanel = (data: any) => {
    setNodeData(data);
    
    // If opening the sidebar, use existing catalogDetails data
    if (!isSidePanelOpen) {
      // Use the catalogDetails from the existing data instead of making API call
      const catalogDetails = data?.catalogDetails;
      
      console.log("Row data structure:", data);
      console.log("Available keys in row data:", Object.keys(data || {}));
      
      if (catalogDetails) {
        console.log("Using catalogDetails:", catalogDetails);
        setEntitlementDetails(catalogDetails);
        // Update nodeData with mapped catalog data
        const mappedData = mapApiDataToNodeData(catalogDetails, data);
        console.log("Mapped Data from catalogDetails:", mappedData);
        setNodeData(mappedData);
      } else {
        console.warn("No catalogDetails found in row data");
        console.log("Available data fields:", Object.keys(data || {}));
        // If no catalogDetails, try to use the data directly
        console.log("Using row data directly for entitlement details");
        setEntitlementDetails(data);
        setNodeData(data);
      }
    }
    
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
    setCommentText(comment); // Load existing comment into the textarea
    setIsCommentModalOpen(true);
  };

  const handleSaveComment = () => {
    if (!commentText.trim()) return;
    
    setComment(commentText);
    setIsCommentModalOpen(false);
    setCommentText("");
  };

  const handleCancelComment = () => {
    setIsCommentModalOpen(false);
    setCommentText("");
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
        `https://preview.keyforge.ai/certification/api/v1/ACMEPOC/updateAction/REVIEWER_ID/CERT_ID`,
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
    return date ? formatDateMMDDYY(date) || "N/A" : "N/A";
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
        const response = await fetch(
          `https://preview.keyforge.ai/entities/api/v1/ACMEPOC/getAppAccounts/430ea9e6-3cff-449c-a24e-59c057f81e3d/${id}`
        );
        const data = await response.json();
        console.log(data);
        if (data.executionStatus === "success") {
          setAccountsRowData(data.items);
          
          // Only update application details if they don't already exist
          // This prevents overriding the data from the applications list
          const existingDetails = localStorage.getItem('applicationDetails');
          if (!existingDetails) {
            // Extract application details from the first item or API response
            if (data.items && data.items.length > 0) {
              const firstItem = data.items[0];
              console.log("First item data:", firstItem);
              const applicationDetails = {
                applicationName: firstItem.applicationinstancename || "N/A",
                owner: firstItem.ownername || "N/A", 
                lastSync: firstItem.lastSync || firstItem.lastlogindate || "N/A"
              };
              console.log("Application details to dispatch:", applicationDetails);
              
              // Store application data in localStorage for HeaderContent
              localStorage.setItem('applicationDetails', JSON.stringify(applicationDetails));
              
              // Also dispatch custom event
              const event = new CustomEvent('applicationDataChange', {
                detail: applicationDetails
              });
              window.dispatchEvent(event);
              console.log("Event dispatched:", event);
            }
          } else {
            console.log("Application details already exist, not overriding:", JSON.parse(existingDetails));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchEntitlementsData = async () => {
      try {
        const response = await fetch(
          `https://preview.keyforge.ai/entities/api/v1/ACMEPOC/getAppEntitlements/ec527a50-0944-4b31-b239-05518c87a743/${id}`
        );
        const data = await response.json();
        console.log("Entitlements data:", data);
        if (data.executionStatus === "success") {
          console.log("Entitlements items:", data.items);
          if (data.items && data.items.length > 0) {
            console.log("First entitlement item:", data.items[0]);
            console.log("Available fields in first item:", Object.keys(data.items[0]));
            
            // Apply mapping to each entitlement item to map catalogDetails.risk
            const mappedItems = data.items.map((item: any) => {
              if (item.catalogDetails) {
                return mapApiDataToNodeData(item.catalogDetails, item);
              }
              return item;
            });
            setEntRowData(mappedItems);
          } else {
            setEntRowData([]);
          }
        }
      } catch (error) {
        console.error("Error fetching entitlements data:", error);
      }
    };
    if (tabIndex === 2) {
      // Only fetch entitlements when on the Entitlements tab
      fetchEntitlementsData();
    }
  }, [id, tabIndex]);

  // const rowData2 = [
  //   {
  //     "Ent ID": "ENT201",
  //     "Ent Name": "Server Admin",
  //     "Ent Description":
  //       "Administrative access to on-premises server infrastructure",
  //     "Total Assignments": 8,
  //     "Last Sync": "2025-07-13T12:00:00Z",
  //     Requestable: "Yes",
  //     Certifiable: "Yes",
  //     Risk: "High",
  //     "SOD Check": "Passed",
  //     Hierarchy: "Top-level",
  //     "Pre- Requisite": "Server Admin Training",
  //     "Pre-Requisite Details": "Completion of Windows Server Admin course",
  //     "Revoke on Disable": "Yes",
  //     "Shared Pwd": "No",
  //     "Capability/Technical Scope": "Manage server configurations and updates",
  //     "Business Objective": "Maintain server uptime and security",
  //     "Compliance Type": "ISO 27001",
  //     "Access Scope": "Global",
  //     "Last Reviewed on": "2025-06-25",
  //     Reviewed: "Yes",
  //     "Dynamic Tag": "Infrastructure",
  //     "MFA Status": "Enabled",
  //     "Review Schedule": "Quarterly",
  //     "Ent Owner": "Emily Carter",
  //     "Created On": "2024-03-10",
  //   },
  //   {
  //     "Ent ID": "ENT202",
  //     "Ent Name": "HR Viewer",
  //     "Ent Description": "Read-only access to HR system reports",
  //     "Total Assignments": 20,
  //     "Last Sync": "2025-07-12T15:30:00Z",
  //     Requestable: "No",
  //     Certifiable: "No",
  //     Risk: "Low",
  //     "SOD Check": "Not Required",
  //     Hierarchy: "Low-level",
  //     "Pre- Requisite": "None",
  //     "Pre-Requisite Details": "N/A",
  //     "Revoke on Disable": "Yes",
  //     "Shared Pwd": "Yes",
  //     "Capability/Technical Scope": "View employee data and reports",
  //     "Business Objective": "Support HR analytics",
  //     "Compliance Type": "GDPR",
  //     "Access Scope": "Departmental",
  //     "Last Reviewed on": "2025-05-15",
  //     Reviewed: "No",
  //     "Dynamic Tag": "HR",
  //     "MFA Status": "Disabled",
  //     "Review Schedule": "Annual",
  //     "Ent Owner": "Mark Thompson",
  //     "Created On": "2024-08-01",
  //   },
  // ];

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "accountName",
        headerName: "Account",
        flex: 2,
        // cellRenderer: "agGroupCellRenderer",
        cellRendererParams: {
          suppressExpand: false,
          innerRenderer: (params: ICellRendererParams) => {
            const { accountType } = params.data || {};
            const accountTypeLabel = accountType;
            return (
              <div className="flex items-center space-x-2">
                <div className="flex flex-col gap-0 cursor-pointer hover:underline">
                  <span className="text-md font-large text-gray-800">
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
        // cellClass: "ag-cell-no-padding",
      },
      {
        field: "Risk",
        headerName: "Risk",
        width: 100,
        hide:true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.data?.Risk || params.data?.risk || "Unknown";
          const riskInitial =
            risk === "High" ? "H" : risk === "Medium" ? "M" : "L";
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";

          // Special styling for High risk - show in red bubble
          if (risk === "High") {
            return (
              <div className="flex items-center">
                <span
                  className="px-3 py-1 text-gray-800 font-medium rounded-full"
                  style={{
                    backgroundColor: "#ffebee",
                    color: "#d32f2f",
                    border: "1px solid #ffcdd2"
                  }}
                >
                  {risk}
                </span>
              </div>
            );
          }

          // Special styling for Low risk - show in green bubble
          if (risk === "Low") {
            return (
              <div className="flex items-center">
                <span
                  className="px-3 py-1 text-gray-800 font-medium rounded-full"
                  style={{
                    backgroundColor: "#e8f5e8",
                    color: "#2e7d32",
                    border: "1px solid #c8e6c9"
                  }}
                >
                  {risk}
                </span>
              </div>
            );
          }

          // Default styling for Medium risk
          return (
            <div className="flex items-center">
              <span
                className="px-2 py-1 text-xs rounded font-medium"
                style={{ backgroundColor: riskColor, color: "white" }}
              >
                {riskInitial}
              </span>
            </div>
          );
        },
      },
      {
        field: "userDisplayName",
        headerName: "Identity",
        flex: 2,
        cellRenderer: (params: ICellRendererParams) => {
          const { userType } = params.data || {};
          const userTypeLabel = userType ? `(${userType})` : "";
          return (
            <div className="flex flex-col gap-0 cursor-pointer hover:underline">
              <span className="text-md text-gray-800">
                {params.value}{" "}
                {userType && (
                  <span
                    className="text-[#175AE4] "
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
        headerName: "Entitlement",
        enableRowGroup: true,
        flex:2,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex flex-col gap-0">
            <span className="text-md text-gray-800">{params.value}</span>
          </div>
        ),
      },
      {
        field: "lastlogindate",
        headerName: "Last Login",
        enableRowGroup: true,
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
      },
      {
        field: "lastAccessReview",
        headerName: "Last Review",
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
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
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
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
        flex: 1,
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
      },
    ],
    []
  );

  const DetailCellRenderer = (props: IDetailCellRendererParams) => {
    const { data } = props;
    return (
      <div className="flex p-4 bg-gray-50 border-t border-gray-200 ml-10">
        <div className="flex flex-row items-center gap-2">
          <span className="text-gray-800">{data.description}</span>
        </div>
      </div>
    );
  };
  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "entitlementName",
        headerName: "Entitlement",
        flex: 3,
        width: 350,
        wrapText: true,
        autoHeight: true,
        colSpan: (params) => {
          if (!params.data?.__isDescRow) return 1;
          try {
            const center = (params.api as any)?.getDisplayedCenterColumns?.() || [];
            const left = (params.api as any)?.getDisplayedLeftColumns?.() || [];
            const right = (params.api as any)?.getDisplayedRightColumns?.() || [];
            const total = center.length + left.length + right.length;
            if (total > 0) return total;
          } catch {}
          const all = (params as any)?.columnApi?.getAllDisplayedColumns?.() || [];
          return all.length || 1;
        },
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.__isDescRow) {
            return (
              <div className="text-gray-600 text-sm w-full break-words whitespace-pre-wrap">
                {params.data?.description || params.data?.entitlementDescription || params.data?.["Ent Description"] || "-"}
              </div>
            );
          }

          const risk = params.data?.risk || params.data?.Risk;
          const isRiskHigh = risk === "High";
          
          return isRiskHigh ? (
            <div className="flex items-center h-full">
              <span
                className="px-2 py-1 text-sm font-medium rounded-full inline-flex items-center cursor-pointer hover:bg-red-200 transition-colors duration-200 break-words whitespace-normal"
                style={{ 
                  backgroundColor: "#ffebee", 
                  color: "#d32f2f",
                  border: "1px solid #ffcdd2",
                  minHeight: "24px"
                }}
                title="High Risk - Click for details"
                onClick={() => {
                  setSelectedEntitlement({
                    name: params.value,
                    description: params.data?.description,
                    type: params.data?.type,
                    applicationName: params.data?.["App Name"] || params.data?.applicationName,
                    risk: params.data?.risk || params.data?.Risk,
                    lastReviewed: params.data?.["Last Reviewed on"],
                    lastSync: params.data?.["Last Sync"],
                    appInstanceId: params.data?.applicationInstanceId || params.data?.appInstanceId,
                    entitlementId: params.data?.entitlementId || params.data?.id
                  });
                  setIsEntitlementSidebarOpen(true);
                }}
              >
                {params.value}
              </span>
            </div>
          ) : (
            <div className="font-semibold break-words whitespace-normal">{params.value}</div>
          );
        },
      },
      // { field:"Ent Description", headerName:"Entitlement Description", flex:2},
      { field: "type", headerName: "Type", width: 200 },
      { 
        field: "Risk", 
        headerName: "Risk", 
        width: 120,
        hide:true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value || params.data?.Risk || params.data?.risk;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span className="font-medium" style={{ color: riskColor }}>{risk}</span>;
        },
      },
      { field: "applicationName", headerName: "Application", width: 150,hide:true },
      { field: "assignment", headerName: "Assignment", width: 150,hide:true },
      {
        field: "Last Sync",
        headerName: "Last Sync",
        width: 200,
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
      },
      {
        field: "Last Reviewed on",
        headerName: "Last Reviewed",
        width: 200,
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
      },
      {
        field: "Total Assignments",
        headerName: "Total Assignments",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Requestable",
        headerName: "Requestable",
        width: 100,
        hide: true,
      },
      {
        field: "Certifiable",
        headerName: "Certifiable",
        width: 100,
        hide: true,
      },
      { field: "SOD Check", headerName: "SOD Check", flex: 1.5, hide: true },
      { field: "Hierarchy", headerName: "Hierarchy", width: 100, hide: true },
      {
        field: "Pre- Requisite",
        headerName: "Pre- Requisite",
        width: 100,
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
        width: 100,
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
        width: 100,
        hide: true,
      },
      {
        field: "Access Scope",
        headerName: "Access Scope",
        flex: 1.5,
        hide: true,
      },
      { field: "Reviewed", headerName: "Reviewed", width: 100, hide: true },
      {
        field: "Dynamic Tag",
        headerName: "Dynamic Tag",
        width: 100,
        hide: true,
      },
      { field: "MFA Status", headerName: "MFA Status", flex: 1.5, hide: true },
      {
        field: "Review Schedule",
        headerName: "Review Schedule",
        width: 100,
        hide: true,
      },
      {
        field: "Ent Owner",
        headerName: "Entitlement Owner",
        flex: 1.5,
        hide: true,
      },
      {
        field: "Created On",
        headerClass: "Created On",
        width: 100,
        hide: true,
      },
      {
        field: "actionColumn",
        headerName: "Action",
        width: 200,
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
        field: "entitlementName",
        headerName: "Entitlement Name",
        width: 550,
        wrapText: true,
        autoHeight: true,
        colSpan: (params) => {
          if (!params.data?.__isDescRow) return 1;
          try {
            const center = (params.api as any)?.getDisplayedCenterColumns?.() || [];
            const left = (params.api as any)?.getDisplayedLeftColumns?.() || [];
            const right = (params.api as any)?.getDisplayedRightColumns?.() || [];
            const total = center.length + left.length + right.length;
            if (total > 0) return total;
          } catch {}
          const all = (params as any)?.columnApi?.getAllDisplayedColumns?.() || [];
          return all.length || 1;
        },
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.__isDescRow) {
            return (
              <div className="text-gray-600 text-sm w-full break-words whitespace-pre-wrap">
                {params.data?.description || params.data?.entitlementDescription || params.data?.["Ent Description"] || "-"}
              </div>
            );
          }

          const risk = params.data?.risk || params.data?.Risk;
          const isRiskHigh = risk === "High";
          
          return isRiskHigh ? (
            <div className="flex items-center h-full">
              <span
                className="px-2 py-1 text-sm font-medium rounded-full inline-flex items-center cursor-pointer hover:bg-red-200 transition-colors duration-200 break-words whitespace-normal"
                style={{ 
                  backgroundColor: "#ffebee", 
                  color: "#d32f2f",
                  border: "1px solid #ffcdd2",
                  minHeight: "24px"
                }}
                title="High Risk - Click for details"
                onClick={() => {
                  setSelectedEntitlement({
                    name: params.value,
                    description: params.data?.description,
                    type: params.data?.type,
                    applicationName: params.data?.["App Name"] || params.data?.applicationName,
                    risk: params.data?.risk || params.data?.Risk,
                    lastReviewed: params.data?.["Last Reviewed on"],
                    lastSync: params.data?.["Last Sync"],
                    appInstanceId: params.data?.applicationInstanceId || params.data?.appInstanceId,
                    entitlementId: params.data?.entitlementId || params.data?.id
                  });
                  setIsEntitlementSidebarOpen(true);
                }}
              >
                {params.value}
              </span>
            </div>
          ) : (
            <div className="font-semibold break-words whitespace-normal">{params.value}</div>
          );
        },
      },
      { field: "type", headerName: "Type", width: 250 },
      {
        field: "Risk",
        headerName: "Risk",
        width: 120,
        hide:true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value || params.data?.Risk || params.data?.risk;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span className="font-medium" style={{ color: riskColor }}>{risk}</span>;
        },
      },
      { field: "applicationName", headerName: "Application", width: 250 },
      { field: "Last Reviewed on", headerName: "Last Reviewed", width: 200 },
      {
        headerName: "Actions",
        width: 250,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex space-x-4 h-full items-start">
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
                onClick={(e) => {
                  setNodeData(params.data);
                  handleComment(e);
                }}
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
                <ArrowRightCircle
                  color="#2563eb"
                  size="36"
                  className="transform scale-[0.8]"
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
              rowData={entRowsWithDesc}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              masterDetail={true}
              getRowHeight={(params) => (params?.data?.__isDescRow ? 36 : 40)}
              detailCellRendererParams={detailCellRendererParams}
              getRowId={(params) => {
                const data = params.data || {};
                const baseId = data.entitlementId || data.entitlementid || data.id || `${data.applicationName || ''}-${data.entitlementName || data.name || ''}`;
                return data.__isDescRow ? `${baseId}-desc` : baseId;
              }}
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
            rowData={entRowsWithDesc}
            columnDefs={underReviewColDefs}
            defaultColDef={defaultColDef}
            masterDetail={true}
            getRowHeight={(params) => (params?.data?.__isDescRow ? 36 : 40)}
            detailCellRendererParams={detailCellRendererParams}
            getRowId={(params) => {
              const data = params.data || {};
              const baseId = data.entitlementId || data.entitlementid || data.id || `${data.applicationName || ''}-${data.entitlementName || data.name || ''}`;
              return data.__isDescRow ? `${baseId}-desc` : baseId;
            }}
          />
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
            <div className="relative mb-2">
              <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
                Accounts
              </h1>
              <Accordion
                iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
                open={true}
              >
                <div className="p-2">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-medium text-gray-800">Filters</h3>
                  </div>
                  <div className="space-y-3">
                    {/* First row - Account Summary (4 items) */}
                    <div className="flex">
                      {dataAccount.accountSummary.map((item, index) => (
                        <div
                          key={`accountSummary-${index}`}
                          className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors bg-white border border-gray-200 w-1/4 ${
                            selected.accountSummary === index
                              ? "bg-blue-100 border-blue-300"
                              : "bg-gray-100"
                          } ${item.color || ""}`}
                          onClick={() => handleSelect('accountSummary', index)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border-2"
                              style={{
                                borderColor: "#6EC6FF",
                                backgroundColor: selected.accountSummary === index ? "#6EC6FF" : "transparent",
                              }}
                            ></div>
                            <span className={`text-sm ${selected.accountSummary === index ? "text-blue-900" : "text-gray-700"}`}>
                              {item.label}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              selected.accountSummary === index
                                ? "text-blue-700 border-blue-300"
                                : "text-gray-900 border-gray-300"
                            } bg-white border px-2 py-1 rounded text-xs min-w-[20px] text-center`}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Second row - Account Activity (3 items) */}
                    <div className="flex">
                      {dataAccount.accountActivity.map((item, index) => (
                        <div
                          key={`accountActivity-${index}`}
                          className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors bg-white border border-gray-200 w-1/4 ${
                            selected.accountActivity === index
                              ? "bg-blue-100 border-blue-300"
                              : "bg-gray-100"
                          } ${item.color || ""}`}
                          onClick={() => handleSelect('accountActivity', index)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border-2"
                              style={{
                                borderColor: "#6EC6FF",
                                backgroundColor: selected.accountActivity === index ? "#6EC6FF" : "transparent",
                              }}
                            ></div>
                            <span className={`text-sm ${selected.accountActivity === index ? "text-blue-900" : "text-gray-700"}`}>
                              {item.label}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              selected.accountActivity === index
                                ? "text-blue-700 border-blue-300"
                                : "text-gray-900 border-gray-300"
                            } bg-white border px-2 py-1 rounded text-xs min-w-[20px] text-center`}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Accordion>
            </div>
            <div className="flex justify-end mb-4 relative z-10 pt-4">
              <Exports gridApi={gridApiRef.current} />
            </div>
            <AgGridReact
              rowData={paginatedData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              masterDetail={true}
              // detailCellRendererParams={detailCellRendererParams}
            />
            <div className="flex justify-center">
              <CustomPagination
                totalItems={totalItems}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
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
            <div className="relative mb-2 flex items-center justify-between">
              <h1 className="text-xl font-bold pb-2 text-blue-950">
                Entitlements
              </h1>
              <div className="flex gap-2">
                <div className="border border-gray-300 w-65 h-8 rounded-md flex ml-0.5">
                  {tabsDataEnt.map((tab, index) => (
                    <button
                      key={index}
                      onClick={() => setEntTabIndex(index)}
                      className={`flex items-center justify-center px-2 gap-2 py-2 cursor-pointer h-10 -mt-1 w-40 right-0 ${
                        entTabIndex === index 
                          ? "bg-[#2563eb] text-white text-sm rounded-sm" 
                          : "text-gray-500 hover:text-blue-500"
                      }`}
                    >
                      <small className="flex gap-2">{tab.label}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Render the active tab content */}
            {tabsDataEnt[entTabIndex]?.component && (
              <div>
                {tabsDataEnt[entTabIndex].component()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Sampling",
      icon: ChevronDown,
      iconOff: ChevronRight,
      component: () => {
        const [selectedApplication, setSelectedApplication] =
          useState<string>("");
        const [userName, setUserName] = useState<string>("");
        const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
        const [applications, setApplications] = useState<
          Array<{
            applicationId: string;
            applicationName: string;
            scimurl: string;
            filter: string;
          }>
        >([]);
        const [loading, setLoading] = useState<boolean>(true);
        const [error, setError] = useState<string | null>(null);
        const [searchResults, setSearchResults] = useState<any[]>([]);
        const [searchLoading, setSearchLoading] = useState<boolean>(false);
        const [searchError, setSearchError] = useState<string | null>(null);
        const [responseBody, setResponseBody] = useState<any>(null);
        const [selectedUser, setSelectedUser] = useState<any>(null);

        // Use the same reviewerID as other parts of the application
        const reviewerID = "430ea9e6-3cff-449c-a24e-59c057f81e3d";

        // Fetch applications from API
        useEffect(() => {
          const fetchApplications = async () => {
            try {
              setLoading(true);
              setError(null);
              const response = await getAllRegisteredApps(reviewerID);

              if (response.executionStatus === "success") {
                setApplications(response.items);
              } else {
                setError("Failed to fetch applications");
              }
            } catch (err) {
              console.error("Error fetching applications:", err);
              setError("Error loading applications. Please try again.");
            } finally {
              setLoading(false);
            }
          };

          fetchApplications();
        }, []);

        const handleApplicationSelect = (app: {
          applicationId: string;
          applicationName: string;
        }) => {
          setSelectedApplication(app.applicationName);
          setIsDropdownOpen(false);
          // Clear user name and response data when application changes
          setUserName("");
          setSearchResults([]);
          setResponseBody(null);
          setSearchError(null);
          setSelectedUser(null);
        };

        const handleGetResult = async () => {
          if (selectedApplication && userName) {
            const selectedApp = applications.find(
              (app) => app.applicationName === selectedApplication
            );

            if (!selectedApp) {
              setSearchError("Selected application not found");
              return;
            }

            try {
              setSearchLoading(true);
              setSearchError(null);
              setSearchResults([]);
              setResponseBody(null);
              setSelectedUser(null);

              // Create the payload as per your specification
              const payload = {
                filter: `userName co "${userName}"`,
                applicationId: selectedApp.applicationId,
                scimurl: selectedApp.scimurl,
                applicationName: selectedApp.applicationName,
              };

              console.log("Searching with payload:", payload);

              const response = await searchUsers(payload);

              console.log("Search results:", response);
              setSearchResults(response.items || response || []);
              setResponseBody(response);
              // Set first user as selected by default
              if (response.Resources && response.Resources.length > 0) {
                setSelectedUser(response.Resources[0]);
              }
            } catch (err) {
              console.error("Error searching users:", err);
              setSearchError("Error searching users. Please try again.");
            } finally {
              setSearchLoading(false);
            }
          }
        };

        return (
          <div className="sampling-tab-content">
            <div
              className="search-container"
              style={{
                display: "flex",
                gap: "15px",
                margin: "20px",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Application Name Dropdown */}
              <div className="relative">
                <button
                  onClick={() =>
                    !loading && !error && setIsDropdownOpen(!isDropdownOpen)
                  }
                  disabled={loading || error}
                  style={{
                    padding: "8px 12px",
                    width: "250px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "14px",
                    backgroundColor: loading || error ? "#f5f5f5" : "white",
                    cursor: loading || error ? "not-allowed" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ color: selectedApplication ? "#000" : "#999" }}
                  >
                    {loading
                      ? "Loading applications..."
                      : error
                      ? "Error loading applications"
                      : selectedApplication || "Select Application Name"}
                  </span>
                  <span style={{ fontSize: "12px" }}>▼</span>
                </button>

                {isDropdownOpen &&
                  !loading &&
                  !error &&
                  applications.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderTop: "none",
                        borderRadius: "0 0 4px 4px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {applications.map((app, index) => (
                        <div
                          key={app.applicationId}
                          onClick={() => handleApplicationSelect(app)}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "14px",
                            borderBottom:
                              index < applications.length - 1
                                ? "1px solid #f0f0f0"
                                : "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "white";
                          }}
                        >
                          {app.applicationName}
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* User Name Input */}
              <input
                type="text"
                placeholder="Enter User Name"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  // Clear response data when user name changes
                  setSearchResults([]);
                  setResponseBody(null);
                  setSearchError(null);
                  setSelectedUser(null);
                }}
                disabled={!selectedApplication}
                style={{
                  padding: "8px 12px",
                  width: "200px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: selectedApplication ? "white" : "#f5f5f5",
                  color: selectedApplication ? "#000" : "#999",
                  cursor: selectedApplication ? "text" : "not-allowed",
                }}
              />

              {/* Get Result Button */}
              <button
                onClick={handleGetResult}
                disabled={!selectedApplication || !userName || searchLoading}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    selectedApplication && userName && !searchLoading
                      ? "#007bff"
                      : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    selectedApplication && userName && !searchLoading
                      ? "pointer"
                      : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500",
                  minWidth: "100px",
                }}
              >
                {searchLoading ? "Searching..." : "Get Result"}
              </button>
            </div>

            {/* Search Results */}
            {(searchResults.length > 0 || searchError) && (
              <div style={{ margin: "20px", width: "100%" }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "10px",
                    color: "#333",
                  }}
                >
                  Search Results
                </h3>

                {searchError && (
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "#fee",
                      border: "1px solid #fcc",
                      borderRadius: "4px",
                      color: "#c33",
                      marginBottom: "10px",
                    }}
                  >
                    {searchError}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderBottom: "1px solid #ddd",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      Found {searchResults.length} result(s)
                    </div>
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "10px",
                          borderBottom:
                            index < searchResults.length - 1
                              ? "1px solid #eee"
                              : "none",
                          fontSize: "14px",
                        }}
                      >
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            backgroundColor: "#f8f9fa",
                            padding: "8px",
                            borderRadius: "4px",
                          }}
                        >
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Response Body Display with Sidebar */}
            {responseBody && responseBody.Resources && (
              <div style={{ margin: "20px", width: "100%", padding: "0 20px" }}>
                <div style={{ display: "flex", gap: "20px", height: "500px" }}>
                  {/* Part 1: Left Sidebar - User List */}
                  <div
                    style={{
                      width: "200px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#f8f9fa",
                      overflowY: "auto",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "#e9ecef",
                        borderBottom: "1px solid #ddd",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      Users ({responseBody.Resources.length})
                    </div>
                    {responseBody.Resources.map((user: any, index: number) => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        style={{
                          padding: "12px",
                          cursor: "pointer",
                          borderBottom:
                            index < responseBody.Resources.length - 1
                              ? "1px solid #eee"
                              : "none",
                          backgroundColor:
                            selectedUser?.id === user.id
                              ? "#007bff"
                              : "transparent",
                          color:
                            selectedUser?.id === user.id ? "white" : "#333",
                          fontSize: "14px",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedUser?.id !== user.id) {
                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedUser?.id !== user.id) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        <div style={{ fontWeight: "500" }}>{user.userName}</div>
                      </div>
                    ))}
                  </div>

                  {/* Part 2: Middle Panel - User Profile Card */}
                  <div
                    style={{
                      width: "500px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#f8f9fa",
                      overflowY: "auto",
                    }}
                  >
                    {selectedUser ? (
                      <div>
                        {/* User Profile Card */}
                        <div
                          style={{
                            padding: "20px",
                            backgroundColor: "white",
                            height: "100%",
                          }}
                        >
                          {/* Header with Avatar and Name */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: "20px",
                            }}
                          >
                            <div
                              style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "50%",
                                backgroundColor: "#007bff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "18px",
                                marginRight: "15px",
                              }}
                            >
                              {selectedUser.displayName
                                ? selectedUser.displayName
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                : selectedUser.userName
                                ? selectedUser.userName
                                    .substring(0, 2)
                                    .toUpperCase()
                                : "U"}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "20px",
                                  fontWeight: "bold",
                                  color: "#333",
                                }}
                              >
                                {selectedUser.displayName ||
                                  selectedUser.userName}
                              </div>
                              {selectedUser.title && (
                                <div
                                  style={{
                                    fontSize: "14px",
                                    color: "#666",
                                    marginTop: "2px",
                                  }}
                                >
                                  {selectedUser.title}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* User Attributes Table */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 2fr",
                              gap: "12px",
                              fontSize: "14px",
                            }}
                          >
                            <div style={{ fontWeight: "600", color: "#333" }}>
                              Username (for login):
                            </div>
                            <div style={{ color: "#666" }}>
                              {selectedUser.userName || "N/A"}
                            </div>

                            <div style={{ fontWeight: "600", color: "#333" }}>
                              Work Email:
                            </div>
                            <div style={{ color: "#666" }}>
                              {selectedUser.emails &&
                              selectedUser.emails.length > 0
                                ? selectedUser.emails[0].value
                                : "N/A"}
                            </div>

                            <div style={{ fontWeight: "600", color: "#333" }}>
                              First Name:
                            </div>
                            <div style={{ color: "#666" }}>
                              {selectedUser.name?.givenName || "N/A"}
                            </div>

                            <div style={{ fontWeight: "600", color: "#333" }}>
                              Last Name:
                            </div>
                            <div style={{ color: "#666" }}>
                              {selectedUser.name?.familyName || "N/A"}
                            </div>

                            <div style={{ fontWeight: "600", color: "#333" }}>
                              Account Status:
                            </div>
                            <div
                              style={{ color: "#28a745", fontWeight: "500" }}
                            >
                              Active
                            </div>

                            <div style={{ fontWeight: "600", color: "#333" }}>
                              Permissions:
                            </div>
                            <div style={{ color: "#6c757d" }}>
                              {selectedUser.groups &&
                              selectedUser.groups.length > 0
                                ? selectedUser.groups.map(
                                    (group: any, index: number) => (
                                      <div
                                        key={index}
                                        style={{ marginBottom: "4px" }}
                                      >
                                        {group.display || group.value}
                                      </div>
                                    )
                                  )
                                : "No group permissions assigned"}
                            </div>

                            {selectedUser.preferredLanguage && (
                              <>
                                <div
                                  style={{ fontWeight: "600", color: "#333" }}
                                >
                                  Preferred Language:
                                </div>
                                <div style={{ color: "#666" }}>
                                  {selectedUser.preferredLanguage}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          color: "#666",
                          fontSize: "14px",
                        }}
                      >
                        Select a user from the list to view details
                      </div>
                    )}
                  </div>

                  {/* Part 3: Right Panel - JSON Data */}
                  <div
                    style={{
                      flex: 1,
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#000000",
                      overflowY: "auto",
                    }}
                  >
                    {selectedUser ? (
                      <div style={{ padding: "15px" }}>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            backgroundColor: "#1a1a1a",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #333",
                            color: "#ffffff",
                            height: "calc(100% - 30px)",
                            overflowY: "auto",
                          }}
                        >
                          {JSON.stringify(selectedUser, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          color: "#ffffff",
                          fontSize: "14px",
                        }}
                      >
                        Select a user from the list to view JSON data
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isSidePanelOpen ? "mr-[500px]" : "mr-0"
      }`}
    >
      <HorizontalTabs
        tabs={tabsData}
        activeClass="bg-[#15274E] text-white rounded-sm -ml-1"
        buttonClass="h-10 -mt-1 w-50"
        className="ml-0.5 border border-gray-300 w-80 h-8 rounded-md"
        activeIndex={tabIndex}
        onChange={setTabIndex}
      />
      {isSidePanelOpen && (
        <div
          className="fixed top-0 right-0 h-180 bg-white shadow-xl z-50 overflow-y-auto overflow-x-hidden border-l border-gray-200 mt-16"
          style={{ width: 500 }}
        >
          <div className="p-4 border-b bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Entitlement Details</h2>
                {entitlementDetailsError ? (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{entitlementDetailsError}</p>
                  </div>
                ) : (
                  <>
                    <div className="mt-2">
                      <span className="text-xs uppercase text-gray-500">
                        Entitlement Name:
                      </span>
                      <div className="text-md font-medium break-words break-all whitespace-normal max-w-full">
                        {nodeData?.["Ent Name"] ||
                          (nodeData as any)?.entitlementName ||
                          (nodeData as any)?.userDisplayName ||
                          (nodeData as any)?.accountName ||
                          (nodeData as any)?.applicationName ||
                          "-"}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs uppercase text-gray-500">
                        Description:
                      </span>
                      <p className="text-sm text-gray-700 break-words break-all whitespace-pre-wrap max-w-full">
                        {nodeData?.["Ent Description"] ||
                          (nodeData as any)?.description ||
                          (nodeData as any)?.details ||
                          "-"}
                      </p>
                    </div>
                  </>
                )}
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
          <button
            onClick={() => setIsSidePanelOpen(false)}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 w-full"
            aria-label="Close panel"
          >
            Close
          </button>
        </div>
      )}
      
      {/* Entitlement Risk Sidebar */}
      <EntitlementRiskSidebar
        isOpen={isEntitlementSidebarOpen}
        onClose={() => setIsEntitlementSidebarOpen(false)}
        entitlementData={selectedEntitlement}
      />

      {/* Comment Modal */}
      {isCommentModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Comment</h3>
              </div>
              
              <div className="mb-6">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Enter your comment here..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end items-center gap-3">
                <button
                  onClick={handleCancelComment}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors min-w-[80px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveComment}
                  disabled={!commentText.trim()}
                  className={`px-6 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 transition-colors min-w-[80px] ${
                    commentText.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
