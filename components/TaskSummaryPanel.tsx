"use client";

import React from "react";
import ActionButtons from "@/components/agTable/ActionButtons";

/** Shape of one entry from aiassist.kf_insights[] */
export interface KfInsight {
  peer_analysis?: unknown[];
  latest_decision?: {
    comments?: string;
    campaign?: string;
    reviewer?: string;
    reviewed_on?: string;
    status?: string;
  };
  risk_assessment?: {
    reason?: string;
    overall_risk?: string;
    details?: {
      metadata?: Record<string, string | null>;
      entitlement_risk_level?: string;
      high_privilege_signals?: string[];
    };
  };
  six_month_history?: {
    approved_count?: number;
    revoked_count?: number;
  };
  [key: string]: unknown;
}

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

function formatReviewDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const TaskSummaryPanel: React.FC<TaskSummaryPanelProps> = ({
  headerLeft,
  headerRight,
  applicationName,
  reviewerId,
  certId,
  selectedRow,
  onActionSuccess,
}) => {
  const insight: KfInsight | undefined = selectedRow?.aiassist?.kf_insights?.[0];

  return (
    <div className="space-y-2">
      {/* Assignment card (no border) */}
      <div className="rounded bg-blue-50/40 overflow-hidden">
        <div className="flex items-stretch gap-2 p-2 min-w-0">
          <div className="flex-1 min-w-0 rounded bg-gray-50/80 px-1.5 py-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">User</p>
            <p className="text-xs font-semibold text-gray-900 break-words leading-tight">{headerLeft.primary}</p>
            <p className="text-[10px] text-gray-500 truncate">{headerLeft.secondary}</p>
          </div>
          <div className="flex items-center shrink-0 text-gray-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 rounded bg-gray-50/80 px-1.5 py-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">IAM role</p>
            <p className="text-xs font-semibold text-gray-900 break-words leading-tight">{headerRight.primary}</p>
            <p className="text-[10px] text-gray-500 truncate">{applicationName || headerRight.secondary}</p>
          </div>
        </div>
      </div>

      {/* 1) Peer Analysis - always show when insight exists */}
      {insight && (
        <div className="rounded border border-gray-200 border-l-4 border-l-indigo-500 bg-indigo-50/40 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Peer Analysis</p>
          <div className="text-xs text-gray-700 space-y-0.5 mt-1">
            {Array.isArray(insight.peer_analysis) && insight.peer_analysis.length > 0 ? (
              insight.peer_analysis.map((entry: any, i: number) => (
                <p key={i}>
                  {entry && typeof entry === "object" && "message" in entry
                    ? String(entry.message)
                    : typeof entry === "string"
                      ? entry
                      : String(entry ?? "")}
                </p>
              ))
            ) : (
              <p className="italic text-gray-500">No peer analysis available.</p>
            )}
          </div>
        </div>
      )}

      {/* 2) Last Access Review Action */}
      {insight?.latest_decision && (
        <div className="rounded border border-gray-200 border-l-4 border-l-emerald-500 bg-emerald-50/40 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Last Access Review Action (Past Action / Latest Decision)
          </p>
          <p className="text-xs text-gray-700 mt-1">
            Access &quot;{capitalize(insight.latest_decision.status ?? "")}&quot; on &quot;
            {formatReviewDate(insight.latest_decision.reviewed_on)}&quot; by &quot;
            {insight.latest_decision.reviewer ?? ""}&quot; with comments - &quot;
            {insight.latest_decision.comments ?? ""}&quot; as part of access review campaign - &quot;
            {insight.latest_decision.campaign ?? ""}&quot;
          </p>
        </div>
      )}

      {/* 3) Access Sensitivity Risk Tag (Risk Assessment) */}
      {insight?.risk_assessment && (
        <div className="rounded border border-gray-200 border-l-4 border-l-amber-500 bg-amber-50/40 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Access Sensitivity Risk Tag (Risk Assessment)
          </p>
          <div className="text-xs text-gray-700 space-y-0.5 mt-1 font-mono break-words">
            <p>{capitalize(insight.risk_assessment.overall_risk ?? "")} Risk</p>
            {insight.risk_assessment.details?.metadata &&
              Object.entries(insight.risk_assessment.details.metadata).map(([key, val]) => (
                <p key={key}>
                  {key}: &quot;{val ?? ""}&quot;
                </p>
              ))}
            {insight.risk_assessment.details?.entitlement_risk_level != null && (
              <p>entitlement_risk_level: &quot;{insight.risk_assessment.details.entitlement_risk_level}&quot;</p>
            )}
            {insight.risk_assessment.details?.high_privilege_signals &&
              insight.risk_assessment.details.high_privilege_signals.length > 0 && (
                <p>
                  high_privilege_signals: &quot;
                  {insight.risk_assessment.details.high_privilege_signals.join("; ")}&quot;
                </p>
              )}
          </div>
        </div>
      )}

      {/* 4) Six Month History */}
      {insight?.six_month_history != null && (
        <div className="rounded border border-gray-200 border-l-4 border-l-violet-500 bg-violet-50/40 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">Six Month History</p>
          <p className="text-xs text-gray-700 mt-1">
            This item was Approved {insight.six_month_history.approved_count ?? 0} times, Revoked{" "}
            {insight.six_month_history.revoked_count ?? 0} times in the last 6 months.
          </p>
        </div>
      )}

      {/* Decision & actions */}
      <div className="rounded border border-gray-200 border-l-4 border-l-blue-600 bg-blue-50/50 p-2">
        <h3 className="text-xs font-semibold text-gray-800">Should this user have this access?</h3>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ActionButtons
            api={{} as any}
            selectedRows={selectedRow ? [selectedRow] : []}
            context="entitlement"
            reviewerId={reviewerId}
            certId={certId}
            onActionSuccess={onActionSuccess}
          />
        </div>
        <p className="text-[11px] text-gray-500">
          Certify or recommend removal. <a href="#" className="text-blue-600 hover:underline">More about decisions</a>
        </p>
      </div>
    </div>
  );
};

export default TaskSummaryPanel;


