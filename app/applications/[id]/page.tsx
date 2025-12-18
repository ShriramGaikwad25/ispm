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
import dynamic from "next/dynamic";
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CircleCheck,
  CircleX,
  ArrowRightCircle,
  X,
  Edit,
  Trash2,
  Info,
  HelpCircle,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { formatDateMMDDYY } from "@/utils/utils";
import "@/lib/ag-grid-setup";
import Exports from "@/components/agTable/Exports";
import CustomPagination from "@/components/agTable/CustomPagination";
import EditReassignButtons from "@/components/agTable/EditReassignButtons";
import ActionButtons from "@/components/agTable/ActionButtons";
import { getAllRegisteredApps, searchUsers } from "@/lib/api";
import { getReviewerId } from "@/lib/auth";
import Link from "next/link";
import Tabs from "@/components/tabs";
import PolicyRiskDetails from "@/components/PolicyRiskDetails";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { BackButton } from "@/components/BackButton";
import UserDisplayName from "@/components/UserDisplayName";

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

export default function ApplicationDetailPage() {
  const { openSidebar, closeSidebar } = useRightSidebar();
  const reviewerId = getReviewerId() || "";
  
  // Wrapper function to handle page changes and close sidebar
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    closeSidebar();
  };
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id as string;
  const [tabIndex, setTabIndex] = useState(1);
  const [entTabIndex, setEntTabIndex] = useState(1); // Set to 1 for "Under Review"
  const gridApiRef = useRef<GridApi | null>(null);
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
  const [mounted, setMounted] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [nodeData, setNodeData] = useState<any>(null);
  const [selectedEntitlement, setSelectedEntitlement] = useState<any>(null);
  const [expandedFrames, setExpandedFrames] = useState({
    general: false,
    business: false,
    technical: false,
    security: false,
    lifecycle: false,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableNodeData, setEditableNodeData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
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
  const [entitlementDetailsError, setEntitlementDetailsError] = useState<
    string | null
  >(null);

  // Attribute mapping pagination state
  const [attributeMappingPage, setAttributeMappingPage] = useState(1);
  const [activeMappingTab, setActiveMappingTab] = useState("provisioning");
  const [isEditingAttribute, setIsEditingAttribute] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<any>(null);
  const [isAttributeMappingExpanded, setIsAttributeMappingExpanded] =
    useState(false);
  const [isHookExpanded, setIsHookExpanded] = useState(true);
  const [activeEventTab, setActiveEventTab] = useState("pre-process");
  const [activeOperation, setActiveOperation] = useState("create");
  const [activeSDKOperation, setActiveSDKOperation] = useState("create");
  const [isServiceExpanded, setIsServiceExpanded] = useState(true);
  const [isSDKExpanded, setIsSDKExpanded] = useState(true);
  const [isThresholdExpanded, setIsThresholdExpanded] = useState(true);
  const [hookName, setHookName] = useState("");

  // Attribute mapping data
  type AttributeMapping = { source: string; target: string; defaultValue?: string };
  const [attributeMappingData, setAttributeMappingData] = useState<{
    provisioning: Record<number, AttributeMapping[]>;
    reconciliation: Record<number, AttributeMapping[]>;
  }>({ provisioning: {}, reconciliation: {} });
  const ATTR_MAPPING_PAGE_SIZE = 10;

  // Fetch schema mapping from Keyforge and populate attribute mappings
  useEffect(() => {
    try {
      const applicationID = localStorage.getItem("keyforgeApplicationID");
      if (!applicationID) return;
      const url = `https://preview.keyforge.ai/schemamapper/getmappedschema/ACMECOM/${encodeURIComponent(
        applicationID
      )}`;
      (async () => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) return;
          const json = await resp.json();
          const provisioningMap = json?.provisioningAttrMap?.scimTargetMap || {};
          const reconciliationMap = json?.reconcilliationAttrMap?.scimTargetMap || {};

          // For provisioning: keys are target attributes, values.variable are source attributes
          const provisioningList: AttributeMapping[] = Object.entries(provisioningMap).map(
            ([target, value]: any) => ({
              source: (value?.variable ?? "").toString(),
              target: target.toString(),
            })
          );

          // For reconciliation: keys are source attributes, values.variable are target attributes
          const reconciliationList: AttributeMapping[] = Object.entries(reconciliationMap).map(
            ([source, value]: any) => ({
              source: source.toString(),
              target: (value?.variable ?? "").toString(),
            })
          );

          setAttributeMappingData({
            provisioning: { 1: provisioningList },
            reconciliation: { 1: reconciliationList },
          });
        } catch {
          // ignore schema fetch errors for now
        }
      })();
    } catch {
      // localStorage not available
    }
  }, []);

  const getCurrentPageData = (): AttributeMapping[] => {
    const tabKey = (activeMappingTab as unknown) as "provisioning" | "reconciliation";
    const tabData = attributeMappingData[tabKey] || {};
    const fullList: AttributeMapping[] = Object.values(tabData).flat() as AttributeMapping[];
    const start = (attributeMappingPage - 1) * ATTR_MAPPING_PAGE_SIZE;
    const end = start + ATTR_MAPPING_PAGE_SIZE;
    return fullList.slice(start, end);
  };

  const getAttributeMappingTotalPages = (): number => {
    const tabKey = (activeMappingTab as unknown) as "provisioning" | "reconciliation";
    const tabData = attributeMappingData[tabKey] || {};
    const fullList: AttributeMapping[] = Object.values(tabData).flat() as AttributeMapping[];
    return Math.max(1, Math.ceil(fullList.length / ATTR_MAPPING_PAGE_SIZE));
  };

  // Pagination state for Entitlement tab tables
  const [entCurrentPage, setEntCurrentPage] = useState(1);
  const [entPageSize, setEntPageSize] = useState(20);
  const [entTotalItems, setEntTotalItems] = useState(0);
  const [entTotalPages, setEntTotalPages] = useState(0);

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

  // Paginated data for Entitlement tab tables
  const entPaginatedData = useMemo(() => {
    // Since entRowsWithDesc is structured as [record1, desc1, record2, desc2, ...]
    // We need to slice by pairs: each record has its description right after it

    // Calculate the start and end indices for the entRowsWithDesc array
    // Each "page" contains entPageSize records, which means entPageSize * 2 rows total
    const startIndex = (entCurrentPage - 1) * entPageSize * 2;
    const endIndex = startIndex + entPageSize * 2;

    return entRowsWithDesc.slice(startIndex, endIndex);
  }, [entRowsWithDesc, entCurrentPage, entPageSize]);

  // Update total items and pages when entRowsWithDesc changes
  useEffect(() => {
    // Only count actual data rows, not description rows
    const actualDataRows = entRowsWithDesc.filter((row) => !row.__isDescRow);
    setEntTotalItems(actualDataRows.length);
    setEntTotalPages(Math.ceil(actualDataRows.length / entPageSize));
  }, [entRowsWithDesc, entPageSize]);

  // Reset pagination when switching between entitlement tabs
  useEffect(() => {
    setEntCurrentPage(1);
  }, [entTabIndex]);

  // Helper function to map catalogDetails to nodeData fields
  const mapApiDataToNodeData = (catalogDetails: any, originalNodeData: any) => {
    if (!catalogDetails) return originalNodeData;

    // Create a mapping object that handles various possible field names
    const fieldMappings = {
      // Entitlement basic info
      "Ent Name":
        catalogDetails.name ||
        catalogDetails.entitlementName ||
        catalogDetails.entitlement_name ||
        originalNodeData?.["Ent Name"],
      "Ent Description":
        catalogDetails.description ||
        catalogDetails.entitlementDescription ||
        catalogDetails.entitlement_description ||
        originalNodeData?.["Ent Description"],
      "Ent Type":
        catalogDetails.type ||
        catalogDetails.entitlementType ||
        catalogDetails.entitlement_type ||
        originalNodeData?.["Ent Type"],

      // Application info
      "App Name":
        catalogDetails.applicationname ||
        catalogDetails.appName ||
        catalogDetails.application_name ||
        originalNodeData?.["App Name"],
      "App Instance":
        catalogDetails.appInstanceId ||
        catalogDetails.appinstanceid ||
        catalogDetails.applicationInstanceId ||
        originalNodeData?.["App Instance"],
      "App Owner":
        catalogDetails.applicationOwner ||
        catalogDetails.applicationowner ||
        catalogDetails.app_owner ||
        originalNodeData?.["App Owner"],
      "Ent Owner":
        catalogDetails.entitlementOwner ||
        catalogDetails.entitlementowner ||
        catalogDetails.entitlement_owner ||
        originalNodeData?.["Ent Owner"],

      // Business info
      "Business Objective":
        catalogDetails.businessObjective ||
        catalogDetails.business_objective ||
        catalogDetails.businessObjective ||
        originalNodeData?.["Business Objective"],
      "Business Unit":
        catalogDetails.businessUnit ||
        catalogDetails.businessunit_department ||
        catalogDetails.business_unit ||
        originalNodeData?.["Business Unit"],
      "Compliance Type":
        catalogDetails.complianceType ||
        catalogDetails.regulatory_scope ||
        catalogDetails.compliance_type ||
        originalNodeData?.["Compliance Type"],
      "Data Classification":
        catalogDetails.dataClassification ||
        catalogDetails.data_classification ||
        catalogDetails.data_classification ||
        originalNodeData?.["Data Classification"],
      "Cost Center":
        catalogDetails.costCenter ||
        catalogDetails.cost_center ||
        catalogDetails.cost_center ||
        originalNodeData?.["Cost Center"],

      // Dates
      "Created On":
        catalogDetails.createdOn ||
        catalogDetails.created_on ||
        catalogDetails.createdOn ||
        originalNodeData?.["Created On"],
      "Last Sync":
        catalogDetails.lastSync ||
        catalogDetails.last_sync ||
        catalogDetails.lastSync ||
        originalNodeData?.["Last Sync"],
      "Last Reviewed on":
        catalogDetails.lastReviewedOn ||
        catalogDetails.last_reviewed_on ||
        catalogDetails.lastReviewedOn ||
        originalNodeData?.["Last Reviewed on"],

      // Technical details
      Hierarchy:
        catalogDetails.hierarchy ||
        catalogDetails.hierarchy ||
        originalNodeData?.["Hierarchy"],
      "MFA Status":
        catalogDetails.mfaStatus ||
        catalogDetails.mfa_status ||
        catalogDetails.mfaStatus ||
        originalNodeData?.["MFA Status"],
      assignment:
        catalogDetails.assignment ||
        catalogDetails.assigned_to ||
        catalogDetails.assignment ||
        originalNodeData?.["assignment"],
      "License Type":
        catalogDetails.licenseType ||
        catalogDetails.license_type ||
        catalogDetails.licenseType ||
        originalNodeData?.["License Type"],

      // Risk and security
      Risk:
        catalogDetails.risk ||
        catalogDetails.riskLevel ||
        catalogDetails.risk ||
        originalNodeData?.["Risk"],
      Certifiable:
        catalogDetails.certifiable ||
        catalogDetails.certifiable ||
        originalNodeData?.["Certifiable"],
      "Revoke on Disable":
        catalogDetails.revokeOnDisable ||
        catalogDetails.revoke_on_disable ||
        catalogDetails.revokeOnDisable ||
        originalNodeData?.["Revoke on Disable"],
      "Shared Pwd":
        catalogDetails.sharedPassword ||
        catalogDetails.shared_pwd ||
        catalogDetails.sharedPassword ||
        originalNodeData?.["Shared Pwd"],
      "SOD Check":
        catalogDetails.sodCheck ||
        catalogDetails.toxic_combination ||
        catalogDetails.sodCheck ||
        originalNodeData?.["SOD Check"],
      "Access Scope":
        catalogDetails.accessScope ||
        catalogDetails.access_scope ||
        catalogDetails.accessScope ||
        originalNodeData?.["Access Scope"],
      "Review Schedule":
        catalogDetails.reviewSchedule ||
        catalogDetails.review_schedule ||
        catalogDetails.reviewSchedule ||
        originalNodeData?.["Review Schedule"],
      Privileged:
        catalogDetails.privileged ||
        catalogDetails.privileged ||
        originalNodeData?.["Privileged"],
      "Non Persistent Access":
        catalogDetails.nonPersistentAccess ||
        catalogDetails.non_persistent_access ||
        catalogDetails.nonPersistentAccess ||
        originalNodeData?.["Non Persistent Access"],

      // Additional details
      "Audit Comments":
        catalogDetails.auditComments ||
        catalogDetails.audit_comments ||
        catalogDetails.auditComments ||
        originalNodeData?.["Audit Comments"],
      "Account Type Restriction":
        catalogDetails.accountTypeRestriction ||
        catalogDetails.account_type_restriction ||
        catalogDetails.accountTypeRestriction ||
        originalNodeData?.["Account Type Restriction"],
      Requestable:
        catalogDetails.requestable ||
        catalogDetails.requestable ||
        originalNodeData?.["Requestable"],
      "Pre- Requisite":
        catalogDetails.prerequisite ||
        catalogDetails.prerequisite ||
        originalNodeData?.["Pre- Requisite"],
      "Pre-Requisite Details":
        catalogDetails.prerequisiteDetails ||
        catalogDetails.prerequisite_details ||
        catalogDetails.prerequisiteDetails ||
        originalNodeData?.["Pre-Requisite Details"],
      "Auto Assign Access Policy":
        catalogDetails.autoAssignAccessPolicy ||
        catalogDetails.auto_assign_access_policy ||
        catalogDetails.autoAssignAccessPolicy ||
        originalNodeData?.["Auto Assign Access Policy"],
      "Provisioner Group":
        catalogDetails.provisionerGroup ||
        catalogDetails.provisioner_group ||
        catalogDetails.provisionerGroup ||
        originalNodeData?.["Provisioner Group"],
      "Provisioning Steps":
        catalogDetails.provisioningSteps ||
        catalogDetails.provisioning_steps ||
        catalogDetails.provisioningSteps ||
        originalNodeData?.["Provisioning Steps"],
      "Provisioning Mechanism":
        catalogDetails.provisioningMechanism ||
        catalogDetails.provisioning_mechanism ||
        catalogDetails.provisioningMechanism ||
        originalNodeData?.["Provisioning Mechanism"],
      "Action on Native Change":
        catalogDetails.actionOnNativeChange ||
        catalogDetails.action_on_native_change ||
        catalogDetails.actionOnNativeChange ||
        originalNodeData?.["Action on Native Change"],
      "Total Assignments":
        catalogDetails.totalAssignments ||
        catalogDetails.total_assignments ||
        catalogDetails.totalAssignments ||
        originalNodeData?.["Total Assignments"],
      "Dynamic Tag":
        catalogDetails.tags ||
        catalogDetails.dynamicTag ||
        catalogDetails.tags ||
        originalNodeData?.["Dynamic Tag"],
    };

    // Return the original data with the mapped fields
    return {
      ...originalNodeData,
      ...fieldMappings,
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
    } else {
      // Closing sidebar - reset edit mode
      setIsEditMode(false);
      setEditableNodeData(null);
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
        `https://preview.keyforge.ai/certification/api/v1/ACMECOM/updateAction/${reviewerId}/CERT_ID`,
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
    value2: any,
    fieldKey1?: string,
    fieldKey2?: string,
    isDate1?: boolean,
    isDate2?: boolean
  ) => {
    const currentData = isEditMode ? editableNodeData : nodeData;
    let val1 = fieldKey1 ? currentData?.[fieldKey1] : value1;
    let val2 = fieldKey2 ? currentData?.[fieldKey2] : value2;

    // In edit mode, use raw values; in view mode, format dates if needed
    if (!isEditMode) {
      if (isDate1 && val1) {
        val1 = formatDate(val1);
      }
      if (isDate2 && val2) {
        val2 = formatDate(val2);
      }
    }

    if (isEditMode) {
      const inputType1 = isDate1 ? "date" : "text";
      const inputType2 = isDate2 ? "date" : "text";
      
      return (
        <div className="flex space-x-4 text-sm">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1 font-medium">{label1}:</label>
            <input
              type={inputType1}
              value={val1?.toString() || ""}
              onChange={(e) => {
                if (fieldKey1) {
                  setEditableNodeData((prev: any) => ({
                    ...prev,
                    [fieldKey1]: e.target.value,
                  }));
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1 font-medium">{label2}:</label>
            <input
              type={inputType2}
              value={val2?.toString() || ""}
              onChange={(e) => {
                if (fieldKey2) {
                  setEditableNodeData((prev: any) => ({
                    ...prev,
                    [fieldKey2]: e.target.value,
                  }));
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex space-x-4 text-sm text-gray-700">
        <div className="flex-1">
          <strong>{label1}:</strong> {val1?.toString() || "N/A"}
        </div>
        <div className="flex-1">
          <strong>{label2}:</strong> {val2?.toString() || "N/A"}
        </div>
      </div>
    );
  };

  const renderSingleField = (label: string, value: any, fieldKey?: string) => {
    const currentData = isEditMode ? editableNodeData : nodeData;
    const val = fieldKey ? currentData?.[fieldKey] : value;

    if (isEditMode) {
      return (
        <div className="text-sm">
          <label className="block text-xs text-gray-500 mb-1 font-medium">{label}:</label>
          <input
            type="text"
            value={val?.toString() || ""}
            onChange={(e) => {
              if (fieldKey) {
                setEditableNodeData((prev: any) => ({
                  ...prev,
                  [fieldKey]: e.target.value,
                }));
              }
            }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-700">
        <strong>{label}:</strong> {val?.toString() || "N/A"}
      </div>
    );
  };

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
          `https://preview.keyforge.ai/entities/api/v1/ACMECOM/getAppAccounts/430ea9e6-3cff-449c-a24e-59c057f81e3d/${id}`
        );
        const data = await response.json();
        console.log(data);
        if (data.executionStatus === "success") {
          setAccountsRowData(data.items);

          // Only update application details if they don't already exist
          // This prevents overriding the data from the applications list
          const existingDetails = localStorage.getItem("applicationDetails");
          if (!existingDetails) {
            // Extract application details from the first item or API response
            if (data.items && data.items.length > 0) {
              const firstItem = data.items[0];
              console.log("First item data:", firstItem);
              const applicationDetails = {
                applicationName: firstItem.applicationinstancename || "N/A",
                owner: firstItem.ownername || "N/A",
                lastSync:
                  firstItem.lastSync || firstItem.lastlogindate || "N/A",
              };
              console.log(
                "Application details to dispatch:",
                applicationDetails
              );

              // Store application data in localStorage for HeaderContent
              localStorage.setItem(
                "applicationDetails",
                JSON.stringify(applicationDetails)
              );

              // Also dispatch custom event
              const event = new CustomEvent("applicationDataChange", {
                detail: applicationDetails,
              });
              window.dispatchEvent(event);
              console.log("Event dispatched:", event);
            }
          } else {
            console.log(
              "Application details already exist, not overriding:",
              JSON.parse(existingDetails)
            );
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
          `https://preview.keyforge.ai/entities/api/v1/ACMECOM/getAppEntitlements/ec527a50-0944-4b31-b239-05518c87a743/${id}`
        );
        const data = await response.json();
        console.log("Entitlements data:", data);
        if (data.executionStatus === "success") {
          console.log("Entitlements items:", data.items);
          if (data.items && data.items.length > 0) {
            console.log("First entitlement item:", data.items[0]);
            console.log(
              "Available fields in first item:",
              Object.keys(data.items[0])
            );

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
        hide: true,
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
                    border: "1px solid #ffcdd2",
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
                    border: "1px solid #c8e6c9",
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
        flex: 2,
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
      {
        field: "__action__",
        headerName: "Action",
        width: 100,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              title="Edit"
              aria-label="Edit account"
              onClick={() => {
                const row = params?.data || {};
                const EditAccountSidebar = () => {
                  const [accountType, setAccountType] = useState("");
                  const [changeOwner, setChangeOwner] = useState(false);

                  // Assign Account Owner state (inline copy of modal content)
                  const [ownerType, setOwnerType] = useState<"User" | "Group">("User");
                  const [selectedAttribute, setSelectedAttribute] = useState<string>("username");
                  const [searchValue, setSearchValue] = useState("");
                  const [selectedItem, setSelectedItem] = useState<Record<string, string> | null>(null);

                  const users: Record<string, string>[] = [
                    { username: "john", email: "john@example.com", role: "admin" },
                    { username: "jane", email: "jane@example.com", role: "user" },
                  ];
                  const groups: Record<string, string>[] = [
                    { name: "admins", email: "admins@corp.com", role: "admin" },
                    { name: "devs", email: "devs@corp.com", role: "developer" },
                  ];
                  const userAttributes = [
                    { value: "username", label: "Username" },
                    { value: "email", label: "Email" },
                  ];
                  const groupAttributes = [
                    { value: "name", label: "Group Name" },
                    { value: "role", label: "Role" },
                  ];
                  const sourceData = ownerType === "User" ? users : groups;
                  const currentAttributes = ownerType === "User" ? userAttributes : groupAttributes;
                  const filteredData =
                    searchValue.trim() === ""
                      ? []
                      : sourceData.filter((item) => {
                          const value = item[selectedAttribute];
                          return value?.toLowerCase().includes(searchValue.toLowerCase());
                        });
                  
                  return (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                          <div className="text-sm text-gray-700 break-words">
                            {row.userDisplayName || "-"} → {row.accountName || "-"}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Account Type</label>
                          <select 
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value=""></option>
                            <option value="Regular">Regular</option>
                            <option value="Orphan">Orphan</option>
                            <option value="Service">Service</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-700">Change Account Owner</span>
                          <span className="text-sm text-gray-900">No</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={changeOwner}
                              onChange={(e) => setChangeOwner(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600"></div>
                          </label>
                          <span className="text-sm text-gray-900">Yes</span>
                        </div>
                        {changeOwner && (
                          <div className="mt-2">
                            <div className="flex mt-3 bg-gray-100 p-1 rounded-md">
                              {(["User", "Group"] as const).map((type) => (
                                <button
                                  key={type}
                                  className={`flex-1 py-2.5 px-3 text-sm font-medium transition-colors ${
                                    ownerType === type
                                      ? "bg-white text-[#15274E] border border-gray-300 shadow-sm relative z-10 rounded-md"
                                      : "bg-transparent text-gray-500 hover:text-gray-700 rounded-md"
                                  }`}
                                  onClick={() => {
                                    setOwnerType(type);
                                    const initialAttr = type === "User" ? userAttributes[0] : groupAttributes[0];
                                    setSelectedAttribute(initialAttr?.value || "");
                                    setSearchValue("");
                                    setSelectedItem(null);
                                  }}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Select Attribute</label>
                              <div className="relative">
                                <select
                                  value={selectedAttribute}
                                  onChange={(e) => setSelectedAttribute(e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {currentAttributes.map((attr) => (
                                    <option key={attr.value} value={attr.value}>
                                      {attr.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Search Value</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Search" />
                              </div>
                            </div>
                            {searchValue.trim() !== "" && (
                              <div className="max-h-36 overflow-auto border rounded p-2 mt-3 text-sm bg-gray-50">
                                {filteredData.length === 0 ? (
                                  <p className="text-gray-500 italic">No results found.</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {filteredData.map((item, index) => (
                                      <li key={index} className={`p-2 border rounded cursor-pointer transition-colors ${selectedItem === item ? "bg-blue-100 border-blue-300" : "hover:bg-gray-100"}`} onClick={() => {
                                        setSelectedItem(item);
                                        setSearchValue(item[selectedAttribute]);
                                      }}>
                                        {Object.values(item).join(" | ")}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex justify-center items-center p-3 border-t border-gray-200 bg-gray-50 min-h-[60px]">
                        <button 
                          onClick={() => { 
                            // Handle save logic here
                            console.log("Save clicked", { accountType, changeOwner, selectedItem });
                          }} 
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                };
                
                openSidebar(<EditAccountSidebar />, { widthPx: 450 });
              }}
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        ),
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
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
        colSpan: (params) => {
          if (!params.data?.__isDescRow) return 1;
          try {
            const center =
              (params.api as any)?.getDisplayedCenterColumns?.() || [];
            const left = (params.api as any)?.getDisplayedLeftColumns?.() || [];
            const right =
              (params.api as any)?.getDisplayedRightColumns?.() || [];
            const total = center.length + left.length + right.length;
            if (total > 0) return total;
          } catch {}
          const all =
            (params as any)?.columnApi?.getAllDisplayedColumns?.() || [];
          return all.length || 1;
        },
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.__isDescRow) {
            return (
              <div className="text-gray-600 text-sm w-full break-words whitespace-pre-wrap">
                {params.data?.["Ent Description"] ||
                  params.data?.description ||
                  params.data?.entitlementDescription ||
                  "-"}
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
                  minHeight: "24px",
                }}
                title="High Risk - Click for details"
                onClick={() => {
                  const appNameForCheck = (
                    params.data?.["App Name"] ||
                    params.data?.applicationName ||
                    ""
                  ).toString();
                  const isOciApp = appNameForCheck
                    .toLowerCase()
                    .includes("oci");
                  if (!isOciApp) {
                    return;
                  }
                  setSelectedEntitlement({
                    name: params.value,
                    description: params.data?.description,
                    type: params.data?.type,
                    applicationName:
                      params.data?.["App Name"] || params.data?.applicationName,
                    risk: params.data?.risk || params.data?.Risk,
                    lastReviewed: params.data?.["Last Reviewed on"],
                    lastSync: params.data?.["Last Sync"],
                    appInstanceId:
                      params.data?.applicationInstanceId ||
                      params.data?.appInstanceId,
                    entitlementId:
                      params.data?.entitlementId || params.data?.id,
                  });
                  openSidebar(
                    <PolicyRiskDetails
                      entitlementData={{
                        name:
                          params.data?.name ||
                          params.data?.entitlementName ||
                          "N/A",
                        description: params.data?.description,
                        type: params.data?.type,
                        applicationName: params.data?.applicationName,
                        risk: params.data?.risk ?? params.data?.risk_level,
                        lastReviewed: params.data?.["Last Reviewed on"],
                        lastSync: params.data?.["Last Sync"],
                        appInstanceId: params.data?.appInstanceId,
                        entitlementId:
                          params.data?.entitlementId || params.data?.id,
                      }}
                    />,
                    { widthPx: 500 }
                  );
                }}
              >
                {params.value}
              </span>
            </div>
          ) : (
            <div className="font-semibold break-words whitespace-normal">
              {params.value}
            </div>
          );
        },
      },
      // { field:"Ent Description", headerName:"Entitlement Description", flex:2},
      { field: "type", headerName: "Type", flex: 1, minWidth: 150 },
      {
        field: "Ent Owner",
        headerName: "Owner",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "Risk",
        headerName: "Risk",
        width: 120,
        hide: true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value || params.data?.Risk || params.data?.risk;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return (
            <span className="font-medium" style={{ color: riskColor }}>
              {risk}
            </span>
          );
        },
      },
      {
        field: "applicationName",
        headerName: "Application",
        width: 150,
        hide: true,
      },
      { field: "assignment", headerName: "Assignment", width: 150, hide: true },
      {
        field: "Last Sync",
        headerName: "Last Sync",
        flex: 1,
        minWidth: 150,
        valueFormatter: (params: ICellRendererParams) =>
          formatDateMMDDYY(params.value),
      },
      {
        field: "Last Reviewed on",
        headerName: "Last Reviewed",
        flex: 1,
        minWidth: 150,
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
        field: "Created On",
        headerClass: "Created On",
        width: 100,
        hide: true,
      },
      {
        field: "arrowColumn",
        headerName: "",
        width: 60,
        maxWidth: 60,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.__isDescRow) return null;
          return (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidePanel(params.data);
                }}
                className="cursor-pointer hover:opacity-80 transition-opacity p-1"
                title="View details"
                aria-label="View entitlement details"
              >
                <ChevronRight
                  className="w-5 h-5 text-gray-600"
                />
              </button>
            </div>
          );
        },
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
        pinned: "right",
        lockPinned: true,
      },
    ],
    [reviewerId, toggleSidePanel]
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
            const center =
              (params.api as any)?.getDisplayedCenterColumns?.() || [];
            const left = (params.api as any)?.getDisplayedLeftColumns?.() || [];
            const right =
              (params.api as any)?.getDisplayedRightColumns?.() || [];
            const total = center.length + left.length + right.length;
            if (total > 0) return total;
          } catch {}
          const all =
            (params as any)?.columnApi?.getAllDisplayedColumns?.() || [];
          return all.length || 1;
        },
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.__isDescRow) {
            return (
              <div className="text-gray-600 text-sm w-full break-words whitespace-pre-wrap">
                {params.data?.["Ent Description"] ||
                  params.data?.description ||
                  params.data?.entitlementDescription ||
                  "-"}
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
                  minHeight: "24px",
                }}
                title="High Risk - Click for details"
                onClick={() => {
                  const appNameForCheck = (
                    params.data?.["App Name"] ||
                    params.data?.applicationName ||
                    ""
                  ).toString();
                  const isOciApp = appNameForCheck
                    .toLowerCase()
                    .includes("oci");
                  if (!isOciApp) {
                    return;
                  }
                  setSelectedEntitlement({
                    name: params.value,
                    description: params.data?.description,
                    type: params.data?.type,
                    applicationName:
                      params.data?.["App Name"] || params.data?.applicationName,
                    risk: params.data?.risk || params.data?.Risk,
                    lastReviewed: params.data?.["Last Reviewed on"],
                    lastSync: params.data?.["Last Sync"],
                    appInstanceId:
                      params.data?.applicationInstanceId ||
                      params.data?.appInstanceId,
                    entitlementId:
                      params.data?.entitlementId || params.data?.id,
                  });
                  openSidebar(
                    <PolicyRiskDetails
                      entitlementData={{
                        name:
                          params.data?.name ||
                          params.data?.entitlementName ||
                          "N/A",
                        description: params.data?.description,
                        type: params.data?.type,
                        applicationName: params.data?.applicationName,
                        risk: params.data?.risk ?? params.data?.risk_level,
                        lastReviewed: params.data?.["Last Reviewed on"],
                        lastSync: params.data?.["Last Sync"],
                        appInstanceId: params.data?.appInstanceId,
                        entitlementId:
                          params.data?.entitlementId || params.data?.id,
                      }}
                    />,
                    { widthPx: 500 }
                  );
                }}
              >
                {params.value}
              </span>
            </div>
          ) : (
            <div className="font-semibold break-words whitespace-normal">
              {params.value}
            </div>
          );
        },
      },
      { field: "type", headerName: "Type", width: 250 },
      {
        field: "Risk",
        headerName: "Risk",
        width: 120,
        hide: true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value || params.data?.Risk || params.data?.risk;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return (
            <span className="font-medium" style={{ color: riskColor }}>
              {risk}
            </span>
          );
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

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 100,
    }),
    []
  );

  const tabsDataEnt = useMemo(() => [
    {
      label: "All",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => {
        return (
          <div
            className="ag-theme-alpine"
            style={{ height: 860, width: "100%", minWidth: 0 }}
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
            <div className="mb-2 relative z-10">
              <div className="flex justify-end mb-2">
                <Exports gridApi={gridApiRef.current} />
              </div>
              <div className="flex justify-center">
                <CustomPagination
                  totalItems={entTotalItems}
                  currentPage={entCurrentPage}
                  totalPages={entTotalPages}
                  pageSize={entPageSize}
                  onPageChange={setEntCurrentPage}
                  onPageSizeChange={(newPageSize) => {
                    setEntPageSize(newPageSize);
                    setEntCurrentPage(1); // Reset to first page when changing page size
                  }}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </div>
            </div>
            {mounted && (
              <AgGridReact
                rowData={entPaginatedData}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                masterDetail={true}
                getRowHeight={(params) => (params?.data?.__isDescRow ? 36 : 40)}
                detailCellRendererParams={detailCellRendererParams}
                domLayout="normal"
                onGridReady={(params) => {
                  gridApiRef.current = params.api;
                }}
                getRowId={(params) => {
                  const data = params.data || {};
                  const baseId =
                    data.entitlementId ||
                    data.entitlementid ||
                    data.id ||
                    `${data.applicationName || ""}-${
                      data.entitlementName || data.name || ""
                    }`;
                  return data.__isDescRow ? `${baseId}-desc` : baseId;
                }}
              />
            )}
            <div className="flex justify-center">
              <CustomPagination
                totalItems={entTotalItems}
                currentPage={entCurrentPage}
                totalPages={entTotalPages}
                pageSize={entPageSize}
                onPageChange={setEntCurrentPage}
                onPageSizeChange={(newPageSize) => {
                  setEntPageSize(newPageSize);
                  setEntCurrentPage(1); // Reset to first page when changing page size
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        );
      },
    },
    {
      label: "Under Review",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => (
        <div className="ag-theme-alpine" style={{ width: "100%" }}>
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
          <div className="mb-2 relative z-10">
            <div className="flex justify-end mb-2">
              <Exports gridApi={gridApiRef.current} />
            </div>
            <div className="flex justify-center">
              <CustomPagination
                totalItems={entTotalItems}
                currentPage={entCurrentPage}
                totalPages={entTotalPages}
                pageSize={entPageSize}
                onPageChange={setEntCurrentPage}
                onPageSizeChange={(newPageSize) => {
                  setEntPageSize(newPageSize);
                  setEntCurrentPage(1); // Reset to first page when changing page size
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
          {mounted && (
            <AgGridReact
              rowData={entPaginatedData}
              columnDefs={underReviewColDefs}
              defaultColDef={defaultColDef}
              masterDetail={true}
              getRowHeight={(params) => (params?.data?.__isDescRow ? 36 : 40)}
              detailCellRendererParams={detailCellRendererParams}
              domLayout="autoHeight"
              getRowId={(params) => {
                const data = params.data || {};
                const baseId =
                  data.entitlementId ||
                  data.entitlementid ||
                  data.id ||
                  `${data.applicationName || ""}-${
                    data.entitlementName || data.name || ""
                  }`;
                return data.__isDescRow ? `${baseId}-desc` : baseId;
              }}
            />
          )}
          <div className="flex justify-center">
            <CustomPagination
              totalItems={entTotalItems}
              currentPage={entCurrentPage}
              totalPages={entTotalPages}
              pageSize={entPageSize}
              onPageChange={setEntCurrentPage}
              onPageSizeChange={(newPageSize) => {
                setEntPageSize(newPageSize);
                setEntCurrentPage(1); // Reset to first page when changing page size
              }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </div>
      ),
    },
  ], [
    mounted,
    entPaginatedData,
    entTotalItems,
    entCurrentPage,
    entTotalPages,
    entPageSize,
    entTabIndex,
    gridApiRef,
    colDefs,
    defaultColDef,
    detailCellRendererParams,
    underReviewColDefs,
    setEntCurrentPage,
    setEntPageSize,
    setEntTabIndex,
  ]);

  // Memoize the Entitlements tab component to prevent flickering
  const EntitlementsTabComponent = useCallback(() => {
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
          <div>{tabsDataEnt[entTabIndex].component()}</div>
        )}
      </div>
    );
  }, [tabsDataEnt, entTabIndex, setEntTabIndex]);

  // Accounts Tab Component - Proper React component that reacts to state changes
  const AccountsTabComponent = useMemo(() => {
    // Create a proper React component
    const Component = () => {
      // Recalculate pagination values inside the component so they update when accountsRowData changes
      const totalItems = accountsRowData.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = accountsRowData.slice(startIndex, endIndex);

      // Grid will update automatically via rowData prop and key

    return (
      <div
        className="ag-theme-alpine"
        style={{ height: 500, width: "100%" }}
      >
        <div className="relative mb-2">
          <div className="flex items-center justify-between border-b border-gray-300 pb-2">
            <h1 className="text-xl font-bold text-blue-950">
              Accounts
            </h1>
            <button
              onClick={() => openSidebar(null)}
              className="flex items-center space-x-2 px-3 py-2 bg-[#27B973] text-white rounded-md hover:bg-[#22a667] transition-all duration-200 text-sm font-medium"
              title="AI Assist Analysis"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>AI Assist</span>
            </button>
          </div>
          <Accordion
            iconClass="top-1 right-0 rounded-full text-white bg-purple-800"
            open={true}
          >
            <div className="p-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-medium text-gray-800">
                  Filters
                </h3>
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
                      onClick={() => handleSelect("accountSummary", index)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border-2"
                          style={{
                            borderColor: "#6EC6FF",
                            backgroundColor:
                              selected.accountSummary === index
                                ? "#6EC6FF"
                                : "transparent",
                          }}
                        ></div>
                        <span
                          className={`text-sm ${
                            selected.accountSummary === index
                              ? "text-blue-900"
                              : "text-gray-700"
                          }`}
                        >
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
                      onClick={() => handleSelect("accountActivity", index)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border-2"
                          style={{
                            borderColor: "#6EC6FF",
                            backgroundColor:
                              selected.accountActivity === index
                                ? "#6EC6FF"
                                : "transparent",
                          }}
                        ></div>
                        <span
                          className={`text-sm ${
                            selected.accountActivity === index
                              ? "text-blue-900"
                              : "text-gray-700"
                          }`}
                        >
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
        <div className="mb-2 relative z-10 pt-4">
          <div className="flex justify-end mb-2">
            <Exports gridApi={gridApiRef.current} />
          </div>
          <div className="flex justify-center">
            <CustomPagination
              totalItems={totalItems}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={(newPageSize) => {
                setPageSize(newPageSize);
                setCurrentPage(1); // Reset to first page when changing page size
                closeSidebar();
              }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </div>
        {mounted && (
          <AgGridReact
            key={`accounts-grid-${accountsRowData.length}-${currentPage}-${pageSize}`}
            rowData={paginatedData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            masterDetail={true}
            onGridReady={(params: any) => {
              gridApiRef.current = params.api;
            }}
            // detailCellRendererParams={detailCellRendererParams}
          />
        )}
        <div className="flex justify-center">
          <CustomPagination
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setCurrentPage(1); // Reset to first page when changing page size
              closeSidebar();
            }}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      </div>
    );
    };
    return Component;
  }, [
    accountsRowData,
    currentPage,
    pageSize,
    columnDefs,
    mounted,
    selected,
    handlePageChange,
    handleSelect,
    gridApiRef,
    openSidebar,
    closeSidebar,
  ]);

  const tabsData = useMemo(() => [
    {
      label: "About",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => (
        <div className="p-6 bg-white">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-300">
            Application Metadata
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Application ID</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Application Name</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Application Instance Name</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Application Type</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Status</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Description</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Version</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Vendor</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Category</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Created Date</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Last Modified Date</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Created By</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Modified By</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">SCIM URL</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">OAuth Client ID</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">OAuth Client Secret</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">OAuth Token URL</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">OAuth Authorization URL</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">OAuth Scope</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">API Endpoint</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Authentication Type</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Tenant ID</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Environment</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Tags</label>
                <div className="text-sm text-gray-900">-</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Accounts",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: AccountsTabComponent,
    },
    {
      label: "Entitlements",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: EntitlementsTabComponent,
    },
    {
      label: "Sampling",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => {
        const [selectedApplication, setSelectedApplication] =
          useState<string>("");
        const [userName, setUserName] = useState<string>("");
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
        const reviewerID = getReviewerId() || "";

        // Fetch applications from API and Keyforge endpoint in parallel
        useEffect(() => {
          const fetchApplications = async () => {
            try {
              setLoading(true);
              setError(null);
              const keyforgeUrl =
                "https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/getAllApplications";

              const [ownResp, keyforgeResp] = await Promise.all([
                getAllRegisteredApps(reviewerID),
                fetch(keyforgeUrl)
                  .then((r) => (r.ok ? r.json() : null))
                  .catch(() => null),
              ]);

              const ownItems =
                ownResp && ownResp.executionStatus === "success"
                  ? (ownResp.items as Array<{
                      applicationId: string;
                      applicationName: string;
                      scimurl: string;
                      filter: string;
                    }>)
                  : [];

              const keyforgeItems: Array<{
                applicationId: string;
                applicationName: string;
                scimurl: string;
                filter: string;
              }> = keyforgeResp?.Applications
                ? keyforgeResp.Applications.map((a: any) => ({
                    applicationId: a.ApplicationID,
                    applicationName: a.ApplicationName,
                    scimurl: a.SCIMURL,
                    filter: "",
                  }))
                : [];

              // Merge by applicationId or name to avoid duplicates
              const mergedMap = new Map<
                string,
                {
                  applicationId: string;
                  applicationName: string;
                  scimurl: string;
                  filter: string;
                }
              >();

              for (const item of [...ownItems, ...keyforgeItems]) {
                const key = item.applicationId || item.applicationName;
                if (!mergedMap.has(key)) mergedMap.set(key, item);
              }

              const merged = Array.from(mergedMap.values());

              if (merged.length > 0) {
                setApplications(merged);

                // Default to the current application (the one whose detail page we're on)
                if (!selectedApplication) {
                  let defaultApp =
                    merged.find((app) => app.applicationId === id) || null;

                  // Fallback: try matching by application name from localStorage
                  if (!defaultApp) {
                    try {
                      const stored = localStorage.getItem("applicationDetails");
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        const storedName = parsed?.applicationName;
                        if (storedName) {
                          defaultApp = merged.find(
                            (app) => app.applicationName === storedName
                          ) as (typeof merged)[number] | null;
                        }
                      }
                    } catch {
                      // ignore localStorage/JSON errors
                    }
                  }

                  // Fallback: if there's only one app, use it
                  if (!defaultApp && merged.length === 1) {
                    defaultApp = merged[0];
                  }

                  if (defaultApp) {
                    setSelectedApplication(defaultApp.applicationName);
                  }
                }
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
        }, [reviewerID, selectedApplication]);

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
                margin: "40px auto",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
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
                style={{
                  padding: "8px 12px",
                  width: "260px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  color: "#000",
                }}
              />

              {/* Get Result Button */}
              <button
                onClick={handleGetResult}
                disabled={!userName || searchLoading}
                style={{
                  padding: "8px 20px",
                  backgroundColor:
                    userName && !searchLoading ? "#007bff" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    userName && !searchLoading ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500",
                  minWidth: "110px",
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
                                <UserDisplayName
                                  displayName={selectedUser.displayName || selectedUser.userName}
                                  userType={selectedUser.userType}
                                  employeetype={selectedUser.employeetype}
                                  tags={selectedUser.tags}
                                />
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
    {
      label: "Configuration",
      icon: ChevronDown,
      iconOff: ChevronUp,
      component: () => (
        <div className="p-6 bg-white">
          <Accordion title="Application Information" iconClass="text-blue-600">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Application Details Section */}
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-800 border-b border-gray-300 pb-2">
                    Application Details
                  </h4>
                  <div className="text-sm text-gray-500 py-2">No details available.</div>
                </div>

                {/* OAuth Details Section */}
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-800 border-b border-gray-300 pb-2">
                    OAuth Details
                  </h4>
                  <div className="text-sm text-gray-500 py-2">No details available.</div>
                </div>
              </div>
            </div>
          </Accordion>

          {/* Attribute Mapping Collapsible Section */}
          <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header with Chevron */}
            <div
              className="px-6 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setIsAttributeMappingExpanded(!isAttributeMappingExpanded)
              }
            >
              <div className="flex items-center">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <div className="w-6 h-6 mr-3 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-monitor-cog-icon lucide-monitor-cog"
                    >
                      <path d="M12 17v4" />
                      <path d="m14.305 7.53.923-.382" />
                      <path d="m15.228 4.852-.923-.383" />
                      <path d="m16.852 3.228-.383-.924" />
                      <path d="m16.852 8.772-.383.923" />
                      <path d="m19.148 3.228.383-.924" />
                      <path d="m19.53 9.696-.382-.924" />
                      <path d="m20.772 4.852.924-.383" />
                      <path d="m20.772 7.148.924.383" />
                      <path d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                      <path d="M8 21h8" />
                      <circle cx="18" cy="6" r="3" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-md font-semibold text-gray-800">
                  Attribute Mapping
                </h2>
              </div>
              {isAttributeMappingExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              )}
            </div>

            {/* Collapsible Content */}
            {isAttributeMappingExpanded && (
              <div className="p-6">
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <div className="flex">
                    <button
                      className={`px-6 py-3 text-sm font-medium ${
                        activeMappingTab === "provisioning"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => {
                        setActiveMappingTab("provisioning");
                        setAttributeMappingPage(1);
                        setIsEditingAttribute(false);
                      }}
                    >
                      Provisioning
                    </button>
                    <button
                      className={`px-6 py-3 text-sm font-medium ${
                        activeMappingTab === "reconciliation"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => {
                        setActiveMappingTab("reconciliation");
                        setAttributeMappingPage(1);
                        setIsEditingAttribute(false);
                      }}
                    >
                      Reconciliation
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Existing Mappings Table */}
                  <div className="space-y-4">
                    <h3 className="text-md font-semibold text-gray-800">
                      Existing Mappings
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full table-auto">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {activeMappingTab === "reconciliation"
                                ? "Target Attribute"
                                : "Source Attribute"}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {activeMappingTab === "reconciliation"
                                ? "Source Attribute"
                                : "Target Attribute"}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Default Value
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getCurrentPageData().length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                                No attribute mappings configured.
                              </td>
                            </tr>
                          ) : (
                            getCurrentPageData().map((mapping, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words break-all align-top" style={{ position: "static", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                {activeMappingTab === "reconciliation"
                                  ? mapping.target
                                  : mapping.source}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words break-all align-top" style={{ position: "static", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                {activeMappingTab === "reconciliation"
                                  ? mapping.source
                                  : mapping.target}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {mapping.defaultValue || ""}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button
                                    className="text-blue-600 hover:text-blue-800"
                                    onClick={() => {
                                      setEditingAttribute(mapping);
                                      setIsEditingAttribute(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button className="text-red-600 hover:text-red-800">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        onClick={() => setAttributeMappingPage(Math.max(1, attributeMappingPage - 1))}
                        disabled={attributeMappingPage === 1}
                        >
                          &lt;
                        </button>
                      <span className="text-sm text-gray-700">
                        Page {attributeMappingPage} of {getAttributeMappingTotalPages()}
                      </span>
                        <button
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        onClick={() => setAttributeMappingPage(Math.min(getAttributeMappingTotalPages(), attributeMappingPage + 1))}
                        disabled={attributeMappingPage === getAttributeMappingTotalPages()}
                        >
                          &gt;
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                        Save
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Add New Attribute Form or Edit Attribute Form */}
                  <div className="space-y-4">
                    {isEditingAttribute ? (
                      <>
                        <h3 className="text-md font-semibold text-gray-800">
                          Edit Attribute
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mapping Type
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              defaultValue="direct"
                            >
                              <option value="direct">Direct</option>
                              <option value="expression">Expression</option>
                              <option value="constant">Constant</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Target Attribute
                              <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              defaultValue={editingAttribute?.target || ""}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Source Attribute
                              <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                              <span className="text-xs text-gray-500 ml-1">
                                Help
                              </span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                defaultValue={editingAttribute?.source || ""}
                              />
                              <button className="absolute right-2 top-2 text-gray-400">
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Default value (optional)
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              defaultValue={
                                editingAttribute?.defaultValue || ""
                              }
                            />
                          </div>
                        </div>

                        {/* Edit Form Action Buttons */}
                        <div className="flex space-x-3 pt-4">
                          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                            Update
                          </button>
                          <button
                            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
                            onClick={() => setIsEditingAttribute(false)}
                          >
                            Discard
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-md font-semibold text-gray-800">
                          Add New Attribute
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mapping Type
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="direct">Direct</option>
                              <option value="expression">Expression</option>
                              <option value="constant">Constant</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Source Attribute
                              <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                              <span className="text-xs text-gray-500 ml-1">
                                Help
                              </span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter source attribute"
                              />
                              <button className="absolute right-2 top-2 text-gray-400">
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Target Attribute
                              <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter target attribute"
                              />
                              <button className="absolute right-2 top-2 text-gray-400">
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Default value (optional)
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter default value"
                            />
                          </div>
                        </div>

                        {/* Add Form Action Buttons */}
                        <div className="flex space-x-3 pt-4">
                          <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">
                            Add
                          </button>
                          <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">
                            Discard
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hook Configuration Card */}
          <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header with Chevron */}
            <div
              className="px-6 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => setIsHookExpanded(!isHookExpanded)}
            >
              <div className="flex items-center">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-monitor-cog-icon lucide-monitor-cog"
                  >
                    <path d="M12 17v4" />
                    <path d="m14.305 7.53.923-.382" />
                    <path d="m15.228 4.852-.923-.383" />
                    <path d="m16.852 3.228-.383-.924" />
                    <path d="m16.852 8.772-.383.923" />
                    <path d="m19.148 3.228.383-.924" />
                    <path d="m19.53 9.696-.382-.924" />
                    <path d="m20.772 4.852.924-.383" />
                    <path d="m20.772 7.148.924.383" />
                    <path d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                    <path d="M8 21h8" />
                    <circle cx="18" cy="6" r="3" />
                  </svg>
                </div>
                <h2 className="text-md font-semibold text-gray-800">
                  Application Configuration
                </h2>
              </div>
              {isHookExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              )}
            </div>

            {/* Collapsible Content */}
            {isHookExpanded && (
              <div className="p-6">
                {/* Name Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter hook name"
                    value={hookName}
                    onChange={(e) => setHookName(e.target.value)}
                  />
                </div>

                {/* Event Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <div className="flex">
                    <button
                      className={`px-6 py-3 text-sm font-medium ${
                        activeEventTab === "pre-process"
                          ? "text-white bg-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveEventTab("pre-process")}
                    >
                      Pre Process Event
                    </button>
                    <button
                      className={`px-6 py-3 text-sm font-medium ${
                        activeEventTab === "post-process"
                          ? "text-white bg-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveEventTab("post-process")}
                    >
                      Post Process Event
                    </button>
                  </div>
                </div>

                {/* Service Section */}
                <div className="space-y-4">
                  <div
                    className="flex items-center justify-between cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded"
                    onClick={() => setIsServiceExpanded(!isServiceExpanded)}
                  >
                    <h3 className="text-md font-semibold text-gray-800 flex items-center">
                      <svg
                        className="w-5 h-5 text-gray-600 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                      </svg>
                      Service
                    </h3>
                    {isServiceExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  {/* Service Content - Only show when expanded */}
                  {isServiceExpanded && (
                    <>
                      {/* Operation Buttons */}
                      <div className="flex space-x-2 mb-4">
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeOperation === "create"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveOperation("create")}
                        >
                          Create
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeOperation === "update"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveOperation("update")}
                        >
                          Update
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeOperation === "delete"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveOperation("delete")}
                        >
                          Delete
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeOperation === "getuser"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveOperation("getuser")}
                        >
                          GetUser
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeOperation === "getalluser"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveOperation("getalluser")}
                        >
                          GetAllUser
                        </button>
                      </div>

                      {/* Service Table */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Endpoint
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Authorization
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Operation
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                -
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                -
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                Create
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button className="text-blue-600 hover:text-blue-800">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button className="text-red-600 hover:text-red-800">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Add Service Button and Pagination */}
                      <div className="flex items-center justify-between">
                        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                          Add Service
                        </button>

                        {/* Pagination */}
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                            &lt;
                          </button>
                          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                            1
                          </button>
                          <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                            &gt;
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* SDK Section */}
                <div className="space-y-4 mt-8">
                  <div
                    className="flex items-center justify-between cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded"
                    onClick={() => setIsSDKExpanded(!isSDKExpanded)}
                  >
                    <h3 className="text-md font-semibold text-gray-800 flex items-center">
                      <svg
                        className="w-5 h-5 text-gray-600 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                      </svg>
                      SDK
                    </h3>
                    {isSDKExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  {/* SDK Content - Only show when expanded */}
                  {isSDKExpanded && (
                    <>
                      {/* SDK Operation Buttons */}
                      <div className="flex space-x-2 mb-4">
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeSDKOperation === "create"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveSDKOperation("create")}
                        >
                          Create
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeSDKOperation === "update"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveSDKOperation("update")}
                        >
                          Update
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeSDKOperation === "delete"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveSDKOperation("delete")}
                        >
                          Delete
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeSDKOperation === "getuser"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveSDKOperation("getuser")}
                        >
                          GetUser
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            activeSDKOperation === "getalluser"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => setActiveSDKOperation("getalluser")}
                        >
                          GetAllUser
                        </button>
                      </div>

                      {/* SDK Table */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Implementation Class
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Agent Id
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Operation
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                -
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                -
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                -
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button className="text-blue-600 hover:text-blue-800">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button className="text-red-600 hover:text-red-800">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Add SDK Button and Pagination */}
                      <div className="flex items-center justify-between">
                        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                          Add SDK
                        </button>

                        {/* Pagination */}
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                            &lt;
                          </button>
                          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                            1
                          </button>
                          <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                            &gt;
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Target System Provisioning Threshold Section */}
                <div className="space-y-4 mt-8">
                  <div
                    className="flex items-center justify-between cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded"
                    onClick={() => setIsThresholdExpanded(!isThresholdExpanded)}
                  >
                    <h3 className="text-md font-semibold text-gray-800 flex items-center">
                      <svg
                        className="w-5 h-5 text-gray-600 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                      </svg>
                      Target System Provisioning Threshold
                    </h3>
                    {isThresholdExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  {/* Threshold Content - Only show when expanded */}
                  {isThresholdExpanded && (
                    <div className="space-y-4">
                      {/* Disable Operation Threshold */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-gray-700">
                          <span>
                            If the Disable Operation exceeds the maximum limit of
                          </span>
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            defaultValue="-1"
                          />
                          <span>operations within</span>
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            placeholder="0"
                          />
                          <span>minutes then</span>
                          <select className="px-2 py-1 border border-gray-300 rounded bg-white">
                            <option value="continue">Continue</option>
                            <option value="stop">Stop</option>
                            <option value="pause">Pause</option>
                          </select>
                          <span>further operations and send alert to email</span>
                          <input
                            type="email"
                            className="w-48 px-2 py-1 border border-gray-300 rounded"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>

                      {/* Create Operation Threshold */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-gray-700">
                          <span>If the Create Operation exceeds the maximum limit of</span>
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            defaultValue="-1"
                          />
                          <span>operations within</span>
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            placeholder="0"
                          />
                          <span>minutes then</span>
                          <select className="px-2 py-1 border border-gray-300 rounded bg-white">
                            <option value="continue">Continue</option>
                            <option value="stop">Stop</option>
                            <option value="pause">Pause</option>
                          </select>
                          <span>further operations and send alert to email</span>
                          <input
                            type="email"
                            className="w-48 px-2 py-1 border border-gray-300 rounded"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>

                      {/* Delete Operation Threshold */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-gray-700">
                          <span>If the Delete Operation exceeds the maximum limit of</span>
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            defaultValue="-1"
                          />
                          <span>operations within</span>
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            placeholder="0"
                          />
                          <span>minutes then</span>
                          <select className="px-2 py-1 border border-gray-300 rounded bg-white">
                            <option value="continue">Continue</option>
                            <option value="stop">Stop</option>
                            <option value="pause">Pause</option>
                          </select>
                          <span>further operations and send alert to email</span>
                          <input
                            type="email"
                            className="w-48 px-2 py-1 border border-gray-300 rounded"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      ),
    },
  ], [
    EntitlementsTabComponent,
    AccountsTabComponent,
  ]);

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isSidePanelOpen ? "mr-[500px]" : "mr-0"
      }`}
    >
      <div className="mb-4">
        <BackButton />
      </div>
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
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="text-gray-600 hover:text-gray-800 ml-auto"
                aria-label="Close panel"
              >
                <X size={24} />
              </button>
            </div>
            {entitlementDetailsError ? (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  {entitlementDetailsError}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={
                          (editableNodeData?.["Ent Name"] ||
                            editableNodeData?.entitlementName ||
                            editableNodeData?.userDisplayName ||
                            editableNodeData?.accountName ||
                            editableNodeData?.applicationName ||
                            "") as string
                        }
                        onChange={(e) => {
                          setEditableNodeData((prev: any) => ({
                            ...prev,
                            "Ent Name": e.target.value,
                            entitlementName: e.target.value,
                          }));
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-md font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-md font-semibold text-gray-900 break-words break-all whitespace-normal max-w-full">
                        {nodeData?.["Ent Name"] ||
                          (nodeData as any)?.entitlementName ||
                          (nodeData as any)?.userDisplayName ||
                          (nodeData as any)?.accountName ||
                          (nodeData as any)?.applicationName ||
                          "-"}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditMode) {
                        // Enter edit mode: expand all cards and initialize editable data
                        setEditableNodeData({ ...nodeData });
                        setExpandedFrames({
                          general: true,
                          business: true,
                          technical: true,
                          security: true,
                          lifecycle: true,
                        });
                        setIsEditMode(true);
                      } else {
                        // Exit edit mode (save changes)
                        // TODO: Add save functionality here
                        setIsEditMode(false);
                        setEditableNodeData(null);
                      }
                    }}
                    className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                      isEditMode 
                        ? "bg-blue-500 hover:bg-blue-600" 
                        : "hover:bg-gray-200"
                    }`}
                    title={isEditMode ? "Save changes" : "Edit entitlement"}
                    aria-label={isEditMode ? "Save changes" : "Edit entitlement"}
                  >
                    <Edit className={`w-4 h-4 ${isEditMode ? "text-white" : "text-gray-600 hover:text-blue-600"}`} />
                  </button>
                </div>
                <div className="mt-3">
                  <span className="text-xs uppercase text-gray-500">
                    Description:
                  </span>
                  {isEditMode ? (
                    <textarea
                      value={
                        (editableNodeData?.["Ent Description"] ||
                          editableNodeData?.description ||
                          editableNodeData?.details ||
                          "") as string
                      }
                      onChange={(e) => {
                        setEditableNodeData((prev: any) => ({
                          ...prev,
                          "Ent Description": e.target.value,
                          description: e.target.value,
                          details: e.target.value,
                        }));
                      }}
                      rows={3}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 break-words break-all whitespace-pre-wrap max-w-full mt-1">
                      {nodeData?.["Ent Description"] ||
                        (nodeData as any)?.description ||
                        (nodeData as any)?.details ||
                        "-"}
                    </p>
                  )}
                </div>
              </>
            )}
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
                  <ChevronUp size={20} className="mr-2" />
                )}
                General
              </button>
              {expandedFrames.general && (
                <div className="p-4 space-y-2">
                  {renderSideBySideField(
                    "Ent Type",
                    nodeData?.["Ent Type"],
                    "#Assignments",
                    nodeData?.["Total Assignments"],
                    "Ent Type",
                    "Total Assignments"
                  )}
                  {renderSideBySideField(
                    "App Name",
                    nodeData?.["App Name"],
                    "Tag(s)",
                    nodeData?.["Dynamic Tag"],
                    "App Name",
                    "Dynamic Tag"
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
                  <ChevronUp size={20} className="mr-2" />
                )}
                Business
              </button>
              {expandedFrames.business && (
                <div className="p-4 space-y-2">
                  {renderSingleField(
                    "Objective",
                    nodeData?.["Business Objective"],
                    "Business Objective"
                  )}
                  {renderSideBySideField(
                    "Business Unit",
                    nodeData?.["Business Unit"],
                    "Business Owner",
                    nodeData?.["Ent Owner"],
                    "Business Unit",
                    "Ent Owner"
                  )}
                  {renderSingleField(
                    "Regulatory Scope",
                    nodeData?.["Compliance Type"],
                    "Compliance Type"
                  )}
                  {renderSideBySideField(
                    "Data Classification",
                    nodeData?.["Data Classification"],
                    "Cost Center",
                    nodeData?.["Cost Center"],
                    "Data Classification",
                    "Cost Center"
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
                  <ChevronUp size={20} className="mr-2" />
                )}
                Technical
              </button>
              {expandedFrames.technical && (
                <div className="p-4 space-y-2">
                  {renderSideBySideField(
                    "Created On",
                    nodeData?.["Created On"],
                    "Last Sync",
                    nodeData?.["Last Sync"],
                    "Created On",
                    "Last Sync",
                    true,
                    true
                  )}
                  {renderSideBySideField(
                    "App Name",
                    nodeData?.["App Name"],
                    "App Instance",
                    nodeData?.["App Instance"],
                    "App Name",
                    "App Instance"
                  )}
                  {renderSideBySideField(
                    "App Owner",
                    nodeData?.["App Owner"],
                    "Ent Owner",
                    nodeData?.["Ent Owner"],
                    "App Owner",
                    "Ent Owner"
                  )}
                  {renderSideBySideField(
                    "Hierarchy",
                    nodeData?.["Hierarchy"],
                    "MFA Status",
                    nodeData?.["MFA Status"],
                    "Hierarchy",
                    "MFA Status"
                  )}
                  {renderSingleField(
                    "Assigned to/Member of",
                    nodeData?.["assignment"],
                    "assignment"
                  )}
                  {renderSingleField(
                    "License Type",
                    nodeData?.["License Type"],
                    "License Type"
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
                  <ChevronUp size={20} className="mr-2" />
                )}
                Security
              </button>
              {expandedFrames.security && (
                <div className="p-4 space-y-2">
                  {renderSideBySideField(
                    "Risk",
                    nodeData?.["Risk"],
                    "Certifiable",
                    nodeData?.["Certifiable"],
                    "Risk",
                    "Certifiable"
                  )}
                  {renderSideBySideField(
                    "Revoke on Disable",
                    nodeData?.["Revoke on Disable"],
                    "Shared Pwd",
                    nodeData?.["Shared Pwd"],
                    "Revoke on Disable",
                    "Shared Pwd"
                  )}
                  {renderSingleField(
                    "SoD/Toxic Combination",
                    nodeData?.["SOD Check"],
                    "SOD Check"
                  )}
                  {renderSingleField(
                    "Access Scope",
                    nodeData?.["Access Scope"],
                    "Access Scope"
                  )}
                  {renderSideBySideField(
                    "Review Schedule",
                    nodeData?.["Review Schedule"],
                    "Last Reviewed On",
                    nodeData?.["Last Reviewed on"],
                    "Review Schedule",
                    "Last Reviewed on",
                    false,
                    true
                  )}
                  {renderSideBySideField(
                    "Privileged",
                    nodeData?.["Privileged"],
                    "Non Persistent Access",
                    nodeData?.["Non Persistent Access"],
                    "Privileged",
                    "Non Persistent Access"
                  )}
                  {renderSingleField(
                    "Audit Comments",
                    nodeData?.["Audit Comments"],
                    "Audit Comments"
                  )}
                  {renderSingleField(
                    "Account Type Restriction",
                    nodeData?.["Account Type Restriction"],
                    "Account Type Restriction"
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
                  <ChevronUp size={20} className="mr-2" />
                )}
                Lifecycle
              </button>
              {expandedFrames.lifecycle && (
                <div className="p-4 space-y-2">
                  {renderSideBySideField(
                    "Requestable",
                    nodeData?.["Requestable"],
                    "Pre-Requisite",
                    nodeData?.["Pre- Requisite"],
                    "Requestable",
                    "Pre- Requisite"
                  )}
                  {renderSingleField(
                    "Pre-Req Details",
                    nodeData?.["Pre-Requisite Details"],
                    "Pre-Requisite Details"
                  )}
                  {renderSingleField(
                    "Auto Assign Access Policy",
                    nodeData?.["Auto Assign Access Policy"],
                    "Auto Assign Access Policy"
                  )}
                  {renderSingleField(
                    "Provisioner Group",
                    nodeData?.["Provisioner Group"],
                    "Provisioner Group"
                  )}
                  {renderSingleField(
                    "Provisioning Steps",
                    nodeData?.["Provisioning Steps"],
                    "Provisioning Steps"
                  )}
                  {renderSingleField(
                    "Provisioning Mechanism",
                    nodeData?.["Provisioning Mechanism"],
                    "Provisioning Mechanism"
                  )}
                  {renderSingleField(
                    "Action on Native Change",
                    nodeData?.["Action on Native Change"],
                    "Action on Native Change"
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

      {/* Global Right Sidebar used via openSidebar */}

      {/* Comment Modal */}
      {isCommentModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full mx-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Comment</h3>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quick comments
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) setCommentText(val);
                  }}
                >
                  <option value="" disabled>
                    Select a suggestion...
                  </option>
                  <option>Approved - access required for role</option>
                  <option>Rejected - insufficient justification</option>
                  <option>Approve temporarily, revisit next review</option>
                  <option>Duplicate access detected - revoke</option>
                  <option>Compliant per policy and controls</option>
                </select>
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
