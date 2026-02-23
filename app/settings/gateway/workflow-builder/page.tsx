"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, Workflow, Plus, X, Minus } from "lucide-react";
import { useForm, Control, FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import MultiSelect from "@/components/MultiSelect";
import { loadUsers, customOption, loadIspmApps } from "@/components/MsAsyncData";
import { asterisk, downArrow, userGroups, excludeUsers, defaultExpression } from "@/utils/utils";
import ExpressionBuilder from "@/components/ExpressionBuilder";
import ToggleSwitch from "@/components/ToggleSwitch";
import FileDropzone from "@/components/FileDropzone";

// Step Palette Categories
const STEP_PALETTE = {
  LOGIC: [
    { id: "user-enabled-check", label: "User Enabled Check", kind: "SYSTEM", type: "LOGIC" },
    { id: "sod-analysis", label: "SoD Analysis", kind: "SYSTEM", type: "LOGIC" },
    { id: "training-check", label: "Training Check", kind: "SYSTEM", type: "LOGIC" },
  ],
  APPROVALS: [
    { id: "manager-approval", label: "Manager Approval", kind: "HUMAN", type: "APPROVAL" },
    { id: "dept-head-approval", label: "Dept Head Approval", kind: "HUMAN", type: "APPROVAL" },
    { id: "app-owner-approval", label: "App Owner Approval", kind: "HUMAN", type: "APPROVAL" },
    { id: "role-owner-approval", label: "Role Owner Approval", kind: "HUMAN", type: "APPROVAL" },
  ],
  FULFILLMENT: [
    { id: "scim-fulfillment", label: "SCIM Fulfillment", kind: "SYSTEM", type: "FULFILLMENT" },
    { id: "itsm-ticket", label: "ITSM Ticket", kind: "SYSTEM", type: "FULFILLMENT" },
  ],
  AI_AGENTS: [
    { id: "ai-auto-approve", label: "AI Auto-Approve Analysis", kind: "AI", type: "AI AGENT" },
    { id: "ai-recommender", label: "AI Recommender", kind: "AI", type: "AI AGENT" },
  ],
};

interface PolicyBuilderProps {
  formData: any;
  setFormData: any;
}

const PolicyBuilder: React.FC<PolicyBuilderProps> = ({ formData, setFormData }) => {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [stepConfig, setStepConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"General" | "Conditions" | "AI Context" | "Approvers">("General");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState<string>("");

  const stages = formData.step2.stages || [];

  const addStage = () => {
    const newStage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${stages.length + 1}`,
      order: stages.length + 1,
      steps: [],
    };
    setFormData((prev: any) => ({
      ...prev,
      step2: {
        ...prev.step2,
        stages: [...prev.step2.stages, newStage],
      },
    }));
    setSelectedStageId(newStage.id);
  };

  const removeStage = (stageId: string) => {
    if (window.confirm("Remove this stage? All steps inside will be lost.")) {
      setFormData((prev: any) => ({
        ...prev,
        step2: {
          ...prev.step2,
          stages: prev.step2.stages
            .filter((s: any) => s.id !== stageId)
            .map((s: any, idx: number) => ({ ...s, order: idx + 1 })),
        },
      }));
      if (selectedStageId === stageId) {
        setSelectedStageId(null);
        setSelectedStepId(null);
        setStepConfig(null);
      }
    }
  };

  const addStepToStage = (stageId: string, stepTemplate: any) => {
    const newStep = {
      id: `step-${Date.now()}`,
      label: stepTemplate.label,
      code: stepTemplate.id.toUpperCase().replace(/-/g, "_"),
      kind: stepTemplate.kind,
      type: stepTemplate.type,
      condition: "true",
    };

    setFormData((prev: any) => ({
      ...prev,
      step2: {
        ...prev.step2,
        stages: prev.step2.stages.map((stage: any) =>
          stage.id === stageId
            ? { ...stage, steps: [...stage.steps, newStep] }
            : stage
        ),
      },
    }));

    setSelectedStepId(newStep.id);
    setStepConfig(newStep);
  };

  const addCustomStep = (stageId: string) => {
    const newStep = {
      id: `step-${Date.now()}`,
      label: "Custom Step",
      code: "CUSTOM_STEP",
      kind: "SYSTEM",
      type: "CUSTOM",
      condition: "true",
    };

    setFormData((prev: any) => ({
      ...prev,
      step2: {
        ...prev.step2,
        stages: prev.step2.stages.map((stage: any) =>
          stage.id === stageId
            ? { ...stage, steps: [...stage.steps, newStep] }
            : stage
        ),
      },
    }));

    setSelectedStepId(newStep.id);
    setStepConfig(newStep);
  };

  const removeStep = (stageId: string, stepId: string) => {
    const step = stages
      .find((s: any) => s.id === stageId)
      ?.steps.find((st: any) => st.id === stepId);
    const stepName = step?.label || "this step";
    
    if (window.confirm(`Are you sure you want to remove "${stepName}"? This action cannot be undone.`)) {
      setFormData((prev: any) => ({
        ...prev,
        step2: {
          ...prev.step2,
          stages: prev.step2.stages.map((stage: any) =>
            stage.id === stageId
              ? { ...stage, steps: stage.steps.filter((s: any) => s.id !== stepId) }
              : stage
          ),
        },
      }));
      if (selectedStepId === stepId) {
        setSelectedStepId(null);
        setStepConfig(null);
      }
    }
  };

  const selectStep = (stageId: string, step: any) => {
    setSelectedStageId(stageId);
    setSelectedStepId(step.id);
    setStepConfig(step);
    setActiveTab("General"); // Reset to General tab when selecting a new step
  };

  const updateStepConfig = (field: string, value: any) => {
    if (!selectedStageId || !selectedStepId) return;

    setFormData((prev: any) => ({
      ...prev,
      step2: {
        ...prev.step2,
        stages: prev.step2.stages.map((stage: any) =>
          stage.id === selectedStageId
            ? {
                ...stage,
                steps: stage.steps.map((s: any) =>
                  s.id === selectedStepId ? { ...s, [field]: value } : s
                ),
              }
            : stage
        ),
      },
    }));

    setStepConfig((prev: any) => (prev ? { ...prev, [field]: value } : null));
  };

  const selectedStep = stages
    .flatMap((s: any) => s.steps.map((step: any) => ({ ...step, stageId: s.id })))
    .find((s: any) => s.id === selectedStepId);

  // Generate JSON preview
  const generateWorkflowJSON = () => {
    const workflowStages = stages.map((stage: any) => {
      // Get the condition from the first step that has a non-default condition, or use "true"
      let stageCondition = "true";
      if (stage.steps.length > 0) {
        const stepWithCondition = stage.steps.find((s: any) => s.condition && s.condition !== "true");
        if (stepWithCondition) {
          stageCondition = stepWithCondition.condition;
        } else if (stage.steps[0].condition) {
          stageCondition = stage.steps[0].condition;
        }
      }
      
      const stageSteps = stage.steps.map((step: any) => {
        const stepJSON: any = {
          code: step.code,
          label: step.label,
          kind: step.kind,
          type: step.type === "AI AGENT" ? "AI_AGENT" : step.type === "FULFILLMENT" ? "FULFILL" : step.type,
          config: {
            blocking: step.blocking !== false,
          },
        };

        // Add AI-specific config
        if (step.type === "AI AGENT") {
          stepJSON.ai = {
            enabled: true,
            peerGroup: step.inputSignals?.peerGroupAnalysis !== false,
            historicalApprovals: step.inputSignals?.historicalApprovals !== false,
            hrCorrelation: step.inputSignals?.hrAttributeCorrelation !== false,
            externalThreat: step.inputSignals?.externalThreatIntel === true,
            confidence: step.confidenceThreshold || 87,
            hardStops: {
              highRisk: step.hardStopRules?.riskHigh !== false,
              sodViolation: step.hardStopRules?.sodViolation !== false,
            },
          };
        }

        // Add Approval-specific config
        if (step.type === "APPROVAL") {
          const resolverMap: Record<string, string> = {
            "line-manager": "FN_RESOLVE_MANAGER",
            "department-head": "FN_RESOLVE_DEPT_HEAD",
            "app-owner": "FN_RESOLVE_APP_OWNER",
            "role-owner": "FN_RESOLVE_ROLE_OWNER",
            "custom": "FN_RESOLVE_CUSTOM",
          };
          stepJSON.config.approverResolver = resolverMap[step.approverResolver] || "FN_RESOLVE_MANAGER";
          stepJSON.config.escalationHours = step.escalateAfter || 24;
          stepJSON.config.skipSelf = step.skipIfRequestorIsApprover !== false;
        }

        // Add condition if not default
        if (step.condition && step.condition !== "true") {
          stepJSON.condition = step.condition;
        }

        // Add Fulfillment-specific config
        if (step.type === "FULFILLMENT") {
          stepJSON.config.mode = "ASYNC";
        }

        // Add Custom-specific config
        if (step.type === "CUSTOM") {
          stepJSON.config.description = step.description || "";
        }

        return stepJSON;
      });

      return {
        name: stage.name,
        order: stage.order,
        condition: stageCondition,
        steps: stageSteps,
      };
    });

    return {
      templateCode: "WF_STD_KEYFORGE",
      version: 1,
      type: "ACCESS_REQUEST",
      stages: workflowStages,
    };
  };

  return (
    <div className="w-full">
      <div className="flex h-[600px] gap-4 w-full mb-4">
      {/* Left Panel - Step Palette */}
      <div className="w-64 bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col h-full">
        <h3 className="text-xs font-semibold text-gray-900 mb-2">STEP PALETTE</h3>
        
        <div className="flex-1 grid grid-cols-1 gap-3 overflow-hidden">
          {Object.entries(STEP_PALETTE).map(([category, steps]) => (
            <div key={category} className="flex flex-col min-h-0">
              <h4 className="text-[10px] font-semibold text-gray-700 mb-1 uppercase">{category.replace(/_/g, " ")}</h4>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (selectedStageId) {
                        addStepToStage(selectedStageId, step);
                      } else {
                        alert("Please select a stage first");
                      }
                    }}
                    className={`w-full text-left px-2 py-1 text-[11px] border rounded transition-colors ${
                      step.type === "AI AGENT"
                        ? "bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400"
                        : "bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400"
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-200 leading-tight">
          Select a stage, then click a chip to add that step. This prototype runs entirely in the browser.
        </p>
      </div>

      {/* Center Panel - Workflow Canvas */}
      <div className="flex-1 bg-gradient-to-b from-white via-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 overflow-x-auto shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Approval Workflow Template</h3>
            <p className="text-sm text-gray-600">
              Design KeyForge approval stages, steps, and AI agents for a given use case.
            </p>
          </div>
        </div>

        <div className="flex gap-5 min-w-max pb-2">
          {stages.map((stage: any) => (
            <div
              key={stage.id}
              className={`min-w-[300px] bg-white rounded-xl p-4 border transition-all duration-200 shadow-sm ${
                selectedStageId === stage.id
                  ? "border-blue-500 ring-1 ring-blue-100 shadow-md"
                  : "border-gray-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  {editingStageId === stage.id ? (
                    <input
                      type="text"
                      value={editingStageName}
                      onChange={(e) => setEditingStageName(e.target.value)}
                      onBlur={() => {
                        if (editingStageName.trim()) {
                          setFormData((prev: any) => ({
                            ...prev,
                            step2: {
                              ...prev.step2,
                              stages: prev.step2.stages.map((s: any) =>
                                s.id === stage.id ? { ...s, name: editingStageName.trim() } : s
                              ),
                            },
                          }));
                        }
                        setEditingStageId(null);
                        setEditingStageName("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        } else if (e.key === "Escape") {
                          setEditingStageId(null);
                          setEditingStageName("");
                        }
                      }}
                      autoFocus
                      className="w-full px-2 py-1 text-sm font-semibold border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <>
                      <h4 className="font-semibold text-gray-900">{stage.name.toUpperCase()}</h4>
                      <p className="text-xs text-gray-500">Order {stage.order}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStageId(stage.id);
                      setEditingStageName(stage.name);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Rename stage"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  {stage.order > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStage(stage.id)}
                      className="p-1 hover:bg-red-100 rounded"
                      title="Remove"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {stage.steps.map((step: any) => (
                  <div
                    key={step.id}
                    onClick={() => selectStep(stage.id, step)}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedStepId === step.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">{step.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStep(stage.id, step.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <X className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {step.kind}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          step.type === "APPROVAL"
                            ? "bg-blue-100 text-blue-700"
                            : step.type === "FULFILLMENT"
                            ? "bg-green-100 text-green-700"
                            : step.type === "AI AGENT"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {step.type === "FULFILLMENT" ? "FULFILL" : step.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">Condition: {step.condition}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addCustomStep(stage.id);
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Step
                    </button>
                  </div>
                ))}
                {stage.steps.length === 0 && (
                  <button
                    type="button"
                    onClick={() => addCustomStep(stage.id)}
                    className="w-full py-2 text-xs text-gray-500 border-2 border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-600"
                  >
                    + Add Step
                  </button>
                )}
              </div>
            </div>
          ))}
          {/* Add Stage Button - scrolls with stages */}
          <button
            type="button"
            onClick={addStage}
            className="min-w-[280px] h-fit px-4 py-8 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-6 h-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Add Stage</span>
          </button>
        </div>
      </div>

      {/* Right Panel - Step Configuration */}
      <div className="w-80 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Step Configuration</h3>
        {selectedStep ? (
          <div>
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900">{selectedStep.label}</h4>
              <p className="text-xs text-gray-600">
                Stage: {stages.find((s: any) => s.id === selectedStep.stageId)?.name} · Kind: {selectedStep.kind} · Type: {selectedStep.type === "AI AGENT" ? "AI_AGENT" : selectedStep.type}
              </p>
            </div>

            {/* Tabs - Show for AI AGENT, APPROVAL, LOGIC, CUSTOM, and FULFILLMENT types */}
            {(selectedStep.type === "AI AGENT" || selectedStep.type === "APPROVAL" || selectedStep.type === "LOGIC" || selectedStep.type === "CUSTOM" || selectedStep.type === "FULFILLMENT") && (
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                {(
                  selectedStep.type === "AI AGENT"
                    ? (["General", "Conditions", "AI Context"] as const)
                    : selectedStep.type === "APPROVAL"
                    ? (["General", "Conditions", "Approvers"] as const)
                    : (["General", "Conditions"] as const)
                ).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                      activeTab === tab
                        ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* Tab Content */}
            <div className="space-y-4">
              {selectedStep.type === "AI AGENT" && activeTab === "General" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Step label</label>
                    <input
                      type="text"
                      value={stepConfig?.label || ""}
                      onChange={(e) => updateStepConfig("label", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={stepConfig?.code || ""}
                      onChange={(e) => updateStepConfig("code", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (internal)</label>
                    <textarea
                      value={stepConfig?.description || ""}
                      onChange={(e) => updateStepConfig("description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={stepConfig?.timeout || 30}
                      onChange={(e) => updateStepConfig("timeout", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Blocking step</label>
                    <ToggleSwitch
                      checked={stepConfig?.blocking !== false}
                      onChange={(checked) => updateStepConfig("blocking", checked)}
                    />
                  </div>
                </>
              )}

              {selectedStep.type === "AI AGENT" && activeTab === "Conditions" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition (CEL / expression)
                    </label>
                    <textarea
                      value={stepConfig?.condition && stepConfig.condition !== "true" ? stepConfig.condition : ""}
                      onChange={(e) => updateStepConfig("condition", e.target.value)}
                      rows={6}
                      placeholder='e.g. risk >= "HIGH" || entitlement.tags.contains("SOX")'
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Skip logic (no-code hint)
                    </label>
                    <select
                      value={stepConfig?.skipLogic || "never"}
                      onChange={(e) => updateStepConfig("skipLogic", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="never">Never skip</option>
                      <option value="risk-low">Skip when risk = LOW</option>
                      <option value="display-only">Skip display-only entitlements</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedStep.type === "AI AGENT" && activeTab === "AI Context" && (
                <div className="space-y-6">
                  {/* Input Signals */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Input Signals</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Peer Group Analysis</label>
                        <ToggleSwitch
                          checked={stepConfig?.inputSignals?.peerGroupAnalysis !== false}
                          onChange={(checked) =>
                            updateStepConfig("inputSignals", {
                              ...stepConfig?.inputSignals,
                              peerGroupAnalysis: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">Historical Approvals</label>
                        <ToggleSwitch
                          checked={stepConfig?.inputSignals?.historicalApprovals !== false}
                          onChange={(checked) =>
                            updateStepConfig("inputSignals", {
                              ...stepConfig?.inputSignals,
                              historicalApprovals: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">HR Attribute Correlation</label>
                        <ToggleSwitch
                          checked={stepConfig?.inputSignals?.hrAttributeCorrelation !== false}
                          onChange={(checked) =>
                            updateStepConfig("inputSignals", {
                              ...stepConfig?.inputSignals,
                              hrAttributeCorrelation: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">External Threat Intel</label>
                        <ToggleSwitch
                          checked={stepConfig?.inputSignals?.externalThreatIntel === true}
                          onChange={(checked) =>
                            updateStepConfig("inputSignals", {
                              ...stepConfig?.inputSignals,
                              externalThreatIntel: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Confidence Gate */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Confidence Gate</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">50%</span>
                        <span className="text-xs text-gray-600">100%</span>
                      </div>
                      <div className="relative">
                        <div className="relative h-2 bg-gray-200 rounded-lg">
                          <div
                            className="absolute top-0 left-0 h-2 bg-blue-600 rounded-lg"
                            style={{
                              width: `${((stepConfig?.confidenceThreshold || 87) - 50) / 50 * 100}%`
                            }}
                          />
                          <input
                            type="range"
                            min="50"
                            max="100"
                            value={stepConfig?.confidenceThreshold || 87}
                            onChange={(e) => updateStepConfig("confidenceThreshold", parseInt(e.target.value))}
                            className="absolute top-0 left-0 w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
                            style={{
                              background: 'transparent'
                            }}
                          />
                        </div>
                        <style jsx>{`
                          input[type="range"]::-webkit-slider-thumb {
                            appearance: none;
                            width: 18px;
                            height: 18px;
                            border-radius: 50%;
                            background: #3b82f6;
                            cursor: pointer;
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                            position: relative;
                            z-index: 20;
                          }
                          input[type="range"]::-moz-range-thumb {
                            width: 18px;
                            height: 18px;
                            border-radius: 50%;
                            background: #3b82f6;
                            cursor: pointer;
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                            position: relative;
                            z-index: 20;
                          }
                        `}</style>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-gray-900">
                          Auto-approve confidence threshold: {stepConfig?.confidenceThreshold || 87}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hard Stop Rules */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Hard Stop Rules (AI Override)</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">If risk level is HIGH</label>
                        <ToggleSwitch
                          checked={stepConfig?.hardStopRules?.riskHigh !== false}
                          onChange={(checked) =>
                            updateStepConfig("hardStopRules", {
                              ...stepConfig?.hardStopRules,
                              riskHigh: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700">If SoD violation exists</label>
                        <ToggleSwitch
                          checked={stepConfig?.hardStopRules?.sodViolation !== false}
                          onChange={(checked) =>
                            updateStepConfig("hardStopRules", {
                              ...stepConfig?.hardStopRules,
                              sodViolation: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* APPROVAL type steps */}
              {selectedStep.type === "APPROVAL" && activeTab === "General" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Step label</label>
                    <input
                      type="text"
                      value={stepConfig?.label || ""}
                      onChange={(e) => updateStepConfig("label", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={stepConfig?.code || ""}
                      onChange={(e) => updateStepConfig("code", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (internal)</label>
                    <textarea
                      value={stepConfig?.description || ""}
                      onChange={(e) => updateStepConfig("description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={stepConfig?.timeout || 30}
                      onChange={(e) => updateStepConfig("timeout", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Blocking step</label>
                    <ToggleSwitch
                      checked={stepConfig?.blocking !== false}
                      onChange={(checked) => updateStepConfig("blocking", checked)}
                    />
                  </div>
                </>
              )}

              {selectedStep.type === "APPROVAL" && activeTab === "Conditions" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition (CEL / expression)
                    </label>
                    <textarea
                      value={stepConfig?.condition && stepConfig.condition !== "true" ? stepConfig.condition : ""}
                      onChange={(e) => updateStepConfig("condition", e.target.value)}
                      rows={6}
                      placeholder='e.g. risk >= "HIGH" || entitlement.tags.contains("SOX")'
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Skip logic (no-code hint)
                    </label>
                    <select
                      value={stepConfig?.skipLogic || "never"}
                      onChange={(e) => updateStepConfig("skipLogic", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="never">Never skip</option>
                      <option value="risk-low">Skip when risk = LOW</option>
                      <option value="display-only">Skip display-only entitlements</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedStep.type === "APPROVAL" && activeTab === "Approvers" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Approver resolver</label>
                    <select
                      value={stepConfig?.approverResolver || "line-manager"}
                      onChange={(e) => updateStepConfig("approverResolver", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="line-manager">Line manager (HR)</option>
                      <option value="department-head">Department head</option>
                      <option value="app-owner">Application owner</option>
                      <option value="role-owner">Role / role collection owner</option>
                      <option value="custom">Custom lookup</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Escalate after (hours)</label>
                    <input
                      type="number"
                      value={stepConfig?.escalateAfter || 24}
                      onChange={(e) => updateStepConfig("escalateAfter", parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Skip if requestor is approver</label>
                    <ToggleSwitch
                      checked={stepConfig?.skipIfRequestorIsApprover !== false}
                      onChange={(checked) => updateStepConfig("skipIfRequestorIsApprover", checked)}
                    />
                  </div>
                </div>
              )}

              {/* LOGIC type steps */}
              {selectedStep.type === "LOGIC" && activeTab === "General" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Step label</label>
                    <input
                      type="text"
                      value={stepConfig?.label || ""}
                      onChange={(e) => updateStepConfig("label", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={stepConfig?.code || ""}
                      onChange={(e) => updateStepConfig("code", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (internal)</label>
                    <textarea
                      value={stepConfig?.description || ""}
                      onChange={(e) => updateStepConfig("description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={stepConfig?.timeout || 30}
                      onChange={(e) => updateStepConfig("timeout", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Blocking step</label>
                    <ToggleSwitch
                      checked={stepConfig?.blocking !== false}
                      onChange={(checked) => updateStepConfig("blocking", checked)}
                    />
                  </div>
                </>
              )}

              {selectedStep.type === "LOGIC" && activeTab === "Conditions" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition (CEL / expression)
                    </label>
                    <textarea
                      value={stepConfig?.condition && stepConfig.condition !== "true" ? stepConfig.condition : ""}
                      onChange={(e) => updateStepConfig("condition", e.target.value)}
                      rows={6}
                      placeholder='e.g. risk >= "HIGH" || entitlement.tags.contains("SOX")'
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Skip logic (no-code hint)
                    </label>
                    <select
                      value={stepConfig?.skipLogic || "never"}
                      onChange={(e) => updateStepConfig("skipLogic", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="never">Never skip</option>
                      <option value="risk-low">Skip when risk = LOW</option>
                      <option value="display-only">Skip display-only entitlements</option>
                    </select>
                  </div>
                </div>
              )}

              {/* CUSTOM type steps */}
              {selectedStep.type === "CUSTOM" && activeTab === "General" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Step label</label>
                    <input
                      type="text"
                      value={stepConfig?.label || ""}
                      onChange={(e) => updateStepConfig("label", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={stepConfig?.code || ""}
                      onChange={(e) => updateStepConfig("code", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (internal)</label>
                    <textarea
                      value={stepConfig?.description || ""}
                      onChange={(e) => updateStepConfig("description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={stepConfig?.timeout || 30}
                      onChange={(e) => updateStepConfig("timeout", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Blocking step</label>
                    <ToggleSwitch
                      checked={stepConfig?.blocking !== false}
                      onChange={(checked) => updateStepConfig("blocking", checked)}
                    />
                  </div>
                </>
              )}

              {selectedStep.type === "CUSTOM" && activeTab === "Conditions" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition (CEL / expression)
                    </label>
                    <textarea
                      value={stepConfig?.condition && stepConfig.condition !== "true" ? stepConfig.condition : ""}
                      onChange={(e) => updateStepConfig("condition", e.target.value)}
                      rows={6}
                      placeholder='e.g. risk >= "HIGH" || entitlement.tags.contains("SOX")'
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Skip logic (no-code hint)
                    </label>
                    <select
                      value={stepConfig?.skipLogic || "never"}
                      onChange={(e) => updateStepConfig("skipLogic", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="never">Never skip</option>
                      <option value="risk-low">Skip when risk = LOW</option>
                      <option value="display-only">Skip display-only entitlements</option>
                    </select>
                  </div>
                </div>
              )}

              {/* FULFILLMENT type steps */}
              {selectedStep.type === "FULFILLMENT" && activeTab === "General" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Step label</label>
                    <input
                      type="text"
                      value={stepConfig?.label || ""}
                      onChange={(e) => updateStepConfig("label", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={stepConfig?.code || ""}
                      onChange={(e) => updateStepConfig("code", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (internal)</label>
                    <textarea
                      value={stepConfig?.description || ""}
                      onChange={(e) => updateStepConfig("description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Blocking step</label>
                    <ToggleSwitch
                      checked={stepConfig?.blocking !== false}
                      onChange={(checked) => updateStepConfig("blocking", checked)}
                    />
                  </div>
                </>
              )}

              {selectedStep.type === "FULFILLMENT" && activeTab === "Conditions" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition (CEL / expression)
                    </label>
                    <textarea
                      value={stepConfig?.condition && stepConfig.condition !== "true" ? stepConfig.condition : ""}
                      onChange={(e) => updateStepConfig("condition", e.target.value)}
                      rows={6}
                      placeholder='e.g. risk >= "HIGH" || entitlement.tags.contains("SOX")'
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Skip logic (no-code hint)
                    </label>
                    <select
                      value={stepConfig?.skipLogic || "never"}
                      onChange={(e) => updateStepConfig("skipLogic", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="never">Never skip</option>
                      <option value="risk-low">Skip when risk = LOW</option>
                      <option value="display-only">Skip display-only entitlements</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Other step types show all fields without tabs */}
              {selectedStep.type !== "AI AGENT" && selectedStep.type !== "APPROVAL" && selectedStep.type !== "LOGIC" && selectedStep.type !== "CUSTOM" && selectedStep.type !== "FULFILLMENT" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Step label</label>
                    <input
                      type="text"
                      value={stepConfig?.label || ""}
                      onChange={(e) => updateStepConfig("label", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={stepConfig?.code || ""}
                      onChange={(e) => updateStepConfig("code", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (internal)</label>
                    <textarea
                      value={stepConfig?.description || ""}
                      onChange={(e) => updateStepConfig("description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={stepConfig?.timeout || 30}
                      onChange={(e) => updateStepConfig("timeout", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Blocking step</label>
                    <ToggleSwitch
                      checked={stepConfig?.blocking !== false}
                      onChange={(checked) => updateStepConfig("blocking", checked)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
                    <input
                      type="text"
                      value={stepConfig?.condition || "true"}
                      onChange={(e) => updateStepConfig("condition", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Select a stage and step to configure its behavior. You can configure approvers, conditions, and AI analysis for each step.
          </p>
        )}
      </div>
      </div>

      {/* JSON Preview Section */}
      <div className="w-full mt-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Workflow-as-Code Preview (read-only)</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-xs font-mono max-h-64">
            {JSON.stringify(generateWorkflowJSON(), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default function WorkflowBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
      step1: {
        ownerUser: [] as any[],
        ownerGroup: [] as any[],
        certificationTemplate: "",
        description: "",
        ownerType: "User",
      // Campaign Scope fields
      userType: "",
      specificUserExpression: [defaultExpression] as { attribute: any; operator: any; value: string }[],
      specificApps: [] as string[] | null,
      expressionApps: [] as { attribute: any; operator: any; value: string }[],
      expressionEntitlement: [defaultExpression] as { attribute: any; operator: any; value: string }[],
      groupListIsChecked: false,
      userGroupList: null as string | null,
      importNewUserGroup: null as File | null,
      excludeUsersIsChecked: false,
      excludeUsers: null as string | null,
      selectData: "",
    },
    step2: {
      stages: [
        {
          id: "stage-validate",
          name: "Validate",
          order: 1,
          steps: [
            {
              id: "step-sod-analysis",
              label: "SoD Analysis",
              code: "SOD_ANALYSIS",
              kind: "SYSTEM",
              type: "LOGIC",
              condition: "true",
            },
            {
              id: "step-ai-auto-approve",
              label: "AI Auto-Approve Analysis",
              code: "AI_AUTO_APPROVE_ANALYSIS",
              kind: "AI",
              type: "AI AGENT",
              condition: "true",
            },
          ],
        },
        {
          id: "stage-manager-approval",
          name: "Manager Approval",
          order: 2,
          steps: [
            {
              id: "step-manager-approval",
              label: "Manager Approval",
              code: "MANAGER_APPROVAL",
              kind: "HUMAN",
              type: "APPROVAL",
              condition: 'risk >= "MEDIUM"',
            },
          ],
        },
        {
          id: "stage-operational-approval",
          name: "Operational Approval",
          order: 3,
          steps: [
            {
              id: "step-app-owner-approval",
              label: "App Owner Approval",
              code: "APP_OWNER_APPROVAL",
              kind: "HUMAN",
              type: "APPROVAL",
              condition: "true",
            },
          ],
        },
        {
          id: "stage-fulfillment",
          name: "Fulfillment",
          order: 4,
          steps: [
            {
              id: "step-scim-fulfillment",
              label: "SCIM Fulfillment",
              code: "SCIM_FULFILLMENT",
              kind: "SYSTEM",
              type: "FULFILLMENT",
              condition: "approved == true",
            },
          ],
        },
      ],
      selectedStep: null,
      selectedStage: null,
    },
    step3: {
      notificationEnabled: false,
      emailTemplate: "",
      escalationEnabled: false,
      escalationTime: "",
    },
  });

  const steps = [
    { id: 1, title: "Basic Information" },
    { id: 2, title: "Policy Builder" },
    { id: 3, title: "Review and Submit" },
  ];

  const handleInputChange = (step: keyof typeof formData, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value,
      },
    }));
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = () => {
    console.log("Form submitted:", formData);
    // Here you would typically submit to your API
    alert("Workflow created successfully!");
  };


  // React Hook Form for step 1
  const {
    register,
    setValue,
    control,
    watch,
    resetField,
    formState: { errors, isValid: step1Valid },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      ownerUser: formData.step1.ownerUser || [],
      ownerGroup: formData.step1.ownerGroup || [],
      certificationTemplate: formData.step1.certificationTemplate || "",
      description: formData.step1.description || "",
      ownerType: formData.step1.ownerType || "User",
      // Campaign Scope fields
      userType: formData.step1.userType || "",
      specificUserExpression: formData.step1.specificUserExpression || [defaultExpression],
      specificApps: formData.step1.specificApps || [],
      expressionApps: formData.step1.expressionApps || [],
      expressionEntitlement: formData.step1.expressionEntitlement || [defaultExpression],
      groupListIsChecked: formData.step1.groupListIsChecked || false,
      userGroupList: formData.step1.userGroupList || null,
      importNewUserGroup: formData.step1.importNewUserGroup || null,
      excludeUsersIsChecked: formData.step1.excludeUsersIsChecked || false,
      excludeUsers: formData.step1.excludeUsers || null,
      selectData: formData.step1.selectData || "",
    },
  });

  const ownerType = watch("ownerType");
  const userType = watch("userType");
  const groupListIsChecked = watch("groupListIsChecked");
  const excludeUsersIsChecked = watch("excludeUsersIsChecked");
  const selectData = watch("selectData");

  useEffect(() => {
    if (ownerType === "User") {
      setValue("ownerGroup", [], { shouldValidate: true });
    } else if (ownerType === "Group") {
      setValue("ownerUser", [], { shouldValidate: true });
    }
  }, [ownerType, setValue]);

  // Step2 field resets
  useEffect(() => {
    if (userType === "All users") {
      setValue("userGroupList", "", { shouldValidate: false });
      setValue("specificUserExpression", [], { shouldValidate: false });
      setValue("groupListIsChecked", false, { shouldValidate: false });
    } else if (userType === "Custom User Group") {
      setValue("specificUserExpression", [], { shouldValidate: false });
      if (groupListIsChecked) {
        setValue("userGroupList", "", { shouldValidate: false });
      }
    } else if (userType === "Specific users") {
      setValue("userGroupList", "", { shouldValidate: false });
      setValue("groupListIsChecked", false, { shouldValidate: false });
    }
    if (!groupListIsChecked) {
      resetField("importNewUserGroup");
    }
    if (!excludeUsersIsChecked) {
      resetField("excludeUsers");
    }
  }, [
    userType,
    groupListIsChecked,
    excludeUsersIsChecked,
    resetField,
    setValue,
  ]);

  useEffect(() => {
    if (selectData === "Entitlement") {
      setValue("specificApps", [], { shouldValidate: false });
      setValue("expressionApps", [], { shouldValidate: false });
    }
    if (selectData === "Roles") {
      setValue("expressionEntitlement", [], { shouldValidate: false });
    }
    if (selectData === "Application") {
      setValue("expressionEntitlement", [], { shouldValidate: false });
    }
    if (selectData === "Entitlement") {
      setValue("specificApps", [], { shouldValidate: false });
    }
  }, [selectData, setValue]);

  // Sync form data with state
  useEffect(() => {
    const subscription = watch((values) => {
      setFormData((prev) => ({
        ...prev,
        step1: {
          ownerUser: values.ownerUser || [],
          ownerGroup: values.ownerGroup || [],
          certificationTemplate: values.certificationTemplate || "",
          description: values.description || "",
          ownerType: values.ownerType || "User",
          // Campaign Scope fields
          userType: values.userType || "",
          specificUserExpression: values.specificUserExpression || [defaultExpression],
          specificApps: values.specificApps || [],
          expressionApps: values.expressionApps || [],
          expressionEntitlement: values.expressionEntitlement || [defaultExpression],
          groupListIsChecked: values.groupListIsChecked || false,
          userGroupList: values.userGroupList || null,
          importNewUserGroup: values.importNewUserGroup || null,
          excludeUsersIsChecked: values.excludeUsersIsChecked || false,
          excludeUsers: values.excludeUsers || null,
          selectData: values.selectData || "",
        },
      }));
    });
    return () => subscription.unsubscribe();
  }, [watch]);


  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return step1Valid && !!(formData.step1.certificationTemplate && formData.step1.ownerType && 
          ((formData.step1.ownerType === "User" && formData.step1.ownerUser.length > 0) ||
           (formData.step1.ownerType === "Group" && formData.step1.ownerGroup.length > 0)));
      case 2:
        return true; // Step 2 is optional
      case 3:
        return true; // Step 3 is optional
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-sm space-y-6 w-full max-w-4xl mx-auto">
            <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
              <label className={`pl-2 ${asterisk}`}>Name</label>
              <div className="max-w-md">
                <input
                  type="text"
                  className="form-input"
                  {...register("certificationTemplate", { required: true })}
                />
                {errors.certificationTemplate?.message &&
                  typeof errors.certificationTemplate.message === "string" && (
                    <p className="text-red-500">{errors.certificationTemplate.message}</p>
                  )}
              </div>
            </div>

            <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
              <label className={`pl-2 ${asterisk}`}>Description</label>
              <div className="max-w-md">
                <textarea
                  className="form-input"
                  rows={3}
                  {...register("description", { required: true })}
                ></textarea>
                {errors.description?.message &&
                  typeof errors.description.message === "string" && (
                    <p className="text-red-500">{errors.description.message}</p>
                  )}
              </div>
            </div>

            <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
              <label className={`pl-2 ${asterisk}`}>Owners</label>
              <div>
                {["User", "Group"].map((option, index, array) => (
                  <button
                    key={option}
                    type="button"
                    className={`px-4 relative py-2 mb-3 min-w-16 rounded-md border border-gray-300 ${
                      watch("ownerType") === option && downArrow
                    } ${
                      watch("ownerType") === option ? "bg-[#15274E] text-white" : ""
                    } ${index === 0 && "rounded-r-none"} ${
                      array.length > 2 &&
                      index === 1 &&
                      "rounded-none border-r-0 border-l-0"
                    } ${index === array.length - 1 && "rounded-l-none"}`}
                    onClick={() =>
                      setValue("ownerType", option, { shouldValidate: true })
                    }
                  >
                    {option}
                  </button>
                ))}

                {watch("ownerType") === "User" && (
                  <>
                    <MultiSelect
                      name="ownerUser"
                      className="max-w-[420px]"
                      control={control as unknown as Control<FieldValues>}
                      isAsync
                      loadOptions={loadUsers}
                      components={{ Option: customOption }}
                    />
                    {errors.ownerUser?.message &&
                      typeof errors.ownerUser.message === "string" && (
                        <p className="text-red-500">{errors.ownerUser.message}</p>
                      )}
                  </>
                )}

                {watch("ownerType") === "Group" && (
                  <>
                    <MultiSelect
                      name="ownerGroup"
                      className="max-w-[420px]"
                      control={control as unknown as Control<FieldValues>}
                      isAsync
                      loadOptions={loadUsers}
                      components={{ Option: customOption }}
                    />
                    {errors.ownerGroup?.message &&
                      typeof errors.ownerGroup.message === "string" && (
                        <p className="text-red-500">{errors.ownerGroup.message}</p>
                      )}
                  </>
                )}
              </div>
            </div>

            {/* Policy Scope Card */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Policy Scope</h3>
              <div className="space-y-6">
                <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
                  <label className={`pl-2 ${asterisk}`}>Select Users</label>
                  <div>
                    {["All users", "Specific users", "Custom User Group"].map(
                      (option, index, array) => (
                        <button
                          key={option}
                          type="button"
                          className={`px-4 relative py-2 mb-3 min-w-16 rounded-md border border-gray-300 ${
                            watch("userType") === option && index > 0 && downArrow
                          } ${
                            watch("userType") === option
                              ? "bg-[#15274E] text-white"
                              : ""
                          } ${index === 0 && "rounded-r-none"} ${
                            array.length > 2 &&
                            index === 1 &&
                            "rounded-none border-r-0  border-l-0 "
                          } ${index === array.length - 1 && "rounded-l-none"}`}
                          onClick={() =>
                            setValue("userType", option, { shouldValidate: true })
                          }
                        >
                          {option}
                        </button>
                      )
                    )}

                    {watch("userType") === "Specific users" && (
                      <ExpressionBuilder
                        title="Build Expression"
                        control={control as unknown as Control<FieldValues>}
                        setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                        watch={watch as unknown as UseFormWatch<FieldValues>}
                        fieldName="specificUserExpression"
                      />
                    )}

                    {watch("userType") === "Custom User Group" && (
                      <>
                        <div className="flex items-center gap-1 mb-2">
                          <span
                            className={`flex items-center ${
                              !watch("groupListIsChecked")
                                ? `${asterisk} !pr-0 text-black`
                                : "text-black/50"
                            }`}
                          >
                            Select from List
                          </span>
                          <ToggleSwitch
                            checked={watch("groupListIsChecked")}
                            onChange={(checked) => {
                              setValue("groupListIsChecked", checked, {
                                shouldValidate: true,
                              });
                            }}
                            className="scale-80"
                          />
                          <span
                            className={`flex items-center ${
                              watch("groupListIsChecked")
                                ? `${asterisk} !pr-0 text-black`
                                : "text-black/50"
                            }`}
                          >
                            Import New User Group
                          </span>
                        </div>

                        {watch("groupListIsChecked") && (
                          <div className="w-[450px]">
                            <FileDropzone
                              name="importNewUserGroup"
                              control={control as unknown as Control<FieldValues>}
                            />
                          </div>
                        )}
                        {!watch("groupListIsChecked") && (
                          <>
                            <MultiSelect
                              name="userGroupList"
                              className="max-w-[420px]"
                              isMulti={true}
                              control={control as unknown as Control<FieldValues>}
                              options={userGroups}
                            />

                            {errors.userGroupList?.message &&
                              typeof errors.userGroupList.message === "string" && (
                                <p className="text-red-500">
                                  {errors.userGroupList.message}
                                </p>
                              )}
                          </>
                        )}
                      </>
                    )}
                    <div className="">
                      <div className="flex items-center gap-1 py-2">
                        <input type="checkbox" {...register("excludeUsersIsChecked")} />{" "}
                        <span
                          className={` ${watch("excludeUsersIsChecked") && asterisk}`}
                        >
                          exclude users from the certification campaign
                        </span>
                      </div>

                      <MultiSelect
                        name="excludeUsers"
                        isDisabled={!watch("excludeUsersIsChecked")}
                        className="max-w-[420px]"
                        isMulti={true}
                        control={control as unknown as Control<FieldValues>}
                        options={excludeUsers}
                      />

                      {errors.excludeUsers?.message &&
                        typeof errors.excludeUsers.message === "string" && (
                          <p className="text-red-500">{errors.excludeUsers.message}</p>
                        )}
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
                  <label className={`pl-2 ${asterisk}`}>Select Data</label>
                  <div>
                    {[
                      "Roles",
                      "Application",
                      "Entitlement",
                    ].map((option, index, array) => (
                      <button
                        key={option}
                        type="button"
                        className={`px-4 relative py-2 mb-3 min-w-16 rounded-md border border-gray-300  ${
                          watch("selectData") === option && index > 0 && downArrow
                        } ${
                          watch("selectData") === option
                            ? "bg-[#15274E] text-white"
                            : ""
                        } ${index === 0 && "rounded-r-none"} ${
                          array.length > 2 &&
                          index === 1 &&
                          "rounded-none border-r-0  border-l-0 "
                        } ${index === array.length - 1 && "rounded-l-none"}`}
                        onClick={() =>
                          setValue("selectData", option, { shouldValidate: true })
                        }
                      >
                        {option}
                      </button>
                    ))}

                    {watch("selectData") === "Roles" && (
                      <div className="space-y-4 bg-[#F4F5FA]/60 border-1 border-gray-300 p-4 rounded-md">
                        <div>
                          <MultiSelect
                            name="specificApps"
                            className="max-w-md"
                            placeholder="Select Specific App(s)"
                            control={control as unknown as Control<FieldValues>}
                            isAsync
                            loadOptions={loadIspmApps}
                            components={{ Option: customOption }}
                          />
                          {errors.specificApps?.message &&
                            typeof errors.specificApps.message === "string" && (
                              <p className="text-red-500">
                                {errors.specificApps.message}
                              </p>
                            )}
                        </div>
                        <div className="w-full bg-white">
                          <ExpressionBuilder
                            control={control as unknown as Control<FieldValues>}
                            setValue={
                              setValue as unknown as UseFormSetValue<FieldValues>
                            }
                            watch={watch as unknown as UseFormWatch<FieldValues>}
                            fieldName="expressionApps"
                            attributesOptions={[
                              { label: "Risk", value: "risk" },
                              { label: "Pre-Requisite", value: "pre_requisite" },
                              { label: "Shared Pwd", value: "shared_pwd" },
                              { label: "Regulatory Scope", value: "regulatory_scope" },
                              { label: "Access Scope", value: "access_scope" },
                              { label: "Review Schedule", value: "review_schedule" },
                              { label: "Business Unit", value: "business_unit" },
                              { label: "Data Classification", value: "data_classification" },
                              { label: "Privileged", value: "privileged" },
                              { label: "Non Persistent Access", value: "non_persistent_access" },
                              { label: "License Type", value: "license_type" },
                              { label: "Tags", value: "tags" },
                            ]}
                          />
                          {errors.expressionApps?.message &&
                            typeof errors.expressionApps.message === "string" && (
                              <p className="text-red-500">
                                {errors.expressionApps.message}
                              </p>
                            )}
                        </div>
                      </div>
                    )}
                    {watch("selectData") === "Application" && (
                      <div className="space-y-4 bg-[#F4F5FA]/60 border-1 border-gray-300 p-4 rounded-md">
                        <div>
                          <MultiSelect
                            name="specificApps"
                            className="max-w-md"
                            placeholder="Select Specific App(s)"
                            control={control as unknown as Control<FieldValues>}
                            isAsync
                            loadOptions={loadIspmApps}
                            components={{ Option: customOption }}
                          />
                          {errors.specificApps?.message &&
                            typeof errors.specificApps.message === "string" && (
                              <p className="text-red-500">
                                {errors.specificApps.message}
                              </p>
                            )}
                        </div>
                        <div className="w-full bg-white">
                          <ExpressionBuilder
                            control={control as unknown as Control<FieldValues>}
                            setValue={
                              setValue as unknown as UseFormSetValue<FieldValues>
                            }
                            watch={watch as unknown as UseFormWatch<FieldValues>}
                            fieldName="expressionApps"
                            attributesOptions={[
                              { label: "Risk", value: "risk" },
                              { label: "Pre-Requisite", value: "pre_requisite" },
                              { label: "Shared Pwd", value: "shared_pwd" },
                              { label: "Regulatory Scope", value: "regulatory_scope" },
                              { label: "Access Scope", value: "access_scope" },
                              { label: "Review Schedule", value: "review_schedule" },
                              { label: "Business Unit", value: "business_unit" },
                              { label: "Data Classification", value: "data_classification" },
                              { label: "Privileged", value: "privileged" },
                              { label: "Non Persistent Access", value: "non_persistent_access" },
                              { label: "License Type", value: "license_type" },
                              { label: "Tags", value: "tags" },
                            ]}
                          />
                          {errors.expressionApps?.message &&
                            typeof errors.expressionApps.message === "string" && (
                              <p className="text-red-500">
                                {errors.expressionApps.message}
                              </p>
                            )}
                        </div>
                      </div>
                    )}
                    {watch("selectData") === "Entitlement" && (
                      <>
                        <ExpressionBuilder
                          title="Build Expression for Entitlement"
                          control={control as unknown as Control<FieldValues>}
                          setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                          watch={watch as unknown as UseFormWatch<FieldValues>}
                          fieldName="expressionEntitlement"
                          attributesOptions={[
                            { label: "Risk", value: "risk" },
                            { label: "Pre-Requisite", value: "pre_requisite" },
                            { label: "Shared Pwd", value: "shared_pwd" },
                            { label: "Regulatory Scope", value: "regulatory_scope" },
                            { label: "Access Scope", value: "access_scope" },
                            { label: "Review Schedule", value: "review_schedule" },
                            { label: "Business Unit", value: "business_unit" },
                            { label: "Data Classification", value: "data_classification" },
                            { label: "Privileged", value: "privileged" },
                            { label: "Non Persistent Access", value: "non_persistent_access" },
                            { label: "License Type", value: "license_type" },
                            { label: "Tags", value: "tags" },
                          ]}
                        />
                        {errors.expressionEntitlement?.message &&
                          typeof errors.expressionEntitlement.message === "string" && (
                            <p className="text-red-500">
                              {errors.expressionEntitlement.message}
                            </p>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return <PolicyBuilder formData={formData} setFormData={setFormData} />;
      case 3:
        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {formData.step1.certificationTemplate || <span className="text-gray-400">Not provided</span>}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Description:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {formData.step1.description || <span className="text-gray-400">Not provided</span>}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Owner Type:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {formData.step1.ownerType || <span className="text-gray-400">Not provided</span>}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Owners:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {formData.step1.ownerType === "User" 
                      ? (formData.step1.ownerUser.length > 0 
                          ? formData.step1.ownerUser.map((u: any) => u.label || u).join(", ")
                          : <span className="text-gray-400">Not provided</span>)
                      : (formData.step1.ownerGroup.length > 0
                          ? formData.step1.ownerGroup.map((g: any) => g.label || g).join(", ")
                          : <span className="text-gray-400">Not provided</span>)
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Policy Configuration</h4>
              <div className="space-y-3">
                {formData.step2.stages && formData.step2.stages.length > 0 ? (
                  formData.step2.stages.map((stage: any) => (
                    <div key={stage.id} className="border-l-2 border-blue-500 pl-3">
                      <p className="text-sm font-medium text-gray-900">{stage.name} (Order {stage.order})</p>
                      {stage.steps.length > 0 ? (
                        <ul className="mt-1 space-y-1 ml-4">
                          {stage.steps.map((step: any) => (
                            <li key={step.id} className="text-sm text-gray-700">
                              • {step.label} ({step.kind}, {step.type})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1">No steps configured</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No stages configured</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                Please review all the information above. Click "Submit" to create the workflow.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full p-6">
      <div className="mx-auto min-h-[calc(100vh-120px)]">
        <div className="w-full">
          <div className="p-6">
            {/* Progress Steps */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-center">
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentStep >= step.id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 ${
                          currentStep > step.id ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="w-full mb-6 min-h-[400px]">
              {currentStep !== 2 && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  {steps[currentStep - 1].title}
                </h3>
              )}
              {currentStep === 2 ? (
                renderStepContent()
              ) : (
                <div className="flex justify-center">
                  {renderStepContent()}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  currentStep === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>

              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                    !isStepValid(currentStep)
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

