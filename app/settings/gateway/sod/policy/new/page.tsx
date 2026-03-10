 "use client";

import React, { useState } from "react";
import { useForm, Control, FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLeftSidebar } from "@/contexts/LeftSidebarContext";
import ExpressionBuilder from "@/components/ExpressionBuilder";

type MitigatingControl = {
  id: string;
  name: string;
};

type ConditionRow = {
  id: string;
  logicalOperator?: "AND" | "OR";
  userAttribute: string;
  operand: string;
  valueType: "value" | "rule";
  value: string;
};

const USER_ATTRIBUTE_OPTIONS = [
  { value: "user_department", label: "User Department" },
  { value: "user_role", label: "User Role" },
  { value: "user_access", label: "User Access / Request" },
];

const OPERAND_OPTIONS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
];

const VALUE_TYPE_OPTIONS = [
  { value: "value", label: "Value" },
  { value: "rule", label: "Rule" },
];

const MITIGATING_CONTROLS: MitigatingControl[] = [
  { id: "mc1", name: "Manager Review" },
  { id: "mc2", name: "Independent Reconciliation" },
  { id: "mc3", name: "Quarterly Audit" },
];

export default function SodPolicyNewPage() {
  const { isVisible: isSidebarVisible, sidebarWidthPx } = useLeftSidebar();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [tags, setTags] = useState("");
  const [riskDefinition, setRiskDefinition] = useState("");
  const [riskValue, setRiskValue] = useState<"Low" | "Medium" | "High" | "Critical" | "">("");

  // Step 2 – Condition builder (using ExpressionBuilder)
  const { control, setValue, watch } = useForm<FieldValues>({
    defaultValues: {
      sodPolicyConditions: [],
    },
  });

  // Step 3 – Mitigating controls
  const [selectedMitigatingControlId, setSelectedMitigatingControlId] = useState<string>("");

  const canGoToStep2 =
    name.trim() &&
    description.trim() &&
    owner.trim() &&
    riskDefinition.trim() &&
    riskValue !== "";

  const canGoToStep3 = true; // ExpressionBuilder handles its own validation for now

  const canCreate = canGoToStep2 && !!selectedMitigatingControlId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed step bar below header; aligned with content area */}
      <div
        className="fixed top-[60px] z-20 bg-white border-b border-gray-200 shadow-sm px-6 py-4"
        style={{
          left: isSidebarVisible ? sidebarWidthPx : 0,
          right: 0,
          transition: "left 300ms ease-in-out",
        }}
      >
        <div className="flex items-center gap-4 max-w-full">
          <button
            type="button"
            onClick={() =>
              setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))
            }
            disabled={currentStep === 1}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium shrink-0 ${
              currentStep === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex-1 flex items-center min-w-0">
            {[1, 2, 3].map((stepId, index) => (
              <React.Fragment key={stepId}>
                <div className="flex items-center shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border shrink-0 ${
                      currentStep >= stepId
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {currentStep > stepId ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      stepId
                    )}
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {stepId === 1
                      ? "Policy Details"
                      : stepId === 2
                      ? "Rules & Conditions"
                      : "Mitigating Controls"}
                  </span>
                </div>
                {index < 2 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-4 min-w-[16px]" aria-hidden />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="shrink-0">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && canGoToStep2) {
                    setCurrentStep(2);
                  } else if (currentStep === 2 && canGoToStep3) {
                    setCurrentStep(3);
                  }
                }}
                disabled={
                  (currentStep === 1 && !canGoToStep2) ||
                  (currentStep === 2 && !canGoToStep3)
                }
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  (currentStep === 1 && !canGoToStep2) ||
                  (currentStep === 2 && !canGoToStep3)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canCreate}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  canCreate
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Check className="w-4 h-4 mr-2" />
                Create SoD Policy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer so content is not hidden under fixed step bar */}
      <div className="h-[80px]" aria-hidden />

      <div className="w-full px-4 py-4">
        <div className="w-full space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Create New Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter policy name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Owner
                    </label>
                    <input
                      type="text"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Owner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    placeholder="Short description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add tags"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Definition
                    </label>
                    <input
                      type="text"
                      value={riskDefinition}
                      onChange={(e) => setRiskDefinition(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the risk"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Value
                    </label>
                    <select
                      value={riskValue}
                      onChange={(e) =>
                        setRiskValue(e.target.value as "Low" | "Medium" | "High" | "Critical" | "")
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select...</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Step 2 – Add Rules &amp; Conditions
                </h2>
                <p className="text-xs text-gray-600">
                  Use the expression builder to define violation conditions based on user attributes.
                </p>

                <ExpressionBuilder
                  control={control as unknown as Control<FieldValues>}
                  setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                  watch={watch as unknown as UseFormWatch<FieldValues>}
                  fieldName="sodPolicyConditions"
                  attributesOptions={[
                    { label: "User Department", value: "user_department" },
                    { label: "User Role", value: "user_role" },
                    { label: "User Access / Request", value: "user_access_request" },
                  ]}
                  hideJsonPreview={false}
                  fullWidth
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Step 3 – Select Mitigating Controls
                </h2>
                <p className="text-xs text-gray-600">
                  Choose a mitigating control that compensates for this SoD policy violation.
                </p>

                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mitigating Control
                  </label>
                  <select
                    value={selectedMitigatingControlId}
                    onChange={(e) => setSelectedMitigatingControlId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select mitigating control</option>
                    {MITIGATING_CONTROLS.map((mc) => (
                      <option key={mc.id} value={mc.id}>
                        {mc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

