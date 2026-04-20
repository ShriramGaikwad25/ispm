"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { RotateCw } from "lucide-react";
import { executeQuery } from "@/lib/api";
import { secretHealthArcColor } from "@/lib/chart-colors";
import {
  buildGovernanceView,
  DASHBOARD_V2_QUERY,
  FINDINGS_SEVERITY_QUERY,
  getNormalizedDashboardV2Row,
  GOVERNANCE_TENANT_ID,
  parseFindingsSeverityResponse,
  severityChartColor,
  type GovernanceViewModel,
  type MetricTone,
} from "@/lib/governance-posture";
import { extractResultRows } from "@/lib/nhi-dashboard";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Doughnut = dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), { ssr: false });
const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), { ssr: false });

const EMPTY_VIEW = buildGovernanceView(null, []);

function metricValueClass(tone: MetricTone): string {
  switch (tone) {
    case "blue":
      return "text-blue-600";
    case "amber":
      return "text-amber-600";
    case "red":
      return "text-red-600";
    default:
      return "text-gray-900";
  }
}

function barColor(score: number): string {
  if (score <= 0) return "#e5e7eb";
  if (score < 50) return "#ef4444";
  if (score < 75) return "#eab308";
  return "#22c55e";
}

export function GovernancePostureDashboard() {
  const [view, setView] = useState<GovernanceViewModel>(EMPTY_VIEW);
  const [payloadJson, setPayloadJson] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const tenant = GOVERNANCE_TENANT_ID;
      const [dashRes, findRes] = await Promise.all([
        executeQuery<unknown>(DASHBOARD_V2_QUERY, [tenant]),
        executeQuery<unknown>(FINDINGS_SEVERITY_QUERY, [tenant]),
      ]);
      const norm = getNormalizedDashboardV2Row(dashRes);
      const findings = parseFindingsSeverityResponse(findRes);
      setView(buildGovernanceView(norm, findings));
      setPayloadJson(
        JSON.stringify(
          {
            dashboard: norm ?? extractResultRows(dashRes)[0] ?? null,
            findingsBySeverity: findings,
          },
          null,
          2
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load governance data";
      setError(msg);
      setView(EMPTY_VIEW);
      setPayloadJson(
        JSON.stringify({ error: msg, dashboard: null, findingsBySeverity: [] }, null, 2)
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const overallScore = view.overallScore;
  const gaugeArcColor = secretHealthArcColor(Math.min(100, Math.max(0, overallScore)));

  const gaugeData = useMemo(
    () => ({
      labels: ["Score", "Rest"],
      datasets: [
        {
          data: [overallScore, Math.max(0, 100 - overallScore)],
          backgroundColor: [gaugeArcColor, "#e5e7eb"],
          borderWidth: 0,
          circumference: 180,
          rotation: -90,
        },
      ],
    }),
    [overallScore, gaugeArcColor]
  );

  const subScoresChart = useMemo(() => {
    const values = view.subScores.map((s) => s.value);
    return {
      labels: view.subScores.map((s) => s.label),
      datasets: [
        {
          label: "Score",
          data: values,
          backgroundColor: values.map(barColor),
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    };
  }, [view.subScores]);

  const findingsChart = useMemo(() => {
    const rows = view.findingsBySeverity;
    if (!rows.length) return null;
    return {
      labels: rows.map((s) => s.severity),
      datasets: [
        {
          data: rows.map((s) => s.n),
          backgroundColor: rows.map((s) => severityChartColor(s.severity)),
          borderWidth: 0,
        },
      ],
    };
  }, [view.findingsBySeverity]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Governance Posture
        </h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
        >
          <RotateCw
            className={`h-4 w-4 ${refreshing || loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </button>
      </div>

      {(loading || error) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {loading && <span className="text-slate-500">Loading…</span>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-5">
          <div className="relative mx-auto h-[200px] max-w-[300px]">
            <Doughnut
              data={gaugeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "78%",
                layout: { padding: { top: 8, bottom: 24 } },
                plugins: {
                  legend: { display: false },
                  tooltip: { enabled: false },
                },
              }}
            />
            <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center text-center">
              <span className="text-4xl font-semibold tabular-nums text-slate-900">
                {Number.isFinite(overallScore)
                  ? overallScore.toFixed(1)
                  : "—"}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Overall posture
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
          {view.metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {m.label}
              </p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${metricValueClass(m.tone)}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Sub-scores
        </h2>
        <div className="h-[280px] w-full">
          <Bar
            data={subScoresChart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.label}: ${ctx.raw}`,
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { font: { size: 11 }, color: "#64748b" },
                },
                y: {
                  min: 0,
                  max: 100,
                  grid: { color: "#f1f5f9" },
                  ticks: { stepSize: 25, font: { size: 11 }, color: "#64748b" },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Open findings by severity
          </h2>
          {!view.findingsBySeverity.length ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No open findings for this tenant.
            </p>
          ) : findingsChart ? (
            <div className="mx-auto flex h-[260px] max-w-[320px] items-center justify-center">
              <Doughnut
                data={findingsChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                      labels: { boxWidth: 12, font: { size: 11 }, color: "#475569" },
                    },
                  },
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex min-h-[280px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
          <h2 className="border-b border-gray-100 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Raw dashboard payload
          </h2>
          <pre className="max-h-[360px] flex-1 overflow-auto p-4 text-left text-xs leading-relaxed text-slate-800">
            <code className="font-mono">{payloadJson}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
