"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import HorizontalTabs from "@/components/HorizontalTabs";

type Section = {
  key: string;
  title: string;
  description: string;
};

const TAB_SECTIONS: Record<string, Section[]> = {
  accessReview: [
    {
      key: "riskSignals",
      title: "Risk Signals",
      description: "Configure AI signals used to identify high-risk access review decisions.",
    },
    {
      key: "reviewScoring",
      title: "Review Scoring",
      description: "Set confidence thresholds and recommendation weights for reviewer guidance.",
    },
    {
      key: "anomalyDetection",
      title: "Anomaly Detection",
      description: "Tune anomaly detection rules for unusual user or entitlement behavior.",
    },
    {
      key: "justificationAnalysis",
      title: "Justification Analysis",
      description: "Enable AI checks for decision rationale quality and policy alignment.",
    },
    {
      key: "campaignInsights",
      title: "Campaign Insights",
      description: "Control dashboards and trend summaries shown during access review campaigns.",
    },
  ],
  accessApproval: [
    {
      key: "approvalSuggestions",
      title: "Approval Suggestions",
      description: "Configure how AI generates approve, deny, or escalate recommendations.",
    },
    {
      key: "policyContext",
      title: "Policy Context",
      description: "Define policy and SoD context inputs used for approval-time reasoning.",
    },
    {
      key: "requestSummaries",
      title: "Request Summaries",
      description: "Manage AI-generated request summaries shown to approvers.",
    },
    {
      key: "sensitiveAccessFlags",
      title: "Sensitive Access Flags",
      description: "Set risk markers for privileged and sensitive entitlement requests.",
    },
    {
      key: "approvalAuditing",
      title: "Approval Auditing",
      description: "Control logging and traceability for AI-assisted approval outcomes.",
    },
  ],
  workflows: [
    {
      key: "workflowRecommendations",
      title: "Workflow Recommendations",
      description: "Configure AI recommendations for routing and workflow optimization.",
    },
    {
      key: "slaPredictions",
      title: "SLA Predictions",
      description: "Set prediction behavior for potential SLA breaches and delays.",
    },
    {
      key: "escalationIntelligence",
      title: "Escalation Intelligence",
      description: "Define AI criteria for proactive escalation and reassignment.",
    },
    {
      key: "automationOpportunities",
      title: "Automation Opportunities",
      description: "Enable discovery of repetitive steps suitable for workflow automation.",
    },
    {
      key: "workflowHealthInsights",
      title: "Workflow Health Insights",
      description: "Configure trend analysis for bottlenecks and end-to-end workflow health.",
    },
  ],
};

function CollapsibleSections({ sections }: { sections: Section[] }) {
  const [expandedSections, setExpandedSections] = useState<boolean[]>(
    Array.from({ length: sections.length }, () => false)
  );

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => prev.map((item, idx) => (idx === index ? !item : item)));
  };

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={section.key} className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-4 bg-white font-semibold text-sm hover:bg-gray-50 transition-colors group"
            onClick={() => toggleSection(idx)}
            aria-expanded={expandedSections[idx] ? "true" : "false"}
          >
            <span className="flex-1 text-left mr-3 text-gray-900">{section.title}</span>
            <div className="flex-shrink-0">
              {expandedSections[idx] ? (
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              )}
            </div>
          </button>
          {expandedSections[idx] && (
            <div className="p-4 text-sm bg-gray-50 border-t border-gray-100 text-gray-700">
              {section.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AccessReviewTab() {
  return <CollapsibleSections sections={TAB_SECTIONS.accessReview} />;
}

function AccessApprovalTab() {
  return <CollapsibleSections sections={TAB_SECTIONS.accessApproval} />;
}

function WorkflowsTab() {
  return <CollapsibleSections sections={TAB_SECTIONS.workflows} />;
}

export default function AiInsightsConfigurationPage() {
  const tabs = useMemo(
    () => [
      { label: "Access Review", component: AccessReviewTab },
      { label: "Access Approval", component: AccessApprovalTab },
      { label: "Workflows", component: WorkflowsTab },
    ],
    []
  );

  return (
    <div className="h-full p-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Insights Configuration</h1>
        <HorizontalTabs tabs={tabs} defaultIndex={0} />
      </div>
    </div>
  );
}

