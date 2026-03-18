"use client";

import React, { useEffect, useState } from "react";
import { Info, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { getReviewerId } from "@/lib/auth";

interface InstanceStep {
  action: string;
  date: string;
  userActor: string;
  status: string;
}

interface RequestDetails {
  dateCreated: string;
  type: string;
  name: string;
  justification: string;
  startDate: string;
  endDate: string;
  globalComments?: string;
}

interface RequestLineItem {
  name: string;
  displayName: string;
  applicationName: string;
  type: string;
  startDate: string;
  endDate: string;
  comments: string;
  hasInfoIcon?: boolean;
  hasHighRisk?: boolean;
  canWithdraw?: boolean;
  canProvideAdditionalDetails?: boolean;
  instanceSteps: InstanceStep[];
}

interface Request {
  id: string | number;
  requestId: string;
  wfInstanceId: string;
  lookupKeys: string[];
  beneficiaryName: string;
  requesterName: string;
  displayName: string;
  entityType: string;
  daysOpen: number;
  status: string;
  hasInfoIcon?: boolean;
  canWithdraw?: boolean;
  canProvideAdditionalDetails?: boolean;
  details?: RequestDetails;
  lineItems: RequestLineItem[];
  instanceSteps: InstanceStep[];
}
const TrackRequestDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = React.use(params);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLineItems, setExpandedLineItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const reviewerId = getReviewerId();
    if (!reviewerId) {
      setError("Reviewer ID not found.");
      return;
    }

    const url = "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery";
    setLoading(true);
    setError(null);

    const body = {
      query: "select * from vw_access_request_full_json where requested_by_user_id = ?::uuid",
      parameters: [reviewerId],
    };

    const formatDate = (value: string | null | undefined): string => {
      if (!value) return "";
      const datePart = value.split(" ")[0] ?? value;
      const parts = datePart.split("-");
      if (parts.length !== 3) return value;
      const [yyyy, mm, dd] = parts;
      if (!yyyy || !mm || !dd) return value;
      return `${mm.padStart(2, "0")}/${dd.padStart(2, "0")}/${yyyy}`;
    };

    const formatDateTime = (value: string | null | undefined): string => {
      if (!value) return "";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return String(value);
      return new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(parsed);
    };

    const normalizeStatus = (value: string | null | undefined): string => {
      if (!value) return "";
      return String(value)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const stepCodeToAction = (code: string | null | undefined): string => {
      const normalized = String(code ?? "").toUpperCase();
      if (normalized === "SOD_CHECK") return "Assigned for SOD Approval";
      if (normalized === "MANAGER_APPROVAL") return "Assigned to User Manager";
      if (normalized === "APP_OWNER_APPROVAL") return "Assigned to App Owner";
      if (normalized === "PROVISION_SCIM") return "Request Fulfillment";
      return normalized ? normalized.replace(/_/g, " ") : "";
    };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        let rawRows: any[] = [];
        if (Array.isArray(data)) rawRows = data;
        else if (Array.isArray((data as any).resultSet)) rawRows = (data as any).resultSet;
        else if (Array.isArray((data as any).rows)) rawRows = (data as any).rows;

        if (!rawRows || rawRows.length === 0) {
          setRequest(null);
          return;
        }
        const isStepLikeObject = (value: any): boolean => {
          if (!value || typeof value !== "object" || Array.isArray(value)) return false;
          const keys = Object.keys(value).map((k) => k.toLowerCase());
          const hasStepIdentity = keys.some((k) =>
            [
              "step_code",
              "stepcode",
              "template_step_id",
              "templatestepid",
              "instance_step_id",
              "instancestepid",
              "step_name",
              "stepname",
            ].includes(k)
          );
          const hasActionAndStatus =
            keys.some((k) => ["action", "action_item", "item_action", "action_name", "actionname"].includes(k)) &&
            keys.some((k) => ["status", "step_status", "stepstatus", "state"].includes(k));
          const looksLikeOutboxEvent =
            keys.includes("event_type") || keys.includes("aggregatetype") || keys.includes("aggregate_type");
          return (hasStepIdentity || hasActionAndStatus) && !looksLikeOutboxEvent;
        };

        const toStepsArray = (value: any): any[] => {
          if (Array.isArray(value)) return value;
          if (!value) return [];

          if (typeof value === "string") {
            try {
              const parsed = JSON.parse(value);
              return toStepsArray(parsed);
            } catch {
              return [];
            }
          }

          if (typeof value === "object") {
            const obj = value as Record<string, unknown>;
            const candidates = [
              obj.instance_steps,
              obj.instancesteps,
              obj.instanceSteps,
              obj.steps,
              obj.workflow_steps,
              obj.workflowSteps,
              obj.data,
              obj.result,
            ];
            for (const candidate of candidates) {
              const arr = toStepsArray(candidate);
              if (arr.length > 0) return arr;
            }
          }

          return [];
        };

        const deepCollectStepArrays = (value: any, maxDepth = 6): any[][] => {
          if (maxDepth < 0 || !value) return [];

          if (Array.isArray(value)) {
            const arrays: any[][] = [];
            const allStepLike = value.length > 0 && value.every((v) => isStepLikeObject(v));
            if (allStepLike) arrays.push(value);
            for (const item of value) {
              arrays.push(...deepCollectStepArrays(item, maxDepth - 1));
            }
            return arrays;
          }

          if (typeof value === "string") {
            try {
              const parsed = JSON.parse(value);
              return deepCollectStepArrays(parsed, maxDepth - 1);
            } catch {
              return [];
            }
          }

          if (typeof value === "object") {
            const obj = value as Record<string, unknown>;
            let arrays: any[][] = [];
            for (const child of Object.values(obj)) {
              arrays = arrays.concat(deepCollectStepArrays(child, maxDepth - 1));
            }
            return arrays;
          }

          return [];
        };

        const pickBestStepArray = (...sources: any[]): any[] => {
          const explicitCandidate = sources
            .map((s) => toStepsArray(s))
            .find((arr) => arr.length > 0 && arr.every((v) => isStepLikeObject(v)));
          if (explicitCandidate) return explicitCandidate;

          let best: any[] = [];
          for (const source of sources) {
            const arrays = deepCollectStepArrays(source);
            for (const arr of arrays) {
              if (arr.length > best.length) best = arr;
            }
          }
          return best;
        };

        const mapInstanceSteps = (steps: any[]): InstanceStep[] =>
          steps.map((step) => {
            const actionFromCode = stepCodeToAction(step?.step_code);
            const actionFromFields =
              step?.action ??
              step?.action_item ??
              step?.item_action ??
              step?.actionItem ??
              step?.action_name ??
              step?.actionName ??
              step?.step_name ??
              step?.stepName ??
              step?.name ??
              "";

            return {
            action: String(actionFromCode ? actionFromCode : actionFromFields),
            date: String(
              formatDateTime(
                step?.created_at ??
                  step?.updated_at ??
                  step?.completed_at ??
                  step?.date ??
                  step?.action_date ??
                  step?.actionDate ??
                  step?.createdon ??
                  step?.createdOn ??
                  step?.requestedon ??
                  step?.requestedOn ??
                  step?.timestamp
              )
            ),
            userActor: String(
              step?.tasks?.[0]?.assignee?.display_name ??
                [step?.tasks?.[0]?.assignee?.first_name, step?.tasks?.[0]?.assignee?.last_name]
                  .filter(Boolean)
                  .join(" ") ??
                step?.tasks?.[0]?.assignee?.username ??
                step?.user_actor ??
                step?.userActor ??
                step?.assigned_to ??
                step?.assignedTo ??
                step?.actor ??
                step?.user ??
                step?.performed_by ??
                step?.performedBy ??
                step?.username ??
                ""
            ),
            status: String(
              normalizeStatus(
                step?.status ??
                  step?.tasks?.[0]?.task_status ??
                  step?.tasks?.[0]?.step_state ??
                  step?.step_status ??
                  step?.stepStatus ??
                  step?.state ??
                  step?.current_status ??
                  step?.currentStatus
              )
            ),
          };
          });

        const mapped: Request[] = rawRows.map((row) => {
          const requestJson = row.request_json ?? {};
          const accessRequest = requestJson.access_request ?? {};
          const requester = accessRequest.requested_by ?? row.requester ?? row.requestedby ?? row.requested_by ?? {};
          const beneficiary = accessRequest.requested_for ?? row.beneficiary ?? {};
          const accessItems: any[] = Array.isArray(requestJson.access_items)
            ? requestJson.access_items
            : Array.isArray(row.itemdetails)
              ? row.itemdetails
              : [];
          const firstItem = accessItems[0] ?? {};
          const catalog = firstItem.catalog ?? {};

          const requesterNameFromObject =
            requester.display_name ||
            requester.displayname ||
            requester.display_name ||
            [requester.firstname, requester.lastname].filter(Boolean).join(" ") ||
            [requester.first_name, requester.last_name].filter(Boolean).join(" ") ||
            requester.username ||
            row.requesterdisplayname ||
            row.requester_display_name ||
            row.requestername ||
            row.requester_name ||
            row.requestedbyname ||
            row.requested_by_name ||
            "";

          const beneficiaryNameFromObject =
            beneficiary.display_name ||
            beneficiary.displayname ||
            [beneficiary.firstname, beneficiary.lastname].filter(Boolean).join(" ") ||
            [beneficiary.first_name, beneficiary.last_name].filter(Boolean).join(" ") ||
            beneficiary.username ||
            "";

          const displayNameFromCatalog =
            catalog.name || catalog.entitlementname || catalog.applicationname || "";

          const entityTypeFromCatalog =
            catalog.type || catalog.entitlementtype || (catalog.metadata?.entitlementType as string) || "";

          const requestedOn: string | undefined =
            accessRequest.created_at ?? row.requestedon ?? row.created_at;
          const raisedOn = formatDate(requestedOn);

          let daysOpen = 0;
          if (requestedOn) {
            const datePart = requestedOn.split(" ")[0] ?? requestedOn;
            const d = new Date(datePart);
            if (!Number.isNaN(d.getTime())) {
              const now = new Date();
              const diffMs = now.getTime() - d.getTime();
              daysOpen = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
            }
          }

          const status: string =
            typeof accessRequest.status === "string" && accessRequest.status.trim()
              ? accessRequest.status
              : typeof row.status === "string" && row.status.trim()
                ? row.status
              : row.isjit
                ? "JIT Request Submitted"
                : "Request Submitted";

          const justification: string =
            (accessRequest.justification as string) ||
            (row.requester_justification as string) ||
            (firstItem.item_comments as string) ||
            "";

          const startDate = firstItem.item_startdate ? String(firstItem.item_startdate) : raisedOn;
          const endDate = firstItem.item_enddate ? String(firstItem.item_enddate) : "";
          const requestJsonStepsRaw = pickBestStepArray(
            requestJson?.instance_steps,
            requestJson?.workflow_instance?.instance_steps,
            requestJson?.workflowInstance?.instance_steps,
            row?.instance_steps,
            requestJson,
            row
          );
          const lineItems: RequestLineItem[] = accessItems.map((item) => {
            const lineCatalog = item?.catalog ?? {};
            const instanceSteps = mapInstanceSteps(toStepsArray(item?.instance_steps));
            const lineDisplayName =
              lineCatalog.name || lineCatalog.entitlementname || lineCatalog.applicationname || "";
            const lineApplicationName =
              lineCatalog.applicationname || lineCatalog.applicationName || lineCatalog.name || "";
            const lineType =
              lineCatalog.type ||
              lineCatalog.entitlementtype ||
              (lineCatalog.metadata?.entitlementType as string) ||
              "Entitlement";
            const lineComments =
              (item?.item_comments as string) || (row.requester_justification as string) || "";
            const lineStartDate = item?.item_startdate ? String(item.item_startdate) : raisedOn;
            const lineEndDate = item?.item_enddate ? String(item.item_enddate) : "";
            const lineRisk = String(lineCatalog.risk ?? "").toLowerCase();

            return {
              name: String(lineDisplayName || ""),
              displayName: String(lineDisplayName || ""),
              applicationName: String(lineApplicationName || ""),
              type: String(lineType),
              startDate: lineStartDate,
              endDate: lineEndDate,
              comments: lineComments,
              hasInfoIcon:
                String(lineCatalog.privileged ?? "").toLowerCase() === "yes" ||
                lineRisk.startsWith("high"),
              hasHighRisk: lineRisk.startsWith("high"),
              canWithdraw: status.toLowerCase().includes("awaiting") || status.toLowerCase().includes("pending"),
              canProvideAdditionalDetails: status.toLowerCase().includes("provide information"),
              instanceSteps,
            };
          });
          const normalizedLineItems =
            lineItems.length > 0
              ? lineItems
              : [
                  {
                    name: String(displayNameFromCatalog || ""),
                    displayName: String(displayNameFromCatalog || ""),
                    applicationName: String(catalog.applicationname || catalog.applicationName || catalog.name || ""),
                    type: String(entityTypeFromCatalog || "Entitlement"),
                    startDate,
                    endDate,
                    comments: justification,
                    hasInfoIcon:
                      String(catalog.privileged ?? "").toLowerCase() === "yes" ||
                      String(catalog.risk ?? "").toLowerCase().startsWith("high"),
                    hasHighRisk: String(catalog.risk ?? "").toLowerCase().startsWith("high"),
                    canWithdraw:
                      status.toLowerCase().includes("awaiting") || status.toLowerCase().includes("pending"),
                    canProvideAdditionalDetails: status.toLowerCase().includes("provide information"),
                    instanceSteps: [],
                  },
                ];
          const mappedWorkflowSteps = mapInstanceSteps(requestJsonStepsRaw);
          const submittedStep: InstanceStep[] = requestedOn
            ? [
                {
                  action: "Request Submitted",
                  date: formatDateTime(requestedOn),
                  userActor: requesterNameFromObject
                    ? `${requesterNameFromObject} (Requester)`
                    : "Requester",
                  status: "Completed",
                },
              ]
            : [];
          const requestInstanceSteps =
            mappedWorkflowSteps.length > 0 ? [...submittedStep, ...mappedWorkflowSteps] : [];

          const wfInstanceIdFromItem =
            firstItem?.wf_instance_id ??
            accessItems.find((item: any) => item?.wf_instance_id != null)?.wf_instance_id;
          const wfInstanceIdFromRequestJson =
            requestJson?.workflow_instance?.id ??
            requestJson?.workflowInstance?.id;
          const requestDisplayId =
            accessRequest.id ??
            row.request_id ??
            row.requestid ??
            row.id ??
            wfInstanceIdFromRequestJson ??
            wfInstanceIdFromItem ??
            "";
          const lookupKeys = [
            wfInstanceIdFromRequestJson,
            wfInstanceIdFromItem,
            row.wf_instance_id,
            row.wfinstanceid,
            row.request_id,
            accessRequest.id,
            row.requestid,
            row.id,
          ]
            .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
            .map((value) => String(value));
          const resolvedRequestId = String(
            accessRequest.id ?? row.request_id ?? row.requestid ?? row.id ?? ""
          );
          const resolvedWfInstanceId = String(
            wfInstanceIdFromRequestJson ??
              wfInstanceIdFromItem ??
              row.wf_instance_id ??
              row.wfinstanceid ??
              ""
          );

          return {
            id: requestDisplayId,
            requestId: resolvedRequestId,
            wfInstanceId: resolvedWfInstanceId,
            lookupKeys,
            beneficiaryName: String(beneficiaryNameFromObject),
            requesterName: String(requesterNameFromObject),
            displayName: String(displayNameFromCatalog),
            entityType: String(entityTypeFromCatalog || "Entitlement"),
            daysOpen,
            status,
            hasInfoIcon:
              String(catalog.privileged ?? "").toLowerCase() === "yes" ||
              String(catalog.risk ?? "").toLowerCase().startsWith("high"),
            canWithdraw: status.toLowerCase().includes("awaiting") || status.toLowerCase().includes("pending"),
            canProvideAdditionalDetails: status.toLowerCase().includes("provide information"),
            details: {
              dateCreated: raisedOn,
              type: String(entityTypeFromCatalog || "Entitlement"),
              name: String(displayNameFromCatalog || ""),
              justification,
              startDate,
              endDate,
              globalComments: justification || undefined,
            },
            lineItems: normalizedLineItems,
            instanceSteps: requestInstanceSteps,
          };
        });

        const incomingId = String(id);
        const scoreCandidate = (candidate: Request): number => {
          let score = 0;
          if (candidate.requestId && candidate.requestId === incomingId) score += 1000;
          if (candidate.wfInstanceId && candidate.wfInstanceId === incomingId) score += 900;
          if (candidate.lookupKeys.includes(incomingId)) score += 700;
          if (String(candidate.id) === incomingId) score += 500;
          score += (candidate.instanceSteps?.length ?? 0) * 10;
          score += candidate.lineItems?.length ?? 0;
          return score;
        };

        const primaryCandidates = mapped.filter(
          (r) =>
            (r.requestId && r.requestId === incomingId) ||
            (r.wfInstanceId && r.wfInstanceId === incomingId) ||
            r.lookupKeys.includes(incomingId) ||
            String(r.id) === incomingId
        );

        const bestPrimary =
          [...primaryCandidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0] ?? null;

        const relatedByBestPrimary =
          bestPrimary == null
            ? []
            : mapped.filter((r) => {
                const sameRequestId =
                  bestPrimary.requestId !== "" && r.requestId === bestPrimary.requestId;
                const sameWfInstanceId =
                  bestPrimary.wfInstanceId !== "" && r.wfInstanceId === bestPrimary.wfInstanceId;
                return sameRequestId || sameWfInstanceId;
              });

        const bestRelated =
          [...relatedByBestPrimary].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0] ??
          null;

        setRequest(bestRelated ?? bestPrimary ?? null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load request.";
        setError(message);
        setRequest(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!request?.lineItems?.length) return;
    const defaultExpandedState: Record<string, boolean> = {};
    request.lineItems.forEach((_, index) => {
      defaultExpandedState[String(index)] = true;
    });
    setExpandedLineItems(defaultExpandedState);
  }, [request]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Loading request…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Unable to load request</h1>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  if (!request || !request.details) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Request not found</h1>
      </div>
    );
  }

  const requestLevelSteps = Array.isArray(request.instanceSteps)
    ? request.instanceSteps
    : [];
  const lineLevelSteps = Array.isArray(request.lineItems)
    ? request.lineItems.flatMap((lineItem) =>
        Array.isArray(lineItem.instanceSteps) ? lineItem.instanceSteps : []
      )
    : [];
  const topInstanceSteps =
    requestLevelSteps.length > 0 ? requestLevelSteps : lineLevelSteps;
  const firstPendingIndex = topInstanceSteps.findIndex((step) =>
    String(step.status ?? "").toLowerCase().includes("pending")
  );

  return (
    <div className="p-6 space-y-6">
      {/* Request Header Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {/* Row 1: Request ID + Request Type */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Request ID: {request.id}
            </h2>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700">
            Request Type:{" "}
            <span className="ml-1 font-semibold">
              {request.details.type || request.entityType}
            </span>
          </div>
        </div>

        {/* Row 2: Date Created | Requester | Beneficiary | Duration (optional) | Justification */}
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

      {topInstanceSteps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                    S. No
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topInstanceSteps.map((step, idx) => {
                  const hideMetaColumns = firstPendingIndex !== -1 && idx >= firstPendingIndex;
                  return (
                    <tr key={`${step.action}-${step.date}-${idx}`}>
                      <td className="px-3 py-1.5 text-gray-900">{idx + 1}</td>
                      <td className="px-3 py-1.5 text-gray-900">{step.action || "-"}</td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {hideMetaColumns ? "" : (step.date || "-")}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {hideMetaColumns ? "" : (step.userActor || "-")}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {hideMetaColumns ? "" : (step.status || "-")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Line Item Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {request.lineItems.map((lineItem, index) => {
          const lineItemKey = String(index);
          const isItemExpanded = expandedLineItems[lineItemKey] ?? true;
          const withdrawTooltip = lineItem.canWithdraw
            ? "Withdraw request"
            : "Withdraw unavailable for current status";
          const provideDetailsTooltip = lineItem.canProvideAdditionalDetails
            ? "Provide additional details"
            : "Additional details not required right now";
          const infoTooltip = lineItem.hasHighRisk
            ? "High-risk or privileged access item"
            : "Additional item information";
          const toggleTooltip = isItemExpanded ? "Collapse line item" : "Expand line item";
          return (
            <div key={lineItemKey} className="border border-gray-200 rounded-lg bg-gray-50">
              {/* Line item header: requested access item + tags + actions */}
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
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{lineItem.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {lineItem.hasHighRisk && (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-red-300 bg-red-50 text-red-600">
                        High Risk
                      </span>
                    )}
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-violet-300 bg-violet-50 text-violet-700">
                      {lineItem.applicationName || "No Application"}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border border-emerald-300 bg-emerald-50 text-emerald-600">
                      Training Check
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    disabled={!lineItem.canWithdraw}
                    title={withdrawTooltip}
                    aria-label={withdrawTooltip}
                    className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      lineItem.canWithdraw
                        ? "border-red-300 text-red-600 bg-white hover:bg-red-50 cursor-pointer"
                        : "border-gray-200 text-gray-400 bg-white cursor-not-allowed"
                    }`}
                  >
                    <img
                      src="/withdraw-icon.svg"
                      alt="Withdraw"
                      className="w-4 h-4"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    disabled={!lineItem.canProvideAdditionalDetails}
                    title={provideDetailsTooltip}
                    aria-label={provideDetailsTooltip}
                    className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      lineItem.canProvideAdditionalDetails
                        ? "border-indigo-300 text-indigo-600 bg-white hover:bg-indigo-50 cursor-pointer"
                        : "border-gray-200 text-gray-400 bg-white cursor-not-allowed"
                    }`}
                  >
                    <img
                      src="/provide-details-icon.svg"
                      alt="Provide additional details"
                      className="w-4 h-4"
                    />
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
                  <span className="text-gray-500 ml-1" aria-hidden title={toggleTooltip}>
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
                  {/* Compact row: access duration, comments, attachment */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                        Access Duration
                      </div>
                      <div className="text-gray-900">
                        {lineItem.startDate}
                        {lineItem.endDate
                          ? ` - ${lineItem.endDate}`
                          : " (ongoing)"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                        Comments
                      </div>
                      <div className="text-gray-900 whitespace-pre-wrap break-words">
                        {lineItem.comments || "No additional comments provided."}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                        Attachment
                      </div>
                      <div className="text-gray-900">No Attachment</div>
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

export default TrackRequestDetailPage;

