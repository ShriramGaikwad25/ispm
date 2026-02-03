"use client";

import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronUp, Edit, Trash2, X, Plus, Calendar, Loader2 } from "lucide-react";
import { updateAppConfig } from "@/lib/api";

type EventTabId = "pre-process" | "post-process";

type ServiceRow = {
  id: string;
  endpoint: string;
  authorization: string;
  operation: string;
  isEnabled: boolean;
  customHeaders: Array<{ name: string; value: string }>;
};

type SdkRow = {
  id: string;
  implementationClass: string;
  agentId: string;
  operation: string;
  isEnabled: boolean;
};

type ThresholdOp = "disable" | "create" | "delete";
type ThresholdState = { maxLimit: number; minutes: number; action: string; email: string };
type PeakDayRange = { id: string; startDate: string; endDate: string };
type ExceptionalState = {
  isExceptionalExpanded: boolean;
  isPeakDaysExpanded: boolean;
  isPeakTimeExpanded: boolean;
  peakDays: PeakDayRange[];
  peakTimes: PeakDayRange[];
};

const initialThresholdState: ThresholdState = {
  maxLimit: -1,
  minutes: 0,
  action: "continue",
  email: "",
};

const initialExceptionalState: ExceptionalState = {
  isExceptionalExpanded: true,
  isPeakDaysExpanded: true,
  isPeakTimeExpanded: false,
  peakDays: [{ id: "peak-1", startDate: "", endDate: "" }],
  peakTimes: [{ id: "peak-time-1", startDate: "", endDate: "" }],
};

const initialEventTabState = {
  isServiceExpanded: true,
  isSDKExpanded: true,
  activeOperation: "create" as const,
  activeSDKOperation: "create" as const,
};

const defaultAppAccessRule = {
  revokeAccess: { entitlements: [], roles: [], groups: [] },
  ruleName: "",
  description: "",
  rule: {},
  ruleElements: [],
  setAttributes: [],
  createdOn: "",
  assignAccess: { entitlements: [], roles: [], groups: [] },
  status: false,
};

const defaultAutoRetry = { isEnabled: false, interval: -1, maximumRetry: 0 };

export type AdvanceSettingTabRef = {
  /** Returns current hooks + threshold config (for use in wizard submit / OnBoard). */
  getConfig: () => Record<string, unknown>;
};

type AdvanceSettingTabProps = {
  applicationId: string;
  /** When true, only show Hooks + Target System Provisioning Threshold (e.g. in add-application step 5); hide Submit/Cancel. */
  wizardMode?: boolean;
};

