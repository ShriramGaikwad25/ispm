"use client";
import { GridApi } from "ag-grid-enterprise";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  Edit2Icon,
  FileText,
  FileTextIcon,
  FolderIcon,
  InfoIcon,
  UserPlus,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ProxyActionModal from "../ProxyActionModal";
import { formatDateMMDDYY } from "@/utils/utils";
import { getEntitlementDetails } from "@/lib/api";

interface EditReassignButtonsProps<T> {
  api: GridApi;
  selectedRows: T[];
  nodeData: T;
  reviewerId: string;
  certId: string;
  context: "user" | "account" | "entitlement";
  onActionSuccess?: () => void;
}

interface User {
  username: string;
  email: string;
  role: string;
}

interface Group {
  name: string;
  email: string;
  role: string;
}

const EditReassignButtons = <T extends { status?: string }>({
  api,
  selectedRows,
  nodeData,
  reviewerId,
  certId,
  context,
  onActionSuccess,
}: EditReassignButtonsProps<T>) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // Initialize as false
  const [expandedFrames, setExpandedFrames] = useState({
    general: false,
    business: false,
    technical: false,
    security: false,
    lifecycle: false,
  });
  const [error, setError] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<User | Group | null>(
    null
  );
  const [editableFields, setEditableFields] = useState<Partial<T>>({});
  const [isLoadingEntitlementDetails, setIsLoadingEntitlementDetails] = useState(false);
  const [entitlementDetails, setEntitlementDetails] = useState<any>(null);
  const [entitlementDetailsError, setEntitlementDetailsError] = useState<string | null>(null);
  const [localNodeData, setLocalNodeData] = useState<any>(nodeData);

  // Sync localNodeData with incoming nodeData prop
  useEffect(() => {
    setLocalNodeData(nodeData);
  }, [nodeData]);

  // Helper function to map API response to nodeData fields
  const mapApiDataToNodeData = (apiData: any, originalNodeData: any) => {
    if (!apiData) return originalNodeData;
    
    return {
      ...originalNodeData,
      // Map API fields to existing nodeData structure based on actual API response
      "Ent Name": apiData.name || originalNodeData?.["Ent Name"],
      "Ent Description": apiData.description || originalNodeData?.["Ent Description"],
      "Ent Type": apiData.type || originalNodeData?.["Ent Type"],
      "App Name": apiData.applicationname || originalNodeData?.["App Name"],
      "App Instance": apiData.appinstanceid || originalNodeData?.["App Instance"],
      "App Owner": apiData.applicationowner || originalNodeData?.["App Owner"],
      "Ent Owner": apiData.entitlementowner || originalNodeData?.["Ent Owner"],
      "Business Objective": apiData.business_objective || originalNodeData?.["Business Objective"],
      "Business Unit": apiData.businessunit_department || originalNodeData?.["Business Unit"],
      "Compliance Type": apiData.regulatory_scope || originalNodeData?.["Compliance Type"],
      "Data Classification": apiData.data_classification || originalNodeData?.["Data Classification"],
      "Cost Center": apiData.cost_center || originalNodeData?.["Cost Center"],
      "Created On": apiData.created_on || originalNodeData?.["Created On"],
      "Last Sync": apiData.last_sync || originalNodeData?.["Last Sync"],
      "Hierarchy": apiData.hierarchy || originalNodeData?.["Hierarchy"],
      "MFA Status": apiData.mfa_status || originalNodeData?.["MFA Status"],
      "assignment": apiData.assigned_to || originalNodeData?.["assignment"],
      "License Type": apiData.license_type || originalNodeData?.["License Type"],
      "Risk": apiData.risk || originalNodeData?.["Risk"],
      "Certifiable": apiData.certifiable || originalNodeData?.["Certifiable"],
      "Revoke on Disable": apiData.revoke_on_disable || originalNodeData?.["Revoke on Disable"],
      "Shared Pwd": apiData.shared_pwd || originalNodeData?.["Shared Pwd"],
      "SOD Check": apiData.toxic_combination || originalNodeData?.["SOD Check"],
      "Access Scope": apiData.access_scope || originalNodeData?.["Access Scope"],
      "Review Schedule": apiData.review_schedule || originalNodeData?.["Review Schedule"],
      "Last Reviewed on": apiData.last_reviewed_on || originalNodeData?.["Last Reviewed on"],
      "Privileged": apiData.privileged || originalNodeData?.["Privileged"],
      "Non Persistent Access": apiData.non_persistent_access || originalNodeData?.["Non Persistent Access"],
      "Audit Comments": apiData.audit_comments || originalNodeData?.["Audit Comments"],
      "Account Type Restriction": apiData.account_type_restriction || originalNodeData?.["Account Type Restriction"],
      "Requestable": apiData.requestable || originalNodeData?.["Requestable"],
      "Pre- Requisite": apiData.prerequisite || originalNodeData?.["Pre- Requisite"],
      "Pre-Requisite Details": apiData.prerequisite_details || originalNodeData?.["Pre-Requisite Details"],
      "Auto Assign Access Policy": apiData.auto_assign_access_policy || originalNodeData?.["Auto Assign Access Policy"],
      "Provisioner Group": apiData.provisioner_group || originalNodeData?.["Provisioner Group"],
      "Provisioning Steps": apiData.provisioning_steps || originalNodeData?.["Provisioning Steps"],
      "Provisioning Mechanism": apiData.provisioning_mechanism || originalNodeData?.["Provisioning Mechanism"],
      "Action on Native Change": apiData.action_on_native_change || originalNodeData?.["Action on Native Change"],
      "Total Assignments": apiData.totalassignmentstousers || originalNodeData?.["Total Assignments"],
      "Dynamic Tag": apiData.tags || originalNodeData?.["Dynamic Tag"],
    };
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || selectedRows.length === 0) return;

    // Update grid rows to "Editing" status
    api.applyTransaction({
      update: selectedRows.map((row) => ({ ...row, status: "Editing" })),
    });

    // Open side panel in edit mode
    setIsSidePanelOpen(true);
    setIsEditMode(true);

    // Initialize editable fields with current localNodeData
    setEditableFields({ ...localNodeData });
  };

  const handleSidebarEdit = () => {
    setIsEditMode(true);
    setEditableFields({ ...localNodeData });
  };

  const handleReassign = () => {
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);

    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom,
        left: rect.left - 128,
      });
    }
  };

  const toggleSidePanel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If opening the sidebar, fetch entitlement details
    if (!isSidePanelOpen) {
      console.log("Opening sidebar for All tab, nodeData:", localNodeData);
      setIsLoadingEntitlementDetails(true);
      setEntitlementDetailsError(null);
      
      try {
        const appInstanceId = (localNodeData as any)?.applicationInstanceId || (localNodeData as any)?.appInstanceId;
        const entitlementId = (localNodeData as any)?.entitlementId || (localNodeData as any)?.id;
        
        if (appInstanceId && entitlementId) {
          const details = await getEntitlementDetails(appInstanceId, entitlementId);
          console.log("API Response:", details);
          setEntitlementDetails(details);
          // Update nodeData with mapped API data
          const mappedData = mapApiDataToNodeData(details, localNodeData);
          console.log("Mapped Data:", mappedData);
          // Update the grid row with the new data
          try {
            api.applyTransaction({
              update: [mappedData]
            });
            // Also update the local nodeData state
            setLocalNodeData(mappedData);
          } catch (error) {
            console.error("Error updating grid:", error);
            // Fallback: just update the local state
            setLocalNodeData(mappedData);
          }
        } else {
          setEntitlementDetailsError("Missing app instance ID or entitlement ID");
        }
      } catch (error) {
        console.error("Error fetching entitlement details:", error);
        setEntitlementDetailsError(error instanceof Error ? error.message : "Failed to fetch entitlement details");
      } finally {
        setIsLoadingEntitlementDetails(false);
      }
    }
    
    setIsSidePanelOpen((prev) => !prev);
    setIsEditMode(false); // Open in non-edit mode
    setEditableFields({}); // Reset editable fields
  };

  const toggleFrame = (frame: keyof typeof expandedFrames) => {
    setExpandedFrames((prev) => ({ ...prev, [frame]: !prev[frame] }));
  };

  const handleSaveEdits = () => {
    if (!api || (!selectedRows.length && !localNodeData)) return;

    // Update grid with edited fields
    api.applyTransaction({
      update: selectedRows.map((row) => ({
        ...row,
        ...editableFields,
        status: "Edited",
      })),
    });

    setIsSidePanelOpen(false);
    setIsEditMode(false);
    alert("Changes saved successfully");
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSidePanelOpen(false);
        setIsEditMode(false);
      }
    };
    if (isSidePanelOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidePanelOpen]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      menuButtonRef.current &&
      !menuButtonRef.current.contains(event.target as Node)
    ) {
      setIsMenuOpen(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    return date ? formatDateMMDDYY(date) || "N/A" : "N/A";
  };

  const renderSideBySideField = (
    label1: string,
    key1: string,
    value1: any,
    label2: string,
    key2: string,
    value2: any
  ) => (
    <div className="flex space-x-4 text-sm text-gray-700">
      <div className="flex-1">
        <strong>{label1}:</strong>{" "}
        {isEditMode ? (
          <input
            type="text"
            value={editableFields[key1 as keyof T] || value1 || ""}
            onChange={(e) =>
              setEditableFields((prev) => ({ ...prev, [key1]: e.target.value }))
            }
            className="form-input w-full text-sm border-gray-300 rounded"
          />
        ) : (
          value1?.toString() || "N/A"
        )}
      </div>
      <div className="flex-1">
        <strong>{label2}:</strong>{" "}
        {isEditMode ? (
          <input
            type="text"
            value={editableFields[key2 as keyof T] || value2 || ""}
            onChange={(e) =>
              setEditableFields((prev) => ({ ...prev, [key2]: e.target.value }))
            }
            className="form-input w-full text-sm border-gray-300 rounded"
          />
        ) : (
          value2?.toString() || "N/A"
        )}
      </div>
    </div>
  );

  const renderSingleField = (label: string, key: string, value: any) => (
    <div className="text-sm text-gray-700">
      <strong>{label}:</strong>{" "}
      {isEditMode ? (
        <input
          type="text"
          value={editableFields[key as keyof T] || value || ""}
          onChange={(e) =>
            setEditableFields((prev) => ({ ...prev, [key]: e.target.value }))
          }
          className="form-input w-full text-sm border-gray-300 rounded"
        />
      ) : (
        value?.toString() || "N/A"
      )}
    </div>
  );

  return (
    <div className="flex space-x-6 h-full items-center">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button onClick={handleEdit} title="Edit" aria-label="Edit selected rows">
        <Edit2Icon
          className="cursor-pointer hover:opacity-80"
          color="#2f8b57ff"
          strokeWidth="1"
          size="24"
        />
      </button>

      {/* <button
        ref={menuButtonRef}
        onClick={toggleMenu}
        title="Reassign"
        className={`cursor-pointer rounded-sm hover:opacity-80 ${
          isMenuOpen ? "bg-[#6D6E73]/20" : ""
        }`}
        aria-label="Reassign task"
      >
        <UserPlus
          color="#e32929ff"
          size="34"
          className="transform scale-[0.6]"
        />
      </button> */}

      <button
        onClick={toggleSidePanel}
        title="Info"
        className={`cursor-pointer rounded-sm hover:opacity-80 ${
          isSidePanelOpen ? "bg-[#6D6E73]/20" : ""
        }`}
        aria-label="View details"
      >
        <InfoIcon
          color="#d53d3dff"
          size="42"
          className="transform scale-[0.6]"
        />
      </button>

      <div className="relative flex items-center">
        {isMenuOpen &&
          createPortal(
            <div
              ref={menuRef}
              className="absolute bg-white border border-gray-300 shadow-lg rounded-md z-50"
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                minWidth: "160px",
                padding: "8px",
              }}
            >
              <ul className="py-2 text-sm text-gray-700">
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={handleReassign}
                >
                  Reassign Task
                </li>
              </ul>
            </div>,
            document.body
          )}

        {isSidePanelOpen &&
          createPortal(
            <div
              className="fixed top-0 right-0 h-full bg-white shadow-xl z-50 overflow-y-auto overflow-x-hidden mt-16 w-200"
              style={{ width: 500 }}
            >
              <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold mb-8 border-b p-1.5">
                      {isEditMode ? "Edit Entitlement" : "Entitlement Details"}
                    </h2>
                    {isLoadingEntitlementDetails ? (
                      <div className="mt-4 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading details...</span>
                      </div>
                    ) : entitlementDetailsError ? (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{entitlementDetailsError}</p>
                      </div>
                    ) : (
                      <>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={
                              editableFields["Ent Name" as keyof T] ||
                              (localNodeData as any)?.["Ent Name"] ||
                              ""
                            }
                            onChange={(e) =>
                              setEditableFields((prev) => ({
                                ...prev,
                                "Ent Name": e.target.value,
                              }))
                            }
                            className="form-input w-full text-md font-medium mt-2 rounded"
                          />
                        ) : (
                          <>
                          <h3 className="text-md font-semibold text-gray-600">Entitlement Name :-</h3>
                          <h4 className="text-md font-medium mt-2 break-words break-all whitespace-normal leading-snug max-w-full">
                            {(localNodeData as any)?.["Ent Name"] || 
                              (localNodeData as any)?.["entitlementName"] || 
                              "Name: -"}
                          </h4>
                          </>
                        )}
                        {isEditMode ? (
                          <textarea
                            value={
                              editableFields["Ent Description" as keyof T] ||
                              (localNodeData as any)?.["Ent Description"] ||
                              ""
                            }
                            onChange={(e) =>
                              setEditableFields((prev) => ({
                                ...prev,
                                "Ent Description": e.target.value,
                              }))
                            }
                            className="form-input w-full text-sm text-gray-600 mt-2 rounded"
                            rows={2}
                          />
                        ) : (
                          <>
                           <h3 className="text-md font-semibold text-gray-600 mt-4">Description :-</h3>
                          <p className="text-sm text-gray-600 mt-1 break-words break-all whitespace-pre-wrap max-w-full">
                            {(localNodeData as any)?.["Ent Description"] ||
                              (localNodeData as any)?.["description"] ||
                              "description: -"}
                          </p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsSidePanelOpen(false);
                      setIsEditMode(false);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                    aria-label="Close panel"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="mt-4 flex space-x-2">
                  {!isEditMode && (
                    <button
                      onClick={handleSidebarEdit}
                      className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 w-full"
                      aria-label="Edit entitlement"
                    >
                      Edit
                    </button>
                  )}
                  {isEditMode && (
                    <button
                      onClick={handleSaveEdits}
                      className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 w-full"
                      aria-label="Save edits"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* General Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center justify-between w-full text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("general")}
                  >
                    <span className="flex items-center">
                      <FolderIcon size={18} className="mr-2 text-gray-600" />
                      General
                    </span>
                    {expandedFrames.general ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-600" />
                    )}
                  </button>
                  {expandedFrames.general && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Ent Type",
                        "Ent Type",
                        (localNodeData as any)?.["Ent Type"],
                        "#Assignments",
                        "Total Assignments",
                        (localNodeData as any)?.["Total Assignments"]
                      )}
                      {renderSideBySideField(
                        "App Name",
                        "App Name",
                        (localNodeData as any)?.["App Name"],
                        "Tag(s)",
                        "Dynamic Tag",
                        (localNodeData as any)?.["Dynamic Tag"]
                      )}
                    </div>
                  )}
                </div>

                {/* Business Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full justify-between text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("business")}
                  >
                    <span className="flex items-center">
                      <FolderIcon size={18} className="mr-2 text-gray-600" />
                      Business
                    </span>
                    {expandedFrames.business ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-600" />
                    )}
                  </button>

                  {expandedFrames.business && (
                    <div className="p-4 space-y-2">
                      {renderSingleField(
                        "Objective",
                        "Business Objective",
                        (localNodeData as any)?.["Business Objective"]
                      )}
                      {renderSideBySideField(
                        "Business Unit",
                        "Business Unit",
                        (localNodeData as any)?.["Business Unit"],
                        "Business Owner",
                        "Ent Owner",
                        (localNodeData as any)?.["Ent Owner"]
                      )}
                      {renderSingleField(
                        "Regulatory Scope",
                        "Compliance Type",
                        (localNodeData as any)?.["Compliance Type"]
                      )}
                      {renderSideBySideField(
                        "Data Classification",
                        "Data Classification",
                        (localNodeData as any)?.["Data Classification"],
                        "Cost Center",
                        "Cost Center",
                        (localNodeData as any)?.["Cost Center"]
                      )}
                    </div>
                  )}
                </div>

                {/* Technical Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full justify-between text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("technical")}
                  >
                    <span className="flex items-center">
                      <FolderIcon size={18} className="mr-2 text-gray-600" />
                      Technical
                    </span>
                    {expandedFrames.technical ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-600" />
                    )}
                  </button>
                  {expandedFrames.technical && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Created On",
                        "Created On",
                        formatDate((localNodeData as any)?.["Created On"]),
                        "Last Sync",
                        "Last Sync",
                        formatDate((localNodeData as any)?.["Last Sync"])
                      )}
                      {renderSideBySideField(
                        "App Name",
                        "App Name",
                        (localNodeData as any)?.["App Name"],
                        "App Instance",
                        "App Instance",
                        (localNodeData as any)?.["App Instance"]
                      )}
                      {renderSideBySideField(
                        "App Owner",
                        "App Owner",
                        (localNodeData as any)?.["App Owner"],
                        "Ent Owner",
                        "Ent Owner",
                        (localNodeData as any)?.["Ent Owner"]
                      )}
                      {renderSideBySideField(
                        "Hierarchy",
                        "Hierarchy",
                        (localNodeData as any)?.["Hierarchy"],
                        "MFA Status",
                        "MFA Status",
                        (localNodeData as any)?.["MFA Status"]
                      )}
                      {renderSingleField(
                        "Assigned to/Member of",
                        "assignment",
                        (localNodeData as any)?.["assignment"]
                      )}
                      {renderSingleField(
                        "License Type",
                        "License Type",
                        (localNodeData as any)?.["License Type"]
                      )}
                    </div>
                  )}
                </div>

                {/* Security Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full justify-between text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("security")}
                  >
                    <span className="flex items-center">
                      <FolderIcon size={18} className="mr-2 text-gray-600" />
                      Security
                    </span>
                    {expandedFrames.security ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-600" />
                    )}
                  </button>
                  {expandedFrames.security && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Risk",
                        "Risk",
                        (localNodeData as any)?.["Risk"],
                        "Certifiable",
                        "Certifiable",
                        (localNodeData as any)?.["Certifiable"]
                      )}
                      {renderSideBySideField(
                        "Revoke on Disable",
                        "Revoke on Disable",
                        (localNodeData as any)?.["Revoke on Disable"],
                        "Shared Pwd",
                        "Shared Pwd",
                        (localNodeData as any)?.["Shared Pwd"]
                      )}
                      {renderSingleField(
                        "SoD/Toxic Combination",
                        "SOD Check",
                        (localNodeData as any)?.["SOD Check"]
                      )}
                      {renderSingleField(
                        "Access Scope",
                        "Access Scope",
                        (localNodeData as any)?.["Access Scope"]
                      )}
                      {renderSideBySideField(
                        "Review Schedule",
                        "Review Schedule",
                        (localNodeData as any)?.["Review Schedule"],
                        "Last Reviewed On",
                        "Last Reviewed on",
                        formatDate((localNodeData as any)?.["Last Reviewed on"])
                      )}
                      {renderSideBySideField(
                        "Privileged",
                        "Privileged",
                        (localNodeData as any)?.["Privileged"],
                        "Non Persistent Access",
                        "Non Persistent Access",
                        (localNodeData as any)?.["Non Persistent Access"]
                      )}
                      {renderSingleField(
                        "Audit Comments",
                        "Audit Comments",
                        (localNodeData as any)?.["Audit Comments"]
                      )}
                      {renderSingleField(
                        "Account Type Restriction",
                        "Account Type Restriction",
                        (localNodeData as any)?.["Account Type Restriction"]
                      )}
                    </div>
                  )}
                </div>

                {/* Lifecycle Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full justify-between text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("lifecycle")}
                  >
                    <span className="flex items-center">
                      <FolderIcon size={18} className="mr-2 text-gray-600" />
                      Lifecycle
                    </span>
                    {expandedFrames.lifecycle ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-600" />
                    )}
                  </button>
                  {expandedFrames.lifecycle && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Requestable",
                        "Requestable",
                        (localNodeData as any)?.["Requestable"],
                        "Pre-Requisite",
                        "Pre- Requisite",
                        (localNodeData as any)?.["Pre- Requisite"]
                      )}
                      {renderSingleField(
                        "Pre-Req Details",
                        "Pre-Requisite Details",
                        (localNodeData as any)?.["Pre-Requisite Details"]
                      )}
                      {renderSingleField(
                        "Auto Assign Access Policy",
                        "Auto Assign Access Policy",
                        (localNodeData as any)?.["Auto Assign Access Policy"]
                      )}
                      {renderSingleField(
                        "Provisioner Group",
                        "Provisioner Group",
                        (localNodeData as any)?.["Provisioner Group"]
                      )}
                      {renderSingleField(
                        "Provisioning Steps",
                        "Provisioning Steps",
                        (localNodeData as any)?.["Provisioning Steps"]
                      )}
                      {renderSingleField(
                        "Provisioning Mechanism",
                        "Provisioning Mechanism",
                        (localNodeData as any)?.["Provisioning Mechanism"]
                      )}
                      {renderSingleField(
                        "Action on Native Change",
                        "Action on Native Change",
                        (localNodeData as any)?.["Action on Native Change"]
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => {
                    setIsSidePanelOpen(false);
                    setIsEditMode(false);
                  }}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 w-full"
                  aria-label="Close panel"
                >
                  Close
                </button>
              </div>
            </div>,
            document.body
          )}
      </div>

      <ProxyActionModal
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        heading="Reassign Task"
        users={[
          { username: "john", email: "john@example.com", role: "admin" },
          { username: "jane", email: "jane@example.com", role: "user" },
        ]}
        groups={[
          { name: "admins", email: "admins@corp.com", role: "admin" },
          { name: "devs", email: "devs@corp.com", role: "developer" },
        ]}
        userAttributes={[
          { value: "username", label: "Username" },
          { value: "email", label: "Email" },
        ]}
        groupAttributes={[
          { value: "name", label: "Group Name" },
          { value: "role", label: "Role" },
        ]}
        onSelectOwner={(assignee) => {
          setSelectedAssignee(assignee);
          setIsModalOpen(false);
          if (assignee && selectedRows.length > 0) {
            api.applyTransaction({
              update: selectedRows.map((row) => ({
                ...row,
                assignee: assignee.username || assignee.name,
                status: "Reassigned",
              })),
            });
            alert(`Task reassigned to ${assignee.username || assignee.name}`);
          }
        }}
      />

      {selectedAssignee && (
        <div className="text-sm text-gray-700 mt-2">
          <strong>Assigned To:</strong>{" "}
          {Object.values(selectedAssignee).join(" | ")}
        </div>
      )}
    </div>
  );
};

export default EditReassignButtons;
