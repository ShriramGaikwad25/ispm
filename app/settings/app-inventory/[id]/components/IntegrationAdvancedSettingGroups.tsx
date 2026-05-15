"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { coerceSupportedObjectsFieldKey, type ApplicationTypeIntegrationFieldGroup } from "@/lib/api";

export type IntegrationAdvancedSettingGroupsProps = {
  groups: ApplicationTypeIntegrationFieldGroup[];
  values: Record<string, string>;
  onChange: (fieldKey: string, value: string) => void;
  expandStateKeyPrefix?: string;
  sectionTitle?: string;
  className?: string;
};

/** Expandable cards for per-type integration `advancedSetting` groups from supported-objects. */
export default function IntegrationAdvancedSettingGroups({
  groups,
  values,
  onChange,
  expandStateKeyPrefix = "default",
  sectionTitle = "Integration advanced settings",
  className = "",
}: IntegrationAdvancedSettingGroupsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!groups.length) return null;

  const renderField = (fieldKey: unknown) => {
    const key = coerceSupportedObjectsFieldKey(fieldKey);
    if (!key) return null;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const value = values[key] ?? "";
    const isPasswordLike = /password|secret|token|passphrase/i.test(key);
    return (
      <div key={key} className="flex-1 relative">
        <input
          type={isPasswordLike ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
          placeholder=" "
          autoComplete={isPasswordLike ? "off" : undefined}
        />
        <label
          className={`absolute left-4 transition-all duration-200 pointer-events-none ${
            value ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"
          }`}
        >
          {label}
        </label>
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="text-sm font-medium text-gray-700 mb-3">{sectionTitle}</div>
      <div className="flex flex-col gap-2">
        {groups.map((group) => {
          const expandKey = `${expandStateKeyPrefix}::${group.id}`;
          const isOpen = expanded[expandKey] ?? false;
          return (
            <div
              key={group.id}
              className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [expandKey]: !(prev[expandKey] ?? false),
                  }))
                }
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left bg-slate-50/90 hover:bg-slate-100/80 transition-colors ${
                  isOpen ? "border-b border-slate-200/80" : ""
                }`}
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-slate-800 min-w-0">{group.label}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
                )}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-3 flex flex-col gap-2 bg-white">
                  {group.fields.map((fk) => renderField(fk))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
