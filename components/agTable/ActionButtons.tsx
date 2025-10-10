"use client";
import { GridApi } from "ag-grid-enterprise";
import { createPortal } from "react-dom";
import {
  CircleCheck,
  CircleOff,
  CircleX,
  Edit2Icon,
  HistoryIcon,
  MoreVertical,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Buttons from "react-multi-date-picker/components/button";
import ProxyActionModal from "../ProxyActionModal";
import DelegateActionModal from "../DelegateActionModal";
import { updateAction } from "@/lib/api";
import { useLoading } from "@/contexts/LoadingContext";
import ActionCompletedToast from "../ActionCompletedToast";
import { useActionPanel } from "@/contexts/ActionPanelContext";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import RemediateSidebar from "../RemediateSidebar";

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

interface ActionButtonsProps<T> {
  api: GridApi;
  selectedRows: T[];
  context: "user" | "account" | "entitlement";
  reviewerId: string;
  certId: string;
  viewChangeEnable?: boolean;
  onActionSuccess?: () => void; // Callback to notify parent of success
}

const ActionButtons = <T extends { status?: string }>({
  api,
  selectedRows,
  context,
  reviewerId,
  certId,
  viewChangeEnable,
  onActionSuccess,
}: ActionButtonsProps<T>): JSX.Element => {
  const { queueAction } = useActionPanel();
  const { openSidebar, closeSidebar } = useRightSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentCategory, setCommentCategory] = useState("");
  const [commentSubcategory, setCommentSubcategory] = useState("");
  const [isCommentDropdownOpen, setIsCommentDropdownOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<User | Group | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('Action completed');
  const [pendingById, setPendingById] = useState<Record<string, 'Approve' | 'Reject' | 'Pending'>>({});
  
  const { showApiLoader, hideApiLoader } = useLoading();

  // Filter out undefined/null rows (e.g., group rows can pass undefined data)
  const definedRows = (selectedRows || []).filter((r): r is T => !!r);
  // Determine if all selected rows have the same status (normalized)
  const rowStatusRaw = definedRows.length > 0 ? (definedRows[0] as any)?.status : null;
  const rowStatus = typeof rowStatusRaw === 'string' ? rowStatusRaw : (rowStatusRaw ? String(rowStatusRaw) : null);
  const normalizedStatus = (rowStatus || "").toString().trim().toLowerCase();
  // Treat approved/certified similarly; rejected/revoked similarly
  const isApproved = normalizedStatus === "approved" || normalizedStatus === "certified";
  const isRejected = normalizedStatus === "rejected" || normalizedStatus === "revoked";

  // Local pending visualization: if all selected rows have same pending action, reflect it on the button
  const selectedIds = definedRows
    .map((row: any) => row.lineItemId || row.id)
    .filter(Boolean) as string[];
  const isApprovePending = selectedIds.length > 0 && selectedIds.every((id) => pendingById[id] === 'Approve');
  const isRejectPending = selectedIds.length > 0 && selectedIds.every((id) => pendingById[id] === 'Reject');
  const isPendingReset = selectedIds.some((id) => pendingById[id] === 'Pending');
  const hasAnyPending = isApprovePending || isRejectPending || isPendingReset;

  // Check if action is Approve/Reject for entitlement context (normalized)
  const actionRaw = definedRows.length > 0 ? (definedRows[0] as any)?.action : null;
  const actionLower = (actionRaw ? String(actionRaw) : "").trim().toLowerCase();
  const isApproveAction = context === "entitlement" && actionLower === "approve";
  const isRejectAction = context === "entitlement" && actionLower === "reject";

  const approveFilled = isApprovePending || (!hasAnyPending && (isApproved || isApproveAction));
  const rejectFilled = isRejectPending || (!hasAnyPending && (isRejected || isRejectAction));

  // API call to update actions
  const updateActions = async (actionType: string, justification: string) => {
    const payload: any = {
      useraction: [],
      accountAction: [],
      entitlementAction: [],
    };

    if (context === "user") {
      payload.useraction = definedRows.map((row: any) => ({
        userId: row.id,
        actionType,
        justification,
      }));
    } else if (context === "account") {
      payload.accountAction = definedRows.map((row: any) => ({
        actionType,
        lineItemId: row.lineItemId,
        justification,
      }));
    } else if (context === "entitlement") {
      payload.entitlementAction = [
        {
          actionType,
          lineItemIds: definedRows
            .map(
              (row: any) => row.lineItemId || (row as any)?.accountLineItemId
            )
            .filter((id: any) => Boolean(id)),
          justification,
        },
      ];
    }

    try {
      // Avoid calling API with empty entitlement IDs
      const hasEntitlementIds =
        Array.isArray(payload?.entitlementAction?.[0]?.lineItemIds) &&
        payload.entitlementAction![0].lineItemIds.length > 0;

      if (context === "entitlement" && !hasEntitlementIds) {
        console.warn("No entitlement lineItemIds to send. Payload:", payload);
        setError("No entitlement selected or missing IDs.");
        return;
      }

      // Prevent double submit but no global loading overlay
      setIsActionLoading(true);

      // Do not send now; queue for submit. Adjust floating count based on toggle intent and current pending state
      const targetIds =
        context === "entitlement"
          ? ((payload.entitlementAction?.[0]?.lineItemIds as string[]) || [])
          : selectedIds;
      const isTogglingToPending = actionType === 'Pending';
      const previouslyPendingIds = targetIds.filter((id) => pendingById[id]);
      const notPreviouslyPendingIds = targetIds.filter((id) => !pendingById[id]);
      // Rules:
      // - Approve/Reject adds count only for ids not already pending
      // - Pending removes count for ids already pending; if none were pending (e.g., certified status), treat as a new change (+)
      const countDelta = isTogglingToPending
        ? (previouslyPendingIds.length > 0 ? -previouslyPendingIds.length : targetIds.length)
        : notPreviouslyPendingIds.length;

      queueAction({ reviewerId, certId, payload, count: countDelta });

      // Mark local pending state for button visuals
      setPendingById((prev) => {
        const next = { ...prev } as Record<string, 'Approve' | 'Reject' | 'Pending'>;
        if (actionType === 'Pending') {
          // Clear pending visual if user set back to Pending
          selectedIds.forEach((id) => {
            delete next[id];
          });
        } else {
          selectedIds.forEach((id) => {
            next[id] = actionType as any;
          });
        }
        return next;
      });
      
      setLastAction(actionType);
      setError(null);
      
      // End local loading state quickly (no overlay)
      setTimeout(() => {
        setIsActionLoading(false);
      }, 100);
      
      // Show success and completion messages immediately
      setCompletionMessage('Action success');
      setShowCompletionToast(true);
      // Counter is managed by queueAction. Do not refresh here; Submit handles it.
    } catch (err: any) {
      setError(`Failed to update actions: ${err.message}`);
      console.error("API error:", err);
      setIsActionLoading(false);
      throw err;
    }
  };
  useEffect(() => {
    setLastAction(null);
  }, [selectedRows]);


  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || definedRows.length === 0 || isActionLoading) return;
    
    // If already marked approve (pending state) OR underlying state approved, toggle to Pending
    if (isApprovePending || isApproved || isApproveAction) {
      await updateActions("Pending", "Reset to pending");
    } else {
      await updateActions("Approve", "Approved via UI");
    }
  };

  const handleRevoke = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || definedRows.length === 0 || isActionLoading) return;
    
    // If already marked reject (pending state) OR underlying state rejected, toggle to Pending
    if (isRejectPending || isRejected || isRejectAction) {
      await updateActions("Pending", "Reset to pending");
    } else {
      await updateActions("Reject", "Revoked via UI");
    }
  };

  const handleUndo = async (
    e: React.MouseEvent,
    originalAction: "Approve" | "Reject"
  ) => {
    e.stopPropagation();
    if (!api || definedRows.length === 0 || isActionLoading) return;
    await updateActions("Pending", `Undo ${originalAction}`);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (definedRows.length === 0) return;
    setCommentText(""); // Load existing comment into the textarea
    setCommentCategory(""); // Reset category selection
    setCommentSubcategory(""); // Reset subcategory selection
    setIsCommentDropdownOpen(false); // Reset dropdown state
    setIsCommentModalOpen(true);
  };

  const handleHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHistoryModalOpen(true);
  };

  const handleSaveComment = () => {
    if (!commentText.trim()) return;

    // Comment functionality is now handled in RemediateSidebar
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
    setCommentSubcategory(""); // Reset subcategory when category changes
    setCommentText(""); // Clear text when category changes
  };

  const handleSubcategoryChange = (subcategory: string) => {
    setCommentSubcategory(subcategory);
    setCommentText(`${commentCategory} - ${subcategory}`);
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
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const openModal = () => {
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const openDelegateModal = () => {
    setIsDelegateModalOpen(true);
    setIsMenuOpen(false);
  };

  const openRemediateSidebar = () => {
    const remediateContent = (
      <RemediateSidebar
        selectedRows={selectedRows}
        onClose={closeSidebar}
        onUpdateActions={updateActions}
        isActionLoading={isActionLoading}
      />
    );
    openSidebar(remediateContent, { widthPx: 500 });
    setIsMenuOpen(false);
  };

  return (
    <div className="flex space-x-3 h-full items-center">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        onClick={handleApprove}
        title={isApproveAction ? "Undo" : "Approve"}
        aria-label="Approve selected rows"
        disabled={isActionLoading}
        className={`p-1 rounded flex items-center justify-center ${isActionLoading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="relative inline-flex items-center justify-center w-8 h-8">
          <CircleCheck
            className={isActionLoading ? "cursor-not-allowed" : "cursor-pointer"}
            color="#1c821cff"
            strokeWidth="1"
            size="32"
            fill={approveFilled ? "#1c821cff" : "none"}
          />
          {approveFilled && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              className="absolute pointer-events-none"
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <path
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                fill="#ffffff"
              />
            </svg>
          )}
        </div>
      </button>

      <button
        onClick={handleRevoke}
        title={isRejectAction ? "Undo" : "Revoke"}
        aria-label="Revoke selected rows"
        disabled={isActionLoading}
        className={`p-1 rounded flex items-center justify-center ${isActionLoading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="inline-flex items-center justify-center w-8 h-8">
          <CircleX
            className={isActionLoading ? "cursor-not-allowed" : "cursor-pointer"}
            color="#FF2D55"
            strokeWidth="1"
            size="32"
            fill={rejectFilled ? "#FF2D55" : "none"}
          />
        </div>
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
        onClick={handleHistory}
        title="History"
        aria-label="History"
        className="p-1 rounded"
      >
        <HistoryIcon strokeWidth="1" size="32" color="#ae14f6ff" />
      </button>

      {/* {viewChangeEnable && (
        <button
          onClick={handleComment}
          title="Change view"
          aria-label="Change view"
          className="p-1 rounded"
        >
          <svg
            width="32"
            height="30.118"
            viewBox="0 0 32 30.118"
            className="cursor-pointer hover:opacity-80 transform scale-[0.6]"
          >
            <path
              fill="#35353A"
              d="M30.08 13.749H13.34a.64.64 0 0 0-.425.16.53.53 0 0 0-.175.388v15.275a.53.53 0 0 0 .175.386c.113.102.265.16.425.16h16.744a.63.63 0 0 0 .424-.16.53.53 0 0 0 .177-.386V14.296c0-.301-.269-.546-.602-.546m-4.655 13.694-9.464-.004a.32.32 0 0 1-.211-.079.26.26 0 0 1-.088-.194V15.718c0-.267.491-.38.659-.16l9.212 11.45c.137.183.134.433-.107.433M18.116 0h-16.8a.66.66 0 0 0-.425.16.6.6 0 0 0-.132.177.6.6 0 0 0-.044.209v14.746q0 .109.045.207a.6.6 0 0 0 .13.179q.085.075.196.119.109.04.23.041h6.615c.16 0 .312-.056.425-.16l5.728-3.94h4.032a.66.66 0 0 0 .425-.16.6.6 0 0 0 .13-.177.6.6 0 0 0 .045-.209V.546a.6.6 0 0 0-.043-.207.6.6 0 0 0-.132-.179.66.66 0 0 0-.425-.16M6.573 26.839h3.981a.66.66 0 0 1 .424.16.6.6 0 0 1 .132.177.6.6 0 0 1 .045.209v2.187a.6.6 0 0 1-.045.207.6.6 0 0 1-.132.179.66.66 0 0 1-.425.16H3.569a.8.8 0 0 1-.23-.041.6.6 0 0 1-.196-.119.6.6 0 0 1-.132-.177.6.6 0 0 1-.043-.211v-6.889H1.165a.64.64 0 0 1-.324-.085.56.56 0 0 1-.222-.232.51.51 0 0 1 .09-.584l3.605-3.827a.66.66 0 0 1 .913 0l3.605 3.827q.113.12.137.279a.5.5 0 0 1-.049.305.56.56 0 0 1-.22.232.64.64 0 0 1-.326.087H6.573zm17.95-23.503h-3.68a.66.66 0 0 1-.425-.16.6.6 0 0 1-.132-.177.6.6 0 0 1-.043-.209V.604q0-.109.045-.211a.6.6 0 0 1 .13-.177.66.66 0 0 1 .425-.16h6.682a.66.66 0 0 1 .427.16q.085.079.13.177a.6.6 0 0 1 .045.211v6.889h1.803q.173 0 .324.085.147.087.22.232a.51.51 0 0 1-.088.584l-3.605 3.827a.66.66 0 0 1-.913 0l-3.605-3.827a.51.51 0 0 1-.088-.584.56.56 0 0 1 .22-.232.64.64 0 0 1 .324-.087h1.803z"
            />
          </svg>
        </button>
      )} */}

      <button
        ref={menuButtonRef}
        onClick={toggleMenu}
        title="More Actions"
        className={`cursor-pointer rounded-sm hover:opacity-80 ${
          isMenuOpen ? "bg-[#6D6E73]/20" : ""
        }`}
        aria-label="More actions"
      >
        <MoreVertical
          color="#35353A"
          size="32"
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
                {/* <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={openModal}
                >
                  Proxy
                </li> */}
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={openDelegateModal}
                >
                  Delegate
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={openRemediateSidebar}
                >
                  Remediate
                </li>
              </ul>
            </div>,
            document.body
          )}
      </div>

      <ProxyActionModal
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        heading="Proxy Action"
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
        onSelectOwner={(owner) => {
          setIsModalOpen(false);
        }}
      />

      <DelegateActionModal
        isModalOpen={isDelegateModalOpen}
        closeModal={() => setIsDelegateModalOpen(false)}
        heading="Delegate Action"
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
        onSelectDelegate={(delegate) => {
          setSelectedDelegate(delegate);
          setIsDelegateModalOpen(false);
        }}
      />

      {/* Comment Modal */}
      {isCommentModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full mx-4">
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

              <div className="mb-4">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors min-w-[72px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveComment}
                  disabled={!commentText.trim()}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 transition-colors min-w-[72px] ${
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

      {/* History Modal */}
      {isHistoryModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full mx-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">History</h3>
              </div>
              <div className="mb-2">
                <textarea
                  value={"Previous History.."}
                  readOnly
                  disabled
                  className="w-full h-24 px-3 py-2 border border-gray-200 rounded-md resize-none bg-gray-100 text-gray-500"
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}


      {/* Action Completed Toast */}
      <ActionCompletedToast
        isVisible={showCompletionToast}
        message={"Action completed"}
        onClose={() => setShowCompletionToast(false)}
        duration={1500}
      />
    </div>
  );
};

export default ActionButtons;
