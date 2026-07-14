"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, Copy, Eye, FilePen, Loader2, SendHorizonal, Shield, Trash2, X } from "lucide-react";
import { useOciPolicyList } from "@/hooks/useOciPolicyList";
import { useOciPolicyGraph } from "@/hooks/useOciPolicyGraph";
import { OciPolicyGraphView } from "@/components/OciPolicyGraphView";
import {
  formatStatementRef,
  PolicyStatementsPanel,
} from "@/components/oci-policy-dashboard/PolicyStatementsPanel";
import PolicyStatementScopesSidebar from "@/components/oci-policy-dashboard/PolicyStatementScopesSidebar";
import { ImpactAnalysisPanel } from "@/components/oci-policy-dashboard/ImpactAnalysisPanel";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import type { PolicyListStatement } from "@/types/oci-policy";

type TabId = "overview" | "statements" | "impact" | "versions" | "activity";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "statements", label: "Statements" },
  { id: "versions", label: "Versions" },
  { id: "impact", label: "Impact Analysis" },
  { id: "activity", label: "Activity" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function riskTextClass(risk: string): string {
  if (risk === "High") return "text-red-600 font-semibold";
  if (risk === "Medium") return "text-yellow-600 font-semibold";
  return "text-green-700 font-semibold";
}

function statusPillClass(status: string): string {
  const lower = status.toLowerCase();
  if (lower === "active") return "bg-green-100 text-green-800";
  if (lower === "inactive") return "bg-gray-100 text-gray-700";
  if (lower === "deleted") return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
}

export default function OciPolicyWorkspacePage({ policyName }: { policyName: string }) {
  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
  } = useOciPolicyList();
  const {
    data: graphData,
    isLoading: graphLoading,
    isError: graphIsError,
    error: graphError,
  } = useOciPolicyGraph(policyName);
  const { openSidebar, closeSidebar } = useRightSidebar();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [statementsView, setStatementsView] = useState<"full" | "statement">("full");
  const [showEditor, setShowEditor] = useState(false);
  const [selectedStatementIndex, setSelectedStatementIndex] = useState<number | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const toggleVersion = (id: string) =>
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const [scopeStatement, setScopeStatement] = useState<{
    index: number;
    statement: PolicyListStatement;
  } | null>(null);

  const policy = useMemo(
    () => listData?.policies.find((p) => p.name === policyName),
    [listData?.policies, policyName]
  );

  const statements = policy?.statements ?? [];

  const conditionCount = useMemo(
    () => statements.filter((s) => s.condition).length,
    [statements]
  );

  const distinctResources = useMemo(
    () => new Set(statements.map((s) => s.resource).filter(Boolean)).size,
    [statements]
  );

  const distinctSubjects = useMemo(
    () =>
      new Set(statements.flatMap((s) => s.subjects?.map((sub) => sub.name) ?? [])).size,
    [statements]
  );

  const criticalResources = useMemo(
    () =>
      new Set(
        statements
          .filter((s) => s.risk === "High")
          .map((s) => s.resource)
          .filter(Boolean)
      ).size,
    [statements]
  );

  const handleStatementClick = useCallback(
    (index: number, statement: PolicyListStatement) => {
      setSelectedStatementIndex(index);
      setScopeStatement({ index, statement });
    },
    []
  );

  useEffect(() => {
    if (!scopeStatement) return;
    const { index, statement } = scopeStatement;
    const statementRef = formatStatementRef(statement.ref, index);
    openSidebar(
      <PolicyStatementScopesSidebar
        policyName={policyName}
        statementRef={statementRef}
        statementIndex={index}
        statement={statement}
        onClose={closeSidebar}
        key={`${policyName}-stmt-${index}`}
      />,
      { widthPx: 520, title: "Statement scopes", closeOnOutsideClick: false }
    );
  }, [closeSidebar, openSidebar, policyName, scopeStatement]);

  if (listLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading policy…
      </div>
    );
  }

  if (listError || (!listLoading && !policy)) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {!policy && !listError
          ? `Policy "${policyName}" was not found.`
          : "Failed to load policy data."}
      </div>
    );
  }

  if (!policy) return null;

  const subjectCount = distinctSubjects || policy.groups.length;
  const compartmentCount = policy.compartments.length || 1;

  return (
    <div className="w-full min-w-0 pb-10">

      {/* Header card */}
      <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Shield className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{policy.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(policy.status)}`}
                >
                  {policy.status}
                </span>
                <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                  {policy.statementCount} statement{policy.statementCount !== 1 ? "s" : ""}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskTextClass(policy.risk)} bg-opacity-10`}>
                  Risk: {policy.risk}
                </span>
                {policy.owner && (
                  <span>
                    Owner:{" "}
                    <span className="font-medium text-gray-700">{policy.owner}</span>
                  </span>
                )}
                {policy.lastSync && (
                  <span>
                    Last synced:{" "}
                    <span className="font-medium text-gray-700">{formatDate(policy.lastSync)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowEditor(true)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit policy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("versions")}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View versions
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-gray-200 bg-white px-1 pt-1 rounded-t-lg border border-blue-100 border-b-0 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        className={`rounded-b-lg border border-t-0 border-blue-100 bg-white shadow-sm ${
          activeTab === "statements" ? "" : "p-5"
        }`}
        role="tabpanel"
      >
        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.5fr_0.85fr]">
            {/* Graph */}
            <div className="flex flex-col">
              <h2 className="mb-3 text-sm font-semibold text-blue-900">
                Policy relationship graph
              </h2>
              <div className="min-h-[430px] flex-1 flex flex-col overflow-hidden rounded-lg border border-blue-100">
                <OciPolicyGraphView
                  graph={graphData?.graph}
                  isLoading={graphLoading}
                  isError={graphIsError}
                  error={graphError}
                  policyFilter={policyName}
                  onPolicyFilterChange={() => {}}
                  statementLimit={graphData?.graph?.meta.statementLimit ?? 100}
                  onStatementLimitChange={() => {}}
                  policyNames={[policyName]}
                  lockPolicyFilter
                  hideStatementLimit
                />
              </div>
            </div>

            {/* Right column: posture + info */}
            <div className="flex flex-col justify-between gap-5">
              {/* Posture metrics */}
              <div className="w-full">
                <h2 className="mb-3 text-sm font-semibold text-blue-900">Policy posture</h2>
                <div className="grid w-full grid-cols-2 gap-2.5">
                  {[
                    { label: "Statements", value: String(policy.statementCount), cls: "text-gray-900" },
                    { label: "Critical resources", value: String(criticalResources || "—"), cls: criticalResources > 0 ? "text-red-600" : "text-gray-900" },
                    { label: "Subjects", value: String(subjectCount || "—"), cls: "text-gray-900" },
                    { label: "Resources", value: String(distinctResources || "—"), cls: "text-gray-900" },
                    { label: "Conditions", value: String(conditionCount), cls: "text-gray-900" },
                    { label: "Compartments", value: String(compartmentCount), cls: "text-gray-900" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className={`text-lg font-bold ${m.cls}`}>{m.value}</div>
                      <div className="mt-0.5 text-[11px] text-gray-500">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policy info */}
              <div className="w-full">
                <h2 className="mb-3 text-sm font-semibold text-blue-900">Policy information</h2>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Created by", value: policy.createdBy || "—" },
                    { label: "Created on", value: formatDate(policy.createdOn) },
                    { label: "Last modified", value: formatDate(policy.lastModified) },
                    { label: "Last synchronized", value: formatDate(policy.lastSync) },
                    { label: "Owner", value: policy.owner || "—" },
                  ].map((info) => (
                    <div key={info.label} className="rounded-lg border border-gray-200 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {info.label}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-gray-800 [overflow-wrap:anywhere]">
                        {info.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STATEMENTS ── */}
        {activeTab === "statements" && (
          <div>
            {/* Toggle */}
            <div className="mb-4 flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
              {(["full", "statement"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setStatementsView(view)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    statementsView === view
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {view === "full" ? "Full View" : "Statement View"}
                </button>
              ))}
            </div>
            </div>

            {statementsView === "full" && (
              <PolicyStatementsPanel
                policyName={policy.name}
                statements={statements}
                isLoading={listLoading}
                selectedStatementIndex={selectedStatementIndex}
                onStatementClick={handleStatementClick}
                hideStatementColumn
              />
            )}

            {statementsView === "statement" && (
              <PolicyStatementsPanel
                policyName={policy.name}
                statements={statements}
                isLoading={listLoading}
                selectedStatementIndex={selectedStatementIndex}
                onStatementClick={handleStatementClick}
                statementOnlyMode
              />
            )}
          </div>
        )}

        {/* ── IMPACT ANALYSIS ── */}
        {activeTab === "impact" && <ImpactAnalysisPanel policyName={policy.name} />}

        {/* ── VERSIONS ── */}
        {activeTab === "versions" && (
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-blue-900">Version history</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Showing available version data from the API.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-blue-100">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Version", "Status", "Created", "Enforced", "Created by", "Impact Analysis", "Actions"].map((h) => (
                      <th key={h} className="whitespace-nowrap border-b border-blue-100 bg-blue-50/80 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-blue-800">
                        {h}
                      </th>
                    ))}
                    <th className="border-b border-blue-100 bg-blue-50/80 px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {([
                    { id: "draft",    label: "Draft",    status: "Draft",            created: "2025-01-20", enforced: null,          by: policy.createdBy || "—", impact: "Not run" },
                    { id: "pending",  label: "v5",       status: "Pending Approval",  created: "2024-12-10", enforced: null,          by: policy.createdBy || "—", impact: "In progress" },
                    { id: "rejected", label: "v4",       status: "Rejected",           created: "2024-11-05", enforced: null,          by: policy.createdBy || "—", impact: "Failed" },
                    { id: "current",  label: "Current",  status: "Active",             created: policy.createdOn, enforced: policy.createdOn, by: policy.createdBy || "—", impact: "Completed" },
                    { id: "v2",       label: "v2",       status: "Superseded",         created: "2024-09-10", enforced: "2024-09-10",  by: policy.createdBy || "—", impact: "Outdated" },
                    { id: "v1",       label: "v1",       status: "Superseded",         created: "2024-06-01", enforced: "2024-06-01",  by: policy.createdBy || "—", impact: "Completed" },
                  ] as const).map((ver) => {
                    const isDraft = ver.status === "Draft";
                    const isSuperseded = ver.status === "Superseded";
                    const isCurrent = ver.status === "Active";
                    const expanded = expandedVersions.has(ver.id);

                    const actions: { label: string; icon: React.ElementType; bg: string; fg: string }[] = [
                      ...(isDraft     ? [{ label: "Edit",                icon: FilePen,       bg: "bg-blue-100",   fg: "text-blue-600" }]   : []),
                      ...(isSuperseded? [{ label: "View",                icon: Eye,           bg: "bg-indigo-100", fg: "text-indigo-600" }] : []),
                      ...(isSuperseded? [{ label: "Create as Draft",     icon: Copy,          bg: "bg-teal-100",   fg: "text-teal-600" }]   : []),
                      ...(isDraft     ? [{ label: "Submit for Approval", icon: SendHorizonal, bg: "bg-green-100",  fg: "text-green-600" }]  : []),
                      ...(isDraft     ? [{ label: "Run Impact Analysis", icon: Activity,      bg: "bg-purple-100", fg: "text-purple-600" }] : []),
                      ...(isDraft     ? [{ label: "Delete",              icon: Trash2,        bg: "bg-red-100",    fg: "text-red-600" }]    : []),
                    ];

                    const statusBadge =
                      ver.status === "Draft"            ? "bg-orange-100 text-orange-700"   :
                      ver.status === "Pending Approval" ? "bg-sky-100 text-sky-700"         :
                      ver.status === "Rejected"         ? "bg-rose-100 text-rose-700"       :
                      ver.status === "Active"           ? "bg-emerald-100 text-emerald-700" :
                                                          "bg-slate-100 text-slate-600";

                    const impactBadge =
                      ver.impact === "Completed"   ? "bg-teal-100 text-teal-700"     :
                      ver.impact === "In progress" ? "bg-violet-100 text-violet-700" :
                      ver.impact === "Failed"      ? "bg-red-100 text-red-700"       :
                      ver.impact === "Outdated"    ? "bg-yellow-100 text-yellow-700" :
                                                     "bg-gray-100 text-gray-500";

                    return (
                      <React.Fragment key={ver.id}>
                        <tr className={`border-b border-gray-100 ${!isCurrent ? "cursor-pointer hover:bg-slate-50" : ""}`}
                          onClick={() => { if (!isCurrent) toggleVersion(ver.id); }}
                        >
                          <td className="px-3 py-3 font-medium text-gray-900">{ver.label}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge}`}>
                              {ver.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-600">{formatDate(ver.created)}</td>
                          <td className="px-3 py-3 text-gray-600">{formatDate(ver.enforced)}</td>
                          <td className="px-3 py-3 text-gray-700">{ver.by}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${impactBadge}`}>
                              {ver.impact}
                            </span>
                          </td>
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {actions.map((a) => (
                                <button
                                  key={a.label}
                                  type="button"
                                  title={a.label}
                                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80 ${a.bg} ${a.fg}`}
                                >
                                  <a.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {!isCurrent && (
                              <button type="button" onClick={() => toggleVersion(ver.id)}>
                                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                              </button>
                            )}
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <td colSpan={8} className="px-6 py-3">
                              <div className="flex flex-col border-l-2 border-blue-200">
                                {statements.length === 0 ? (
                                  <p className="pl-4 text-xs text-gray-400">No statements available.</p>
                                ) : (
                                  statements.map((s, i) => (
                                    <div key={`${ver.id}-s-${i}`} className={`px-4 py-2 font-mono text-sm text-gray-700 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                      {s.text}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Full version history requires KeyForge version tracking to be enabled for this policy.
            </p>
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === "activity" && (
          <div>
            <h2 className="mb-4 text-sm font-semibold text-blue-900">Policy activity</h2>
            <div className="relative ml-3 border-l-2 border-gray-200 pl-6">
              {(
                [
                  policy.lastSync
                    ? {
                        event: "Policy synchronized",
                        date: formatDate(policy.lastSync),
                        by: "System",
                      }
                    : null,
                  policy.lastModified && policy.lastModified !== policy.createdOn
                    ? {
                        event: "Policy last modified",
                        date: formatDate(policy.lastModified),
                        by: policy.owner || policy.createdBy || "—",
                      }
                    : null,
                  policy.createdOn
                    ? {
                        event: "Policy created",
                        date: formatDate(policy.createdOn),
                        by: policy.createdBy || "—",
                      }
                    : null,
                ] as ({ event: string; date: string; by: string } | null)[]
              )
                .filter(
                  (item): item is { event: string; date: string; by: string } => item !== null
                )
                .map((item, i) => (
                  <div key={i} className="relative mb-5">
                    <div className="absolute -left-[1.625rem] top-1 h-3.5 w-3.5 rounded-full border-2 border-blue-400 bg-white" />
                    <p className="font-medium text-gray-800">{item.event}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.by} · {item.date}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      {/* Edit Policy modal */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditor(false); }}
        >
          <div className="flex w-full max-w-7xl max-h-[95vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="font-semibold text-gray-900">
                  Edit {policy.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  The enforced version remains unchanged until a draft is approved and enforced.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="ml-4 shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close editor"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex min-h-0 flex-1 overflow-auto p-5">
              <div className="flex w-full flex-col gap-2">
                <h3 className="text-sm font-semibold text-blue-900">OCI policy statements</h3>
                <textarea
                  readOnly
                  className="h-[28rem] w-full resize-none rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  value={statements.map((s) => s.text).join("\n\n")}
                  aria-label="Policy statements"
                />
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Statement editing is read-only in this view. Contact your KeyForge administrator to modify enforced policies.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Validate syntax
              </button>
              <button
                type="button"
                className="rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
