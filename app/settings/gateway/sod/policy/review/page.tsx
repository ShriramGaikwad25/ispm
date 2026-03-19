"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, FileText, FolderTree, ShieldCheck, UserRound } from "lucide-react";

const SOD_POLICY_VIEW_STORAGE_KEY = "sodPolicyViewDraft";
const BUSINESS_PROCESS_NAME_BY_ID: Record<string, string> = {
  BP1: "Procure to Pay",
  BP2: "Revenue and Credit Management",
  BP3: "Directory Access Administration",
  BP4: "Identity Governance and Access App",
  BP5: "HR Lifecycle Management",
  BP6: "HCM Platform Operations",
};

type PolicyViewData = {
  policyId: string;
  name: string;
  description: string;
  owner: string;
  riskDefinition: string;
  businessProcess: string;
};

type SodRuleJson = {
  Rule_ID?: string;
  Rule_Name?: string;
  "Business Process ID"?: string;
  "Business Process Name"?: string;
};

type PolicyStatementRow = {
  policyId: string;
  statementType: "MASTER" | "CONFLICT";
  ruleId: string;
  ruleName: string;
};

const EMPTY_DATA: PolicyViewData = {
  policyId: "",
  name: "",
  description: "",
  owner: "",
  riskDefinition: "",
  businessProcess: "",
};

export default function SodPolicyReviewPage() {
  const [data, setData] = useState<PolicyViewData>(EMPTY_DATA);
  const [hasData, setHasData] = useState(false);
  const [policyStatements, setPolicyStatements] = useState<PolicyStatementRow[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOD_POLICY_VIEW_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Partial<PolicyViewData>;
      setData({
        policyId: parsed.policyId ?? "",
        name: parsed.name ?? "",
        description: parsed.description ?? "",
        owner: parsed.owner ?? "",
        riskDefinition: parsed.riskDefinition ?? "",
        businessProcess: parsed.businessProcess ?? "",
      });
      setHasData(true);
    } catch (error) {
      console.error("Unable to load policy review data:", error);
    }
  }, []);

  useEffect(() => {
    if (!hasData || !data.policyId || !data.businessProcess) {
      setPolicyStatements([]);
      return;
    }

    let cancelled = false;

    const loadPolicyStatements = async () => {
      try {
        const rulesRes = await fetch("/SOdRules.json");
        if (!rulesRes.ok) return;

        const rulesJson = (await rulesRes.json()) as SodRuleJson[];
        if (cancelled) return;

        const relevantRules = rulesJson
          .map((rule) => {
            const ruleId = (rule.Rule_ID ?? "").trim();
            const ruleName = (rule.Rule_Name ?? "").trim();
            const bpName =
              (rule["Business Process Name"] ?? "").trim() ||
              BUSINESS_PROCESS_NAME_BY_ID[(rule["Business Process ID"] ?? "").trim()] ||
              "";
            if (!ruleId || bpName !== data.businessProcess) return null;
            return { ruleId, ruleName };
          })
          .filter((item): item is { ruleId: string; ruleName: string } => item !== null);

        const uniqueRules = relevantRules.filter(
          (rule, index, arr) => arr.findIndex((r) => r.ruleId === rule.ruleId) === index
        );

        if (uniqueRules.length === 0) {
          setPolicyStatements([]);
          return;
        }

        // Keep previous-tab relationship logic:
        // Business Process -> ordered Rules list from SOdRules.json.
        // Use the last mapped rule as MASTER and the remaining as CONFLICT.
        const masterRule = uniqueRules[uniqueRules.length - 1];
        const conflictRules = uniqueRules.slice(0, -1);

        const mapped: PolicyStatementRow[] = [
          {
            policyId: data.policyId,
            statementType: "MASTER",
            ruleId: masterRule.ruleId,
            ruleName: masterRule.ruleName,
          },
          ...conflictRules.map((rule) => ({
            policyId: data.policyId,
            statementType: "CONFLICT" as const,
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
          })),
        ];

        setPolicyStatements(mapped);
      } catch (error) {
        console.error("Unable to load policy statement mapping:", error);
      }
    };

    loadPolicyStatements();

    return () => {
      cancelled = true;
    };
  }, [data.businessProcess, data.policyId, hasData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="rounded-xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review SoD Policy</h1>
              <p className="mt-1 text-xs text-gray-600">
                Review policy details before making updates.
              </p>
            </div>
            {hasData && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {data.policyId || "Policy"}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {!hasData ? (
            <p className="text-sm text-gray-600">
              No policy selected. Please use the View action from the SoD Policy tab.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <FolderTree className="h-4 w-4 text-blue-600" />
                    Policy ID
                  </p>
                  <p className="text-xs font-medium text-gray-900">{data.policyId || "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Name
                  </p>
                  <p className="text-xs font-medium text-gray-900">{data.name || "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <UserRound className="h-4 w-4 text-blue-600" />
                    Owner
                  </p>
                  <p className="text-xs font-medium text-gray-900">{data.owner || "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                    Mitigating Controls
                  </p>
                  <p className="text-xs font-medium text-gray-900 whitespace-pre-wrap">
                    {data.riskDefinition || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <FolderTree className="h-4 w-4 text-blue-600" />
                    Business Process
                  </p>
                  <p className="text-xs font-medium text-gray-900">{data.businessProcess || "-"}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Description
                </p>
                <p className="text-xs leading-5 text-gray-900 whitespace-pre-wrap">
                  {data.description || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Policy Statement Mapping
                  </p>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {policyStatements.length} Rows
                  </span>
                </div>
                {policyStatements.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-gray-700">
                    No policy statement mapping found for this policy.
                  </p>
                ) : (
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Policy
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Statement_Type
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Rule
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {policyStatements.map((row) => (
                          <tr key={`${row.policyId}-${row.statementType}-${row.ruleId}`}>
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {data.name ? `${row.policyId} - ${data.name}` : row.policyId}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">{row.statementType}</td>
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {row.ruleName ? `${row.ruleId} - ${row.ruleName}` : row.ruleId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
