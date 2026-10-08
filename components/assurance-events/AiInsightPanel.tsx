"use client";

import type { ReactNode } from "react";
import { Activity, AlertTriangle, Brain, History, Radar, RefreshCw, TrendingUp, Users } from "lucide-react";
import { useAiInsight, useRefreshInsight } from "@/hooks/useAssuranceEvents";
import { formatRelative } from "@/lib/assurance-format";
import type { UUID } from "@/lib/assurance-events-api";
import { BADGE, BTN_GHOST, CARD, CARD_BODY, CARD_HEADER, LookupBadge, Spinner, cx } from "./ui";

export function AiInsightPanel({ eventId }: { eventId: UUID }) {
  const { data, isLoading } = useAiInsight(eventId);
  const refresh = useRefreshInsight();

  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <div className="flex items-center gap-2 text-gray-800 flex-wrap">
          <Brain size={16} className="text-blue-500" />
          <span className="font-medium">AI insight</span>
          {data && (
            <span className="text-xs text-gray-500">model {data.modelVersion} · {formatRelative(data.generatedAt)}</span>
          )}
        </div>
        <button className={cx(BTN_GHOST, "text-xs px-2 py-1")}
                onClick={() => refresh.mutate(eventId)} disabled={refresh.isPending}>
          {refresh.isPending ? <Spinner size={12} /> : <RefreshCw size={12} />}
          Refresh
        </button>
      </div>
      <div className={CARD_BODY}>
        {isLoading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2"><Spinner /> Generating insight…</div>
        ) : !data ? (
          <div className="text-sm text-gray-500">No insight generated yet.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {data.recommendedDecision && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Recommend:</span>
                  <LookupBadge domain="DECISION_TYPE" code={data.recommendedDecision} />
                </div>
              )}
              {typeof data.riskScore === "number" && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <TrendingUp size={14} className="text-red-500" />
                  Risk <span className="font-semibold">{data.riskScore.toFixed(0)}</span>/100
                </span>
              )}
              {typeof data.confidence === "number" && (
                <span className="text-sm text-gray-600">Confidence {(data.confidence * 100).toFixed(0)}%</span>
              )}
            </div>

            {data.rationale && (
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-3">
                {data.rationale}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
              {data.peerAnalysis && (
                <InsightTile icon={<Users size={14} />} title="Peer analysis">
                  {typeof data.peerAnalysis.withEntitlementPct === "number" && (
                    <div>
                      <span className="font-semibold">{data.peerAnalysis.withEntitlementPct}%</span> of peers
                      {data.peerAnalysis.peerCount ? <> ({data.peerAnalysis.peerCount}) </> : " "}
                      hold this entitlement.
                    </div>
                  )}
                  {data.peerAnalysis.comparableRoles?.length ? (
                    <div className="text-xs text-gray-500 mt-1">
                      Roles: {data.peerAnalysis.comparableRoles.join(", ")}
                    </div>
                  ) : null}
                </InsightTile>
              )}

              {data.usageSignal && (
                <InsightTile icon={<Activity size={14} />} title="Usage signal">
                  {data.usageSignal.lastUsedAt && <div>Last used {formatRelative(data.usageSignal.lastUsedAt)}.</div>}
                  {typeof data.usageSignal.sessions12m === "number" && (
                    <div>{data.usageSignal.sessions12m} sessions in 12 months.</div>
                  )}
                  {typeof data.usageSignal.anomalyScore === "number" && (
                    <div className="text-xs text-gray-500 mt-1">Anomaly: {data.usageSignal.anomalyScore.toFixed(2)}</div>
                  )}
                </InsightTile>
              )}

              {data.blastRadius && (
                <InsightTile icon={<Radar size={14} />} title="Blast radius">
                  {typeof data.blastRadius.affectedCount === "number" && (
                    <div>{data.blastRadius.affectedCount} principals affected.</div>
                  )}
                  {data.blastRadius.transitivelyGrants?.length ? (
                    <div className="text-xs text-gray-500 mt-1">
                      Grants: {data.blastRadius.transitivelyGrants.slice(0, 3).join(", ")}
                      {data.blastRadius.transitivelyGrants.length > 3 && "…"}
                    </div>
                  ) : null}
                </InsightTile>
              )}

              {data.similarPastDecisions?.length ? (
                <InsightTile icon={<History size={14} />} title="Similar past decisions">
                  <ul className="space-y-0.5">
                    {data.similarPastDecisions.slice(0, 3).map((d) => (
                      <li key={d.eventId} className="text-xs text-gray-600">
                        <LookupBadge domain="DECISION_TYPE" code={d.decisionType} className="mr-1" />
                        {d.outcome ?? ""}
                      </li>
                    ))}
                  </ul>
                </InsightTile>
              ) : null}

              {data.toxicComboFindings?.length ? (
                <InsightTile icon={<AlertTriangle size={14} className="text-orange-500" />} title="Toxic combos">
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    {data.toxicComboFindings.slice(0, 3).map((f, i) => (
                      <li key={i}>{String((f as Record<string, string>).rule ?? JSON.stringify(f))}</li>
                    ))}
                  </ul>
                </InsightTile>
              ) : null}
            </div>

            {data.recommendedMitigations?.length ? (
              <div>
                <div className="text-xs text-gray-500 mb-1">Recommended mitigations</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.recommendedMitigations.map((m) => (
                    <span key={m} className={cx(BADGE, "bg-blue-50 text-blue-700 border border-blue-100")}>{m}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function InsightTile({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
        {icon} {title}
      </div>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
