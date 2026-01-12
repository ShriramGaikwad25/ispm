"use client";
import React, { useMemo, useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
import { ColDef, ICellRendererParams, GridApi } from "ag-grid-community";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import "@/lib/ag-grid-setup";
import { formatDateMMDDYY } from "../access-review/page";
import {
  CircleCheck,
  CircleX,
  ArrowRightCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getAccessDetails } from "@/lib/api";
import { getReviewerId } from "@/lib/auth";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import CustomPagination from "@/components/agTable/CustomPagination";
import { BackButton } from "@/components/BackButton";

const EntitlementOwnerPageContent = () => {
  const { openSidebar, closeSidebar } = useRightSidebar();
  const searchParams = useSearchParams();
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentCategory, setCommentCategory] = useState("");
  const [commentSubcategory, setCommentSubcategory] = useState("");
  const [isCommentDropdownOpen, setIsCommentDropdownOpen] = useState(false);

  // Get reviewerId and certificationId from URL parameters
  const reviewerId =
    searchParams.get("reviewerId") || getReviewerId() || "";
  const certificationId =
    searchParams.get("certificationId") || "";

  // Transform rowData to add description rows (separate row for each description)
  const filteredRowData = useMemo(() => {
    if (!rowData || rowData.length === 0) return [];
    const rows: any[] = [];
    for (const item of rowData) {
      rows.push(item);
      rows.push({ ...item, __isDescRow: true });
    }
    return rows;
  }, [rowData]);

  // Action handlers
  const handleApprove = () => {
    setLastAction("Approve");
    setError(null);
    console.log("Approve action triggered");
  };

  const handleRevoke = () => {
    setLastAction("Revoke");
    setError(null);
    console.log("Revoke action triggered");
  };

  const handleComment = () => {
    setCommentText(comment);
    setCommentCategory("");
    setCommentSubcategory("");
    setIsCommentDropdownOpen(false);
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
    setCommentCategory("");
    setCommentSubcategory("");
    setIsCommentDropdownOpen(false);
  };

  // Comment options data structure
  const commentOptions = {
    "Approve": [
      "Access required to perform current job responsibilities.",
      "Access aligns with user's role and department functions.",
      "Validated with manager/business owner – appropriate access.",
      "No SoD (Segregation of Duties) conflict identified.",
      "User continues to work on project/system requiring this access."
    ],
    "Revoke": [
      "User no longer in role requiring this access.",
      "Access redundant – duplicate with other approved entitlements.",
      "Access not used in last 90 days (inactive entitlement).",
      "SoD conflict identified – removing conflicting access.",
      "Temporary/project-based access – no longer required."
    ]
  };

  const handleCategoryChange = (category: string) => {
    setCommentCategory(category);
    setCommentSubcategory("");
    setCommentText("");
  };

  const handleSubcategoryChange = (subcategory: string) => {
    setCommentSubcategory(subcategory);
    setCommentText(`${commentCategory} - ${subcategory}`);
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      if (!reviewerId || !certificationId) {
        setApiError("Missing reviewerId or certificationId");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setApiError(null);

        // Handle dummy test record
        if (certificationId === "dummy-cert-id-entitlement-owner") {
          // Return dummy data for testing
          const dummyData = [
            {
              entitlementName: "Administrator Access",
              description: "Full administrative access to system resources and configurations",
              "Ent Name": "Administrator Access",
              "Ent Description": "Full administrative access to system resources and configurations",
              type: "Role",
              "Ent Type": "Role",
              applicationName: "Active Directory",
              "App Name": "Active Directory",
              risk: "High",
              "Risk": "High",
              "Total Assignments": "25",
              "Dynamic Tag": "Admin",
              "Business Objective": "System Administration",
              "Business Unit": "IT Operations",
              "Ent Owner": "John Doe",
              "Compliance Type": "SOX",
              "Data Classification": "Confidential",
              "Cost Center": "IT-001",
              "Created On": "2024-01-15",
              "Last Sync": "2024-12-01",
              "App Instance": "AD-PROD-01",
              "App Owner": "IT Team",
              "Hierarchy": "Enterprise",
              "MFA Status": "Required",
              "assignment": "Direct",
              "License Type": "Enterprise",
              "Certifiable": "Yes",
              "Revoke on Disable": "Yes",
              "Shared Pwd": "No",
              "SOD Check": "Yes",
              "Access Scope": "Global",
              "Review Schedule": "Quarterly",
              "Last Reviewed on": "2024-09-15",
              "Privileged": "Yes",
              "Non Persistent Access": "No",
              "Audit Comments": "Regular review required",
              "Account Type Restriction": "Service Account",
              "Requestable": "Yes",
              "Pre- Requisite": "Security Training",
              "Pre-Requisite Details": "Must complete security awareness training",
              "Auto Assign Access Policy": "No",
              "Provisioner Group": "IT Admins",
              "Provisioning Steps": "Approval, Assignment, Notification",
              "Provisioning Mechanism": "Automated",
              "Action on Native Change": "Sync",
              entitlementId: "dummy-ent-001",
              lineItemId: "dummy-line-001",
              status: "Pending",
            },
            {
              entitlementName: "Database Read Access",
              description: "Read-only access to production database for reporting purposes",
              "Ent Name": "Database Read Access",
              "Ent Description": "Read-only access to production database for reporting purposes",
              type: "Permission",
              "Ent Type": "Permission",
              applicationName: "Oracle Database",
              "App Name": "Oracle Database",
              risk: "Medium",
              "Risk": "Medium",
              "Total Assignments": "150",
              "Dynamic Tag": "ReadOnly",
              "Business Objective": "Business Reporting",
              "Business Unit": "Analytics",
              "Ent Owner": "Jane Smith",
              "Compliance Type": "GDPR",
              "Data Classification": "Internal",
              "Cost Center": "ANAL-002",
              "Created On": "2024-03-20",
              "Last Sync": "2024-12-01",
              "App Instance": "ORACLE-PROD",
              "App Owner": "DBA Team",
              "Hierarchy": "Department",
              "MFA Status": "Optional",
              "assignment": "Group",
              "License Type": "Standard",
              "Certifiable": "Yes",
              "Revoke on Disable": "No",
              "Shared Pwd": "No",
              "SOD Check": "No",
              "Access Scope": "Department",
              "Review Schedule": "Annually",
              "Last Reviewed on": "2024-06-10",
              "Privileged": "No",
              "Non Persistent Access": "No",
              "Audit Comments": "Low risk entitlement",
              "Account Type Restriction": "User Account",
              "Requestable": "Yes",
              "Pre- Requisite": "None",
              "Pre-Requisite Details": "N/A",
              "Auto Assign Access Policy": "Yes",
              "Provisioner Group": "DB Admins",
              "Provisioning Steps": "Auto Assignment",
              "Provisioning Mechanism": "Automated",
              "Action on Native Change": "Sync",
              entitlementId: "dummy-ent-002",
              lineItemId: "dummy-line-002",
              status: "Pending",
            },
          ];
          
          setRowData(dummyData);
          setTotalItems(dummyData.length);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        // Fetch all entitlements for this certification
        const response = await getAccessDetails<any>(
          reviewerId,
          certificationId,
          undefined,
          "All",
          pageSize,
          currentPage
        );

        // Transform API response to match Catalog format
        const transformedData: any[] = [];
        
        if (response.items && Array.isArray(response.items)) {
          response.items.forEach((item: any) => {
            const entitlements = item.entityEntitlements?.items || [];
            
            entitlements.forEach((ent: any) => {
              // Handle both entityEntitlement (singular) and entityEntitlements (plural)
              const entInfo = ent.entityEntitlement || ent.entityEntitlements || {};
              const catalogDetails = ent.catalogDetails || {};
              
              transformedData.push({
                entitlementName: catalogDetails.entitlementName || entInfo.entitlementName || "N/A",
                description: catalogDetails.description || entInfo.entitlementDescription || "N/A",
                "Ent Name": catalogDetails.entitlementName || entInfo.entitlementName || "N/A",
                "Ent Description": catalogDetails.description || entInfo.entitlementDescription || "N/A",
                type: catalogDetails.entitlementType || entInfo.entitlementType || "N/A",
                "Ent Type": catalogDetails.entitlementType || entInfo.entitlementType || "N/A",
                applicationName: item.applicationInfo?.applicationName || "N/A",
                "App Name": item.applicationInfo?.applicationName || "N/A",
                risk: catalogDetails.risk || "N/A",
                "Risk": catalogDetails.risk || "N/A",
                "Total Assignments": catalogDetails.totalAssignments || "N/A",
                "Dynamic Tag": catalogDetails.dynamicTag || "N/A",
                "Business Objective": catalogDetails.businessObjective || "N/A",
                "Business Unit": catalogDetails.businessUnit || "N/A",
                "Ent Owner": catalogDetails.entitlementOwner || "N/A",
                "Compliance Type": catalogDetails.complianceType || "N/A",
                "Data Classification": catalogDetails.dataClassification || "N/A",
                "Cost Center": catalogDetails.costCenter || "N/A",
                "Created On": catalogDetails.createdOn || "N/A",
                "Last Sync": catalogDetails.lastSync || "N/A",
                "App Instance": item.applicationInfo?.applicationInstanceId || "N/A",
                "App Owner": catalogDetails.appOwner || "N/A",
                "Hierarchy": catalogDetails.hierarchy || "N/A",
                "MFA Status": catalogDetails.mfaStatus || "N/A",
                "assignment": catalogDetails.assignment || "N/A",
                "License Type": catalogDetails.licenseType || "N/A",
                "Certifiable": catalogDetails.certifiable || "N/A",
                "Revoke on Disable": catalogDetails.revokeOnDisable || "N/A",
                "Shared Pwd": catalogDetails.sharedPwd || "N/A",
                "SOD Check": catalogDetails.sodCheck || "N/A",
                "Access Scope": catalogDetails.accessScope || "N/A",
                "Review Schedule": catalogDetails.reviewSchedule || "N/A",
                "Last Reviewed on": catalogDetails.lastReviewedOn || "N/A",
                "Privileged": catalogDetails.privileged || "N/A",
                "Non Persistent Access": catalogDetails.nonPersistentAccess || "N/A",
                "Audit Comments": catalogDetails.auditComments || "N/A",
                "Account Type Restriction": catalogDetails.accountTypeRestriction || "N/A",
                "Requestable": catalogDetails.requestable || "N/A",
                "Pre- Requisite": catalogDetails.preRequisite || "N/A",
                "Pre-Requisite Details": catalogDetails.preRequisiteDetails || "N/A",
                "Auto Assign Access Policy": catalogDetails.autoAssignAccessPolicy || "N/A",
                "Provisioner Group": catalogDetails.provisionerGroup || "N/A",
                "Provisioning Steps": catalogDetails.provisioningSteps || "N/A",
                "Provisioning Mechanism": catalogDetails.provisioningMechanism || "N/A",
                "Action on Native Change": catalogDetails.actionOnNativeChange || "N/A",
                entitlementId: catalogDetails.entitlementId || entInfo.entitlementId || "",
                lineItemId: entInfo.lineItemId || "",
                status: entInfo.action || "Pending",
              });
            });
          });
        }

        setRowData(transformedData);
        setTotalItems(response.total_items || transformedData.length);
        setTotalPages(response.total_pages || 1);
      } catch (err: any) {
        console.error("Error fetching entitlements:", err);
        setApiError(err.message || "Failed to load entitlements");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reviewerId, certificationId, pageSize, currentPage]);

  const underReviewColDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "entitlementName",
        headerName: "Entitlement Name",
        width: 700,
        autoHeight: true,
        wrapText: true,
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
            const desc = params.data?.["description"] ||
              params.data?.["Ent Description"] ||
              params.data?.description ||
              "No description available";
            const isEmpty = !desc || desc === "N/A" || desc.trim().length === 0;
            return (
              <div className={`text-sm w-full break-words whitespace-pre-wrap ${isEmpty ? "text-gray-400 italic" : "text-gray-600"}`}>
                {isEmpty ? "No description available" : desc}
              </div>
            );
          }

          const riskVal = (params.data?.risk || "").toString().toLowerCase();
          const isHighRisk = riskVal === "high" || riskVal === "critical";

          return (
            <div className="flex items-center h-full">
              {isHighRisk ? (
                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                  {params.value}
                </span>
              ) : (
                <span className="font-semibold">{params.value}</span>
              )}
            </div>
          );
        },
      },
      { field: "type", headerName: "Type", width: 120 },
      { field: "applicationName", headerName: "Application", width: 150 },
      {
        field: "risk",
        headerName: "Risk",
        width: 120,
        hide: true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return (
            <span className="font-medium" style={{ color: riskColor }}>
              {risk}
            </span>
          );
        },
      },
      { field: "Last Reviewed on", headerName: "Last Reviewed", width: 180 },
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
                  params.data?.status === "Rejected" ? "bg-red-100" : ""
                }`}
              >
                <CircleX
                  className="cursor-pointer hover:opacity-80 transform rotate-90"
                  color="#FF2D55"
                  strokeWidth="1"
                  size="32"
                  fill={params.data?.status === "Rejected" ? "#FF2D55" : "none"}
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
                onClick={() => {
                  const row = params?.data || {};
                  const InfoSidebar = () => {
                    const [sectionsOpen, setSectionsOpen] = useState({
                      general: false,
                      business: false,
                      technical: false,
                      security: false,
                      lifecycle: false,
                    });

                    return (
                      <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          {/* Header Section */}
                          <div className="p-4 border-b bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h2 className="text-lg font-semibold">Entitlement Details</h2>
                                <div className="mt-2">
                                  <span className="text-xs uppercase text-gray-500">
                                    Entitlement Name:
                                  </span>
                                  <div className="text-md font-medium break-words break-all whitespace-normal max-w-full">
                                    {row?.["Ent Name"] ||
                                      row?.entitlementName ||
                                      row?.applicationName ||
                                      "-"}
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-xs uppercase text-gray-500">
                                    Description:
                                  </span>
                                  <p className="text-sm text-gray-700 break-words break-all whitespace-pre-wrap max-w-full">
                                    {row?.["Ent Description"] ||
                                      row?.description ||
                                      row?.details ||
                                      "-"}
                                  </p>
                                </div>
                              </div>
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
                                  row?.status === "Rejected" ? "bg-red-100" : ""
                                }`}
                              >
                                <CircleX
                                  className="cursor-pointer hover:opacity-80 transform rotate-90"
                                  color="#FF2D55"
                                  strokeWidth="1"
                                  size="32"
                                  fill={row?.status === "Rejected" ? "#FF2D55" : "none"}
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
                            {/* General Accordion */}
                            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                              <button
                                className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                                onClick={() =>
                                  setSectionsOpen((s: any) => ({ ...s, general: !s.general }))
                                }
                              >
                                {sectionsOpen.general ? (
                                  <ChevronDown size={20} className="mr-2" />
                                ) : (
                                  <ChevronRight size={20} className="mr-2" />
                                )}{" "}
                                General
                              </button>
                              {sectionsOpen.general && (
                                <div className="p-4 space-y-2">
                                  <div className="flex space-x-4 text-sm text-gray-700">
                                    <div className="flex-1">
                                      <strong>Ent Type:</strong>{" "}
                                      {row?.["Ent Type"] || row?.type || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>#Assignments:</strong>{" "}
                                      {row?.["Total Assignments"] ?? "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex space-x-4 text-sm text-gray-700">
                                    <div className="flex-1">
                                      <strong>App Name:</strong>{" "}
                                      {row?.["App Name"] ||
                                        row?.applicationName ||
                                        "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Tag(s):</strong>{" "}
                                      {row?.["Dynamic Tag"] || "N/A"}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Business Accordion */}
                            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                              <button
                                className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                                onClick={() =>
                                  setSectionsOpen((s: any) => ({ ...s, business: !s.business }))
                                }
                              >
                                {sectionsOpen.business ? (
                                  <ChevronDown size={20} className="mr-2" />
                                ) : (
                                  <ChevronRight size={20} className="mr-2" />
                                )}{" "}
                                Business
                              </button>
                              {sectionsOpen.business && (
                                <div className="p-4 space-y-2 text-sm text-gray-700">
                                  <div>
                                    <strong>Objective:</strong>{" "}
                                    {row?.["Business Objective"] || "N/A"}
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Business Unit:</strong>{" "}
                                      {row?.["Business Unit"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Business Owner:</strong>{" "}
                                      {row?.["Ent Owner"] || "N/A"}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>Regulatory Scope:</strong>{" "}
                                    {row?.["Compliance Type"] || "N/A"}
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Data Classification:</strong>{" "}
                                      {row?.["Data Classification"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Cost Center:</strong>{" "}
                                      {row?.["Cost Center"] || "N/A"}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Technical Accordion */}
                            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                              <button
                                className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                                onClick={() =>
                                  setSectionsOpen((s: any) => ({
                                    ...s,
                                    technical: !s.technical,
                                  }))
                                }
                              >
                                {sectionsOpen.technical ? (
                                  <ChevronDown size={20} className="mr-2" />
                                ) : (
                                  <ChevronRight size={20} className="mr-2" />
                                )}{" "}
                                Technical
                              </button>
                              {sectionsOpen.technical && (
                                <div className="p-4 space-y-2 text-sm text-gray-700">
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Created On:</strong>{" "}
                                      {row?.["Created On"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Last Sync:</strong>{" "}
                                      {row?.["Last Sync"] || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>App Name:</strong>{" "}
                                      {row?.["App Name"] ||
                                        row?.applicationName ||
                                        "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>App Instance:</strong>{" "}
                                      {row?.["App Instance"] || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>App Owner:</strong>{" "}
                                      {row?.["App Owner"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Ent Owner:</strong>{" "}
                                      {row?.["Ent Owner"] || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Hierarchy:</strong>{" "}
                                      {row?.["Hierarchy"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>MFA Status:</strong>{" "}
                                      {row?.["MFA Status"] || "N/A"}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>Assigned to/Member of:</strong>{" "}
                                    {row?.["assignment"] || "N/A"}
                                  </div>
                                  <div>
                                    <strong>License Type:</strong>{" "}
                                    {row?.["License Type"] || "N/A"}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Security Accordion */}
                            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                              <button
                                className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                                onClick={() =>
                                  setSectionsOpen((s: any) => ({ ...s, security: !s.security }))
                                }
                              >
                                {sectionsOpen.security ? (
                                  <ChevronDown size={20} className="mr-2" />
                                ) : (
                                  <ChevronRight size={20} className="mr-2" />
                                )}{" "}
                                Security
                              </button>
                              {sectionsOpen.security && (
                                <div className="p-4 space-y-2 text-sm text-gray-700">
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Risk:</strong>{" "}
                                      {row?.["Risk"] || row?.risk || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Certifiable:</strong>{" "}
                                      {row?.["Certifiable"] || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Revoke on Disable:</strong>{" "}
                                      {row?.["Revoke on Disable"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Shared Pwd:</strong>{" "}
                                      {row?.["Shared Pwd"] || "N/A"}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>SoD/Toxic Combination:</strong>{" "}
                                    {row?.["SOD Check"] || "N/A"}
                                  </div>
                                  <div>
                                    <strong>Access Scope:</strong>{" "}
                                    {row?.["Access Scope"] || "N/A"}
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Review Schedule:</strong>{" "}
                                      {row?.["Review Schedule"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Last Reviewed On:</strong>{" "}
                                      {row?.["Last Reviewed on"] || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Privileged:</strong>{" "}
                                      {row?.["Privileged"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Non Persistent Access:</strong>{" "}
                                      {row?.["Non Persistent Access"] || "N/A"}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>Audit Comments:</strong>{" "}
                                    {row?.["Audit Comments"] || "N/A"}
                                  </div>
                                  <div>
                                    <strong>Account Type Restriction:</strong>{" "}
                                    {row?.["Account Type Restriction"] || "N/A"}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Lifecycle Accordion */}
                            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                              <button
                                className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                                onClick={() =>
                                  setSectionsOpen((s: any) => ({
                                    ...s,
                                    lifecycle: !s.lifecycle,
                                  }))
                                }
                              >
                                {sectionsOpen.lifecycle ? (
                                  <ChevronDown size={20} className="mr-2" />
                                ) : (
                                  <ChevronRight size={20} className="mr-2" />
                                )}{" "}
                                Lifecycle
                              </button>
                              {sectionsOpen.lifecycle && (
                                <div className="p-4 space-y-2 text-sm text-gray-700">
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Requestable:</strong>{" "}
                                      {row?.["Requestable"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Pre-Requisite:</strong>{" "}
                                      {row?.["Pre- Requisite"] || "N/A"}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>Pre-Req Details:</strong>{" "}
                                    {row?.["Pre-Requisite Details"] || "N/A"}
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Auto Assign Access Policy:</strong>{" "}
                                      {row?.["Auto Assign Access Policy"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Provisioner Group:</strong>{" "}
                                      {row?.["Provisioner Group"] || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex space-x-4">
                                    <div className="flex-1">
                                      <strong>Provisioning Steps:</strong>{" "}
                                      {row?.["Provisioning Steps"] || "N/A"}
                                    </div>
                                    <div className="flex-1">
                                      <strong>Provisioning Mechanism:</strong>{" "}
                                      {row?.["Provisioning Mechanism"] || "N/A"}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>Action on Native Change:</strong>{" "}
                                    {row?.["Action on Native Change"] || "N/A"}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };
                  
                  openSidebar(<InfoSidebar />, { widthPx: 500 });
                }}
                title="Info"
                className="cursor-pointer rounded-sm hover:opacity-80"
                aria-label="View details"
              >
                <ArrowRightCircle
                  color="#2563eb"
                  size="42"
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
    [error, lastAction, reviewerId]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  const updatePaginationState = (api: GridApi | null) => {
    if (!api) return;
    const pageZeroBased = api.paginationGetCurrentPage?.() ?? 0;
    const totalPageCount = api.paginationGetTotalPages?.() ?? 1;
    const filteredRowCount = api.getDisplayedRowCount?.() ?? rowData.length;
    setCurrentPage(Math.max(1, pageZeroBased + 1));
    setTotalPages(Math.max(1, totalPageCount));
    setTotalItems(filteredRowCount);
  };

  if (loading) {
    return (
      <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="relative mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlement Review</h1>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading entitlements...</p>
          </div>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="relative mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlement Review</h1>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-2">
              Error Loading Entitlements
            </p>
            <p className="text-gray-600 mb-4">{apiError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ag-theme-alpine" style={{ width: "100%" }}>
      <style jsx global>{`
        .ag-paging-panel { display: none !important; }
      `}</style>
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="relative mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlement Review</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={searchText}
            onChange={(e) => {
              const val = e.target.value;
              setSearchText(val);
              gridApi?.setGridOption("quickFilterText", val);
            }}
            placeholder="Search..."
            className="border border-gray-300 rounded px-3 h-9 text-sm w-64"
          />
        </div>
      </div>
      {/* Top pagination */}
      <div className="mb-2">
        <CustomPagination
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(newPage) => {
            setCurrentPage(newPage);
          }}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
          }}
        />
      </div>
      <div style={{ width: "100%" }}>
        <AgGridReact
          rowData={filteredRowData}
          columnDefs={underReviewColDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="multiple"
          domLayout="autoHeight"
          pagination={true}
          paginationPageSize={pageSize}
          suppressRowTransform={true}
          getRowId={(params: any) => {
            const d = params.data || {};
            const baseId =
              d.entitlementId ||
              d.entitlementid ||
              d.catalogId ||
              `${d.applicationName || ""}|${d.entitlementName || d.name || ""}`;
            return d.__isDescRow ? `${baseId}-desc` : baseId;
          }}
          onGridReady={(params: any) => {
            setGridApi(params.api);
            params.api.setGridOption("paginationPageSize", pageSize);
            updatePaginationState(params.api);
            params.api.addEventListener("paginationChanged", () => updatePaginationState(params.api));
            params.api.addEventListener("modelUpdated", () => updatePaginationState(params.api));
            params.api.addEventListener("filterChanged", () => updatePaginationState(params.api));
            params.api.addEventListener("sortChanged", () => updatePaginationState(params.api));
          }}
        />
      </div>

      <div className="mt-1">
        <CustomPagination
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(newPage) => {
            setCurrentPage(newPage);
          }}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Comment Modal */}
      {isCommentModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full mx-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Comment</h3>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment Suggestions
                </label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between"
                    onClick={() => setIsCommentDropdownOpen(!isCommentDropdownOpen)}
                  >
                    <span className="text-gray-500">
                      {commentSubcategory ? `${commentCategory} - ${commentSubcategory}` : 'Select a comment suggestion...'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isCommentDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isCommentDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
                      <div className="p-2 space-y-2">
                        {/* Approve Section */}
                        <div>
                          <div className="flex items-center p-1">
                            <div className="w-3 h-3 rounded-full border-2 mr-2 flex items-center justify-center border-green-500 bg-green-500">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium text-gray-900">Approve</span>
                          </div>
                          
                          <div className="ml-5 mt-1 space-y-1">
                            {commentOptions["Approve"].map((option, index) => (
                              <div
                                key={index}
                                className="text-xs text-gray-600 cursor-pointer hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                                onClick={() => {
                                  handleCategoryChange("Approve");
                                  handleSubcategoryChange(option);
                                  setIsCommentDropdownOpen(false);
                                }}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Revoke Section */}
                        <div>
                          <div className="flex items-center p-1">
                            <div className="w-3 h-3 rounded-full border-2 mr-2 flex items-center justify-center border-red-500 bg-red-500">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium text-gray-900">Revoke</span>
                          </div>
                          
                          <div className="ml-5 mt-1 space-y-1">
                            {commentOptions["Revoke"].map((option, index) => (
                              <div
                                key={index}
                                className="text-xs text-gray-600 cursor-pointer hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                                onClick={() => {
                                  handleCategoryChange("Revoke");
                                  handleSubcategoryChange(option);
                                  setIsCommentDropdownOpen(false);
                                }}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    commentCategory 
                      ? `Enter additional details for ${commentCategory.toLowerCase()}...` 
                      : "Select an action type and reason, or enter your comment here..."
                  }
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
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EntitlementOwnerPageContent />
    </Suspense>
  );
}

