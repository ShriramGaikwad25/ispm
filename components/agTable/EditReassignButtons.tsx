"use client";
import { GridApi } from "ag-grid-enterprise";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, CircleCheck, CircleX, Edit2Icon, InfoIcon, UserPlus, X } from "lucide-react";
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
  const [expandedFrames, setExpandedFrames] = useState({
    general: true,
    business: true,
    technical: true,
    security: true,
    lifecycle: true,
  });
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<User | Group | null>(null);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || selectedRows.length === 0) return;
    api.applyTransaction({
      update: selectedRows.map((row) => ({ ...row, status: "Editing" })),
    });
    alert(`Editing ${selectedRows.length} selected rows`);
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
  };

  const toggleFrame = (frame: keyof typeof expandedFrames) => {
    setExpandedFrames((prev) => ({ ...prev, [frame]: !prev[frame] }));
  };

  const updateActions = async (actionType: string, justification: string) => {
    const payload: any = {
      useraction: [],
      accountAction: [],
      entitlementAction: [],
    };

    if (context === "entitlement") {
      payload.entitlementAction = [
        {
          actionType,
          lineItemIds: selectedRows.length > 0
            ? selectedRows.map((row: any) => row.lineItemId)
            : [(nodeData as any)?.lineItemId].filter(Boolean),
          justification,
        },
      ];
    }

    try {
      const response = await fetch(
        `https://preview.keyforge.ai/certification/api/v1/CERTTEST/updateAction/${reviewerId}/${certId}`,
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

      // Update grid with new status
      const rowsToUpdate = selectedRows.length > 0 ? selectedRows : [nodeData].filter(Boolean);
      api.applyTransaction({
        update: rowsToUpdate.map((row) => ({ ...row, status: actionType })),
      });
      setLastAction(actionType);
      setError(null);
      if (onActionSuccess) {
        onActionSuccess();
      }
      setComment("");
      return await response.json();
    } catch (err) {
      setError(`Failed to update actions: ${err.message}`);
      console.error("API error:", err);
      throw err;
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || (!selectedRows.length && !nodeData)) return;
    await updateActions("Approve", comment || "Approved via UI");
  };

  const handleRevoke = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || (!selectedRows.length && !nodeData)) return;
    await updateActions("Reject", comment || "Revoked via UI");
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedRows.length && !nodeData) return;
    if (comment.trim()) {
      alert(`Comment added: ${comment} for ${(nodeData as any)?.["Ent Name"] || "selected rows"}`);
      setComment("");
    }
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
      if (e.key === "Escape") setIsSidePanelOpen(false);
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

  useEffect(() => {
    setLastAction(null);
  }, [selectedRows, nodeData]);

  const formatDate = (date: string | undefined) => {
    return date
      ? new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";
  };

  const renderSideBySideField = (label1: string, value1: any, label2: string, value2: any) => (
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

      <button
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
      </button>

      <button
        onClick={toggleSidePanel}
        title="Info"
        className={`cursor-pointer rounded-sm hover:opacity-80 ${
          isSidePanelOpen ? "bg-[#6D6E73]/20" : ""
        }`}
        aria-label="View details"
      >
        <InfoIcon
          color="#55544dff"
          size="34"
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
                    <h2 className="text-lg font-semibold">Entitlement Details</h2>
                    <h3 className="text-md font-medium mt-2">{(nodeData as any)?.["Ent Name"] || "Name: -"}</h3>
                    <p className="text-sm text-gray-600">{(nodeData as any)?.["Ent Description"] || "Ent Description: -"}</p>
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
                      lastAction === "Approve" ? "bg-green-500" : "hover:bg-green-100"
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
                      (nodeData as any)?.status === "Rejected" ? "bg-red-100" : ""
                    }`}
                  >
                    <CircleX
                      className="cursor-pointer hover:opacity-80 transform rotate-90"
                      color="#FF2D55"
                      strokeWidth="1"
                      size="32"
                      fill={(nodeData as any)?.status === "Rejected" ? "#FF2D55" : "none"}
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
                {/* <div className="mt-3">
                  <span className="text-sm text-gray-700">Comment:</span>
                  <div className="flex">
                    <textarea
                      className="form-input w-full text-sm border-gray-300 rounded"
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Enter comment"
                    />
                  </div>
                </div> */}
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
                        (nodeData as any)?.["Ent Type"],
                        "#Assignments",
                        (nodeData as any)?.["Total Assignments"]
                      )}
                      {renderSideBySideField(
                        "App Name",
                        (nodeData as any)?.["App Name"],
                        "Tag(s)",
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
                      {renderSingleField("Objective", (nodeData as any)?.["Business Objective"])}
                      {renderSideBySideField(
                        "Business Unit",
                        (nodeData as any)?.["Business Unit"],
                        "Business Owner",
                        (nodeData as any)?.["Ent Owner"]
                      )}
                      {renderSingleField("Regulatory Scope", (nodeData as any)?.["Compliance Type"])}
                      {renderSideBySideField(
                        "Data Classification",
                        (nodeData as any)?.["Data Classification"],
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
                        formatDate((nodeData as any)?.["Created On"]),
                        "Last Sync",
                        formatDate((nodeData as any)?.["Last Sync"])
                      )}
                      {renderSideBySideField(
                        "App Name",
                        (nodeData as any)?.["App Name"],
                        "App Instance",
                        (nodeData as any)?.["App Instance"]
                      )}
                      {renderSideBySideField(
                        "App Owner",
                        (nodeData as any)?.["App Owner"],
                        "Ent Owner",
                        (nodeData as any)?.["Ent Owner"]
                      )}
                      {renderSideBySideField(
                        "Hierarchy",
                        (nodeData as any)?.["Hierarchy"],
                        "MFA Status",
                        (nodeData as any)?.["MFA Status"]
                      )}
                      {renderSingleField("Assigned to/Member of", (nodeData as any)?.["assignment"])}
                      {renderSingleField("License Type", (nodeData as any)?.["License Type"])}
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
                        (nodeData as any)?.["Risk"],
                        "Certifiable",
                        (nodeData as any)?.["Certifiable"]
                      )}
                      {renderSideBySideField(
                        "Revoke on Disable",
                        (nodeData as any)?.["Revoke on Disable"],
                        "Shared Pwd",
                        (nodeData as any)?.["Shared Pwd"]
                      )}
                      {renderSingleField("SoD/Toxic Combination", (nodeData as any)?.["SOD Check"])}
                      {renderSingleField("Access Scope", (nodeData as any)?.["Access Scope"])}
                      {renderSideBySideField(
                        "Review Schedule",
                        (nodeData as any)?.["Review Schedule"],
                        "Last Reviewed On",
                        formatDate((nodeData as any)?.["Last Reviewed on"])
                      )}
                      {renderSideBySideField(
                        "Privileged",
                        (nodeData as any)?.["Privileged"],
                        "Non Persistent Access",
                        (nodeData as any)?.["Non Persistent Access"]
                      )}
                      {renderSingleField("Audit Comments", (nodeData as any)?.["Audit Comments"])}
                      {renderSingleField("Account Type Restriction", (nodeData as any)?.["Account Type Restriction"])}
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
                        (nodeData as any)?.["Requestable"],
                        "Pre-Requisite",
                        (nodeData as any)?.["Pre- Requisite"]
                      )}
                      {renderSingleField("Pre-Req Details", (nodeData as any)?.["Pre-Requisite Details"])}
                      {renderSingleField("Auto Assign Access Policy", (nodeData as any)?.["Auto Assign Access Policy"])}
                      {renderSingleField("Provisioner Group", (nodeData as any)?.["Provisioner Group"])}
                      {renderSingleField("Provisioning Steps", (nodeData as any)?.["Provisioning Steps"])}
                      {renderSingleField("Provisioning Mechanism", (nodeData as any)?.["Provisioning Mechanism"])}
                      {renderSingleField("Action on Native Change", (nodeData as any)?.["Action on Native Change"])}
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