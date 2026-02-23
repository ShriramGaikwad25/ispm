"use client";

import React, { useState } from "react";
import { useForm, Control, FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Trash2, Plus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import ExpressionBuilder from "@/components/ExpressionBuilder";

type AccessProvision = {
  id: string;
  type: string;
  application: string;
  name: string;
};

export default function CreateAccessPolicyPage() {
  const { control, setValue, watch, register, handleSubmit } = useForm<FieldValues>({
    defaultValues: {
      policyName: "",
      description: "",
      priority: "",
      enabled: false,
      userAttributeConditions: [],
    },
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [accessProvisions, setAccessProvisions] = useState<AccessProvision[]>([]);

  // User-specific attributes for the expression builder
  const userAttributes = [
    { label: "Department", value: "department" },
    { label: "Job Title", value: "job_title" },
    { label: "Location", value: "location" },
    { label: "Employee Type", value: "employee_type" },
    { label: "Manager", value: "manager" },
    { label: "User Role", value: "user_role" },
    { label: "Status", value: "status" },
    { label: "Access Level", value: "access_level" },
  ];

  const typeOptions = ["Business Role", "Entitlement", "Role", "Permission", "Profile"];
  const applicationOptions = ["(N/A)", "Salesforce", "SAP", "Active Directory", "ServiceNow"];

  const addAccess = () => {
    const newAccess: AccessProvision = {
      id: Date.now().toString(),
      type: typeOptions[0],
      application: typeOptions[0] === "Business Role" ? "(N/A)" : applicationOptions[1],
      name: "",
    };
    setAccessProvisions([...accessProvisions, newAccess]);
  };

  const removeAccess = (id: string) => {
    setAccessProvisions(accessProvisions.filter((a) => a.id !== id));
  };

  const updateAccess = (id: string, field: keyof AccessProvision, value: string) => {
    setAccessProvisions(
      accessProvisions.map((a) => {
        if (a.id === id) {
          const updated = { ...a, [field]: value };
          // If type is changed to Business Role, set application to (N/A)
          if (field === "type" && value === "Business Role") {
            updated.application = "(N/A)";
          }
          return updated;
        }
        return a;
      })
    );
  };

  const onSubmit = (data: any) => {
    // TODO: Implement policy creation logic
    console.log("Creating policy:", {
      ...data,
      accessProvisions,
    });
    alert("Policy created successfully!");
  };

  const handleNext = () => {
    if (currentStep < 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 1 Component - Policy Details
  const Step1Content = () => (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="max-w-6xl mx-auto">

        {/* Policy Details Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Policy Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Policy Name
              </label>
              <input
                type="text"
                {...register("policyName")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  {...register("priority")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="enabled"
                  {...register("enabled")}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                  Enabled
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* User Attribute Condition Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">User Attribute Condition</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Advanced</span>
              <button
                type="button"
                onClick={() => setAdvanced(!advanced)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  advanced ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    advanced ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            All conditions must be true (AND) for the policy to apply.
          </p>

          <ExpressionBuilder
            control={control as unknown as Control<FieldValues>}
            setValue={setValue as unknown as UseFormSetValue<FieldValues>}
            watch={watch as unknown as UseFormWatch<FieldValues>}
            fieldName="userAttributeConditions"
            attributesOptions={userAttributes}
            hideJsonPreview={true}
            fullWidth={true}
          />
        </div>

        {/* Access Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access</h2>
          <p className="text-sm text-gray-600 mb-4">
            This is the access that will be provisioned when the conditions are met.
          </p>

          <div className="space-y-3">
            {accessProvisions.map((access) => (
              <div key={access.id} className="flex items-center gap-3">
                <select
                  value={access.type}
                  onChange={(e) => updateAccess(access.id, "type", e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {typeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {access.type === "Business Role" ? (
                  <input
                    type="text"
                    value={access.application}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                ) : (
                  <select
                    value={access.application}
                    onChange={(e) => updateAccess(access.id, "application", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {applicationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={access.name}
                  onChange={(e) => updateAccess(access.id, "name", e.target.value)}
                  placeholder="NAME (ROLE, ENTITLEMENT, ETC.)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeAccess(access.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addAccess}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>ADD ACCESS</span>
          </button>
        </div>

      </div>
    </form>
  );

  // Step 2 Component - Review/Additional Info
  const Step2Content = () => (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Review</h2>
        <p className="text-gray-600">Review your access policy configuration here.</p>
      </div>
    </div>
  );

  const steps = [
    { name: "Policy Details", number: 1 },
    { name: "Review", number: 2 },
  ];

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Create Access Policy</h1>
        
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <React.Fragment key={index}>
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        isActive || isCompleted
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-600"}`}>
                        {step.name}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? "bg-blue-600" : "bg-gray-200"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {currentStep === 0 && <Step1Content />}
          {currentStep === 1 && <Step2Content />}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              currentStep === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          {currentStep === 0 ? (
            <button
              type="button"
              onClick={handleNext}
              className="bg-blue-600 text-white px-8 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="bg-blue-600 text-white px-8 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              CREATE POLICY
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

