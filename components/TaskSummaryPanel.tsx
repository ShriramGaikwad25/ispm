"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import ActionButtons from "@/components/agTable/ActionButtons";

export interface TaskSummaryPanelProps {
  headerLeft: {
    primary: string;
    secondary: string;
  };
  headerRight: {
    primary: string;
    secondary: string;
  };
  riskLabel?: string;
  jobTitle?: string;
  applicationName?: string;
  reviewerId: string;
  certId: string;
  selectedRow?: any;
  onActionSuccess?: () => void;
}

const TaskSummaryPanel: React.FC<TaskSummaryPanelProps> = ({
  headerLeft,
  headerRight,
  riskLabel,
  jobTitle,
  applicationName,
  reviewerId,
  certId,
  selectedRow,
  onActionSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

  return (
    <div className="p-3 space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          History
        </button>
      </div>

      {activeTab === "overview" && (
        <>
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center space-x-2 p-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{headerLeft.primary}</p>
            <p className="text-xs text-gray-600">{headerLeft.secondary} - User</p>
          </div>
          <span className="text-gray-400 text-lg">→</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{headerRight.primary}</p>
            <p className="text-xs text-gray-600">{applicationName || headerRight.secondary} - IAM role</p>
          </div>
        </div>
      </div>

      <div className="border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-md">
        <p className="font-semibold flex items-center text-yellow-700 mb-2 text-sm">
          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
          We suggest taking a closer look at this access
        </p>
        <ul className="list-decimal list-inside text-xs text-yellow-800 space-y-1">
          <li>
            This access is {riskLabel || "critical"} risk and this user might be over-permissioned
          </li>
          {jobTitle && (
            <li>
              Users with the job title <span>{jobTitle}</span> don't usually have this access
            </li>
          )}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-700">
              <strong>{headerLeft.primary}</strong> is <strong>active</strong> in Okta
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-700">
          <p>
            {headerLeft.primary} last logged into {applicationName || headerRight.secondary} recently
          </p>
        </div>
        {riskLabel && (
          <div className="text-red-600 text-xs">
            <p>This entitlement is marked as <strong>{riskLabel}</strong> risk</p>
          </div>
        )}
        <div className="text-xs text-gray-700 space-y-0.5">
          <p>1 out of 11 users with the title {jobTitle || ""} have this entitlement</p>
          <p>1 out of 2495 users in your organization have this entitlement</p>
          <p>1 out of 13 accounts in this application have this entitlement</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-semibold text-gray-700">Should this user have this access?</h3>
          <div className="space-x-2">
            <ActionButtons
              api={{} as any}
              selectedRows={selectedRow ? [selectedRow] : []}
              context="entitlement"
              reviewerId={reviewerId}
              certId={certId}
              onActionSuccess={onActionSuccess}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Certify or recommend removing this user's access.
          <a href="#" className="text-blue-600 hover:underline ml-1">More about decisions</a>
        </p>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <input
          type="text"
          placeholder="Ask me Anything"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <button className="mt-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white">
          Submit
        </button>
      </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Approval History Section */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Approval History</h3>
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700">No approval history available</p>
                <p className="text-gray-500 mt-1">Approval history will appear here once actions are taken.</p>
              </div>
            </div>
          </div>

          {/* Access History Section */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Access History</h3>
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700">No access history available</p>
                <p className="text-gray-500 mt-1">Access history will appear here once changes are made.</p>
              </div>
            </div>
          </div>

          {/* Usage History Section */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Usage History</h3>
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700">No usage history available</p>
                <p className="text-gray-500 mt-1">Usage history will appear here once activity is recorded.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskSummaryPanel;


