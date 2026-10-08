"use client";

import { useMemo, useState } from "react";
import { Check, CornerUpRight, Hourglass, Shield, X } from "lucide-react";
import { useDecide, useLookupMap } from "@/hooks/useAssuranceEvents";
import type { ComplianceEvent, DecisionRequest, EventDefinition } from "@/lib/assurance-events-api";
import {
  BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_BODY, CARD_HEADER, INPUT, INPUT_BASE, LABEL, LookupSelect, Spinner,
  cx,
} from "./ui";

type MitigationDraft = {
  controlCode: string;
  parameters: Record<string, unknown>;
  expiresAt?: string;
};

/**
 * Decision form. What the form asks for comes from the chosen DECISION_TYPE
 * lookup's metadata: requires_mitigation, requires_expiry, moves_to_status,
 * and system_only (hidden from reviewers).
 */
export function DecisionPanel({ event, definition, aiRecommendation }: {
  event: ComplianceEvent;
  definition?: EventDefinition;
  aiRecommendation?: string;
}) {
  const decide = useDecide();
  const { map: decisionMeta } = useLookupMap("DECISION_TYPE");

  const [decisionType, setDecisionType] = useState<string>(aiRecommendation ?? "");
  const [justification, setJustification] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [mitigations, setMitigations] = useState<MitigationDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const meta = decisionType ? (decisionMeta.get(decisionType)?.metadata as Record<string, unknown>) : undefined;
  const requiresMitigation = meta?.requires_mitigation === true;
  const requiresExpiry = meta?.requires_expiry === true;
  const movesTo = (meta?.moves_to_status as string | undefined) ?? "";

  const allowedMitigations = useMemo(
    () => new Set(definition?.allowedMitigationCodes ?? []),
    [definition]
  );

  const canSubmit =
    decisionType &&
    (!requiresMitigation || mitigations.length > 0) &&
    (!requiresExpiry || expiresAt) &&
    !decide.isPending;

  const reset = () => {
    setDecisionType("");
    setJustification("");
    setExpiresAt("");
    setMitigations([]);
    setError(null);
  };

  const submit = () => {
    setError(null);
    const body: DecisionRequest = {
      decisionType,
      justification: justification.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      mitigations: mitigations.length
        ? mitigations.map((m) => ({
            controlCode: m.controlCode,
            parameters: m.parameters,
            expiresAt: m.expiresAt ? new Date(m.expiresAt).toISOString() : undefined,
          }))
        : undefined,
    };
    decide.mutate(
      { id: event.eventId, body },
      {
        onError: (err) => setError((err as Error).message ?? "Decision failed"),
        onSuccess: reset,
      }
    );
  };

  const closed = ["CLOSED", "SUPPRESSED", "MERGED", "EXPIRED"].includes(event.status);
  if (closed) {
    return (
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <div className="font-medium text-gray-700">Decision</div>
        </div>
        <div className={cx(CARD_BODY, "text-sm text-gray-500")}>
          This event is {event.status.toLowerCase()}. Reopen the event to take a new decision.
        </div>
      </section>
    );
  }

  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="font-medium text-gray-800">Make a decision</div>
        {aiRecommendation && decisionType === aiRecommendation && (
          <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
            Matches AI recommendation
          </span>
        )}
      </div>
      <div className={cx(CARD_BODY, "space-y-4")}>
        <div>
          <div className={LABEL}>Decision type</div>
          <LookupSelect
            domain="DECISION_TYPE"
            value={decisionType}
            onChange={setDecisionType}
            filter={(_c, m) => !(m.system_only === true)}
          />
          {decisionType && (
            <p className="text-xs text-gray-500 mt-1">
              {decisionMeta.get(decisionType)?.description}
              {movesTo && <> · moves to <span className="font-semibold">{movesTo}</span></>}
            </p>
          )}
        </div>

        {requiresExpiry && (
          <div>
            <div className={LABEL}>Expires at (required for risk acceptance)</div>
            <input type="datetime-local" className={INPUT} value={expiresAt}
                   onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        )}

        <div>
          <div className={LABEL}>Business justification</div>
          <textarea
            rows={3}
            className={INPUT}
            placeholder="What is the business reason for this decision?"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>

        {requiresMitigation && (
          <div>
            <div className={cx(LABEL, "flex items-center justify-between")}>
              <span>Mitigations (at least one)</span>
              <button
                className="text-xs text-blue-700 hover:underline"
                onClick={() => setMitigations([...mitigations, { controlCode: "", parameters: {} }])}
                type="button"
              >
                + Add mitigation
              </button>
            </div>
            <div className="space-y-2">
              {mitigations.length === 0 && <div className="text-xs text-gray-500">No mitigations attached.</div>}
              {mitigations.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={cx(INPUT, "flex-1 min-w-0")}
                    value={m.controlCode}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...m, controlCode: e.target.value };
                      setMitigations(next);
                    }}
                  >
                    <option value="" disabled>Choose control…</option>
                    {[...allowedMitigations].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="datetime-local"
                    className={cx(INPUT_BASE, "w-48 shrink-0")}
                    value={m.expiresAt ?? ""}
                    onChange={(e) => {
                      const next = [...mitigations];
                      next[i] = { ...m, expiresAt: e.target.value };
                      setMitigations(next);
                    }}
                  />
                  <button
                    className={cx(BTN_GHOST, "p-2")}
                    onClick={() => setMitigations(mitigations.filter((_, j) => j !== i))}
                    type="button"
                    aria-label="Remove mitigation"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            {definition && allowedMitigations.size > 0 && (
              <div className="text-[11px] text-gray-500 mt-1">
                Definition restricts to: {[...allowedMitigations].join(", ")}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{error}</div>
        )}

        <div className="flex items-center gap-2">
          <button className={BTN_PRIMARY} disabled={!canSubmit} onClick={submit}>
            {decide.isPending ? <Spinner size={14} className="text-white" /> : <Check size={14} />}
            Submit decision
          </button>
          <button className={BTN_SECONDARY} onClick={reset} type="button">Reset</button>
        </div>
      </div>
    </section>
  );
}

/** Small action toolbar shown above the event — reopen / suppress. */
export function EventActions({ onReopen, onSuppress, status, busy }: {
  onReopen: () => void; onSuppress: () => void; status: string; busy?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {["CLOSED", "SUPPRESSED", "EXPIRED"].includes(status) && (
        <button className={cx(BTN_SECONDARY, "text-xs")} onClick={onReopen} disabled={busy}>
          <CornerUpRight size={14} /> Reopen
        </button>
      )}
      {!["SUPPRESSED", "CLOSED"].includes(status) && (
        <button className={cx(BTN_SECONDARY, "text-xs")} onClick={onSuppress} disabled={busy}>
          <Hourglass size={14} /> Suppress
        </button>
      )}
      <span className="text-xs text-gray-400 ml-2">
        <Shield size={12} className="inline -mt-0.5 mr-1" />
        Decision signed and audited.
      </span>
    </div>
  );
}
