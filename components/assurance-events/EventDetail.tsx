"use client";

import Link from "next/link";
import { ChevronLeft, Clock, ExternalLink, Hash, MapPin, Server, ShieldAlert } from "lucide-react";
import {
  useDefinition, useEvent, useEventDecisions, useEventMitigations, useEventRemediations,
  useReopenEvent, useSuppressEvent,
} from "@/hooks/useAssuranceEvents";
import { formatAbsolute, formatRelative, msUntil } from "@/lib/assurance-format";
import type { ComplianceEvent, Decision, Mitigation, Remediation, UUID } from "@/lib/assurance-events-api";
import { AiInsightPanel } from "./AiInsightPanel";
import { DecisionPanel, EventActions } from "./DecisionPanel";
import { WorkflowPanel } from "./WorkflowPanel";
import { BADGE, CARD, CARD_BODY, CARD_HEADER, LookupBadge, Spinner, cx } from "./ui";

/** Event detail — ported from the Continuous Assurance app's components/events/EventDetail.tsx. */
export function EventDetail({ id, backHref, backLabel }: { id: UUID; backHref: string; backLabel: string }) {
  const evQ = useEvent(id);
  const event = evQ.data;
  const defQ = useDefinition(event?.definitionId);
  const definition = defQ.data;

  const decQ = useEventDecisions(id);
  const mitQ = useEventMitigations(id);
  const remQ = useEventRemediations(id);

  const reopen = useReopenEvent();
  const suppress = useSuppressEvent();

  if (evQ.isLoading) {
    return <div className="p-6 flex items-center gap-2 text-gray-500"><Spinner /> Loading event…</div>;
  }
  if (!event) {
    return (
      <div className="p-6 space-y-3">
        <BackLink href={backHref} label={backLabel} />
        <div className="text-gray-500">
          Event not found.{evQ.error ? ` ${(evQ.error as Error).message}` : ""}
        </div>
      </div>
    );
  }

  const overdue = msUntil(event.dueAt) < 0;
  const actionError = reopen.error ?? suppress.error;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <BackLink href={backHref} label={backLabel} />
        <EventActions
          status={event.status}
          busy={reopen.isPending || suppress.isPending}
          onReopen={() => {
            const reason = prompt("Reason for reopen?") || undefined;
            if (reason !== undefined) reopen.mutate({ id, reason });
          }}
          onSuppress={() => {
            const reason = prompt("Reason for suppress?") || undefined;
            if (reason !== undefined) suppress.mutate({ id, reason });
          }}
        />
      </div>

      {actionError && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2 rounded">
          {(actionError as Error).message}
        </div>
      )}

      {/* Header card */}
      <section className={CARD}>
        <div className={CARD_BODY}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <LookupBadge domain="SEVERITY" code={event.severity} />
                <LookupBadge domain="EVENT_STATUS" code={event.status} />
                {event.escalationLevel > 0 && (
                  <span className={cx(BADGE, "bg-orange-50 text-orange-700 border border-orange-200")}>
                    Escalation L{event.escalationLevel}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-semibold text-gray-800">{definition?.name ?? event.eventTypeCode}</h1>
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1"><Hash size={12} /> {event.eventId.slice(0, 8)}</span>
                <span>{event.definitionId && (definition?.code ?? "definition")} v{event.definitionVersion}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> Discovered {formatRelative(event.discoveredAt)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={overdue ? "text-red-600 font-medium" : "text-gray-700"}>
                <div className="text-xs uppercase tracking-wide text-gray-400">Due</div>
                <div className="text-base">{formatRelative(event.dueAt)}</div>
                <div className="text-xs text-gray-500">{formatAbsolute(event.dueAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left column: subject, evidence, decisions history, mitigations, remediations */}
        <div className="xl:col-span-2 space-y-4">
          <SubjectPanel event={event} />
          <EvidencePanel evidence={event.evidence} detectorSource={event.detectorSource} discoveredAt={event.discoveredAt} />
          {decQ.data && decQ.data.length > 0 && <DecisionsHistory decisions={decQ.data} />}
          {mitQ.data && mitQ.data.length > 0 && <MitigationsList items={mitQ.data} />}
          {remQ.data && remQ.data.length > 0 && <RemediationsList items={remQ.data} />}
        </div>

        {/* Right column: AI insight + workflows + decision panel */}
        <div className="space-y-4">
          <AiInsightPanel eventId={event.eventId} />
          <WorkflowPanel eventId={event.eventId} />
          <DecisionPanel
            key={`${event.eventId}:${event.status}`}
            event={event}
            definition={definition}
            aiRecommendation={event.aiRecommendedDecision}
          />
        </div>
      </div>
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1">
      <ChevronLeft size={16} /> {label}
    </Link>
  );
}

function SubjectPanel({ event }: { event: ComplianceEvent }) {
  const d = event.subjectDescriptor as Record<string, string>;
  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="font-medium text-gray-800 flex items-center gap-2">
          <Server size={16} className="text-gray-400" /> Subject
        </div>
        <LookupBadge domain="SUBJECT_KIND" code={event.subjectKind} />
      </div>
      <div className={cx(CARD_BODY, "grid grid-cols-2 md:grid-cols-3 gap-3 text-sm")}>
        {[
          ["User", event.subjectUserId],
          ["Account", event.subjectAccountId],
          ["Application", event.subjectApplicationId],
          ["Entitlement", event.subjectEntitlementId],
          ["NHI", event.subjectNhiId],
        ].map(([label, val]) =>
          val ? (
            <div key={label as string}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="font-mono text-xs text-gray-700">{String(val).slice(0, 13)}…</div>
            </div>
          ) : null
        )}
        {Object.entries(d).map(([k, v]) => (
          <div key={k}>
            <div className="text-xs text-gray-500">{k}</div>
            <div className="text-gray-700 truncate">{String(v)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidencePanel({ evidence, detectorSource, discoveredAt }: {
  evidence: Record<string, unknown>; detectorSource: string; discoveredAt: string;
}) {
  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="font-medium text-gray-800 flex items-center gap-2">
          <ShieldAlert size={16} className="text-gray-400" /> Evidence
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <MapPin size={12} /> {detectorSource} · {formatRelative(discoveredAt)}
        </span>
      </div>
      <div className={CARD_BODY}>
        {Object.keys(evidence ?? {}).length === 0 ? (
          <div className="text-sm text-gray-500">No evidence attached.</div>
        ) : (
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto">
            {JSON.stringify(evidence, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}

function DecisionsHistory({ decisions }: { decisions: Decision[] }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="font-medium text-gray-800">Decisions</div>
        <span className="text-xs text-gray-500">{decisions.length} total</span>
      </div>
      <div className={cx(CARD_BODY, "space-y-2")}>
        {decisions.map((d) => (
          <div key={d.decisionId} className="border border-gray-100 rounded p-3 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <LookupBadge domain="DECISION_TYPE" code={d.decisionType} />
              <span className="text-xs text-gray-500">
                {formatRelative(d.decidedAt)} · {d.decidedByRole ?? "reviewer"}
              </span>
            </div>
            {d.justification && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{d.justification}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function MitigationsList({ items }: { items: Mitigation[] }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="font-medium text-gray-800">Mitigations</div>
        <span className="text-xs text-gray-500">{items.length} attached</span>
      </div>
      <div className={cx(CARD_BODY, "space-y-1")}>
        {items.map((m) => (
          <div key={m.mitigationId} className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-2">
              <LookupBadge domain="MITIGATION_STATUS" code={m.status} />
              <span>{m.controlCode}</span>
            </div>
            <div className="text-xs text-gray-500">
              {m.expiresAt ? <>expires {formatRelative(m.expiresAt)}</> : "—"}
              {m.verifiedAt && <span className="ml-2">verified</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RemediationsList({ items }: { items: Remediation[] }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="font-medium text-gray-800">Remediations</div>
        <span className="text-xs text-gray-500">{items.length} queued / executed</span>
      </div>
      <div className={cx(CARD_BODY, "space-y-1")}>
        {items.map((r) => (
          <div key={r.remediationId} className="flex items-center justify-between text-sm py-1 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <LookupBadge domain="REMEDIATION_STATUS" code={r.status} />
              <LookupBadge domain="REMEDIATION_MODE" code={r.mode} />
              <span>{r.actionTypeCode}</span>
              <span className="text-xs text-gray-500">→ {r.targetConnector}</span>
            </div>
            <div className="text-xs text-gray-500 inline-flex items-center gap-2 shrink-0">
              {typeof r.blastRadiusEstimate === "number" && <span>blast {r.blastRadiusEstimate}</span>}
              {r.failureReason && <span className="text-red-600">⚠ {r.failureReason}</span>}
              <ExternalLink size={12} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
