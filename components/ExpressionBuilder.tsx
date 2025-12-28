"use client";
import {
  Control,
  FieldValues,
  UseFormSetValue,
  UseFormWatch,
  useWatch,
} from "react-hook-form";
import { CircleX, Plus } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import Select from "react-select";
import { v4 as uuidv4 } from "uuid";
import Accordion from "./Accordion";

const attributes = [
  { label: "User Role", value: "user_role" },
  { label: "Department", value: "department" },
  { label: "Location", value: "location" },
  { label: "Access Level", value: "access_level" },
  { label: "Status", value: "status" },
  { label: "Job Title", value: "job_title" },
];

const operators = [
  { label: "Equals", value: "equals" },
  { label: "Not Equals", value: "not_equals" },
  { label: "Contains", value: "contains" },
  { label: "Excludes", value: "excludes" },
  { label: "IN", value: "in" },
  { label: "NOT IN", value: "not_in" },
];

const logicalOperators = [
  { label: "AND", value: "AND" },
  { label: "OR", value: "OR" },
];

interface Condition {
  id: string;
  attribute: { label: string; value: string } | null;
  operator: { label: string; value: string } | null;
  value: string;
  logicalOp: string;
}

interface ExpressionBuilderProps {
  title?: string;
  control: Control<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  fieldName: string;
  attributesOptions?: { label: string; value: string }[];
  hideJsonPreview?: boolean;
  fullWidth?: boolean;
}

const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  title,
  control,
  setValue,
  fieldName,
  attributesOptions,
  hideJsonPreview = false,
  fullWidth = false,
}) => {
  const watchedConditions = useWatch({ control, name: fieldName });
  const conditions: Condition[] = useMemo(() => {
    if (!Array.isArray(watchedConditions)) return [];
    // Ensure all conditions have an id
    return watchedConditions.map((cond, index) => ({
      ...cond,
      id: cond.id || `condition-${index}-${Date.now()}`,
    }));
  }, [watchedConditions]);

  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // <-- Sidebar State
  // (Reverted) No global shift behavior

  useEffect(() => {
    if (conditions.length > 0) {
      setIsAccordionOpen(true);
    }
  }, [conditions]);

  useEffect(() => {
    if (!Array.isArray(conditions)) {
      setValue(fieldName, [], { shouldDirty: true });
    }
  }, [conditions, setValue, fieldName]);

  const addCondition = () => {
    const newCondition: Condition = {
      id: uuidv4(),
      attribute: null,
      operator: null,
      value: "",
      logicalOp: "AND",
    };

    setValue(fieldName, [...conditions, newCondition], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeCondition = (id: string) => {
    setValue(
      fieldName,
      conditions.filter((cond) => cond.id !== id),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const formattedExpression = conditions.map((cond) => ({
    attribute: cond.attribute?.value || "",
    operator: cond.operator?.value || "",
    value: cond.value || "",
    logicalOp: cond.logicalOp || "",
  }));

  return (
    <>
      {title && <h3 className="font-bold">{title}</h3>}
      <div className={`p-4 border rounded-md w-full border-gray-300 relative ${fullWidth ? '' : 'max-w-2xl'}`}>
        {conditions.map((condition, index) => (
          <div
            key={condition.id || `expr-${index}`}
            className="flex space-x-2 items-center mb-2 justify-end"
          >
            {index > 0 && (
              <Controller
                name={`${fieldName}.${index}.logicalOp`}
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={logicalOperators}
                    isSearchable={false}
                    placeholder="AND/OR"
                  />
                )}
              />
            )}

            <Controller
              name={`${fieldName}.${index}.attribute`}
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={attributesOptions ?? attributes}
                  isSearchable={false}
                  placeholder="Select Attribute"
                />
              )}
            />

            <Controller
              name={`${fieldName}.${index}.operator`}
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={operators}
                  isSearchable={false}
                  placeholder="Condition"
                />
              )}
            />

            <Controller
              name={`${fieldName}.${index}.value`}
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter value"
                  className="form-input !w-32 border border-gray-300 rounded-md px-2 py-1"
                />
              )}
            />

            {conditions.length > 1 && (
              <button
                type="button"
                onClick={() => removeCondition(condition.id)}
                className="text-red-500 cursor-pointer"
              >
                <CircleX size={18} />
              </button>
            )}
          </div>
        ))}

        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={addCondition}
            className="bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
          >
            <Plus size={15} /> Add Condition
          </button>

          <button
            type="button"
            disabled={conditions.length === 0}
            onClick={() => setIsSidebarOpen(true)}
            className={`px-3 py-1 rounded text-white ${
              conditions.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Test Expression
          </button>
        </div>

        {!hideJsonPreview && (
          <div className="mt-4 border border-gray-300 rounded bg-gray-100">
            <Accordion
              iconClass="absolute -top-2 right-5 bg-white rounded-full text-gray-400"
              iconSize={16}
              title="Expand/Collapse"
              open={isAccordionOpen}
            >
              <div className="py-3 overflow-auto max-h-40">
                <pre className="text-sm  px-3">
                  {JSON.stringify(formattedExpression, null, 2)}
                </pre>
              </div>
            </Accordion>
          </div>
        )}
      </div>

      {/* Right Sidebar for Test Output */}
      {isSidebarOpen && (
        <div className="fixed top-16 right-0 h-[calc(100%-4rem)] w-[500px] bg-white shadow-lg z-50 overflow-auto">
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <h4 className="text-lg font-semibold">Test Results</h4>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="p-4 overflow-auto">
            {/* Replace this with actual test output logic */}
            <pre className="text-sm bg-gray-100 p-3 rounded">
              {JSON.stringify(formattedExpression, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpressionBuilder;
