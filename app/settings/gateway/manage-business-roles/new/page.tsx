"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLeftSidebar } from "@/contexts/LeftSidebarContext";
import { useCart } from "@/contexts/CartContext";
import SelectAccessTab from "@/app/access-request/SelectAccessTab";

interface Step1Data {
  roleName: string;
  description: string;
  owner: string;
  tags: string;
}

interface FormData {
  step1: Step1Data;
}

export default function NewBusinessRoleWizard() {
  const router = useRouter();
  const { isVisible: isSidebarVisible, sidebarWidthPx } = useLeftSidebar();
  const { items: cartItems, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    step1: {
      roleName: "",
      description: "",
      owner: "",
      tags: "",
    },
  });

  // Catalog state for Select Access (same as Access Request step 2)
  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedAppInstanceId, setSelectedAppInstanceId] = useState<string | null>(null);
  const [showApplicationInstancesOnly, setShowApplicationInstancesOnly] = useState(false);
  const [applicationInstances, setApplicationInstances] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<string>("All");
  const [tagFilter, setTagFilter] = useState<string>("");
  const catalogFetchKeyRef = useRef<string | null>(null);
  const catalogPageRef = useRef(catalogPage);

  const steps = [
    { id: 1, title: "Business Role Details" },
    { id: 2, title: "Select Access" },
    { id: 3, title: "Review & Submit" },
  ];

  const canGoNextFromStep1 =
    formData.step1.roleName.trim() !== "" &&
    formData.step1.description.trim() !== "" &&
    formData.step1.owner.trim() !== "";

  const canGoNextFromStep2 = true;

  const canGoNext =
    (currentStep === 1 && canGoNextFromStep1) ||
    (currentStep === 2 && canGoNextFromStep2);

  const handleNext = () => {
    if (currentStep < 3 && canGoNext) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Placeholder: wire to API when available
      // eslint-disable-next-line no-console
      console.log("Submitting business role:", formData);
      await new Promise((resolve) => setTimeout(resolve, 800));
      clearCart();
      router.push("/settings/gateway/manage-business-roles");
    } finally {
      setSubmitting(false);
    }
  };

  // Clear selected access when leaving this wizard
  useEffect(() => {
    return () => {
      clearCart();
    };
  }, [clearCart]);

  // Keep catalog page ref in sync
  catalogPageRef.current = catalogPage;

  // Transform catalog rows into roles for SelectAccessTab
  const apiRoles = React.useMemo(() => {
    if (!catalogData || catalogData.length === 0) return [];
    const firstRow = catalogData[0] || {};
    const keys = Object.keys(firstRow);

    const findKey = (predicates: ((k: string) => boolean)[]): string | undefined => {
      const lowerKeys = keys.map((k) => k.toLowerCase());
      for (const predicate of predicates) {
        const idx = lowerKeys.findIndex(predicate);
        if (idx !== -1) return keys[idx];
      }
      return undefined;
    };

    const nameKey =
      findKey([
        (k) => k === "name",
        (k) => k === "entitlementname",
        (k) => k === "entitlement_name",
        (k) => k === "applicationname",
      ]) || keys[0];

    const riskKey =
      findKey([
        (k) => k === "risk",
        (k) => k.endsWith("_risk"),
        (k) => k.includes("risk"),
      ]) || keys[1] || keys[0];

    const descriptionKey =
      findKey([
        (k) => k === "description",
        (k) => k === "entitlementdescription",
        (k) => k === "entitlement_description",
        (k) => k === "business_objective",
      ]) || keys[2] || keys[0];

    const idKeysPreference = ["catalogid", "entitlementid", "appinstanceid", "id"];

    const resolveIdKey = (): string | undefined => {
      const lowerKeys = keys.map((k) => k.toLowerCase());
      for (const pref of idKeysPreference) {
        const idx = lowerKeys.indexOf(pref);
        if (idx !== -1) return keys[idx];
      }
      return undefined;
    };

    const idKey = resolveIdKey();

    const normalizeRisk = (value: string): "Low" | "Medium" | "High" => {
      const v = value.toLowerCase();
      if (v.startsWith("high")) return "High";
      if (v.startsWith("medium")) return "Medium";
      if (v.startsWith("low")) return "Low";
      return "Low";
    };

    return catalogData.map((row, idx) => {
      const rawName =
        row[nameKey] !== undefined && row[nameKey] !== null ? String(row[nameKey]) : "";
      const rawRisk =
        row[riskKey] !== undefined && row[riskKey] !== null ? String(row[riskKey]) : "";
      const rawDesc =
        row[descriptionKey] !== undefined && row[descriptionKey] !== null
          ? String(row[descriptionKey])
          : "";

      const idValue =
        (idKey && row[idKey]) ||
        row.catalogid ||
        row.entitlementid ||
        row.appinstanceid ||
        idx;

      return {
        id: String(idValue).trim(),
        name: rawName || "Unnamed access",
        risk: normalizeRisk(rawRisk),
        description: rawDesc,
        catalogRow: row,
      };
    });
  }, [catalogData]);

  // Load application instances when on step 2
  useEffect(() => {
    if (currentStep !== 2) return;
    const url = "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "SELECT appinstanceid, name FROM vw_catalog WHERE type = 'ApplicationInstance' ORDER BY name",
        parameters: [],
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((data) => {
        let rows: any[] = [];
        if (Array.isArray(data)) rows = data;
        else if (Array.isArray((data as any).resultSet)) rows = (data as any).resultSet;
        else if (Array.isArray((data as any).rows)) rows = (data as any).rows;
        const seen = new Set<string>();
        const list: Array<{ id: string; name: string }> = [];
        rows.forEach((r: any) => {
          const id = (r.appinstanceid ?? r.appInstanceId ?? r.app_instance_id ?? "")
            .toString()
            .trim();
          const name = (r.name ?? "").toString().trim();
          if (id && !seen.has(id)) {
            seen.add(id);
            list.push({ id, name: name || id });
          }
        });
        setApplicationInstances(list);
      })
      .catch(() => setApplicationInstances([]));
  }, [currentStep]);

  // Load catalog data in step 2
  useEffect(() => {
    if (currentStep !== 2) return;

    const fetchKey = `2-${catalogPage}-${selectedAppInstanceId ?? "all"}-${showApplicationInstancesOnly}-${catalogTypeFilter}-${tagFilter || "all"}`;
    if (catalogFetchKeyRef.current === fetchKey) return;
    catalogFetchKeyRef.current = fetchKey;

    const pageRequested = catalogPage;

    const limit = 100;
    const offset = (catalogPage - 1) * limit;

    const isFilteredByAppInstance = !!selectedAppInstanceId?.trim() && !showApplicationInstancesOnly;
    const trimmedTag = tagFilter.trim();

    const body =
      showApplicationInstancesOnly
        ? {
            query:
              "SELECT * FROM vw_catalog WHERE type = 'ApplicationInstance' ORDER BY appinstanceid LIMIT ? OFFSET ?",
            parameters: [limit, offset],
          }
        : catalogTypeFilter === "Tags"
          ? {
              query:
                trimmedTag
                  ? `SELECT * FROM vw_catalog WHERE type = 'Entitlement' AND tags ILIKE '%${trimmedTag}%' ORDER BY appinstanceid LIMIT ? OFFSET ?`
                  : "SELECT * FROM vw_catalog WHERE type = 'Entitlement' ORDER BY appinstanceid LIMIT ? OFFSET ?",
              parameters: [limit, offset],
            }
          : isFilteredByAppInstance
            ? {
                query:
                  "SELECT * FROM vw_catalog WHERE type = 'Entitlement' AND appinstanceid = ?::uuid ORDER BY appinstanceid LIMIT ? OFFSET ?",
                parameters: [selectedAppInstanceId!.trim(), limit, offset],
              }
            : {
                query: "SELECT * FROM vw_catalog ORDER BY appinstanceid LIMIT ? OFFSET ?",
                parameters: [limit, offset],
              };

    fetch("https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (catalogPageRef.current !== pageRequested) return;
        let rows: any[] = [];
        if (Array.isArray(data)) rows = data;
        else if (Array.isArray((data as any).resultSet)) rows = (data as any).resultSet;
        else if (Array.isArray((data as any).rows)) rows = (data as any).rows;
        setCatalogData(rows);
      })
      .catch(() => {
        if (catalogPageRef.current !== pageRequested) return;
        setCatalogData([]);
      })
      .finally(() => {
        if (catalogPageRef.current === pageRequested) {
          catalogFetchKeyRef.current = null;
        }
      });
  }, [
    currentStep,
    catalogPage,
    selectedAppInstanceId,
    showApplicationInstancesOnly,
    catalogTypeFilter,
    tagFilter,
  ]);

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
            onClick={handlePrevious}
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
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border shrink-0 ${
                      currentStep >= step.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className="flex-1 h-0.5 bg-gray-200 mx-4 min-w-[16px]"
                    aria-hidden
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="shrink-0">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  !canGoNext
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
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-60"
              >
                {submitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer so content is not hidden under fixed step bar */}
      <div className="h-[72px]" aria-hidden />

      <div className="w-full py-2 px-4">
        <div className="w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    value={formData.step1.roleName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        step1: { ...prev.step1, roleName: e.target.value },
                      }))
                    }
                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                    placeholder=" "
                  />
                  <label
                    className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step1.roleName
                        ? "top-0.5 text-xs text-blue-600"
                        : "top-3.5 text-sm text-gray-500"
                    }`}
                  >
                    Business Role Name <span className="text-red-500">*</span>
                  </label>
                </div>

                <div className="relative">
                  <textarea
                    value={formData.step1.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        step1: { ...prev.step1, description: e.target.value },
                      }))
                    }
                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline resize-none"
                    placeholder=" "
                    rows={4}
                  />
                  <label
                    className={`absolute left-4 top-3.5 transition-all duration-200 pointer-events-none ${
                      formData.step1.description
                        ? "top-0.5 text-xs text-blue-600"
                        : "text-sm text-gray-500"
                    }`}
                  >
                    Description <span className="text-red-500">*</span>
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={formData.step1.owner}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        step1: { ...prev.step1, owner: e.target.value },
                      }))
                    }
                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                    placeholder=" "
                  />
                  <label
                    className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step1.owner
                        ? "top-0.5 text-xs text-blue-600"
                        : "top-3.5 text-sm text-gray-500"
                    }`}
                  >
                    Owner <span className="text-red-500">*</span>
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={formData.step1.tags}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        step1: { ...prev.step1, tags: e.target.value },
                      }))
                    }
                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                    placeholder=" "
                  />
                  <label
                    className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step1.tags
                        ? "top-0.5 text-xs text-blue-600"
                        : "top-3.5 text-sm text-gray-500"
                    }`}
                  >
                    Tags
                  </label>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <SelectAccessTab
                  onApply={() => setCurrentStep(3)}
                  rolesFromApi={apiRoles}
                  apiCurrentPage={catalogPage}
                  onApiPageChange={(page) => setCatalogPage(page)}
                  applicationInstances={applicationInstances}
                  selectedAppInstanceId={selectedAppInstanceId}
                  onAppInstanceChange={(id) => {
                    setSelectedAppInstanceId(id || null);
                    setCatalogPage(1);
                  }}
                  showApplicationInstancesOnly={showApplicationInstancesOnly}
                  onShowApplicationInstancesOnlyChange={(checked) => {
                    setShowApplicationInstancesOnly(checked);
                    setCatalogPage(1);
                  }}
                  onCatalogTypeChange={(value) => {
                    setCatalogTypeFilter(value);
                    setCatalogPage(1);
                  }}
                  onTagSearch={(tag) => {
                    setTagFilter(tag);
                    setCatalogPage(1);
                  }}
                  hideRecommendedTab
                  hideAddDetailsSidebar
                />
              </div>
            )}

            {currentStep === 3 && (
                <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Review Business Role
                </h3>

                {/* Business role summary */}
                <div className="bg-gray-50 p-4 rounded-md space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      Business Role Name:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {formData.step1.roleName || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Owner:</span>
                    <span className="ml-2 text-gray-900">
                      {formData.step1.owner || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tags:</span>
                    <span className="ml-2 text-gray-900">
                      {formData.step1.tags || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Description:
                    </span>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {formData.step1.description || "-"}
                    </p>
                  </div>
                </div>

                {/* Selected access summary */}
                <div className="bg-gray-50 p-4 rounded-md space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      Selected Access ({cartItems.length})
                    </span>
                  </div>
                  {cartItems.length === 0 ? (
                    <p className="text-gray-500">
                      No access items selected in step 2.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {cartItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-white"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {item.name}
                            </span>
                          </div>
                          {item.risk && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full border border-gray-300 text-gray-700">
                              {item.risk} Risk
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

