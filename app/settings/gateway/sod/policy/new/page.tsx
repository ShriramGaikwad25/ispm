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

// Simple list of available SoD Rules for rule-based conditions
const AVAILABLE_RULES: { id: string; name: string }[] = [
  { id: "rule1", name: "Finance SoD Rule" },
  { id: "rule2", name: "Procure-to-Pay Rule" },
  { id: "rule3", name: "Order-to-Cash Rule" },
  { id: "rule4", name: "IT Admin SoD Rule" },
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

  // Step 2 – Condition builders (using ExpressionBuilder)
  const { control, setValue, watch } = useForm<FieldValues>({
    defaultValues: {
      sodPolicyUserConditions: [],
      sodPolicyRuleConditions: [],
    },
  });

  // Step 2 – UI state for redesigned layout
  const [conditionScope, setConditionScope] = useState<"User" | "Rules">("User");
  const [ruleSearch, setRuleSearch] = useState("");
  const [selectedLeftRuleId, setSelectedLeftRuleId] = useState<string>("");
  const [selectedRightRuleId, setSelectedRightRuleId] = useState<string>("");
  const [rightRuleIds, setRightRuleIds] = useState<string[]>(
    AVAILABLE_RULES[0] ? [AVAILABLE_RULES[0].id] : []
  );
  const [isLeftRuleDropdownOpen, setIsLeftRuleDropdownOpen] = useState(false);
  const [rightRuleSearch, setRightRuleSearch] = useState("");
  const [isRightRuleDropdownOpen, setIsRightRuleDropdownOpen] = useState(false);

  // Step 3 – Mitigating controls
  const [selectedMitigatingControlId, setSelectedMitigatingControlId] = useState<string>("");

  const canGoToStep2 =
    name.trim() &&
    description.trim() &&
    owner.trim();

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

                <div className="max-w-md">
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
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Two partitions separated by AND */}
                <div className="flex flex-col lg:flex-row items-stretch gap-6">
                  {/* Left partition: Master Statement */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Scope dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Master Statement
                      </label>
                      <select
                        value={conditionScope}
                        onChange={(e) =>
                          setConditionScope(e.target.value as "User" | "Rules")
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="User">User</option>
                        <option value="Rules">Rules</option>
                      </select>
                    </div>

                    {/* When User selected: show expression builder */}
                    {conditionScope === "User" && (
                      <ExpressionBuilder
                        control={control as unknown as Control<FieldValues>}
                        setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                        watch={watch as unknown as UseFormWatch<FieldValues>}
                        fieldName="sodPolicyUserConditions"
                        hideJsonPreview={false}
                        fullWidth
                      />
                    )}

                    {/* When Rules selected: show typeahead-like dropdown (same UX as Rules tab BP) */}
                    {conditionScope === "Rules" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Rule
                        </label>
                        <div className="relative">
                          <input
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Start typing to search and select"
                            value={ruleSearch}
                            onFocus={() => setIsLeftRuleDropdownOpen(true)}
                            onChange={(e) => {
                              setRuleSearch(e.target.value);
                              setIsLeftRuleDropdownOpen(true);
                            }}
                          />
                          {isLeftRuleDropdownOpen &&
                            AVAILABLE_RULES.filter((r) =>
                              r.name.toLowerCase().includes(ruleSearch.toLowerCase())
                            ).length > 0 && (
                              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                <ul className="py-1 text-sm">
                                  {AVAILABLE_RULES.filter((r) =>
                                    r.name.toLowerCase().includes(ruleSearch.toLowerCase())
                                  ).map((rule) => (
                                    <li key={rule.id}>
                                      <button
                                        type="button"
                                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setRuleSearch(rule.name);
                                          setSelectedLeftRuleId(rule.id);
                                          setIsLeftRuleDropdownOpen(false);
                                        }}
                                      >
                                        {rule.name}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AND separator */}
                  <div className="flex items-center justify-center">
                    <span className="px-3 py-2 rounded-full bg-gray-100 border border-gray-300 text-xs font-semibold text-gray-700">
                      AND
                    </span>
                  </div>

                  {/* Right partition: Conflicting Statement (Rules with OR) */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      CONFLICTING STATEMENT
                    </label>

                    <div className="mt-1 space-y-2">
                      {rightRuleIds.map((id, index) => {
                          const rule = AVAILABLE_RULES.find((r) => r.id === id) ?? AVAILABLE_RULES[0];
                          return (
                            <React.Fragment key={`${id}-${index}`}>
                              {index > 0 && (
                                <div className="flex justify-center my-1">
                                  <span className="px-3 py-1 rounded-full bg-gray-100 border border-gray-300 text-[11px] font-semibold text-gray-600">
                                    OR
                                  </span>
                                </div>
                              )}
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                                <select
                                  value={rule?.id}
                                  onChange={(e) => {
                                    const newId = e.target.value;
                                    setRightRuleIds((prev) =>
                                      prev.map((ruleId, i) => (i === index ? newId : ruleId))
                                    );
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {AVAILABLE_RULES.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.name}
                                    </option>
                                  ))}
                                </select>
                                {/* Remove button for this line (not shown on first row) */}
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRightRuleIds((prev) =>
                                        prev.filter((_, i) => i !== index)
                                      )
                                    }
                                    className="inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold w-8 h-8"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    {/* Add button below the dropdowns, like in ExpressionBuilder */}
                    <div className="flex justify-start mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const baseId = AVAILABLE_RULES[0]?.id;
                          if (!baseId) return;
                          setRightRuleIds((prev) => [...prev, baseId]);
                        }}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 hover:bg-blue-700"
                      >
                        <span className="text-sm leading-none">+</span>
                        <span>Add Rule</span>
                      </button>
                    </div>
                  </div>
                </div>
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

