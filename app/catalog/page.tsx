"use client";
import React, { useMemo, useState, useEffect, Suspense } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams, GridApi } from "ag-grid-community";
import { useSearchParams } from "next/navigation";
import "@/lib/ag-grid-setup";
import EditReassignButtons from "@/components/agTable/EditReassignButtons";
import { formatDateMMDDYY } from "../access-review/page";
import { CircleCheck, CircleX, InfoIcon, X, ChevronDown, ChevronRight } from "lucide-react";
import { getCatalogEntitlements } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";

interface TabProps {
  tabs: { label: string }[];
  activeClass: string;
  buttonClass: string;
  className: string;
  activeIndex: number;
  onChange: (index: number) => void;
}

const Tabs: React.FC<TabProps> = ({
  tabs,
  activeClass,
  buttonClass,
  className,
  activeIndex,
  onChange,
}) => {
  return (
    <div className={className}>
      {tabs.map((tab, index) => (
        <button
          key={tab.label}
          className={`flex items-center justify-center ${
            index === activeIndex
              ? activeClass
              : "text-gray-500 hover:text-gray-700"
          } ${buttonClass}`}
          onClick={() => onChange(index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

const CatalogPageClient = () => {
  const searchParams = useSearchParams();
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Get appinstanceid and reviewerId from URL parameters with fallback values
  const appInstanceId = searchParams.get('appinstanceid') || "b73ac8d7-f4cd-486f-93c7-3589ab5c5296";
  const reviewerId = searchParams.get('reviewerId') || "ec527a50-0944-4b31-b239-05518c87a743";

  const [entTabIndex, setEntTabIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [nodeData, setNodeData] = useState<any>(null);
  const [isHighRiskSidebarOpen, setIsHighRiskSidebarOpen] = useState(false);
  const [highRiskData, setHighRiskData] = useState<any>(null);
  const [policyRiskLoading, setPolicyRiskLoading] = useState(false);
  const [policyRiskError, setPolicyRiskError] = useState<string|null>(null);
  const [policyRiskData, setPolicyRiskData] = useState<any>(null);
  const [policySelections, setPolicySelections] = useState<Array<{ controls: string; accepted: string; lastUpdate: string }>>([]);
  const [policyOpen, setPolicyOpen] = useState<boolean[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>("All");
  const [sectionsOpen, setSectionsOpen] = useState({
    general: false,
    business: false,
    technical: false,
    security: false,
    lifecycle: false,
  });

  // Define tabs data
  const tabsDataEnt = [{ label: "All" }, { label: "Under Review" }];

  // Use rowData directly since quickFilter and column filter are applied via gridApi
  const filteredRowData = rowData;

  const applicationOptions = useMemo(() => {
    return ["All", "ACMECorporateDirectory", "Workday", "Oracle_Fusion_HCM", "SAP_S4", "KF_OCI"];
  }, []);

  // Action handlers for Under Review tab
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
    setLastAction("Comment");
    setError(null);
    console.log("Comment action triggered");
  };

  const toggleSidePanel = (data: any) => {
    if (isSidePanelOpen && nodeData === data) {
      setIsSidePanelOpen(false);
      setNodeData(null);
    } else {
      setIsSidePanelOpen(true);
      setNodeData(data);
    }
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setApiError(null);
        
        const response = await getCatalogEntitlements<any>(
          appInstanceId,
          reviewerId,
        );
        
        // Debug: Log the API response to see what fields are available
        console.log("API Response:", response);
        console.log("Response items:", response.items);
        if (response.items && response.items.length > 0) {
          console.log("First item structure:", response.items[0]);
          console.log("Available fields in first item:", Object.keys(response.items[0]));
        }
        
        // Transform API response to match the expected format
        const transformedData = response.items?.map((item: any) => {
          // Normalize snake_case and different APIs to the keys used by Applications sidebar
          const name = item.name || item.entitlementName || item.entitlementname || "N/A";
          const description = item.description || item.entitlementDescription || item.details || item.summary || item.comment || item.notes || "N/A";
          const entType = item["Ent Type"] || item.entitlementType || item.entitlementtype || item.type || "N/A";
          const appName = item["App Name"] || item.applicationName || item.applicationname || item.appName || "N/A";
          const entOwner = item["Ent Owner"] || item.entitlementOwner || item.entitlementowner || item.owner || "N/A";
          const appOwner = item["App Owner"] || item.applicationowner || item.appOwner || "N/A";
          const businessObjective = item["Business Objective"] || item.businessObjective || item.business_objective || "N/A";
          const complianceType = item["Compliance Type"] || item.complianceType || item.regulatory_scope || "N/A";
          const dataClassification = item["Data Classification"] || item.data_classification || "N/A";
          const businessUnit = item["Business Unit"] || item.businessunit_department || "N/A";
          const risk = item["Risk"] || item.risk || item.riskLevel || "N/A";
          const requestable = (item.requestable ?? item["Requestable"]) ? "Yes" : "No";
          const certifiable = (item.certifiable ?? item["Certifiable"]) ? "Yes" : "No";
          const lastReviewed = item["Last Reviewed on"] || item.last_reviewed_on || item.lastReviewedOn || item.last_reviewed || "N/A";
          const lastSync = item["Last Sync"] || item.last_sync || item.lastSync || "N/A";
          const createdOn = item["Created On"] || item.created_on || item.createdOn || item.createdDate || item.createddate || "N/A";
          const reviewSchedule = item["Review Schedule"] || item.review_schedule || item.reviewSchedule || "N/A";
          const accessScope = item["Access Scope"] || item.access_scope || item.accessScope || "N/A";
          const dynamicTag = item["Dynamic Tag"] || item.tags || item.dynamicTag || "N/A";
          const revokeOnDisable = (item["Revoke on Disable"] ?? item.revoke_on_disable ?? item.revokeOnDisable) ? "Yes" : "No";
          const sharedPwd = item["Shared Pwd"] ?? item.shared_pwd ?? item.sharedPassword;
          const sharedPwdText = (sharedPwd === true || sharedPwd === "true") ? "Yes" : (sharedPwd === false || sharedPwd === "false") ? "No" : (sharedPwd || "N/A");
          const mfaStatus = item["MFA Status"] || item.mfa_status || item.mfaStatus || "N/A";
          const hierarchy = item["Hierarchy"] || item.hierarchy || "N/A";
          const preReq = item["Pre- Requisite"] || item.prerequisite || "N/A";
          const preReqDetails = item["Pre-Requisite Details"] || item.prerequisite_details || item.prerequisiteDetails || "N/A";
          const totalAssignments = item["Total Assignments"] || item.totalAssignments || item.assignmentCount || item.totalassignmentstousers || 0;
          const assignment = item["assignment"] || item.assignment || item.assigned_to || item.assignedTo || "N/A";
          const licenseType = item["License Type"] || item.license_type || "N/A";
          const toxicCombination = item["SOD Check"] || item.toxic_combination || item.sodCheck || "N/A";
          const provisionerGroup = item["Provisioner Group"] || item.provisioner_group || "N/A";
          const provisioningSteps = item["Provisioning Steps"] || item.provisioning_steps || "N/A";
          const provisioningMechanism = item["Provisioning Mechanism"] || item.provisioning_mechanism || "N/A";
          const autoAssignPolicy = item["Auto Assign Access Policy"] || item.auto_assign_access_policy || "N/A";
          const policyDefinition = item.policy_definition || undefined;
          const actionOnNativeChange = item["Action on Native Change"] || item.action_on_native_change || "N/A";
          const accountTypeRestriction = item["Account Type Restriction"] || item.account_type_restriction || "N/A";
          const nonPersistentAccess = item["Non Persistent Access"] || item.non_persistent_access || "N/A";
          const costCenter = item["Cost Center"] || item.cost_center || "N/A";
          const privileged = item["Privileged"] || item.privileged || "N/A";
          const auditComments = item["Audit Comments"] || item.audit_comments || "N/A";

          // Try to derive entitlementId from multiple places (including metadata JSON)
          let entitlementId = item.entitlementid || item.entitlementId;
          if (!entitlementId && typeof item.metadata === 'string') {
            try {
              const meta = JSON.parse(item.metadata);
              entitlementId = meta?.entitlementId || meta?.entitlementid || entitlementId;
            } catch {}
          }
          
          return {
            // Fields used by grid columns
            entitlementName: name,
            description,
            type: entType,
            risk,
            applicationName: appName,
            assignment,
            "Last Sync": lastSync,
            "Last Reviewed on": lastReviewed,
            "Total Assignments": totalAssignments,
            Requestable: requestable,
            Certifiable: certifiable,
            "SOD Check": toxicCombination,
            Hierarchy: hierarchy,
            "Pre- Requisite": preReq,
            "Pre-Requisite Details": preReqDetails,
            "Revoke on Disable": revokeOnDisable,
            "Shared Pwd": sharedPwdText,
            "Capability/Technical Scope": item.capabilityScope || "N/A",
            "Business Objective": businessObjective,
            "Compliance Type": complianceType,
            "Access Scope": accessScope,
            Reviewed: item.reviewed ? "Yes" : "No",
            "Dynamic Tag": Array.isArray(dynamicTag) ? dynamicTag.join(", ") : dynamicTag,
            "MFA Status": mfaStatus,
            "Review Schedule": reviewSchedule,
            "Ent Owner": entOwner,
            "App Owner": appOwner,
            "Created On": createdOn,
            "Privileged": privileged,
            "Audit Comments": auditComments,
            // Additional fields used in Applications-style sidebar
            "Ent Name": name,
            "App Name": appName,
            "Ent Description": description,
            "Business Unit": businessUnit,
            "Data Classification": dataClassification,
            "License Type": licenseType,
            "Provisioner Group": provisionerGroup,
            "Provisioning Steps": provisioningSteps,
            "Provisioning Mechanism": provisioningMechanism,
            "Auto Assign Access Policy": autoAssignPolicy,
            "Action on Native Change": actionOnNativeChange,
            "Policy Definition": policyDefinition,
            "Account Type Restriction": accountTypeRestriction,
            "Non Persistent Access": nonPersistentAccess,
            // passthrough ids
            entitlementId,
            appInstanceId: item.appinstanceid || item.appInstanceId,
            catalogId: item.catalogid || item.catalogId,
          };
        }) || [];
        
        // Debug: Log the final transformed data
        console.log("Transformed data:", transformedData);
        if (transformedData.length > 0) {
          console.log("First transformed item:", transformedData[0]);
          console.log("Description in first item:", transformedData[0].description);
        }
        
        // Force add some test data if no data is returned
        if (transformedData.length === 0) {
          console.log("No data returned, adding test data");
          const testData = [{
            entitlementName: "Test Entitlement 1",
            description: "This is a test description to verify the UI is working",
            type: "Test",
            risk: "Low",
            applicationName: "Test App",
            assignment: "Direct",
            "Last Sync": "2024-01-15",
            "Last Reviewed on": "2024-01-10",
            "Total Assignments": 5,
            Requestable: "Yes",
            Certifiable: "Yes",
            "SOD Check": "Passed",
            Hierarchy: "Level 1",
            "Pre- Requisite": "No",
            "Pre-Requisite Details": "None",
            "Revoke on Disable": "Yes",
            "Shared Pwd": "No",
            "Capability/Technical Scope": "Test Scope",
            "Business Objective": "Test Objective",
            "Compliance Type": "Test Compliance",
            "Access Scope": "Test Scope",
            Reviewed: "Yes",
            "Dynamic Tag": "Test",
            "MFA Status": "Required",
            "Review Schedule": "Monthly",
            "Ent Owner": "Test Owner",
            "Created On": "2024-01-01",
          }, {
            entitlementName: "HIGH RISK Test Entitlement",
            description: "This is a HIGH RISK test entitlement that should have red background and be clickable",
            type: "High Risk Test",
            risk: "High",
            applicationName: "High Risk App",
            assignment: "Direct",
            "Last Sync": "2024-01-15",
            "Last Reviewed on": "2024-01-10",
            "Total Assignments": 2,
            Requestable: "No",
            Certifiable: "Yes",
            "SOD Check": "Failed",
            Hierarchy: "Level 3",
            "Pre- Requisite": "Yes",
            "Pre-Requisite Details": "Security Clearance Required",
            "Revoke on Disable": "Yes",
            "Shared Pwd": "No",
            "Capability/Technical Scope": "High Risk Scope",
            "Business Objective": "High Risk Objective",
            "Compliance Type": "SOX",
            "Access Scope": "Global",
            Reviewed: "No",
            "Dynamic Tag": "High Risk",
            "MFA Status": "Required",
            "Review Schedule": "Weekly",
            "Ent Owner": "Security Manager",
            "Created On": "2024-01-01",
          }];
          setRowData(testData);
        } else {
          setRowData(transformedData);
        }
        
      } catch (error) {
        console.error("Error fetching catalog entitlements:", error);
        setApiError(error instanceof Error ? error.message : "Failed to fetch entitlements");
        // Set fallback data in case of error
        const fallbackData = [{
          entitlementName: "Fallback Test Entitlement",
          description: "This is fallback test data to verify the UI works even when API fails",
          type: "Fallback",
          risk: "Medium",
          applicationName: "Fallback App",
          assignment: "Direct",
          "Last Sync": "2024-01-15",
          "Last Reviewed on": "2024-01-10",
          "Total Assignments": 3,
          Requestable: "Yes",
          Certifiable: "Yes",
          "SOD Check": "Passed",
          Hierarchy: "Level 2",
          "Pre- Requisite": "No",
          "Pre-Requisite Details": "None",
          "Revoke on Disable": "Yes",
          "Shared Pwd": "No",
          "Capability/Technical Scope": "Fallback Scope",
          "Business Objective": "Fallback Objective",
          "Compliance Type": "Fallback Compliance",
          "Access Scope": "Fallback Scope",
          Reviewed: "Yes",
          "Dynamic Tag": "Fallback",
          "MFA Status": "Required",
          "Review Schedule": "Monthly",
          "Ent Owner": "Fallback Owner",
          "Created On": "2024-01-01",
        }];
        setRowData(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [appInstanceId, reviewerId]);


  const handleRowClick = (event: any) => {
    const entitlementData = {
      entitlementName: event.data.entitlementName || "N/A",
      appName: event.data.applicationName || "N/A",
      appOwner: event.data["Ent Owner"] || "N/A",
      risk: event.data.risk || "N/A",
      totalAssignments: event.data["Total Assignments"] || 0,
      lastSync: event.data["Last Sync"] || "N/A",
      description:event.data['description']
    };
    
    console.log('Row clicked - Entitlement data:', entitlementData);
    
    // Store entitlement data in localStorage for HeaderContent
    localStorage.setItem('entitlementDetails', JSON.stringify(entitlementData));
    
    // Dispatch custom event
    const customEvent = new CustomEvent('entitlementDataChange', {
      detail: entitlementData
    });
    window.dispatchEvent(customEvent);
    console.log('Custom event dispatched from catalog page');
  };

  const handleHighRiskClick = async (data: any) => {
    console.log('High-risk entitlement clicked:', data);
    
    // Set the high-risk data and open the sidebar
    setHighRiskData(data);
    setIsHighRiskSidebarOpen(true);
    setPolicyRiskLoading(true);
    setPolicyRiskError(null);
    setPolicyRiskData(null);
    
    // Close other sidebars if open
    setIsSidePanelOpen(false);
    setNodeData(null);

    try {
      const entitlementId = data?.entitlementId || data?.entitlementid;
      if (entitlementId) {
        const resp = await fetch(`https://preview.keyforge.ai/entities/api/v1/ACMECOM/policyrisk/entitlement/11a2af37-bf8d-46c5-b18e-ed0d41e96490`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        setPolicyRiskData(json);
      } else {
        setPolicyRiskError('Missing entitlementId');
      }
    } catch (e: any) {
      console.error('Policy risk fetch failed:', e);
      setPolicyRiskError(e?.message || 'Failed to load policy risk');
    } finally {
      setPolicyRiskLoading(false);
    }
  };

  useEffect(() => {
    if (policyRiskData && Array.isArray(policyRiskData.items)) {
      const today = new Date().toISOString().slice(0, 10);
      setPolicySelections(
        policyRiskData.items.map(() => ({ controls: "", accepted: "Under Review", lastUpdate: today }))
      );
      setPolicyOpen(policyRiskData.items.map(() => false));
    } else {
      setPolicySelections([]);
      setPolicyOpen([]);
    }
  }, [policyRiskData]);

  const closeHighRiskSidebar = () => {
    setIsHighRiskSidebarOpen(false);
    setHighRiskData(null);
  };

  // Close sidebar on Escape, align with hooks order rules (must be before conditional returns)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidePanelOpen(false);
    };
    if (isSidePanelOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidePanelOpen]);

  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "entitlementName",
        headerName: "Entitlement",
        width: 950,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (params: ICellRendererParams) => {
          const riskVal = (params.data?.risk || "").toString().toLowerCase();
          const isHighRisk = riskVal === "high" || riskVal === "critical";
          
          return (
            <div className="flex flex-col">
              {/* Row 1: entitlement name */}
              <div className="font-semibold flex items-center gap-2">
                {isHighRisk ? (
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-red-200"
                        onClick={() => handleHighRiskClick(params.data)}>
                    {params.value}
                  </span>
                ) : (
                  <span>{params.value}</span>
                )}
              </div>

              {/* Row 2: full-width description */}
              <div className="text-gray-600 text-sm w-full z-index-1 mt-1">
                {params.data["description"] || `Test description for ${params.value}`}
              </div>
            </div>
          );
        },
      },
      // { field:"Ent Description", headerName:"Entitlement Description", flex:2},
      { field: "type", headerName: "Type", width: 130 },
      { 
        field: "risk", 
        headerName: "Risk", 
        width: 120,
        hide:true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value;
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
        width: 150,
        valueFormatter: (params: any) => formatDateMMDDYY(params.value),
      },
      {
        field: "Last Reviewed on",
        headerName: "Last Reviewed",
        width: 200,
        valueFormatter: (params: any) => formatDateMMDDYY(params.value),
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
        width: 100,
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
        suppressHeaderMenuButton: true,
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
        width: 700,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (params: ICellRendererParams) => {
          const riskVal = (params.data?.risk || "").toString().toLowerCase();
          const isHighRisk = riskVal === "high" || riskVal === "critical";
          
          return (
            <div className="flex flex-col">
              {/* Row 1: entitlement name */}
              <div className="font-semibold flex items-center gap-2">
                {isHighRisk ? (
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-red-200"
                        onClick={() => handleHighRiskClick(params.data)}>
                    {params.value}
                  </span>
                ) : (
                  <span>{params.value}</span>
                )}
              </div>

              <div className="text-gray-600 text-sm w-full mt-1">
                {params.data["description"] || `Test description for ${params.value}`}
              </div>
            </div>
          );
        },
      },
      { field: "type", headerName: "Type", width: 120 },
      { field: "applicationName", headerName: "Application", width: 120 },
      {
        field: "risk",
        headerName: "Risk",
        width: 120,
        hide:true,
        cellRenderer: (params: ICellRendererParams) => {
          const risk = params.value;
          const riskColor =
            risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
          return <span className="font-medium" style={{ color: riskColor }}>{risk}</span>;
        },
      },
      { field: "applicationName", headerName: "Application", width: 150 },
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
    [error, lastAction, nodeData, isSidePanelOpen]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  if (loading) {
    return (
      <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
        <div className="relative mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlements</h1>
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
        <div className="relative mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlements</h1>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-2">Error Loading Entitlements</p>
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
    <div className={`ag-theme-alpine transition-all duration-300 ease-in-out ${isSidePanelOpen ? "mr-[500px]" : "mr-0"}`} style={{ height: "calc(100vh - 120px)", width: "100%" }}>
      <div className="relative mb-4 flex items-center justify-between">
        <div>
        <h1 className="text-xl font-bold pb-2 text-blue-950">Entitlements</h1>
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
          <select
            value={selectedAppFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedAppFilter(val);
              if (!gridApi) return;
              if (val === "All") {
                const current = gridApi.getFilterModel() || {} as any;
                delete (current as any)["applicationName"];
                gridApi.setFilterModel(Object.keys(current).length ? current : null);
              } else {
                const model = gridApi.getFilterModel() || {} as any;
                (model as any)["applicationName"] = {
                  filterType: "text",
                  type: "equals",
                  filter: val,
                } as any;
                gridApi.setFilterModel(model);
              }
            }}
            className="border border-gray-300 rounded px-3 h-9 text-sm w-64"
          >
            {applicationOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        <Tabs
          tabs={tabsDataEnt}
          activeClass="bg-[#2563eb] text-white text-sm rounded-sm"
          buttonClass="h-10 -mt-1 w-30"
          className="border border-gray-300 w-61 h-8 rounded-md flex"
          activeIndex={entTabIndex}
          onChange={setEntTabIndex}
        />
        </div>
      </div>
      {/* <div className="flex justify-end mb-2">
        <button className="p-2 hover:bg-gray-300 rounded-md transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div> */}
      <div style={{ height: "calc(100% - 60px)", width: "100%" }}>
        <AgGridReact
          rowData={filteredRowData}
          columnDefs={entTabIndex === 0 ? colDefs : underReviewColDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="multiple"
          onRowClicked={handleRowClick}
          getRowHeight={() => 80}
          suppressRowTransform={true}
          getRowId={(params: any) => {
            const d = params.data || {};
            return (
              d.entitlementId ||
              d.entitlementid ||
              d.catalogId ||
              `${d.applicationName || ''}|${d.entitlementName || d.name || ''}`
            );
          }}
          onGridReady={(params: any) => setGridApi(params.api)}
        />
      </div>
      
      
      {/* Info Sidebar for Under Review tab (mirrors Applications Entitlements sidebar) */}
      {isSidePanelOpen && nodeData && entTabIndex === 1 && (
        <div className="fixed top-0 right-0 h-180 bg-white shadow-xl z-50 overflow-y-auto overflow-x-hidden border-l border-gray-200 mt-16" style={{ width: 500 }}>
          <div className="p-4 border-b bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Entitlement Details</h2>
                <div className="mt-2">
                  <span className="text-xs uppercase text-gray-500">Entitlement Name:</span>
                  <div className="text-md font-medium break-words break-all whitespace-normal max-w-full">
                    {nodeData?.["Ent Name"] || nodeData?.entitlementName || nodeData?.applicationName || "-"}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xs uppercase text-gray-500">Description:</span>
                  <p className="text-sm text-gray-700 break-words break-all whitespace-pre-wrap max-w-full">
                    {nodeData?.["Ent Description"] || nodeData?.description || nodeData?.details || "-"}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSidePanelOpen(false)} className="text-gray-600 hover:text-gray-800" aria-label="Close panel">
                <X size={24} />
              </button>
            </div>
            <div className="mt-3 flex space-x-2">
              <button onClick={handleApprove} title="Approve" aria-label="Approve entitlement" className={`p-1 rounded transition-colors duration-200 ${lastAction === "Approve" ? "bg-green-500" : "hover:bg-green-100"}`}>
                <CircleCheck className="cursor-pointer" color="#1c821cff" strokeWidth="1" size="32" fill={lastAction === "Approve" ? "#1c821cff" : "none"} />
              </button>
              <button onClick={handleRevoke} title="Revoke" aria-label="Revoke entitlement" className={`p-1 rounded ${nodeData?.status === "Rejected" ? "bg-red-100" : ""}`}>
                <CircleX className="cursor-pointer hover:opacity-80 transform rotate-90" color="#FF2D55" strokeWidth="1" size="32" fill={nodeData?.status === "Rejected" ? "#FF2D55" : "none"} />
              </button>
              <button onClick={handleComment} title="Comment" aria-label="Add comment" className="p-1 rounded">
                <svg width="30" height="30" viewBox="0 0 32 32" className="cursor-pointer hover:opacity-80"><path d="M0.700195 0V19.5546H3.5802V25.7765C3.57994 25.9525 3.62203 26.1247 3.70113 26.2711C3.78022 26.4176 3.89277 26.5318 4.02449 26.5992C4.15621 26.6666 4.30118 26.6842 4.44101 26.6498C4.58085 26.6153 4.70926 26.5304 4.80996 26.4058C6.65316 24.1232 10.3583 19.5546 10.3583 19.5546H25.1802V0H0.700195ZM2.1402 1.77769H23.7402V17.7769H9.76212L5.0202 23.6308V17.7769H2.1402V1.77769ZM5.0202 5.33307V7.11076H16.5402V5.33307H5.0202ZM26.6202 5.33307V7.11076H28.0602V23.11H25.1802V28.9639L20.4383 23.11H9.34019L7.9002 24.8877H19.8421C19.8421 24.8877 23.5472 29.4563 25.3904 31.7389C25.4911 31.8635 25.6195 31.9484 25.7594 31.9828C25.8992 32.0173 26.0442 31.9997 26.1759 31.9323C26.3076 31.8648 26.4202 31.7507 26.4993 31.6042C26.5784 31.4578 26.6204 31.2856 26.6202 31.1096V24.8877H29.5002V5.33307H26.6202ZM5.0202 8.88845V10.6661H10.7802V8.88845H5.0202ZM5.0202 12.4438V14.2215H19.4202V12.4438H5.0202Z" fill="#2684FF"/></svg>
              </button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {/* Accordions copied */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
              <button className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md" onClick={() => setSectionsOpen((s:any) => ({...s, general: !s.general}))}>
                {sectionsOpen.general ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />} General
              </button>
              {sectionsOpen.general && (
                <div className="p-4 space-y-2">
                  <div className="flex space-x-4 text-sm text-gray-700"><div className="flex-1"><strong>Ent Type:</strong> {nodeData?.["Ent Type"] || nodeData?.type || "N/A"}</div><div className="flex-1"><strong>#Assignments:</strong> {nodeData?.["Total Assignments"] ?? "N/A"}</div></div>
                  <div className="flex space-x-4 text-sm text-gray-700"><div className="flex-1"><strong>App Name:</strong> {nodeData?.["App Name"] || nodeData?.applicationName || "N/A"}</div><div className="flex-1"><strong>Tag(s):</strong> {nodeData?.["Dynamic Tag"] || "N/A"}</div></div>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
              <button className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md" onClick={() => setSectionsOpen((s:any) => ({...s, business: !s.business}))}>
                {sectionsOpen.business ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />} Business
              </button>
              {sectionsOpen.business && (
                <div className="p-4 space-y-2 text-sm text-gray-700">
                  <div><strong>Objective:</strong> {nodeData?.["Business Objective"] || "N/A"}</div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Business Unit:</strong> {nodeData?.["Business Unit"] || "N/A"}</div><div className="flex-1"><strong>Business Owner:</strong> {nodeData?.["Ent Owner"] || "N/A"}</div></div>
                  <div><strong>Regulatory Scope:</strong> {nodeData?.["Compliance Type"] || "N/A"}</div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Data Classification:</strong> {nodeData?.["Data Classification"] || "N/A"}</div><div className="flex-1"><strong>Cost Center:</strong> {nodeData?.["Cost Center"] || "N/A"}</div></div>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
              <button className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md" onClick={() => setSectionsOpen((s:any) => ({...s, technical: !s.technical}))}>
                {sectionsOpen.technical ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />} Technical
              </button>
              {sectionsOpen.technical && (
                <div className="p-4 space-y-2 text-sm text-gray-700">
                  <div className="flex space-x-4"><div className="flex-1"><strong>Created On:</strong> {nodeData?.["Created On"] || "N/A"}</div><div className="flex-1"><strong>Last Sync:</strong> {nodeData?.["Last Sync"] || "N/A"}</div></div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>App Name:</strong> {nodeData?.["App Name"] || nodeData?.applicationName || "N/A"}</div><div className="flex-1"><strong>App Instance:</strong> {nodeData?.["App Instance"] || "N/A"}</div></div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>App Owner:</strong> {nodeData?.["App Owner"] || "N/A"}</div><div className="flex-1"><strong>Ent Owner:</strong> {nodeData?.["Ent Owner"] || "N/A"}</div></div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Hierarchy:</strong> {nodeData?.["Hierarchy"] || "N/A"}</div><div className="flex-1"><strong>MFA Status:</strong> {nodeData?.["MFA Status"] || "N/A"}</div></div>
                  <div><strong>Assigned to/Member of:</strong> {nodeData?.["assignment"] || "N/A"}</div>
                  <div><strong>License Type:</strong> {nodeData?.["License Type"] || "N/A"}</div>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
              <button className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md" onClick={() => setSectionsOpen((s:any) => ({...s, security: !s.security}))}>
                {sectionsOpen.security ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />} Security
              </button>
              {sectionsOpen.security && (
                <div className="p-4 space-y-2 text-sm text-gray-700">
                  <div className="flex space-x-4"><div className="flex-1"><strong>Risk:</strong> {nodeData?.["Risk"] || nodeData?.risk || "N/A"}</div><div className="flex-1"><strong>Certifiable:</strong> {nodeData?.["Certifiable"] || "N/A"}</div></div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Revoke on Disable:</strong> {nodeData?.["Revoke on Disable"] || "N/A"}</div><div className="flex-1"><strong>Shared Pwd:</strong> {nodeData?.["Shared Pwd"] || "N/A"}</div></div>
                  <div><strong>SoD/Toxic Combination:</strong> {nodeData?.["SOD Check"] || "N/A"}</div>
                  <div><strong>Access Scope:</strong> {nodeData?.["Access Scope"] || "N/A"}</div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Review Schedule:</strong> {nodeData?.["Review Schedule"] || "N/A"}</div><div className="flex-1"><strong>Last Reviewed On:</strong> {nodeData?.["Last Reviewed on"] || "N/A"}</div></div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Privileged:</strong> {nodeData?.["Privileged"] || "N/A"}</div><div className="flex-1"><strong>Non Persistent Access:</strong> {nodeData?.["Non Persistent Access"] || "N/A"}</div></div>
                  <div><strong>Audit Comments:</strong> {nodeData?.["Audit Comments"] || "N/A"}</div>
                  <div><strong>Account Type Restriction:</strong> {nodeData?.["Account Type Restriction"] || "N/A"}</div>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
              <button className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md" onClick={() => setSectionsOpen((s:any) => ({...s, lifecycle: !s.lifecycle}))}>
                {sectionsOpen.lifecycle ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />} Lifecycle
              </button>
              {sectionsOpen.lifecycle && (
                <div className="p-4 space-y-2 text-sm text-gray-700">
                  <div className="flex space-x-4"><div className="flex-1"><strong>Requestable:</strong> {nodeData?.["Requestable"] || "N/A"}</div><div className="flex-1"><strong>Pre-Requisite:</strong> {nodeData?.["Pre- Requisite"] || "N/A"}</div></div>
                  <div><strong>Pre-Req Details:</strong> {nodeData?.["Pre-Requisite Details"] || "N/A"}</div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Auto Assign Access Policy:</strong> {nodeData?.["Auto Assign Access Policy"] || "N/A"}</div><div className="flex-1"><strong>Provisioner Group:</strong> {nodeData?.["Provisioner Group"] || "N/A"}</div></div>
                  <div className="flex space-x-4"><div className="flex-1"><strong>Provisioning Steps:</strong> {nodeData?.["Provisioning Steps"] || "N/A"}</div><div className="flex-1"><strong>Provisioning Mechanism:</strong> {nodeData?.["Provisioning Mechanism"] || "N/A"}</div></div>
                  <div><strong>Action on Native Change:</strong> {nodeData?.["Action on Native Change"] || "N/A"}</div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setIsSidePanelOpen(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 w-full" aria-label="Close panel">Close</button>
        </div>
      )}

      {/* Policy Risk Sidebar (replaces High Risk Sidebar) */}
      {isHighRiskSidebarOpen && highRiskData && (
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out" style={{ width: 500 }}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Policy Risk Details:</h2>
                <button
                  onClick={closeHighRiskSidebar}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Policy Risk (from API) */}
              <div className="pt-4">
                {policyRiskLoading && (
                  <div className="text-sm text-gray-600">Loading policy risk…</div>
                )}
                {policyRiskError && (
                  <div className="text-sm text-red-600">{policyRiskError}</div>
                )}
                {!policyRiskLoading && !policyRiskError && policyRiskData && Array.isArray(policyRiskData.items) && policyRiskData.items.length > 0 && (
                  <div className="space-y-3">
                    {/* Main Header */}
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase text-gray-500">Policy Name:</span>
                        <span className="font-medium">{policyRiskData.items[0]?.policy_name || "-"}</span>
                  </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase text-gray-500">Risk Level:</span>
                        <span className="font-medium">{policyRiskData.items[0]?.risk_level || "-"}</span>
                </div>
                <div>
                        <div className="text-[11px] uppercase text-gray-500">Compartment ID</div>
                        <div className="font-medium break-all">{policyRiskData.items[0]?.compartment || "-"}</div>
                  </div>
                </div>
                
                    {/* Subsections per statement */}
                    {policyRiskData.items.map((it: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 rounded">
                        <button
                          className="w-full flex items-start justify-between px-2 py-2 bg-white font-semibold text-sm no-underline"
                          onClick={() => setPolicyOpen((prev) => prev.map((v, i) => i === idx ? !v : v))}
                          aria-expanded={policyOpen[idx] ? 'true' : 'false'}
                        >
                          <span className="flex-1 text-left mr-2 whitespace-pre-wrap break-words break-all text-blue-600">{it.statement || "Statement"}</span>
                          {policyOpen[idx] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        {policyOpen[idx] && (
                        <div className="p-3 text-sm space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div><strong>Risk Score:</strong> {it.risk_score ?? "-"}</div>
                            <div><strong>Risk Level:</strong> {it.risk_level || "-"}</div>
                  </div>
                <div>
                            <strong>Risk Factors:</strong>
                            <div className="text-gray-700">{it.explanation || "-"}</div>
                  </div>
                          <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                              <label className="block text-xs text-gray-500 mb-1">Mitigating Controls</label>
                              <select
                                value={policySelections[idx]?.controls || ""}
                                onChange={(e) => setPolicySelections((prev) => prev.map((s, i) => i === idx ? { ...s, controls: e.target.value } : s))}
                                className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                              >
                                <option value="">Select...</option>
                                <option>Integrated with Cloud Guard</option>
                                <option>Periodic Access Review</option>
                                <option>MFA Setup</option>
                                <option>Dynamic Group Controls</option>
                              </select>
                  </div>
                <div>
                              <label className="block text-xs text-gray-500 mb-1">Risk Accepted</label>
                              <select
                                value={policySelections[idx]?.accepted || "Under Review"}
                                onChange={(e) => setPolicySelections((prev) => prev.map((s, i) => i === idx ? { ...s, accepted: e.target.value } : s))}
                                className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                              >
                                <option>Yes</option>
                                <option>No</option>
                                <option>Under Review</option>
                              </select>
                  </div>
                </div>
                <div>
                            <label className="block text-xs text-gray-500 mb-1">Last Update</label>
                            <input
                              type="date"
                              disabled
                              value={policySelections[idx]?.lastUpdate || new Date().toISOString().slice(0,10)}
                              className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                            />
                  </div>
                </div>
                        )}
                  </div>
                    ))}
                </div>
                )}
                </div>
                
                {/* Actions removed per request */}
              </div>
              
              {/* Footer */}
              <div className="border-t p-4 bg-gray-50">
                <button
                  onClick={closeHighRiskSidebar}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        
      )}
    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-600">Loading…</div>}>
      <CatalogPageClient />
    </Suspense>
  );
}
