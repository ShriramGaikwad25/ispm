"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { optionsForRemidiate } from "@/utils/utils";
import Select from "react-select";
import { Edit2Icon } from "lucide-react";
import UserDisplayName from "./UserDisplayName";

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
  const [lockAccountChecked, setLockAccountChecked] = useState(false);
  const [modifyAccessChecked, setModifyAccessChecked] = useState(false);
  const [immediateRevokeChecked, setImmediateRevokeChecked] = useState(false);
  const [conditionalAccessChecked, setConditionalAccessChecked] =
    useState(false);
  const [conditionalEndDate, setConditionalEndDate] = useState("");
  const [conditionalJustification, setConditionalJustification] =
    useState("");
  const [dateValidationError, setDateValidationError] = useState("");
  const [showLockConfirmation, setShowLockConfirmation] = useState(false);
  const [showRevokeConfirmation, setShowRevokeConfirmation] = useState(false);
  const [modifyAccessSelectedOption, setModifyAccessSelectedOption] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [comment, setComment] = useState("");

  const definedRows = selectedRows.filter((row) => row && Object.keys(row).length > 0);

  // Get campaign expiry date from various sources
  const getCampaignExpiryDate = (): string | null => {
    // Try to get from localStorage
    try {
      const campaignSummary = localStorage.getItem("selectedCampaignSummary");
      if (campaignSummary) {
        const parsed = JSON.parse(campaignSummary);
        if (parsed.dueDate) {
          return parsed.dueDate;
        }
      }
    } catch (e) {
      // Ignore errors
    }

    // Try to get from selectedRows (check first row for common field names)
    if (definedRows.length > 0) {
      const firstRow = definedRows[0];
      return (
        firstRow?.certificationExpiration ||
        firstRow?.campaignExpiryDate ||
        firstRow?.expiryDate ||
        firstRow?.dueDate ||
        null
      );
    }

    return null;
  };

  const campaignExpiryDate = getCampaignExpiryDate();

  // Validate date when it changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    setConditionalEndDate(selectedDate);

    if (!selectedDate) {
      setDateValidationError("");
      return;
    }

    if (campaignExpiryDate) {
      const expiryDateObj = new Date(campaignExpiryDate);
      const selectedDateObj = new Date(selectedDate);
      
      // Reset time to compare only dates
      expiryDateObj.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);

      if (selectedDateObj < expiryDateObj) {
        const formattedExpiry = new Date(campaignExpiryDate).toLocaleDateString();
        setDateValidationError(
          `Date cannot be before the campaign expiry date (${formattedExpiry})`
        );
      } else {
        setDateValidationError("");
      }
    }
  };

  const isDateValid = !dateValidationError && conditionalEndDate;

  return (
    <div className="space-y-6">
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
              const userType = row?.userType || row?.employeetype || row?.tags;
              return (
                <div key={row.lineItemId || row.id || index} className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      <UserDisplayName
                        displayName={userPrimary || userSecondary || "N/A"}
                        userType={userType}
                        employeetype={row?.employeetype}
                        tags={row?.tags}
                      />
                    </p>
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

        {/* Conditional Access */}
        <div
          className={`items-center space-x-4 p-2 rounded-md ${
            conditionalAccessChecked ? "bg-gray-200" : "bg-gray-50"
          }`}
        >
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={conditionalAccessChecked}
                onChange={(e) => {
                  setConditionalAccessChecked(e.target.checked);
                  if (!e.target.checked) {
                    setConditionalEndDate("");
                    setConditionalJustification("");
                    setDateValidationError("");
                  }
                }}
                className="cursor-pointer"
              />
              <h2 className="font-semibold">Conditional Access</h2>
            </label>
            {conditionalAccessChecked && (
              <button
                onClick={async () => {
                  const justification =
                    conditionalJustification.trim() || "Conditional access";
                  const fullComment = conditionalEndDate
                    ? `Conditional access until ${conditionalEndDate} - ${justification}`
                    : justification;

                  await onUpdateActions("ConditionalAccess", fullComment);

                  // reset local state
                  setConditionalAccessChecked(false);
                  setConditionalEndDate("");
                  setConditionalJustification("");
                  setDateValidationError("");
                }}
                disabled={
                  isActionLoading ||
                  !isDateValid ||
                  !conditionalJustification.trim()
                }
                className={`rounded-sm p-2 ${
                  isActionLoading ||
                  !isDateValid ||
                  !conditionalJustification.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#15274E] text-white hover:bg-blue-900"
                }`}
              >
                {isActionLoading ? "Processing..." : "Apply"}
              </button>
            )}
          </div>
          {conditionalAccessChecked && (
            <div className="mt-3 space-y-3">
              <div>
                <span className="flex items-center mb-1">End date</span>
                <input
                  type="date"
                  value={conditionalEndDate}
                  onChange={handleDateChange}
                  min={campaignExpiryDate ? new Date(campaignExpiryDate).toISOString().split('T')[0] : undefined}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white ${
                    dateValidationError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300"
                  }`}
                />
                {dateValidationError && (
                  <p className="text-red-500 text-xs mt-1">{dateValidationError}</p>
                )}
              </div>
              <div>
                <span className="flex items-center mb-1">Justification</span>
                <textarea
                  rows={2}
                  value={conditionalJustification}
                  onChange={(e) =>
                    setConditionalJustification(e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modify Access */}
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
          {showConfirmation &&
            createPortal(
              <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30">
                <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm space-y-4 border-2 border-gray-300 ring-4 ring-blue-100" onClick={(e) => e.stopPropagation()}>
                  <p className="text-base font-medium text-gray-800">
                    Are you sure you want to modify access?
                  </p>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
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
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </div>

        {/* Lock Account */}
        <div className="items-center space-x-4 p-2 bg-gray-50 rounded-md">
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lockAccountChecked}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setLockAccountChecked(checked);
                  if (checked) {
                    setShowLockConfirmation(true);
                  }
                }}
                className="cursor-pointer"
              />
              <h2 className="font-semibold">Lock Account</h2>
            </label>
          </div>
        </div>

        {/* Immediate Revoke */}
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
                  if (checked) {
                    setShowRevokeConfirmation(true);
                  }
                }}
                className="cursor-pointer"
              />
              <h2 className="font-semibold">Immediate Revoke</h2>
            </label>
          </div>
        </div>

        {/* Lock Account Confirmation Popup */}
        {showLockConfirmation &&
          createPortal(
            <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30">
              <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm space-y-4 border-2 border-gray-300 ring-4 ring-blue-100" onClick={(e) => e.stopPropagation()}>
                <p className="text-base font-medium text-gray-800">
                  Are you sure you want to lock the account with immediate
                  effect?
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowLockConfirmation(false);
                      setLockAccountChecked(false);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await onUpdateActions(
                        "Lock",
                        "Lock account with immediate effect from Remediate"
                      );
                      setShowLockConfirmation(false);
                      setLockAccountChecked(false);
                      onClose();
                    }}
                    disabled={isActionLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActionLoading
                        ? "bg-gray-400 text-gray-100 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isActionLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Immediate Revoke Confirmation Popup */}
        {showRevokeConfirmation &&
          createPortal(
            <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30">
              <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm space-y-4 border-2 border-red-200 ring-4 ring-red-100" onClick={(e) => e.stopPropagation()}>
                <p className="text-base font-medium text-gray-800">
                  Are you sure you want to revoke access immediately?
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowRevokeConfirmation(false);
                      setImmediateRevokeChecked(false);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await onUpdateActions(
                        "Reject",
                        "Immediate revoke"
                      );
                      setShowRevokeConfirmation(false);
                      setImmediateRevokeChecked(false);
                      onClose();
                    }}
                    disabled={isActionLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActionLoading
                        ? "bg-gray-400 text-gray-100 cursor-not-allowed"
                        : "bg-[#e22f2e] text-white hover:bg-red-600"
                    }`}
                  >
                    {isActionLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
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

    </div>
  );
};

export default RemediateSidebar;