const AdvanceSettingTab = forwardRef<AdvanceSettingTabRef, AdvanceSettingTabProps>(function AdvanceSettingTab(
  { applicationId, wizardMode },
  ref
) {
  const router = useRouter();
  const [isHooksExpanded, setIsHooksExpanded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeEventTab, setActiveEventTab] = useState<EventTabId>("pre-process");
  const [eventTabState, setEventTabState] = useState<Record<EventTabId, typeof initialEventTabState>>({
    "pre-process": { ...initialEventTabState },
    "post-process": { ...initialEventTabState },
  });
  const [isThresholdExpanded, setIsThresholdExpanded] = useState(true);
  const [hookName, setHookName] = useState("");
  // Process Event modal (Add Service)
  const [isProcessEventModalOpen, setIsProcessEventModalOpen] = useState(false);
  const [processEventForm, setProcessEventForm] = useState({
    endpoint: "",
    authorization: "",
    operation: "Create",
    isEnabled: false,
  });
  const [customHeaders, setCustomHeaders] = useState<Array<{ name: string; value: string }>>([]);
  const [serviceRowsByEventTab, setServiceRowsByEventTab] = useState<Record<EventTabId, ServiceRow[]>>({
    "pre-process": [],
    "post-process": [],
  });
  // SDK modal (Add SDK)
  const [isSdkModalOpen, setIsSdkModalOpen] = useState(false);
  const [sdkForm, setSdkForm] = useState({
    implementationClass: "",
    agentId: "",
    operation: "Create",
    isEnabled: false,
  });
  const [sdkRowsByEventTab, setSdkRowsByEventTab] = useState<Record<EventTabId, SdkRow[]>>({
    "pre-process": [],
    "post-process": [],
  });
  // Target System Provisioning Threshold (per operation)
  const [thresholdByOperation, setThresholdByOperation] = useState<Record<ThresholdOp, ThresholdState>>({
    disable: { ...initialThresholdState },
    create: { ...initialThresholdState },
    delete: { ...initialThresholdState },
  });
  const [exceptionalByOperation, setExceptionalByOperation] = useState<
    Record<ThresholdOp, ExceptionalState>
  >({
    disable: { ...initialExceptionalState },
    create: { ...initialExceptionalState },
    delete: { ...initialExceptionalState },
  });

  const setThreshold = (op: ThresholdOp, update: Partial<ThresholdState>) => {
    setThresholdByOperation((prev) => ({ ...prev, [op]: { ...prev[op], ...update } }));
  };
  const setExceptional = (op: ThresholdOp, update: Partial<ExceptionalState>) => {
    setExceptionalByOperation((prev) => ({ ...prev, [op]: { ...prev[op], ...update } }));
  };
  const addPeakDayRange = (op: ThresholdOp) => {
    setExceptionalByOperation((prev) => ({
      ...prev,
      [op]: {
        ...prev[op],
        peakDays: [...prev[op].peakDays, { id: `peak-${Date.now()}`, startDate: "", endDate: "" }],
      },
    }));
  };
  const removePeakDayRange = (op: ThresholdOp, id: string) => {
    setExceptionalByOperation((prev) => ({
      ...prev,
      [op]: { ...prev[op], peakDays: prev[op].peakDays.filter((r) => r.id !== id) },
    }));
  };
  const updatePeakDayRange = (op: ThresholdOp, id: string, field: "startDate" | "endDate", value: string) => {
    setExceptionalByOperation((prev) => ({
      ...prev,
      [op]: {
        ...prev[op],
        peakDays: prev[op].peakDays.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      },
    }));
  };
  const addPeakTimeRange = (op: ThresholdOp) => {
    setExceptionalByOperation((prev) => ({
      ...prev,
      [op]: {
        ...prev[op],
        peakTimes: [...prev[op].peakTimes, { id: `peak-time-${Date.now()}`, startDate: "", endDate: "" }],
      },
    }));
  };
  const removePeakTimeRange = (op: ThresholdOp, id: string) => {
    setExceptionalByOperation((prev) => ({
      ...prev,
      [op]: { ...prev[op], peakTimes: prev[op].peakTimes.filter((r) => r.id !== id) },
    }));
  };
  const updatePeakTimeRange = (op: ThresholdOp, id: string, field: "startDate" | "endDate", value: string) => {
    setExceptionalByOperation((prev) => ({
      ...prev,
      [op]: {
        ...prev[op],
        peakTimes: prev[op].peakTimes.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      },
    }));
  };

  const buildApplicationConfig = (): Record<string, unknown> => {
    const preProcessEvent: unknown[] = [];
    (serviceRowsByEventTab["pre-process"] || []).forEach((r) => {
      preProcessEvent.push({
        type: "service",
        endpoint: r.endpoint,
        authorization: r.authorization,
        operation: r.operation,
        isEnabled: r.isEnabled,
        customHeaders: r.customHeaders,
      });
    });
    (sdkRowsByEventTab["pre-process"] || []).forEach((r) => {
      preProcessEvent.push({
        type: "sdk",
        implementationClass: r.implementationClass,
        agentId: r.agentId,
        operation: r.operation,
        isEnabled: r.isEnabled,
      });
    });

    const postProcessEvent: unknown[] = [];
    (serviceRowsByEventTab["post-process"] || []).forEach((r) => {
      postProcessEvent.push({
        type: "service",
        endpoint: r.endpoint,
        authorization: r.authorization,
        operation: r.operation,
        isEnabled: r.isEnabled,
        customHeaders: r.customHeaders,
      });
    });
    (sdkRowsByEventTab["post-process"] || []).forEach((r) => {
      postProcessEvent.push({
        type: "sdk",
        implementationClass: r.implementationClass,
        agentId: r.agentId,
        operation: r.operation,
        isEnabled: r.isEnabled,
      });
    });

    const threshold: unknown[] = (
      ["disable", "create", "delete"] as ThresholdOp[]
    ).map((op) => {
      const th = thresholdByOperation[op];
      const exc = exceptionalByOperation[op];
      const operationLabel =
        op === "disable" ? "Disable" : op === "create" ? "Create" : "Delete";
      return {
        operation: operationLabel,
        cutOff: {
          maximumAllowed: th.maxLimit,
          stopFurtherOperations: th.action === "stop",
          sendAlertTo: th.email || "",
          durationInMinutes: th.minutes || 0,
        },
        exceptionalCases: {
          peakDays: exc.peakDays.map((r) => ({
            startDate: r.startDate || "",
            endData: r.endDate || "",
          })),
          peakTime: exc.peakTimes.map((r) => ({
            startTime: r.startDate || "",
            endTime: r.endDate || "",
          })),
        },
      };
    });

    return {
      hook: {
        name: hookName || "",
        postProcessEvent,
        preProcessEvent,
      },
      threshold,
      appAccessRule: [{ ...defaultAppAccessRule }],
      autoRetry: { ...defaultAutoRetry },
    };
  };

  const buildApplicationConfigRef = useRef(buildApplicationConfig);
  buildApplicationConfigRef.current = buildApplicationConfig;
  useImperativeHandle(
    ref,
    () => ({
      getConfig: () => buildApplicationConfigRef.current(),
    }),
    []
  );

  const handleSubmit = async () => {
    if (!applicationId || wizardMode) return;
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    try {
      const oldApiToken =
        typeof window !== "undefined"
          ? sessionStorage.getItem(`app-inventory-token-${applicationId}`) ?? ""
          : "";
      const applicationConfig = buildApplicationConfig();
      await updateAppConfig(applicationId, oldApiToken, applicationConfig);
      setSubmitSuccess(true);
      router.push("/settings/app-inventory");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const operationLabel = (op: string) =>
    op === "getuser" ? "GetUser" : op === "getalluser" ? "GetAllUser" : op.charAt(0).toUpperCase() + op.slice(1);

  const openProcessEventModal = () => {
    const op = tabState.activeOperation;
    setProcessEventForm({
      endpoint: "",
      authorization: "",
      operation: operationLabel(op),
      isEnabled: false,
    });
    setCustomHeaders([]);
    setIsProcessEventModalOpen(true);
  };
  const closeProcessEventModal = () => setIsProcessEventModalOpen(false);
  const addCustomHeader = () => setCustomHeaders((prev) => [...prev, { name: "", value: "" }]);
  const removeCustomHeader = (index: number) =>
    setCustomHeaders((prev) => prev.filter((_, i) => i !== index));
  const updateCustomHeader = (index: number, field: "name" | "value", value: string) =>
    setCustomHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  const isProcessEventFormValid =
    processEventForm.endpoint.trim() !== "" && processEventForm.authorization.trim() !== "";

  const addServiceRow = () => {
    const row: ServiceRow = {
      id: `service-${Date.now()}`,
      endpoint: processEventForm.endpoint,
      authorization: processEventForm.authorization,
      operation: processEventForm.operation,
      isEnabled: processEventForm.isEnabled,
      customHeaders: customHeaders.filter((h) => h.name.trim() || h.value.trim()),
    };
    setServiceRowsByEventTab((prev) => ({
      ...prev,
      [activeEventTab]: [...(prev[activeEventTab] || []), row],
    }));
    closeProcessEventModal();
  };

  const removeServiceRow = (eventTab: EventTabId, id: string) => {
    setServiceRowsByEventTab((prev) => ({
      ...prev,
      [eventTab]: (prev[eventTab] || []).filter((r) => r.id !== id),
    }));
  };

  const openSdkModal = () => {
    const op = tabState.activeSDKOperation;
    setSdkForm({
      implementationClass: "",
      agentId: "",
      operation: operationLabel(op),
      isEnabled: false,
    });
    setIsSdkModalOpen(true);
  };
  const closeSdkModal = () => setIsSdkModalOpen(false);
  const isSdkFormValid =
    sdkForm.implementationClass.trim() !== "" && sdkForm.agentId.trim() !== "";

  const addSdkRow = () => {
    const row: SdkRow = {
      id: `sdk-${Date.now()}`,
      implementationClass: sdkForm.implementationClass,
      agentId: sdkForm.agentId,
      operation: sdkForm.operation,
      isEnabled: sdkForm.isEnabled,
    };
    setSdkRowsByEventTab((prev) => ({
      ...prev,
      [activeEventTab]: [...(prev[activeEventTab] || []), row],
    }));
    closeSdkModal();
  };

  const removeSdkRow = (eventTab: EventTabId, id: string) => {
    setSdkRowsByEventTab((prev) => ({
      ...prev,
      [eventTab]: (prev[eventTab] || []).filter((r) => r.id !== id),
    }));
  };

  const tabState = eventTabState[activeEventTab];
  const setTabState = (update: Partial<typeof initialEventTabState>) => {
    setEventTabState((prev) => ({
      ...prev,
      [activeEventTab]: { ...prev[activeEventTab], ...update },
    }));
  };

  return (
    <div className="p-6">
          {/* Hooks section: Name + Pre/Post Process Event (collapsible) - same style as Threshold card */}
          <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60 shadow-sm">
            <div
              className="flex items-center justify-between cursor-pointer border-l-4 border-amber-500 bg-white px-5 py-3.5 hover:bg-slate-50 transition-colors"
              onClick={() => setIsHooksExpanded(!isHooksExpanded)}
              role="button"
              aria-expanded={isHooksExpanded}
            >
              <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
                Hooks
              </h3>
              {isHooksExpanded ? (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              )}
            </div>
            {isHooksExpanded && (
            <div className="p-5 space-y-4 border-t border-slate-200 bg-white">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Enter hook name"
                  value={hookName}
                  onChange={(e) => setHookName(e.target.value)}
                />
              </div>

              {/* Pre / Post Process Event - card */}
              <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
            {/* Event Tabs: Pre Process Event | Post Process Event */}
            <div className="border-b border-gray-200 bg-gray-50/80">
              <div className="flex">
                <button
                  className={`px-6 py-3 text-sm font-medium ${
                    activeEventTab === "pre-process"
                      ? "text-white bg-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveEventTab("pre-process")}
                >
                  Pre Process Event
                </button>
                <button
                  className={`px-6 py-3 text-sm font-medium ${
                    activeEventTab === "post-process"
                      ? "text-white bg-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveEventTab("post-process")}
                >
                  Post Process Event
                </button>
              </div>
            </div>

            {/* Service and SDK are part of the selected event tab */}
            <div className="p-5">
            {/* Service Section */}
            <div className="space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded"
                onClick={() => setTabState({ isServiceExpanded: !tabState.isServiceExpanded })}
              >
                <h3 className="text-md font-semibold text-gray-800 flex items-center">
                  <svg
                    className="w-5 h-5 text-gray-600 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                  </svg>
                  Service
                </h3>
                {tabState.isServiceExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {tabState.isServiceExpanded && (
                <>
                  <div className="flex space-x-2 mb-4">
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeOperation === "create"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeOperation: "create" })}
                    >
                      Create
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeOperation === "update"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeOperation: "update" })}
                    >
                      Update
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeOperation === "delete"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeOperation: "delete" })}
                    >
                      Delete
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeOperation === "getuser"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeOperation: "getuser" })}
                    >
                      GetUser
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeOperation === "getalluser"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeOperation: "getalluser" })}
                    >
                      GetAllUser
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Endpoint
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Authorization
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Operation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          const rowsForOperation = (serviceRowsByEventTab[activeEventTab] || []).filter(
                            (r) => r.operation === operationLabel(tabState.activeOperation)
                          );
                          return rowsForOperation.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button type="button" className="text-gray-400 cursor-default" disabled>
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button type="button" className="text-gray-400 cursor-default" disabled>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          rowsForOperation.map((row) => (
                            <tr key={row.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.endpoint}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.authorization}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.operation}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button type="button" className="text-blue-600 hover:text-blue-800">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeServiceRow(activeEventTab, row.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={openProcessEventModal}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                    >
                      Add Service
                    </button>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        &lt;
                      </button>
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                        1
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        &gt;
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* SDK Section */}
            <div className="space-y-4 mt-8">
              <div
                className="flex items-center justify-between cursor-pointer bg-blue-50 hover:bg-blue-100 p-2 rounded"
                onClick={() => setTabState({ isSDKExpanded: !tabState.isSDKExpanded })}
              >
                <h3 className="text-md font-semibold text-gray-800 flex items-center">
                  <svg
                    className="w-5 h-5 text-gray-600 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" />
                  </svg>
                  SDK
                </h3>
                {tabState.isSDKExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {tabState.isSDKExpanded && (
                <>
                  <div className="flex space-x-2 mb-4">
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeSDKOperation === "create"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeSDKOperation: "create" })}
                    >
                      Create
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeSDKOperation === "update"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeSDKOperation: "update" })}
                    >
                      Update
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeSDKOperation === "delete"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeSDKOperation: "delete" })}
                    >
                      Delete
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeSDKOperation === "getuser"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeSDKOperation: "getuser" })}
                    >
                      GetUser
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded ${
                        tabState.activeSDKOperation === "getalluser"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setTabState({ activeSDKOperation: "getalluser" })}
                    >
                      GetAllUser
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Implementation Class
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Agent Id
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Operation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          const sdkRowsForOperation = (sdkRowsByEventTab[activeEventTab] || []).filter(
                            (r) => r.operation === operationLabel(tabState.activeSDKOperation)
                          );
                          return sdkRowsForOperation.length === 0 ? (
                            <tr>
                              <td className="px-4 py-3 text-sm text-gray-500">-</td>
                              <td className="px-4 py-3 text-sm text-gray-500">-</td>
                              <td className="px-4 py-3 text-sm text-gray-500">-</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button type="button" className="text-gray-400 cursor-default" disabled>
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button type="button" className="text-gray-400 cursor-default" disabled>
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            sdkRowsForOperation.map((row) => (
                              <tr key={row.id}>
                                <td className="px-4 py-3 text-sm text-gray-900">{row.implementationClass}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{row.agentId}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{row.operation}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  <div className="flex space-x-2">
                                    <button type="button" className="text-blue-600 hover:text-blue-800">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeSdkRow(activeEventTab, row.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={openSdkModal}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                    >
                      Add SDK
                    </button>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        &lt;
                      </button>
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                        1
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        &gt;
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
          </div>
            )}
          </div>

          {/* Target System Provisioning Threshold - separate section (distinct style) */}
          <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60 shadow-sm">
            <div
              className="flex items-center justify-between cursor-pointer border-l-4 border-amber-500 bg-white px-5 py-3.5 hover:bg-slate-50 transition-colors"
              onClick={() => setIsThresholdExpanded(!isThresholdExpanded)}
            >
              <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Target System Provisioning Threshold
              </h3>
              {isThresholdExpanded ? (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              )}
            </div>

            {isThresholdExpanded && (
              <div className="p-5 space-y-5 border-t border-slate-200 bg-white">
                {(["disable", "create", "delete"] as ThresholdOp[]).map((op) => {
                  const th = thresholdByOperation[op];
                  const exc = exceptionalByOperation[op];
                  const opLabel = op.charAt(0).toUpperCase() + op.slice(1);
                  const showExceptional = th.maxLimit > 0;
                  return (
                    <div
                      key={op}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-amber-400"
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-amber-700 mb-3">
                        {opLabel} Operation
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>If the {opLabel} Operation exceeds the maximum limit of</span>
                        <input
                          type="number"
                          className="w-16 px-2 py-1.5 border border-slate-300 rounded-md text-center text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          value={th.maxLimit === -1 ? "" : th.maxLimit}
                          onChange={(e) => {
                            const v = e.target.value;
                            setThreshold(op, { maxLimit: v === "" ? -1 : parseInt(v, 10) || 0 });
                          }}
                          placeholder="-1"
                        />
                        <span>operations within</span>
                        <input
                          type="number"
                          className="w-16 px-2 py-1.5 border border-slate-300 rounded-md text-center text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          value={th.minutes || ""}
                          onChange={(e) =>
                            setThreshold(op, { minutes: parseInt(e.target.value, 10) || 0 })
                          }
                          placeholder="0"
                        />
                        <span>minutes then</span>
                        <select
                          className="px-2 py-1.5 border border-slate-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          value={th.action}
                          onChange={(e) => setThreshold(op, { action: e.target.value })}
                        >
                          <option value="continue">Continue</option>
                          <option value="stop">Stop</option>
                          <option value="pause">Pause</option>
                        </select>
                        <span>further operations and send alert to email</span>
                        <input
                          type="email"
                          className="w-52 px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="email@example.com"
                          value={th.email}
                          onChange={(e) => setThreshold(op, { email: e.target.value })}
                        />
                      </div>

                      {showExceptional && (
                        <div className="mt-4 rounded-lg border border-slate-200 border-l-4 border-l-amber-500 bg-slate-50/40 overflow-hidden">
                          <div
                            className="flex items-center gap-2 cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100/80 transition-colors"
                            onClick={() =>
                              setExceptional(op, { isExceptionalExpanded: !exc.isExceptionalExpanded })
                            }
                            role="button"
                            aria-expanded={exc.isExceptionalExpanded}
                          >
                            {exc.isExceptionalExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            Exceptional Cases
                          </div>
                          {exc.isExceptionalExpanded && (
                            <div className="px-3 pb-3 pt-1 space-y-2">
                              {/* Peak Days */}
                              <div className="rounded-lg border border-slate-200 border-l-4 border-l-blue-500 bg-white shadow-sm overflow-hidden">
                                <div
                                  className="flex items-center justify-between cursor-pointer px-4 py-3 hover:bg-slate-50 transition-colors"
                                  onClick={() =>
                                    setExceptional(op, {
                                      isPeakDaysExpanded: !exc.isPeakDaysExpanded,
                                      ...(!exc.isPeakDaysExpanded ? { isPeakTimeExpanded: false } : {}),
                                    })
                                  }
                                  role="button"
                                  aria-expanded={exc.isPeakDaysExpanded}
                                >
                                  <span className="text-sm font-medium text-slate-700">Peak Days</span>
                                  {exc.isPeakDaysExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                  )}
                                </div>
                                {exc.isPeakDaysExpanded && (
                                  <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-100">
                                    {exc.peakDays.map((range, idx) => (
                                      <div
                                        key={range.id}
                                        className="flex flex-nowrap items-center gap-2"
                                      >
                                        <span className="text-slate-600 text-sm shrink-0">Start Date</span>
                                        <div className="relative w-52 shrink-0">
                                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                                          <input
                                            type="date"
                                            className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            value={range.startDate}
                                            onChange={(e) =>
                                              updatePeakDayRange(op, range.id, "startDate", e.target.value)
                                            }
                                          />
                                        </div>
                                        <span className="text-slate-600 text-sm shrink-0">End Date</span>
                                        <div className="relative w-52 shrink-0">
                                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                                          <input
                                            type="date"
                                            className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            value={range.endDate}
                                            onChange={(e) =>
                                              updatePeakDayRange(op, range.id, "endDate", e.target.value)
                                            }
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removePeakDayRange(op, range.id)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                                          aria-label="Remove date range"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        {idx === exc.peakDays.length - 1 && (
                                          <button
                                            type="button"
                                            onClick={() => addPeakDayRange(op)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                                            aria-label="Add date range"
                                          >
                                            <Plus className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Peak Time */}
                              <div className="rounded-lg border border-slate-200 border-l-4 border-l-blue-500 bg-white shadow-sm overflow-hidden">
                                <div
                                  className="flex items-center justify-between cursor-pointer px-4 py-3 hover:bg-slate-50 transition-colors"
                                  onClick={() =>
                                    setExceptional(op, {
                                      isPeakTimeExpanded: !exc.isPeakTimeExpanded,
                                      ...(!exc.isPeakTimeExpanded ? { isPeakDaysExpanded: false } : {}),
                                    })
                                  }
                                  role="button"
                                  aria-expanded={exc.isPeakTimeExpanded}
                                >
                                  <span className="text-sm font-medium text-slate-700">Peak Time</span>
                                  {exc.isPeakTimeExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                  )}
                                </div>
                                {exc.isPeakTimeExpanded && (
                                  <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-100">
                                    {exc.peakTimes.map((range, idx) => (
                                      <div
                                        key={range.id}
                                        className="flex flex-nowrap items-center gap-2"
                                      >
                                        <span className="text-slate-600 text-sm shrink-0">Start Date</span>
                                        <div className="relative w-52 shrink-0">
                                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                                          <input
                                            type="date"
                                            className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            value={range.startDate}
                                            onChange={(e) =>
                                              updatePeakTimeRange(op, range.id, "startDate", e.target.value)
                                            }
                                          />
                                        </div>
                                        <span className="text-slate-600 text-sm shrink-0">End Date</span>
                                        <div className="relative w-52 shrink-0">
                                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                                          <input
                                            type="date"
                                            className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            value={range.endDate}
                                            onChange={(e) =>
                                              updatePeakTimeRange(op, range.id, "endDate", e.target.value)
                                            }
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removePeakTimeRange(op, range.id)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                                          aria-label="Remove date range"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        {idx === exc.peakTimes.length - 1 && (
                                          <button
                                            type="button"
                                            onClick={() => addPeakTimeRange(op)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                                            aria-label="Add date range"
                                          >
                                            <Plus className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit and Cancel - hidden in wizard mode (e.g. add-application step 5) */}
          {!wizardMode && (
          <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-slate-200">
            {submitError && (
              <p className="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}
            {submitSuccess && (
              <p className="text-sm text-green-600" role="status">
                Settings saved successfully.
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
          )}

      {/* Process Event modal (Add Service) */}
      {isProcessEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Process Event</h2>
              <button
                type="button"
                onClick={closeProcessEventModal}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (isProcessEventFormValid) {
                  addServiceRow();
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
                <input
                  type="text"
                  value={processEventForm.endpoint}
                  onChange={(e) => setProcessEventForm((p) => ({ ...p, endpoint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authorization</label>
                <input
                  type="text"
                  value={processEventForm.authorization}
                  onChange={(e) => setProcessEventForm((p) => ({ ...p, authorization: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                <input
                  type="text"
                  value={processEventForm.operation}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="process-event-enabled"
                  checked={processEventForm.isEnabled}
                  onChange={(e) => setProcessEventForm((p) => ({ ...p, isEnabled: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="process-event-enabled" className="text-sm font-medium text-gray-700">
                  Is Enabled
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Headers</label>
                <div className="space-y-2">
                  {customHeaders.length === 0 ? (
                    <div className="flex items-center gap-2 min-h-[42px]">
                      <div className="flex-1 min-w-0" />
                      <div className="flex-1 min-w-0" />
                      <div className="w-10 h-10 flex-shrink-0" />
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={addCustomHeader}
                          className="p-2 h-10 w-10 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-full bg-green-100"
                          aria-label="Add header"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                  customHeaders.map((header, index) => (
                    <div key={index} className="flex items-center gap-2 min-h-[42px]">
                      <input
                        type="text"
                        value={header.name}
                        onChange={(e) => updateCustomHeader(index, "name", e.target.value)}
                        className="flex-1 min-w-0 h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => updateCustomHeader(index, "value", e.target.value)}
                        className="flex-1 min-w-0 h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Value"
                      />
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeCustomHeader(index)}
                          className="p-2 h-10 w-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded"
                          aria-label="Remove header"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                        {index === customHeaders.length - 1 ? (
                          <button
                            type="button"
                            onClick={addCustomHeader}
                            className="p-2 h-10 w-10 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-full bg-green-100"
                            aria-label="Add header"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeProcessEventModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isProcessEventFormValid}
                  className={`px-4 py-2 text-sm font-medium rounded ${
                    isProcessEventFormValid
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SDK modal (Add SDK) */}
      {isSdkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">SDK Configuration</h2>
              <button
                type="button"
                onClick={closeSdkModal}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (isSdkFormValid) addSdkRow();
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Implementation Class</label>
                <input
                  type="text"
                  value={sdkForm.implementationClass}
                  onChange={(e) => setSdkForm((p) => ({ ...p, implementationClass: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Id</label>
                <input
                  type="text"
                  value={sdkForm.agentId}
                  onChange={(e) => setSdkForm((p) => ({ ...p, agentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                <input
                  type="text"
                  value={sdkForm.operation}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sdk-enabled"
                  checked={sdkForm.isEnabled}
                  onChange={(e) => setSdkForm((p) => ({ ...p, isEnabled: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="sdk-enabled" className="text-sm font-medium text-gray-700">Is Enabled</label>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeSdkModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isSdkFormValid}
                  className={`px-4 py-2 text-sm font-medium rounded ${
                    isSdkFormValid
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  );
});

export default AdvanceSettingTab;
