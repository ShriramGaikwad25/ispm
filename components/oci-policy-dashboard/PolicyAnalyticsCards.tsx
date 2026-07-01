"use client";

import Link from "next/link";
import { Network } from "lucide-react";
import type { PolicyListAnalytics } from "@/types/oci-policy";

const COMPARTMENTS_GRAPH_HREF = "/oci-policy-analysis/compartments";

const CARD_SHELL =
  "flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm";

function SummaryStatBox({
  label,
  value,
  accent = "text-gray-900",
  className,
}: {
  label: string;
  value: number | string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={`${CARD_SHELL} ${className ?? ""}`}>
      <p className="mb-1 text-xs leading-snug text-gray-500">{label}</p>
      <p className={`mt-auto text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

const SUBJECT_KIND_LABELS: { key: keyof PolicyListAnalytics["subjectsByKind"]; label: string }[] =
  [
    { key: "GROUP", label: "Groups" },
    { key: "DYNAMIC_GROUP", label: "Dynamic groups" },
    { key: "SERVICE", label: "Services" },
    { key: "UNKNOWN", label: "Unknown" },
  ];

function GraphShortcutCard({ className }: { className?: string }) {
  return (
    <Link
      href={COMPARTMENTS_GRAPH_HREF}
      className={`${CARD_SHELL} group flex min-h-[88px] items-center justify-center transition-colors hover:border-blue-300 hover:bg-blue-50/50 ${className ?? ""}`}
      aria-label="View compartment graph"
      title="View compartment graph"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
        <Network className="h-7 w-7" aria-hidden />
      </span>
    </Link>
  );
}

function DistinctSubjectsCard({ analytics }: { analytics: PolicyListAnalytics }) {
  return (
    <div className={CARD_SHELL}>
      <p className="mb-1 text-xs leading-snug text-gray-500">Distinct subjects</p>
      <p className="text-2xl font-semibold tabular-nums text-gray-900">
        {analytics.distinctSubjects}
      </p>
      <div className="mt-auto space-y-2 border-t border-gray-100 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          By kind
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUBJECT_KIND_LABELS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs"
            >
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold tabular-nums text-gray-800">
                {analytics.subjectsByKind[key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PolicyAnalyticsCards({ analytics }: { analytics: PolicyListAnalytics }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:grid-rows-2">
      <SummaryStatBox
        label="Total policies"
        value={analytics.totalPolicies}
        accent="text-blue-700"
        className="xl:col-start-1 xl:row-start-1"
      />
      <SummaryStatBox
        label="Total statements"
        value={analytics.totalStatements}
        accent="text-blue-700"
        className="xl:col-start-2 xl:row-start-1"
      />
      <SummaryStatBox
        label="Distinct compartments"
        value={analytics.distinctCompartments}
        className="xl:col-start-3 xl:row-start-1"
      />
      <SummaryStatBox
        label="Distinct resources"
        value={analytics.distinctResources}
        className="xl:col-start-1 xl:row-start-2"
      />
      <SummaryStatBox
        label="High Risk"
        value={analytics.highRiskStatements}
        accent={analytics.highRiskStatements > 0 ? "text-red-700" : "text-gray-900"}
        className="xl:col-start-2 xl:row-start-2"
      />
      <SummaryStatBox
        label="Conditional statements"
        value={analytics.conditionalStatements}
        accent="text-amber-700"
        className="xl:col-start-3 xl:row-start-2"
      />

      <GraphShortcutCard className="xl:col-start-4 xl:row-start-1" />
      <SummaryStatBox
        label="Unparsable statements"
        value={analytics.unparsableStatements}
        accent={analytics.unparsableStatements > 0 ? "text-red-700" : "text-gray-900"}
        className="xl:col-start-4 xl:row-start-2"
      />

      <div className="col-span-2 sm:col-span-3 xl:col-start-5 xl:row-start-1 xl:row-span-2 xl:col-span-1">
        <DistinctSubjectsCard analytics={analytics} />
      </div>
    </div>
  );
}
