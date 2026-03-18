"use client";

import React, { useEffect, useState } from "react";
import {
  Info,
  FileText,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  RotateCcw,
} from "lucide-react";

interface RequestLineItem {
  name: string;
  displayName: string;
  type: string;
  startDate: string;
  endDate: string;
  comments: string;
  hasInfoIcon?: boolean;
  hasHighRisk?: boolean;
}

interface RequestDetails {
  dateCreated: string;
  type: string;
  justification: string;
}

interface PendingApprovalDetail {
  id: string;
  beneficiaryName: string;
  requesterName: string;
  durationDays?: number;
  details: RequestDetails;
  lineItems: RequestLineItem[];
}

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    const yyyy = String(parsed.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }
  return value;
};

const toStringSafe = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const normalizeId = (value: unknown): string =>
  toStringSafe(value).trim().toLowerCase();

const toArraySafe = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).filter(
      (entry) => entry && typeof entry === "object"
    ) as any[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed as Record<string, unknown>).filter(
          (entry) => entry && typeof entry === "object"
        ) as any[];
      }
    } catch {
      // ignore invalid json string
    }
  }
  return [];
};

const PendingApprovalDetailPage = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = React.use(params);
  const [request, setRequest] = useState<PendingApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLineItems, setExpandedLineItems] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const url = "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery";
    setLoading(true);
    setError(null);

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "select * from kf_wf_get_approval_task where assignee_id = 'f558e3b2-348b-4ff3-be4c-a3c5dc8b5a91' AND task_status = 'OPEN'",
        parameters: [],
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const rows: any[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.resultSet)
          ? (data as any).resultSet
          : Array.isArray((data as any)?.rows)
          ? (data as any).rows
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : [];

        const mapped = rows.map((row) => {
          const requestId = toStringSafe(
            row.request_id ??
              row.requestId ??
              row.requestid ??
              row.req_id ??
              row.task_id ??
              row.taskId ??
              row.taskid ??
              row.id
          );
          const requesterName = toStringSafe(
            row?.requester?.displayname ??
              row.requester_name ??
              row.requestor_name ??
              row.requested_by
          );
          const beneficiaryName = toStringSafe(
            row?.beneficiary?.username ??
              row.beneficiary_name ??
              row.beneficiary ??
              row.user_name
          );
          const createdOnRaw =
            row.created_on ??
            row.createdOn ??
            row.created_at ??
            row.assigned_on ??
            row.assignedOn;
          const createdOn = formatDate(toStringSafe(createdOnRaw));
          const justification = toStringSafe(
            row.requester_justification ??
              row.comments ??
              row.comment ??
              row.remarks
          );

          const itemDetails: any[] = toArraySafe(
            row.itemdetails ?? row.itemDetails
          );

          const lineItems: RequestLineItem[] = itemDetails.map((item) => {
            const catalog = item?.catalog ?? {};
            const lineName = toStringSafe(
              catalog.name ??
                catalog.entitlementname ??
                catalog.applicationname ??
                item?.entity_name ??
                item?.entityName ??
                item?.name
            );
            const lineType = toStringSafe(
              catalog.type ??
                catalog.entitlementtype ??
                catalog.metadata?.entitlementType ??
                item?.entity_type ??
                item?.entityType ??
                "Entitlement"
            );
            const lineComments = toStringSafe(
              item?.item_comments ??
                item?.comments ??
                item?.comment ??
                row.requester_justification ??
                ""
            );
            const startDate = formatDate(toStringSafe(item?.item_startdate));
            const endDate = formatDate(toStringSafe(item?.item_enddate));
            const riskLevel = String(catalog.risk ?? "").toLowerCase();

            return {
              name: lineName,
              displayName: lineName,
              type: lineType,
              startDate,
              endDate,
              comments: lineComments,
              hasInfoIcon:
                String(catalog.privileged ?? "").toLowerCase() === "yes" ||
                riskLevel.startsWith("high"),
              hasHighRisk: riskLevel.startsWith("high"),
            };
          });

          const normalizedLineItems =
            lineItems.length > 0
              ? lineItems
              : [
                  {
                    name: toStringSafe(
                      row.entity_name ?? row.entityName ?? "Requested Access"
                    ),
                    displayName: toStringSafe(
                      row.entity_name ?? row.entityName ?? "Requested Access"
                    ),
                    type: toStringSafe(
                      row.entity_type ?? row.entityType ?? "Entitlement"
                    ),
                    startDate: "",
                    endDate: "",
                    comments: justification,
                    hasInfoIcon: false,
                    hasHighRisk: false,
                  },
                ];

          const durationDays = createdOnRaw
            ? Math.max(
                0,
                Math.round(
                  (Date.now() - new Date(String(createdOnRaw)).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : undefined;

          return {
            id: requestId,
            requesterName,
            beneficiaryName,
            durationDays,
            details: {
              dateCreated: createdOn,
              type: toStringSafe(row.request_type ?? row.type ?? "Entitlement"),
              justification,
            },
            lineItems: normalizedLineItems,
          } as PendingApprovalDetail;
        });

        const routeId = normalizeId(id);
        const matched = mapped.find((row) => normalizeId(row.id) === routeId);
        setRequest(matched ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load request.");
        setRequest(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!request?.lineItems?.length) return;
    const defaults: Record<string, boolean> = {};
    request.lineItems.forEach((_, idx) => {
      defaults[String(idx)] = true;
    });
    setExpandedLineItems(defaults);
  }, [request]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Loading request...
        </h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">
          Unable to load request
        </h1>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Request not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Request ID: {request.id}
            </h2>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700">
            Request Type:{" "}
            <span className="ml-1 font-semibold">{request.details.type}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Date Created
            </div>
            <div className="text-gray-900">{request.details.dateCreated}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Requester
            </div>
            <div className="text-gray-900">{request.requesterName}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Beneficiary
            </div>
            <div className="text-gray-900">{request.beneficiaryName}</div>
          </div>
          {typeof request.durationDays === "number" && (
            <div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Duration
              </div>
              <div className="text-gray-900">{request.durationDays} days</div>
            </div>
          )}
          <div className="md:col-span-2">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Justification
            </div>
            <div className="text-gray-900 whitespace-pre-wrap break-words">
              {request.details.justification}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {request.lineItems.map((lineItem, index) => {
          const lineItemKey = String(index);
          const isItemExpanded = expandedLineItems[lineItemKey] ?? true;
          const actionBtnClass =
            "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors";
          const infoTooltip = lineItem.hasHighRisk
            ? "High-risk or privileged access item"
            : "Additional item information";

          return (
            <div key={lineItemKey} className="border border-gray-200 rounded-lg bg-gray-50">
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setExpandedLineItems((prev) => ({
                    ...prev,
                    [lineItemKey]: !(prev[lineItemKey] ?? true),
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedLineItems((prev) => ({
                      ...prev,
                      [lineItemKey]: !(prev[lineItemKey] ?? true),
                    }));
                  }
                }}
                className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 text-left hover:bg-gray-100 transition-colors cursor-pointer"
                aria-expanded={isItemExpanded}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {lineItem.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {lineItem.hasHighRisk && (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-red-300 bg-red-50 text-red-600">
                        High Risk
                      </span>
                    )}
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-blue-300 bg-blue-50 text-blue-600">
                      {lineItem.displayName}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-emerald-300 bg-emerald-50 text-emerald-600">
                      Training Check
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    title="Approve"
                    aria-label="Approve"
                    onClick={(e) => e.stopPropagation()}
                    className={actionBtnClass}
                  >
                    <CircleCheck className="h-5 w-5 text-emerald-600" />
                  </button>
                  <button
                    type="button"
                    title="Reject"
                    aria-label="Reject"
                    onClick={(e) => e.stopPropagation()}
                    className={actionBtnClass}
                  >
                    <CircleX className="h-5 w-5 text-red-600" />
                  </button>
                  <button
                    type="button"
                    title="Request more information"
                    aria-label="Request more information"
                    onClick={(e) => e.stopPropagation()}
                    className={actionBtnClass}
                  >
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                  </button>
                  {lineItem.hasInfoIcon && (
                    <div
                      className="ml-1 w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600"
                      title={infoTooltip}
                      aria-label={infoTooltip}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span className="text-gray-500 ml-1" aria-hidden>
                    {isItemExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </div>
              </div>

              {isItemExpanded && (
                <div className="px-4 py-3 space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                        Access Duration
                      </div>
                      <div className="text-gray-900">
                        {lineItem.startDate}
                        {lineItem.endDate ? ` - ${lineItem.endDate}` : ""}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                        Comments
                        {lineItem.comments && (
                          <Info className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                      <div className="text-gray-900 whitespace-pre-wrap break-words">
                        {lineItem.comments || "No additional comments provided."}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                        Attachment
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View / Add Attachment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingApprovalDetailPage;

