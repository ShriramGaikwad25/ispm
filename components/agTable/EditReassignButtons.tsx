"use client";
import { GridApi } from "ag-grid-enterprise";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Edit2Icon, InfoIcon, UserPlus, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ProxyActionModal from "../ProxyActionModal";

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
    general: true,
    business: true,
    technical: true,
    security: true,
    lifecycle: true,
  });
  const [error, setError] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<User | Group | null>(null);
  const [editableFields, setEditableFields] = useState<Partial<T>>({});

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

    // Initialize editable fields with current nodeData
    setEditableFields({ ...nodeData });
  };

  const handleSidebarEdit = () => {
    setIsEditMode(true);
    setEditableFields({ ...nodeData });
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

  const toggleSidePanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSidePanelOpen((prev) => !prev);
    setIsEditMode(false); // Open in non-edit mode
    setEditableFields({}); // Reset editable fields
  };

  const toggleFrame = (frame: keyof typeof expandedFrames) => {
    setExpandedFrames((prev) => ({ ...prev, [frame]: !prev[frame] }));
  };

  const handleSaveEdits = () => {
    if (!api || (!selectedRows.length && !nodeData)) return;

    // Update grid with edited fields
    api.applyTransaction({
      update: selectedRows.map((row) => ({ ...row, ...editableFields, status: "Edited" })),
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
    return date
      ? new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";
  };

  const renderSideBySideField = (label1: string, key1: string, value1: any, label2: string, key2: string, value2: any) => (
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
              className="fixed top-0 right-0 h-full w-150 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
              style={{
                transform: isSidePanelOpen ? "translateX(0)" : "translateX(100%)",
              }}
            >
              <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">
                      {isEditMode ? "Edit Entitlement" : "Entitlement Details"}
                    </h2>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editableFields["Ent Name" as keyof T] || (nodeData as any)?.["Ent Name"] || ""}
                        onChange={(e) =>
                          setEditableFields((prev) => ({ ...prev, "Ent Name": e.target.value }))
                        }
                        className="form-input w-full text-md font-medium mt-2 rounded"
                      />
                    ) : (
                      <h3 className="text-md font-medium mt-2">
                        {(nodeData as any)?.["Ent Name"] || "Name: -"}
                      </h3>
                    )}
                    {isEditMode ? (
                      <textarea
                        value={editableFields["Ent Description" as keyof T] || (nodeData as any)?.["Ent Description"] || ""}
                        onChange={(e) =>
                          setEditableFields((prev) => ({ ...prev, "Ent Description": e.target.value }))
                        }
                        className="form-input w-full text-sm text-gray-600 mt-2 rounded"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-gray-600">
                        {(nodeData as any)?.["Ent Description"] || "Ent Description: -"}
                      </p>
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
                <div className="mt-3 flex space-x-2">
                  {!isEditMode && (
                    <button
                      onClick={handleSidebarEdit}
                      className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                      aria-label="Edit entitlement"
                    >
                      Edit
                    </button>
                  )}
                  {isEditMode && (
                    <button
                      onClick={handleSaveEdits}
                      className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600"
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
                    className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("general")}
                  >
                    {expandedFrames.general ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />}
                    General
                  </button>
                  {expandedFrames.general && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Ent Type",
                        "Ent Type",
                        (nodeData as any)?.["Ent Type"],
                        "#Assignments",
                        "Total Assignments",
                        (nodeData as any)?.["Total Assignments"]
                      )}
                      {renderSideBySideField(
                        "App Name",
                        "App Name",
                        (nodeData as any)?.["App Name"],
                        "Tag(s)",
                        "Dynamic Tag",
                        (nodeData as any)?.["Dynamic Tag"]
                      )}
                    </div>
                  )}
                </div>

                {/* Business Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("business")}
                  >
                    {expandedFrames.business ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />}
                    Business
                  </button>
                  {expandedFrames.business && (
                    <div className="p-4 space-y-2">
                      {renderSingleField("Objective", "Business Objective", (nodeData as any)?.["Business Objective"])}
                      {renderSideBySideField(
                        "Business Unit",
                        "Business Unit",
                        (nodeData as any)?.["Business Unit"],
                        "Business Owner",
                        "Ent Owner",
                        (nodeData as any)?.["Ent Owner"]
                      )}
                      {renderSingleField("Regulatory Scope", "Compliance Type", (nodeData as any)?.["Compliance Type"])}
                      {renderSideBySideField(
                        "Data Classification",
                        "Data Classification",
                        (nodeData as any)?.["Data Classification"],
                        "Cost Center",
                        "Cost Center",
                        (nodeData as any)?.["Cost Center"]
                      )}
                    </div>
                  )}
                </div>

                {/* Technical Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("technical")}
                  >
                    {expandedFrames.technical ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />}
                    Technical
                  </button>
                  {expandedFrames.technical && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Created On",
                        "Created On",
                        formatDate((nodeData as any)?.["Created On"]),
                        "Last Sync",
                        "Last Sync",
                        formatDate((nodeData as any)?.["Last Sync"])
                      )}
                      {renderSideBySideField(
                        "App Name",
                        "App Name",
                        (nodeData as any)?.["App Name"],
                        "App Instance",
                        "App Instance",
                        (nodeData as any)?.["App Instance"]
                      )}
                      {renderSideBySideField(
                        "App Owner",
                        "App Owner",
                        (nodeData as any)?.["App Owner"],
                        "Ent Owner",
                        "Ent Owner",
                        (nodeData as any)?.["Ent Owner"]
                      )}
                      {renderSideBySideField(
                        "Hierarchy",
                        "Hierarchy",
                        (nodeData as any)?.["Hierarchy"],
                        "MFA Status",
                        "MFA Status",
                        (nodeData as any)?.["MFA Status"]
                      )}
                      {renderSingleField("Assigned to/Member of", "assignment", (nodeData as any)?.["assignment"])}
                      {renderSingleField("License Type", "License Type", (nodeData as any)?.["License Type"])}
                    </div>
                  )}
                </div>

                {/* Security Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("security")}
                  >
                    {expandedFrames.security ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />}
                    Security
                  </button>
                  {expandedFrames.security && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Risk",
                        "Risk",
                        (nodeData as any)?.["Risk"],
                        "Certifiable",
                        "Certifiable",
                        (nodeData as any)?.["Certifiable"]
                      )}
                      {renderSideBySideField(
                        "Revoke on Disable",
                        "Revoke on Disable",
                        (nodeData as any)?.["Revoke on Disable"],
                        "Shared Pwd",
                        "Shared Pwd",
                        (nodeData as any)?.["Shared Pwd"]
                      )}
                      {renderSingleField("SoD/Toxic Combination", "SOD Check", (nodeData as any)?.["SOD Check"])}
                      {renderSingleField("Access Scope", "Access Scope", (nodeData as any)?.["Access Scope"])}
                      {renderSideBySideField(
                        "Review Schedule",
                        "Review Schedule",
                        (nodeData as any)?.["Review Schedule"],
                        "Last Reviewed On",
                        "Last Reviewed on",
                        formatDate((nodeData as any)?.["Last Reviewed on"])
                      )}
                      {renderSideBySideField(
                        "Privileged",
                        "Privileged",
                        (nodeData as any)?.["Privileged"],
                        "Non Persistent Access",
                        "Non Persistent Access",
                        (nodeData as any)?.["Non Persistent Access"]
                      )}
                      {renderSingleField("Audit Comments", "Audit Comments", (nodeData as any)?.["Audit Comments"])}
                      {renderSingleField("Account Type Restriction", "Account Type Restriction", (nodeData as any)?.["Account Type Restriction"])}
                    </div>
                  )}
                </div>

                {/* Lifecycle Frame */}
                <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                  <button
                    className="flex items-center w-full text-left text-md font-semibold text-gray-800 p-3 bg-gray-50 rounded-t-md"
                    onClick={() => toggleFrame("lifecycle")}
                  >
                    {expandedFrames.lifecycle ? <ChevronDown size={20} className="mr-2" /> : <ChevronRight size={20} className="mr-2" />}
                    Lifecycle
                  </button>
                  {expandedFrames.lifecycle && (
                    <div className="p-4 space-y-2">
                      {renderSideBySideField(
                        "Requestable",
                        "Requestable",
                        (nodeData as any)?.["Requestable"],
                        "Pre-Requisite",
                        "Pre- Requisite",
                        (nodeData as any)?.["Pre- Requisite"]
                      )}
                      {renderSingleField("Pre-Req Details", "Pre-Requisite Details", (nodeData as any)?.["Pre-Requisite Details"])}
                      {renderSingleField("Auto Assign Access Policy", "Auto Assign Access Policy", (nodeData as any)?.["Auto Assign Access Policy"])}
                      {renderSingleField("Provisioner Group", "Provisioner Group", (nodeData as any)?.["Provisioner Group"])}
                      {renderSingleField("Provisioning Steps", "Provisioning Steps", (nodeData as any)?.["Provisioning Steps"])}
                      {renderSingleField("Provisioning Mechanism", "Provisioning Mechanism", (nodeData as any)?.["Provisioning Mechanism"])}
                      {renderSingleField("Action on Native Change", "Action on Native Change", (nodeData as any)?.["Action on Native Change"])}
                    </div>
                  )}
                </div>
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