"use client";

import React, { useState } from "react";
import { optionsForRemidiate, revokeOption } from "@/utils/utils";
import Select from "react-select";
import ToggleSwitch from "./ToggleSwitch";
import { Edit2Icon } from "lucide-react";
import ProxyActionModal from "./ProxyActionModal";

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

interface RemediateSidebarProps {
  selectedRows: any[];
  onClose: () => void;
  onUpdateActions: (actionType: string, justification: string) => Promise<void>;
  isActionLoading: boolean;
}

const RemediateSidebar: React.FC<RemediateSidebarProps> = ({
  selectedRows,
  onClose,
  onUpdateActions,
  isActionLoading,
}) => {
  const [changeAccountOwner, setChangeAccountOwner] = useState(false);
  const [sendForApproval, setSendForApproval] = useState(false);
  const [modifyAccessChecked, setModifyAccessChecked] = useState(false);
  const [immediateRevokeChecked, setImmediateRevokeChecked] = useState(false);
  const [modifyAccessSelectedOption, setModifyAccessSelectedOption] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [revokeSelection, setRevokeSelection] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [reviewerType, setReviewerType] = useState<any>(null);
  const [selectedOwner, setSelectedOwner] = useState<User | Group | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const definedRows = selectedRows.filter((row) => row && Object.keys(row).length > 0);

  const handleChangeAccountOwner = (checked: boolean) => {
    setChangeAccountOwner(checked);
    if (checked) {
      setIsModalOpen(true);
    } else {
      setSelectedOwner(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Remediate action</h2>
      </div>
      
      {/* Content */}
      <div className="space-y-6 text-sm">
        <div className="space-y-2">
          {definedRows.length > 0 ? (
            definedRows.map((row: any, index: number) => {
              const appName =
                row?.applicationName ||
                row?.application ||
                row?.appName ||
                row?.application_name ||
                row?.applicationDisplayName ||
                row?.application_display_name ||
                row?.app ||
                row?.app_display_name ||
                "N/A";
              const entName =
                row?.entitlementName ||
                row?.entitlement ||
                row?.name ||
                row?.entitlement_name ||
                "N/A";
              const userPrimary =
                row?.fullName ||
                row?.userName ||
                row?.username ||
                row?.user ||
                row?.userDisplayName ||
                row?.user_display_name ||
                "";
              const derivedEmail = (() => {
                const acc = String(row?.accountName || "");
                if (acc.includes("@")) return acc;
                return "";
              })();
              const userSecondary =
                row?.email ||
                row?.userEmail ||
                row?.user_email ||
                derivedEmail ||
                "";
              return (
                <div key={row.lineItemId || row.id || index} className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{userPrimary || userSecondary || "N/A"}</p>
                    <p className="text-gray-500 truncate">{(userPrimary || userSecondary || "N/A") + " - User"}</p>
                  </div>
                  <span className="mx-4 text-gray-400">→</span>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-medium truncate">{entName}</p>
                    <p className="text-gray-500 truncate">{appName + " - IAM role"}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 bg-gray-50 rounded-md text-gray-500">No selection</div>
          )}
        </div>
        
        <div className="items-center space-x-4 p-2 bg-gray-50 rounded-md">
          <div className="mt-4 flex gap-5">
            <span>Change Account Owner</span>
            <span className="flex gap-2 items-center">
              No
              <ToggleSwitch
                checked={changeAccountOwner}
                onChange={handleChangeAccountOwner}
              />
              Yes
            </span>
          </div>
          {selectedOwner && (
            <div className="text-sm text-gray-700 mt-2">
              <strong>Selected Owner:</strong>{" "}
              {Object.values(selectedOwner).join(" | ")}
            </div>
          )}
          <div>
            <span className="flex items-center mt-4 mb-2">
              Select Approver
            </span>
            <Select
              options={optionsForRemidiate}
              styles={{
                control: (base) => ({ ...base, fontSize: "0.875rem" }),
              }}
            />
          </div>
          <div className="mt-4 flex gap-14">
            <span>Send For Approval</span>
            <span className="flex gap-2 items-center">
              No
              <ToggleSwitch
                checked={sendForApproval}
                onChange={(checked) => setSendForApproval(checked)}
              />
              Yes
            </span>
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={async () => {
                await onUpdateActions(
                  "Approve",
                  comment || "Saved via Remediate"
                );
                onClose();
              }}
              disabled={isActionLoading}
              className={`px-2 py-1 rounded-md transition-colors ${
                isActionLoading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isActionLoading ? "Saving..." : "Save Action"}
            </button>
          </div>
        </div>
        
        <div
          className={`items-center space-x-4 p-2 rounded-md ${
            immediateRevokeChecked ? "bg-gray-200" : "bg-gray-50"
          }`}
        >
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={modifyAccessChecked}
                disabled={immediateRevokeChecked}
                onChange={(e) => setModifyAccessChecked(e.target.checked)}
                className="cursor-pointer"
              />
              <h2 className="font-semibold">Modify Access</h2>
            </label>
            {modifyAccessChecked && (
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!modifyAccessSelectedOption || isActionLoading}
                className={`cursor-pointer text-white rounded-sm p-2 ${
                  !modifyAccessSelectedOption || immediateRevokeChecked || isActionLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#15274E]"
                }`}
              >
                {isActionLoading ? "Processing..." : "Modify Access"}
              </button>
            )}
          </div>
          {modifyAccessChecked && (
            <div className="mt-2">
              <span className="flex items-center m-2">
                Select New Access
              </span>
              <Select
                options={optionsForRemidiate}
                isDisabled={immediateRevokeChecked}
                value={modifyAccessSelectedOption}
                onChange={setModifyAccessSelectedOption}
                styles={{
                  control: (base) => ({ ...base, fontSize: "0.875rem" }),
                  menu: (base) => ({ ...base, fontSize: "0.875rem" }),
                }}
              />
            </div>
          )}
          {modifyAccessChecked && (
            <div className="mt-2">
              <span className="flex items-center m-2">Comments</span>
              <div className="flex">
                <textarea
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mr-2"
                  rows={1}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                      <button
                        disabled={!comment.trim()}
                        className={`rounded-lg p-2 ${
                          comment.trim()
                            ? "bg-[#2684ff] text-white hover:bg-blue-600"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <Edit2Icon />
                      </button>
              </div>
            </div>
          )}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-md shadow-md max-w-sm space-y-4">
                <p className="text-sm">
                  Are you sure you want to modify access?
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="px-3 py-1 text-sm bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await onUpdateActions(
                        "Approve",
                        comment || "Modified access"
                      );
                      setShowConfirmation(false);
                      setModifyAccessSelectedOption(null);
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div
          className={`items-center space-x-4 p-2 rounded-md ${
            modifyAccessChecked ? "bg-gray-200" : "bg-gray-50"
          }`}
        >
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={immediateRevokeChecked}
                disabled={modifyAccessChecked}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setImmediateRevokeChecked(checked);
                  if (!checked) {
                    setRevokeSelection(null);
                    setReviewerType(null);
                    setComment("");
                  }
                }}
                className="cursor-pointer"
              />
              <h2 className="font-semibold">Immediate Revoke</h2>
            </label>
            {immediateRevokeChecked && (
              <button
                disabled={!revokeSelection}
                onClick={async () => {
                  if (
                    window.confirm(
                      "Are you sure you want to revoke access?"
                    )
                  ) {
                    await onUpdateActions(
                      "Reject",
                      comment || "Immediate revoke"
                    );
                    setRevokeSelection(null);
                  }
                }}
                className={`rounded-sm p-2 ${
                  revokeSelection
                    ? "bg-[#e22f2e] text-white hover:bg-red-600"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Revoke Access
              </button>
            )}
          </div>
          {immediateRevokeChecked && (
            <div className="mt-2">
              <span className="flex items-center m-2">Options</span>
              <Select
                options={revokeOption}
                value={revokeSelection}
                onChange={(selected) => setRevokeSelection(selected)}
                isDisabled={modifyAccessChecked}
                styles={{
                  control: (base) => ({ ...base, fontSize: "0.875rem" }),
                  menu: (base) => ({ ...base, fontSize: "0.875rem" }),
                }}
              />
            </div>
          )}
          {immediateRevokeChecked &&
            revokeSelection?.value === "Revoke post approval" && (
              <div className="mt-2">
                <span className="flex items-center m-2">
                  Select Reviewer
                </span>
                <Select
                  options={[
                    {
                      label: "2nd level reviewer",
                      value: "second_level",
                    },
                    { label: "Select custom user", value: "custom_user" },
                  ]}
                  value={reviewerType}
                  onChange={(selected) => {
                    setReviewerType(selected);
                  }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      fontSize: "0.875rem",
                    }),
                    menu: (base) => ({ ...base, fontSize: "0.875rem" }),
                  }}
                />
              </div>
            )}
          {immediateRevokeChecked && (
            <div className="mt-2">
              <span className="flex items-center m-2">Comments</span>
              <div className="flex">
                <textarea
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mr-2"
                  rows={1}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                      <button
                        disabled={!comment.trim()}
                        className={`rounded-lg p-2 ${
                          comment.trim()
                            ? "bg-[#2684ff] text-white hover:bg-blue-600"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <Edit2Icon />
                      </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer with Close Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Assign Account Owner Modal */}
      <ProxyActionModal
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        heading="Assign Account Owner"
        users={[
          { username: "john", email: "john@example.com", role: "admin" },
          { username: "jane", email: "jane@example.com", role: "user" },
        ]}
        groups={[
          { name: "IT Team", email: "it@example.com", role: "admin" },
          { name: "HR Team", email: "hr@example.com", role: "user" },
        ]}
        userAttributes={[
          { value: "username", label: "Username" },
          { value: "email", label: "Email" },
          { value: "role", label: "Role" },
        ]}
        groupAttributes={[
          { value: "name", label: "Group Name" },
          { value: "role", label: "Role" },
        ]}
        onSelectOwner={(owner) => {
          setSelectedOwner(owner);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default RemediateSidebar;
