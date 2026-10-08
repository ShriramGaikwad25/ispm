"use client";

import { useState } from "react";
import { Check, GitBranch, Play, X } from "lucide-react";
import {
  useDecideWorkItem, useEventWorkflowInstances, useInstanceDetail,
  useMyWorkItems, useStartWorkflow, useWorkflowList,
} from "@/hooks/useAssuranceEvents";
import { formatRelative } from "@/lib/assurance-format";
import type { UUID } from "@/lib/assurance-events-api";
import {
  BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_BODY, CARD_HEADER, INPUT_BASE, LookupBadge, Spinner, cx,
} from "./ui";

/**
 * Shows workflow runs for this event (with per-step progress) and lets the
 * current user decide any open approval work items inline. Also allows
 * manually starting an ACTIVE workflow against the event.
 */
export function WorkflowPanel({ eventId }: { eventId: UUID }) {
  const { data: instances, isLoading } = useEventWorkflowInstances(eventId);
  const { data: workflows } = useWorkflowList();
  const { data: myItems } = useMyWorkItems();
  const start = useStartWorkflow();
  const decide = useDecideWorkItem();
  const [startId, setStartId] = useState("");

  const activeWorkflows = (workflows ?? []).filter((w) => w.state === "ACTIVE");
  const eventItems = (myItems ?? []).filter((w) => w.eventId === eventId && w.status === "OPEN");

  return (
    <section className={CARD}>
      <div className={cx(CARD_HEADER, "flex-wrap")}>
        <div className="font-medium text-gray-800 flex items-center gap-2">
          <GitBranch size={16} className="text-gray-400" /> Workflows
        </div>
        <div className="flex items-center gap-1.5">
          <select className={cx(INPUT_BASE, "h-8 py-1 text-xs w-52")} value={startId}
                  onChange={(e) => setStartId(e.target.value)}>
            <option value="">Run workflow…</option>
            {activeWorkflows.map((w) => (
              <option key={w.workflowId} value={w.workflowId}>{w.name}</option>
            ))}
          </select>
          <button className={cx(BTN_SECONDARY, "text-xs h-8")} disabled={!startId || start.isPending}
                  onClick={() => start.mutate({ id: startId, eventId }, { onSuccess: () => setStartId("") })}>
            {start.isPending ? <Spinner size={12} /> : <Play size={12} />} Start
          </button>
        </div>
      </div>
      <div className={cx(CARD_BODY, "space-y-3")}>
        {start.error && (
          <div className="text-xs text-red-600">{(start.error as Error).message}</div>
        )}

        {/* Pending approvals for me on this event */}
        {eventItems.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded-md p-3">
            <div className="text-sm font-medium text-amber-800 mb-2">
              Pending approvals ({eventItems.length})
            </div>
            {eventItems.map((wi) => (
              <div key={wi.workItemId} className="flex items-center justify-between gap-2 py-1">
                <div className="min-w-0">
                  <div className="text-sm text-gray-800">{wi.title}</div>
                  <div className="text-xs text-gray-500">
                    due {formatRelative(wi.dueAt)} · via {wi.assigneeResolvedVia ?? "queue"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className={cx(BTN_PRIMARY, "text-xs h-8")} disabled={decide.isPending}
                          onClick={() => decide.mutate({ id: wi.workItemId, outcome: "APPROVED" })}>
                    <Check size={12} /> Approve
                  </button>
                  <button className={cx(BTN_DANGER, "text-xs h-8")} disabled={decide.isPending}
                          onClick={() => {
                            const comment = prompt("Rejection reason?") || undefined;
                            decide.mutate({ id: wi.workItemId, outcome: "REJECTED", comment });
                          }}>
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2"><Spinner /> Loading…</div>
        ) : !instances || instances.length === 0 ? (
          <div className="text-sm text-gray-500">No workflow runs for this event yet.</div>
        ) : (
          instances.map((inst) => (
            <InstanceRow key={inst.instanceId} instanceId={inst.instanceId} code={inst.workflowCode}
                         status={inst.status} startedAt={inst.startedAt} currentStep={inst.currentStepKey} />
          ))
        )}
      </div>
    </section>
  );
}

function InstanceRow({ instanceId, code, status, startedAt, currentStep }: {
  instanceId: UUID; code: string; status: string; startedAt: string; currentStep?: string;
}) {
  const [open, setOpen] = useState(false);
  const detail = useInstanceDetail(open ? instanceId : undefined);

  return (
    <div className="border border-gray-200 rounded-md">
      <button className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => setOpen((s) => !s)}>
        <div className="flex items-center gap-2 flex-wrap">
          <LookupBadge domain="WF_INSTANCE_STATUS" code={status} />
          <span className="text-sm font-medium text-gray-800">{code}</span>
          {currentStep && <span className="text-xs text-gray-500 font-mono">@ {currentStep}</span>}
        </div>
        <span className="text-xs text-gray-500 shrink-0">{formatRelative(startedAt)}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1">
          {detail.isLoading && (
            <div className="text-xs text-gray-500 flex items-center gap-1"><Spinner size={12} /> Loading steps…</div>
          )}
          {detail.data?.steps.map((s, i) => (
            <div key={s.stepInstanceId} className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-4 text-right">{i + 1}.</span>
              <span className="font-mono text-gray-700">{s.stepKey}</span>
              <LookupBadge domain="WF_STEP_STATUS" code={s.status} />
              {s.outcome && <span className="text-gray-500">→ {s.outcome}</span>}
              {s.error && <span className="text-red-600 truncate max-w-[24ch]" title={s.error}>⚠ {s.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
