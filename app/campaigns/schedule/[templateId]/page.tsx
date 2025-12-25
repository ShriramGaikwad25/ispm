"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useForm, Control, FieldValues } from "react-hook-form";
import { createPortal } from "react-dom";
import { Play, X, RotateCcw } from "lucide-react";
import MultiSelect from "@/components/MultiSelect";
import { customOption, loadUsers, loadIspmApps } from "@/components/MsAsyncData";
import { asterisk, userGroups, excludeUsers, defaultExpression } from "@/utils/utils";
import ToggleSwitch from "@/components/ToggleSwitch";
import FileDropzone from "@/components/FileDropzone";
import { BackButton } from "@/components/BackButton";
import DateInput from "@/components/DatePicker";

const SchedulePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = params?.templateId as string;
  const templateName = searchParams?.get("name") || "Template";
  
  const [template, setTemplate] = useState<any>(null);
  const [showRunNowModal, setShowRunNowModal] = useState(false);
  const [showStagingForm, setShowStagingForm] = useState(false);
  const [stagingTiming, setStagingTiming] = useState("Before First Run Only");
  const [stagingDuration, setStagingDuration] = useState("");
  const [stagingDurationUnit, setStagingDurationUnit] = useState("Days");
  // Run history state
  const [runHistoryLoading, setRunHistoryLoading] = useState(false);
  const [runHistoryError, setRunHistoryError] = useState<string | null>(null);
  const [runHistoryData, setRunHistoryData] = useState<any[]>([]);

  // Fetch run history
  const fetchRunHistory = async (groupName: string, jobName: string) => {
    try {
      setRunHistoryLoading(true);
      setRunHistoryError(null);

      const response = await fetch(
        `/api/jobs/history/${encodeURIComponent(groupName)}/${encodeURIComponent(jobName)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error);
      }

      const data = await response.json();

      // Check if the response contains an error
      if (data && typeof data === "object" && (data.message || data.error)) {
        throw new Error(data.message || data.error);
      }

      // Set the history data (should be an array)
      setRunHistoryData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching run history:", err);
      setRunHistoryError(
        err instanceof Error ? err.message : "Failed to fetch run history"
      );
      setRunHistoryData([]);
    } finally {
      setRunHistoryLoading(false);
    }
  };

  // In a real app, you would fetch the template data based on templateId
  useEffect(() => {
    // For now, we'll use template name from query params. In production, fetch from API
    setTemplate({
      id: templateId,
      name: templateName,
      description: "",
      userType: "All users",
      selectData: "All Applications",
    });
  }, [templateId, templateName]);

  // Fetch run history when templateId is available
  useEffect(() => {
    if (templateId) {
      // Use templateId as jobName and default groupName to "CAMPAIGNS"
      // In production, you might want to fetch the actual groupName from the template data
      const groupName = "CAMPAIGNS"; // Default group name, can be made configurable
      const jobName = templateId;
      fetchRunHistory(groupName, jobName);
    }
  }, [templateId]);

  const {
    register,
    setValue,
    control,
    watch,
    resetField,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      certificationTemplate: template?.name || "",
      description: template?.description || "",
      userType: template?.userType || "All users",
      selectData: template?.selectData || "All Applications",
      specificUserExpression: template?.specificUserExpression || [defaultExpression],
      specificApps: template?.specificApps || [],
      expressionApps: template?.expressionApps || [],
      expressionEntitlement: template?.expressionEntitlement || [defaultExpression],
      groupListIsChecked: template?.groupListIsChecked || false,
      userGroupList: template?.userGroupList || "",
      excludeUsersIsChecked: template?.excludeUsersIsChecked || false,
      excludeUsers: template?.excludeUsers || "",
      // Scheduling fields
      startDate: null,
      runOnceOnly: false,
      recurrenceNumber: "",
      recurrenceUnit: "Days",
      endCondition: "Never",
      endDate: null,
      numberOfOccurrences: "",
      enableStaging: "No",
      stagingTiming: "Before First Run Only",
      stagingDuration: "",
      stagingDurationUnit: "Days",
    },
  });

  useEffect(() => {
    if (template) {
      setValue("certificationTemplate", template.name || "");
      setValue("description", template.description || "");
      setValue("userType", template.userType || "All users");
      setValue("selectData", template.selectData || "All Applications");
    }
  }, [template, setValue]);

  const userType = watch("userType");
  const groupListIsChecked = watch("groupListIsChecked");
  const excludeUsersIsChecked = watch("excludeUsersIsChecked");
  const selectData = watch("selectData");
  const runOnceOnly = watch("runOnceOnly");
  const endCondition = watch("endCondition");
  const enableStaging = watch("enableStaging");

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
  }, [userType, groupListIsChecked, excludeUsersIsChecked, resetField, setValue]);

  useEffect(() => {
    if (
      selectData === "All Applications" ||
      selectData === "Select Entitlement"
    ) {
      setValue("specificApps", [], { shouldValidate: false });
      setValue("expressionApps", [], { shouldValidate: false });
    }
    if (selectData === "All Applications") {
      setValue("expressionEntitlement", [], { shouldValidate: false });
    }
    if (selectData === "Specific Applications") {
      setValue("expressionEntitlement", [], { shouldValidate: false });
    }
    if (selectData === "Select Entitlement") {
      setValue("specificApps", [], { shouldValidate: false });
    }
  }, [selectData, setValue]);

  const onSubmit = (data: any) => {
    // Handle schedule submission
    console.log("Schedule data:", data);
    // TODO: Call API to schedule the template
    alert("Campaign scheduled successfully!");
    router.push("/campaigns");
  };

  const handleRunNowClick = () => {
    setShowRunNowModal(true);
    setShowStagingForm(false);
  };

  const handleRunNow = () => {
    // Handle run now - execute campaign immediately
    const formData = watch();
    console.log("Run Now data:", formData);
    // TODO: Call API to run the campaign immediately
    setShowRunNowModal(false);
    setShowStagingForm(false);
    alert("Campaign started successfully!");
    router.push("/campaigns");
  };

  const handleStagingClick = () => {
    setShowStagingForm(true);
  };

  const handleStagingSubmit = () => {
    // Handle staging - run with staging enabled
    const formData = watch();
    const stagingData = {
      ...formData,
      enableStaging: "Yes",
      stagingTiming,
      stagingDuration,
      stagingDurationUnit,
    };
    console.log("Staging data:", stagingData);
    // TODO: Call API to run the campaign with staging
    setShowRunNowModal(false);
    setShowStagingForm(false);
    alert("Campaign started with staging successfully!");
    router.push("/campaigns");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Schedule Template</h1>
          <button
            type="button"
            onClick={handleRunNowClick}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            <Play className="w-4 h-4" />
            Run Now
          </button>
        </div>

        {/* Two-part layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Part: Schedule Form */}
          <div className="space-y-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">Basic Information</h2>
            <div className="space-y-6">
              {/* Template Name */}
              <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                <label className={`text-sm font-medium text-gray-700 pt-2 ${asterisk}`}>
                  Template Name
                </label>
                <div className="w-full max-w-md">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("certificationTemplate", { required: "Template Name is required" })}
                  />
                  {errors.certificationTemplate?.message &&
                    typeof errors.certificationTemplate.message === "string" && (
                      <p className="text-red-500 text-sm mt-1">{errors.certificationTemplate.message}</p>
                    )}
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                <label className={`text-sm font-medium text-gray-700 pt-2 ${asterisk}`}>
                  Description
                </label>
                <div className="w-full max-w-md">
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    {...register("description", { required: "Description is required" })}
                  />
                  {errors.description?.message &&
                    typeof errors.description.message === "string" && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">Scheduling</h2>
            <div className="space-y-6">
              {/* Start Date Section */}
              <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                <label className={`text-sm font-medium text-gray-700 pt-2 ${asterisk}`}>
                  Start Date
                </label>
                <div className="w-full max-w-sm">
                  <DateInput
                    control={control as unknown as Control<FieldValues>}
                    name="startDate"
                    showTime={true}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.startDate?.message &&
                    typeof errors.startDate.message === "string" && (
                      <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
                    )}
                </div>
              </div>

              {/* Run Once Only Checkbox */}
              <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
                <div></div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register("runOnceOnly")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700 cursor-pointer">Run it once only</label>
                </div>
              </div>

              {/* Recurrence Section */}
              {!runOnceOnly && (
                <div className="border-t border-gray-200 pt-6 space-y-6">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">Recurrence</h4>
                  
                  <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
                    <label className="text-sm font-medium text-gray-700">Frequency</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        className="w-60 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Number"
                        {...register("recurrenceNumber")}
                      />
                      <span className="text-gray-600 font-medium">—</span>
                      <select
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        {...register("recurrenceUnit")}
                      >
                        <option value="Days">Days</option>
                        <option value="Weeks">Weeks</option>
                        <option value="Months">Months</option>
                      </select>
                    </div>
                  </div>

                  {/* Ends Section */}
                  <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                    <label className="text-sm font-medium text-gray-700 pt-2">Ends</label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="Never"
                          {...register("endCondition")}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Never</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="On"
                            {...register("endCondition")}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">On</span>
                        </label>
                        <div className="ml-5 w-64">
                          <DateInput
                            control={control as unknown as Control<FieldValues>}
                            name="endDate"
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                              endCondition !== "On" ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
                            }`}
                            disabled={endCondition !== "On"}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="After"
                            {...register("endCondition")}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">After</span>
                        </label>
                        <div className="ml-2 w-60">
                          <input
                            type="number"
                            min="1"
                            {...register("numberOfOccurrences")}
                            disabled={endCondition !== "After"}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              endCondition !== "After" ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
                            }`}
                            placeholder=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enable Staging Section */}
              <div className="border-t border-gray-200 pt-6 space-y-6">
                <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
                  <label className={`text-sm font-medium text-gray-700 ${asterisk}`}>
                    Enable Staging
                  </label>
                  <div className="w-full max-w-md">
                    <select
                      className="w-80 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...register("enableStaging")}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>

                {enableStaging === "Yes" && (
                  <div className="ml-[200px] space-y-6 pl-6 border-l-2 border-gray-200">
                    {/* Staging Timing */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Staging Timing</label>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="Before First Run Only"
                            {...register("stagingTiming")}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Before First Run Only</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="Before Each Run"
                            {...register("stagingTiming")}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Before Each Run</span>
                        </label>
                      </div>
                    </div>

                    {/* Staging Duration */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Duration</label>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 whitespace-nowrap">Number</label>
                        <input
                          type="number"
                          min="1"
                          className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Number"
                          {...register("stagingDuration")}
                        />
                        <span className="text-gray-600 font-medium">—</span>
                        <select
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          {...register("stagingDurationUnit")}
                        >
                          <option value="Days">Days</option>
                          <option value="Weeks">Weeks</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with Schedule Button */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                Schedule
              </button>
            </div>
          </div>
            </form>
          </div>

          {/* Right Part: Run History Section */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Run History</h2>
            <button
              type="button"
              onClick={() => {
                if (templateId) {
                  const groupName = "CAMPAIGNS";
                  const jobName = templateId;
                  fetchRunHistory(groupName, jobName);
                }
              }}
              disabled={runHistoryLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh run history"
            >
              <RotateCcw className={`w-4 h-4 ${runHistoryLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          
              {runHistoryLoading ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">Loading run history...</p>
                </div>
              ) : runHistoryError ? (
                <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600">Error: {runHistoryError}</p>
                </div>
              ) : runHistoryData.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">
                  <p>No run history available</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-md max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full border-collapse text-sm min-w-[1200px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Fired At
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Job Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Job Group
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Trigger Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Trigger Group
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Finished At
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      Duration
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {runHistoryData.map((historyItem, index) => {
                    const firedAt = historyItem.firedAt ? new Date(historyItem.firedAt).toLocaleString() : "N/A";
                    const finishedAt = historyItem.finishedAt ? new Date(historyItem.finishedAt).toLocaleString() : "N/A";
                    const duration = historyItem.firedAt && historyItem.finishedAt
                      ? `${Math.round((new Date(historyItem.finishedAt).getTime() - new Date(historyItem.firedAt).getTime()) / 1000)}s`
                      : "N/A";
                    const status = historyItem.status?.toLowerCase() || "unknown";
                    
                    return (
                      <tr key={historyItem.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap border-r border-gray-200">
                          {firedAt}
                        </td>
                        <td className="px-3 py-3 border-r border-gray-200">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${
                              status === "success" || status === "completed"
                                ? "bg-green-100 text-green-800"
                                : status === "error" || status === "failure"
                                ? "bg-red-100 text-red-800"
                                : status === "running"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {historyItem.status || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 font-medium border-r border-gray-200">
                          {historyItem.jobName || "N/A"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 font-medium border-r border-gray-200">
                          {historyItem.jobGroup || "N/A"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 font-medium border-r border-gray-200">
                          {historyItem.triggerName || "N/A"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 font-medium border-r border-gray-200">
                          {historyItem.triggerGroup || "N/A"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap border-r border-gray-200">
                          {finishedAt}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 font-medium whitespace-nowrap border-r border-gray-200">
                          {duration}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 max-w-xs break-words">
                          {historyItem.message || "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Run Now Modal */}
      {showRunNowModal &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowRunNowModal(false);
                  setShowStagingForm(false);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {!showStagingForm ? (
                <>
                  {/* Header */}
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 pr-8">Run Campaign</h2>

                  {/* Body */}
                  <p className="text-gray-600 mb-6">
                    Choose how you want to run this campaign:
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleRunNow}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm"
                    >
                      <Play className="w-4 h-4" />
                      Run Now
                    </button>
                    <button
                      onClick={handleStagingClick}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
                    >
                      <Play className="w-4 h-4" />
                      Staging
                    </button>
                  </div>

                  {/* Cancel Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        setShowRunNowModal(false);
                        setShowStagingForm(false);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Staging Form */}
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 pr-8">Staging Configuration</h2>

                  <div className="space-y-6">
                    {/* Staging Timing */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Staging Timing</label>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="Before First Run Only"
                            checked={stagingTiming === "Before First Run Only"}
                            onChange={(e) => setStagingTiming(e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Before First Run Only</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="Before Each Run"
                            checked={stagingTiming === "Before Each Run"}
                            onChange={(e) => setStagingTiming(e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Before Each Run</span>
                        </label>
                      </div>
                    </div>

                    {/* Staging Duration */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Duration</label>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 whitespace-nowrap">Number</label>
                        <input
                          type="number"
                          min="1"
                          value={stagingDuration}
                          onChange={(e) => setStagingDuration(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Number"
                        />
                        <span className="text-gray-600 font-medium">—</span>
                        <select
                          value={stagingDurationUnit}
                          onChange={(e) => setStagingDurationUnit(e.target.value)}
                          className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Days">Days</option>
                          <option value="Weeks">Weeks</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowStagingForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStagingSubmit}
                      className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
                    >
                      <Play className="w-4 h-4" />
                      Run with Staging
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SchedulePage;

