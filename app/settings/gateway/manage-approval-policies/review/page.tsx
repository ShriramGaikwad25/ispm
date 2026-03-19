"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, FileText, ShieldCheck, Tag, AlertCircle } from "lucide-react";

const APPROVAL_POLICY_VIEW_STORAGE_KEY = "approvalPolicyViewDraft";

type ApprovalPolicyViewData = {
  id: string;
  name: string;
  owner: string;
  description: string;
  priority: number | null;
  status: string;
  code?: string;
  businessObjectType?: string;
  workflowTemplateName?: string;
  workflowTemplateCode?: string;
  workflowTemplateDescription?: string;
  selectorScope?: string;
  selectorSummary?: string;
  createdBy?: string;
  createdAt?: string;
  validFrom?: string;
  version?: number | null;
  isActive?: boolean | null;
};

const EMPTY_DATA: ApprovalPolicyViewData = {
  id: "",
  name: "",
  owner: "",
  description: "",
  priority: null,
  status: "",
  code: "",
  businessObjectType: "",
  workflowTemplateName: "",
  workflowTemplateCode: "",
  workflowTemplateDescription: "",
  selectorScope: "",
  selectorSummary: "",
  createdBy: "",
  createdAt: "",
  validFrom: "",
  version: null,
  isActive: null,
};

function formatPriority(priority: number | null): string {
  if (priority === null || priority === undefined) return "-";
  // If backend already stores 1-4 etc., just show as is
  return String(priority);
}

export default function ApprovalPolicyReviewPage() {
  const [data, setData] = useState<ApprovalPolicyViewData>(EMPTY_DATA);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(APPROVAL_POLICY_VIEW_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as {
        id?: string;
        name?: string;
        owner?: string;
        description?: string;
        priority?: number | null;
        status?: string;
        raw?: Record<string, unknown> | null;
      };

      const raw = (parsed.raw ?? null) as Record<string, unknown> | null;

      let code = "";
      let businessObjectType = "";
      let wfName = "";
      let wfCode = "";
      let wfDescription = "";
      let selectorScope = "";
      let selectorSummary = "";
      let createdBy = "";
      let createdAt = "";
      let validFrom = "";
      let version: number | null = null;
      let isActive: boolean | null = null;

      if (raw && typeof raw === "object") {
        code = String(raw.code ?? "");
        businessObjectType = String(raw.business_object_type ?? "");
        wfName = String(raw.wftemplatename ?? raw.wftemplate_name ?? "");
        wfCode = String(raw.wftemplatecode ?? "");
        wfDescription = String(raw.wftemplatedescription ?? "");
        createdBy = String(raw.created_by ?? "");
        createdAt = String(raw.created_at ?? "");
        validFrom = String(raw.valid_from ?? "");
        version =
          raw.version !== undefined && raw.version !== null
            ? Number(raw.version)
            : null;
        if (raw.is_active !== undefined && raw.is_active !== null) {
          isActive = Boolean(raw.is_active);
        }

        const selector = raw.selector_json as
          | {
              scope?: string;
              request?: Record<string, unknown>;
              catalog?: Record<string, unknown>;
            }
          | undefined;

        if (selector) {
          selectorScope = String(selector.scope ?? "");

          const parts: string[] = [];
          if (selector.request && typeof selector.request === "object") {
            Object.entries(selector.request).forEach(([k, v]) => {
              parts.push(`Request.${k} = ${JSON.stringify(v)}`);
            });
          }
          if (selector.catalog && typeof selector.catalog === "object") {
            Object.entries(selector.catalog).forEach(([k, v]) => {
              parts.push(`Catalog.${k} = ${JSON.stringify(v)}`);
            });
          }
          selectorSummary = parts.length ? parts.join("; ") : "";
        }
      }

      const normalized: ApprovalPolicyViewData = {
        id: parsed.id ?? "",
        name: parsed.name ?? "",
        owner: parsed.owner ?? "",
        description: parsed.description ?? "",
        priority: parsed.priority ?? null,
        status: parsed.status ?? "",
        code,
        businessObjectType,
        workflowTemplateName: wfName,
        workflowTemplateCode: wfCode,
        workflowTemplateDescription: wfDescription,
        selectorScope,
        selectorSummary,
        createdBy,
        createdAt,
        validFrom,
        version,
        isActive,
      };

      setData(normalized);
      setHasData(true);
    } catch (error) {
      console.error("Unable to load approval policy review data:", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
      <div className="mx-auto w-full max-w-6xl space-y-4 py-3 px-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-semibold text-gray-900">
            Review and Submit Approval Policy
          </h1>
          {hasData && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {data.id || "Policy"}
            </span>
          )}
        </div>

        {/* Legacy back button row removed and replaced with header above */}
        {/* <div className="pt-4 px-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Approval Policies
          </button>
        </div> */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          {!hasData ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p>No approval policy selected. Please use the View action from the Manage Approval Policies page.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Approval Policy summary (matches wizard Step 4 layout) */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Approval Policy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Name</div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-900">
                      {data.name || <span className="text-gray-400">Not provided</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Owner</div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-900">
                      {data.owner || <span className="text-gray-400">Not provided</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Priority</div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-900">
                      {formatPriority(data.priority)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Status</div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-900">
                      {data.status || <span className="text-gray-400">Not provided</span>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-medium text-gray-600 mb-1">Description</div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-900 whitespace-pre-wrap">
                      {data.description || <span className="text-gray-400">Not provided</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Policy Code</div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-900">
                      {data.code || <span className="text-gray-400">Not provided</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600 mb-1">Business Object Type</div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-900">
                      {data.businessObjectType || <span className="text-gray-400">Not provided</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditions-style view, derived from selector_json */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Conditions</h4>
                {data.selectorSummary ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-700">
                      Selector Scope:{" "}
                      <span className="font-normal text-gray-900">
                        {data.selectorScope || "N/A"}
                      </span>
                    </div>
                    <div className="font-medium text-gray-600 mb-1 text-xs">
                      Selector Conditions
                    </div>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-[11px] text-gray-900 whitespace-pre-wrap">
                      {data.selectorSummary}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    No conditions defined. This policy applies when no more specific selector matches.
                  </p>
                )}
              </div>

              {/* Attached workflow, using workflowTemplate* fields */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Attached Workflow
                </h4>
                {data.workflowTemplateName ? (
                  <div className="space-y-1 text-xs text-gray-900">
                    <div className="font-medium">
                      {data.workflowTemplateName}
                      {data.workflowTemplateCode
                        ? ` (${data.workflowTemplateCode})`
                        : ""}
                    </div>
                    {data.workflowTemplateDescription && (
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {data.workflowTemplateDescription}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.businessObjectType && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700">
                          {data.businessObjectType}
                        </span>
                      )}
                      {data.version != null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700">
                          Version: {data.version}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    No workflow template details available for this policy.
                  </p>
                )}
              </div>

              {/* Technical details banner, similar to info box */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-blue-900">
                  <span className="font-semibold">Technical Details:</span>{" "}
                  Created by {data.createdBy || "N/A"} on{" "}
                  {data.createdAt || "N/A"}. Valid from{" "}
                  {data.validFrom || "N/A"}. Active flag:{" "}
                  {data.isActive == null
                    ? "N/A"
                    : data.isActive
                    ? "true"
                    : "false"}
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

