"use client";
import React from "react";
import { useForm, Control, FieldValues } from "react-hook-form";
import MultiSelect from "@/components/MultiSelect";

const UserGroupTab: React.FC = () => {
  const { control, register } = useForm<FieldValues>({
    defaultValues: {
      selectedUserGroups: [],
    },
  });

  // Mock user groups data - replace with actual API call
  const userGroups = [
    { label: "IT Administrators", value: "it_admins" },
    { label: "HR Managers", value: "hr_managers" },
    { label: "Finance Team", value: "finance_team" },
    { label: "Sales Department", value: "sales_dept" },
    { label: "Marketing Group", value: "marketing_group" },
    { label: "Executive Team", value: "executive_team" },
    { label: "Developers", value: "developers" },
    { label: "QA Team", value: "qa_team" },
    { label: "Operations", value: "operations" },
    { label: "Support Staff", value: "support_staff" },
  ];

  return (
    <div className="p-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search and Select User Groups
        </label>
        <div className="max-w-2xl">
          <MultiSelect
            className="w-full"
            isMulti={true}
            control={control as unknown as Control<FieldValues>}
            options={userGroups}
            placeholder="Search and select user groups..."
            {...register("selectedUserGroups")}
          />
        </div>
      </div>
    </div>
  );
};

export default UserGroupTab;

