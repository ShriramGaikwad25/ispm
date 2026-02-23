"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, X, ShoppingCart } from "lucide-react";
import HorizontalTabs from "@/components/HorizontalTabs";
import UserSearchTab from "./UserSearchTab";
import UserGroupTab from "./UserGroupTab";
import SelectAccessTab from "./SelectAccessTab";
import DetailsTab from "./DetailsTab";
import ReviewTab from "./ReviewTab";
import { useSelectedUsers } from "@/contexts/SelectedUsersContext";
import { useCart } from "@/contexts/CartContext";
import { useItemDetails } from "@/contexts/ItemDetailsContext";
import { useLeftSidebar } from "@/contexts/LeftSidebarContext";

function clearAccessRequestSelections(
  clearCart: () => void,
  clearUsers: () => void,
  clearItemDetails: () => void
) {
  clearCart();
  clearUsers();
  clearItemDetails();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("mirrorAccessState");
      localStorage.removeItem("selectAccessActiveTab");
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("accessRoleDetails:")) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  }
}

/** Payload shape for the full Access Request (all steps, all fields). */
export interface AccessRequestPayload {
  /** Step 1: "self" | "others" */
  requestFor: "self" | "others";
  /** Step 1: when request for others, selected users */
  selectedUsers: Array<{
    id: string;
    name: string;
    email: string;
    username: string;
    department: string;
    jobTitle: string;
    employeeId?: string;
  }>;
  /** Step 1: selected groups (from User Group tab) */
  selectedGroups: Array<{ value: string; label: string }>;
  /** Step 3: request type */
  requestType: "Regular" | "Urgent";
  /** Step 3: global dates/comment applied when useGlobalSettings is true */
  globalSettings: {
    startDate: string;
    endDate: string;
    isIndefinite: boolean;
    comment: string;
    accessType: "indefinite" | "duration";
  };
  /** Step 2 + 3: each access item with details and optional catalog/saved form data */
  accessItems: Array<{
    id: string;
    name: string;
    risk: "High" | "Medium" | "Low";
    catalogRow?: Record<string, unknown>;
    startDate: string;
    endDate: string;
    isIndefinite: boolean;
    comment: string;
    useGlobalSettings: boolean;
    attachmentEmail?: string;
    attachmentFile?: string;
    customFieldValues?: Record<number, string>;
    provisioningValues?: Record<string, string>;
  }>;
}

function loadSavedRoleDetails(itemId: string): { fieldValues?: Record<number, string>; provisioningValues?: Record<string, string> } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`accessRoleDetails:${itemId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fieldValues?: Record<number, string>; provisioningValues?: Record<string, string> };
    return parsed || null;
  } catch {
    return null;
  }
}

const AccessRequest: React.FC = () => {
  const router = useRouter();
  const { selectedUsers, removeUser, clearUsers } = useSelectedUsers();
  const { addToCart, removeFromCart, isInCart, clearCart, items: cartItems } = useCart();
  const { clearItemDetails, getItemDetail, globalSettings, requestType, attachmentEmailByItem, attachmentFileByItem } = useItemDetails();
  const { isVisible: isSidebarVisible, sidebarWidthPx } = useLeftSidebar();
  const [selectedOption, setSelectedOption] = useState<"self" | "others">("self");
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedAppInstanceId, setSelectedAppInstanceId] = useState<string | null>(null);
  const [showApplicationInstancesOnly, setShowApplicationInstancesOnly] = useState(false);
  const [applicationInstances, setApplicationInstances] = useState<Array<{ id: string; name: string }>>([]);
  const catalogFetchKeyRef = useRef<string | null>(null);
  const catalogPageRef = useRef(catalogPage);

  const [catalogTypeFilter, setCatalogTypeFilter] = useState<string>("All");
  const [tagFilter, setTagFilter] = useState<string>("");

  const [selectedGroups, setSelectedGroups] = useState<Array<{ value: string; label: string }>>([]);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavigateUrlRef = useRef<string | null>(null);

  // Browser leave (refresh, close tab, external link): show native confirm
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // In-app navigation: intercept link clicks and show custom modal
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || !anchor.href) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#" || href.startsWith("javascript:")) return;
      const isInternal = href.startsWith("/");
      const isLeavingAccessRequest = isInternal && !href.startsWith("/access-request");
      if (!isLeavingAccessRequest) return;
      e.preventDefault();
      e.stopPropagation();
      pendingNavigateUrlRef.current = href;
      setShowLeaveConfirm(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Clear all selections when leaving the Access Request page (e.g. unmount)
  useEffect(() => {
    return () => {
      clearAccessRequestSelections(clearCart, clearUsers, clearItemDetails);
    };
  }, [clearCart, clearUsers, clearItemDetails]);

  const steps = [
    { id: 1, title: "Select User" },
    { id: 2, title: "Select Access" },
    { id: 3, title: "Details" },
    { id: 4, title: "Review and Submit" },
  ];

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Map fetched catalog rows into Role objects for SelectAccessTab
  const apiRoles = React.useMemo(
    () => {
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
        const rawType =
          typeof row.type === "string"
            ? row.type
            : typeof row.Type === "string"
            ? row.Type
            : undefined;

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
          type: rawType,
          catalogRow: row,
        };
      });
    },
    [catalogData]
  );

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const buildAccessRequestPayload = (): AccessRequestPayload => {
    const norm = (x: unknown) => String(x ?? "").trim();
    const accessItems = cartItems.map((item) => {
      const detail = getItemDetail(item.id);
      const saved = loadSavedRoleDetails(item.id);
      const role = apiRoles.find((r) => norm(r.id) === norm(item.id));
      const catalogRow = role?.catalogRow as Record<string, unknown> | undefined;
      return {
        id: item.id,
        name: item.name,
        risk: item.risk ?? "Low",
        catalogRow,
        startDate: detail?.startDate ?? globalSettings.startDate,
        endDate: detail?.endDate ?? globalSettings.endDate,
        isIndefinite: detail?.isIndefinite ?? globalSettings.isIndefinite,
        comment: detail?.comment ?? globalSettings.comment,
        useGlobalSettings: detail?.useGlobalSettings ?? true,
        attachmentEmail: attachmentEmailByItem[item.id] || undefined,
        attachmentFile: attachmentFileByItem[item.id] || undefined,
        customFieldValues: saved?.fieldValues,
        provisioningValues: saved?.provisioningValues,
      };
    });
    return {
      requestFor: selectedOption,
      selectedUsers: selectedOption === "others" ? selectedUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, username: u.username, department: u.department, jobTitle: u.jobTitle, employeeId: u.employeeId })) : [],
      selectedGroups,
      requestType,
      globalSettings: {
        startDate: globalSettings.startDate,
        endDate: globalSettings.endDate,
        isIndefinite: globalSettings.isIndefinite,
        comment: globalSettings.comment,
        accessType: globalSettings.accessType,
      },
      accessItems,
    };
  };

  const handleSubmit = () => {
    const payload = buildAccessRequestPayload();
    console.log("Access Request Payload:", JSON.stringify(payload, null, 2));
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    }
    clearAccessRequestSelections(clearCart, clearUsers, clearItemDetails);
    setSelectedGroups([]);
    setCurrentStep(1);
    setSelectedOption("self");
  };

  // Keep ref in sync so we can ignore stale responses
  catalogPageRef.current = catalogPage;

  // Fetch Application Instances list for dropdown when on step 2
  React.useEffect(() => {
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
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`${res.status}`)))
      .then((data) => {
        let rows: any[] = [];
        if (Array.isArray(data)) rows = data;
        else if (Array.isArray((data as any).resultSet)) rows = (data as any).resultSet;
        else if (Array.isArray((data as any).rows)) rows = (data as any).rows;
        const seen = new Set<string>();
        const list: Array<{ id: string; name: string }> = [];
        rows.forEach((r: any) => {
          const id = (r.appinstanceid ?? r.appInstanceId ?? r.app_instance_id ?? "").toString().trim();
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

  // Load catalog in Step 2. Keep catalog data when leaving step 2 so step 4 can show full role details in sidebar.
  React.useEffect(() => {
    if (currentStep !== 2) return;

    const fetchKey = `2-${catalogPage}-${selectedAppInstanceId ?? "all"}-${showApplicationInstancesOnly}-${catalogTypeFilter}-${tagFilter || "all"}`;
    if (catalogFetchKeyRef.current === fetchKey) return;
    catalogFetchKeyRef.current = fetchKey;

    const pageRequested = catalogPage;
    setCatalogLoading(true);
    setCatalogError(null);

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
              // Entitlements filtered by tag text (inline filter on tags column only)
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
      .catch((err) => {
        if (catalogPageRef.current !== pageRequested) return;
        console.error("Catalog fetch failed:", err);
        setCatalogError(err instanceof Error ? err.message : "Failed to load catalog");
      })
      .finally(() => {
        if (catalogPageRef.current === pageRequested) setCatalogLoading(false);
        catalogFetchKeyRef.current = null;
      });
  }, [currentStep, catalogPage, selectedAppInstanceId, showApplicationInstancesOnly, catalogTypeFilter, tagFilter]);

  // Load selected groups (from Step 1 User Group tab) for display in Step 2
  React.useEffect(() => {
    if (currentStep !== 2) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("accessRequestSelectedGroups");
      if (!raw) {
        setSelectedGroups([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSelectedGroups(
          parsed
            .map((g) => ({
              value: String(g?.value ?? "").trim(),
              label: String(g?.label ?? "").trim(),
            }))
            .filter((g) => g.value && g.label)
        );
      } else {
        setSelectedGroups([]);
      }
    } catch {
      setSelectedGroups([]);
    }
  }, [currentStep]);

  const userTabs = [
    {
      label: "User Search",
      component: UserSearchTab,
    },
    {
      label: "User Group",
      component: UserGroupTab,
    },
  ];

  return (
    <div className="pt-16">
      {/* Steps + Navigation in one panel: fixed below header, left of bar starts after sidebar to avoid overlap */}
      <div
        className="fixed top-16 right-0 z-20 bg-white shadow-sm border-b border-gray-200 px-3 sm:px-6 py-2.5 sm:py-3.5"
        style={{ left: isSidebarVisible ? sidebarWidthPx : 0 }}
      >
        <div className="flex items-center gap-2 sm:gap-8 min-w-0">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`flex items-center px-2 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shrink-0 ${
              currentStep === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2.5" />
            Previous
          </button>
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <div className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-0 w-full">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center min-w-0 flex-1 sm:flex-initial">
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium shrink-0 ${
                      currentStep >= step.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.id ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : step.id}
                  </div>
                  <div className="ml-1.5 sm:ml-3 min-w-0 overflow-hidden flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate" title={step.title}>{step.title}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 sm:flex-initial w-2 sm:w-14 md:w-20 h-0.5 bg-gray-200 mx-0.5 sm:mx-5 shrink-0 max-w-2 sm:max-w-none" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-1 sm:gap-4 shrink-0">
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="flex items-center px-2 sm:px-5 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center px-2 sm:px-5 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium"
              >
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2.5" />
                Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step 1 Content */}
      {currentStep === 1 && (
        <>
          {/* Toggle Button - Only show in step 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3 mb-6">
            <div className="flex justify-center items-center gap-4">
              <span 
                className={`text-sm font-medium cursor-pointer ${
                  selectedOption === "self" ? "text-blue-600 font-semibold" : "text-gray-600"
                }`}
                onClick={() => setSelectedOption("self")}
              >
                Request for Self
              </span>
              
              <label className="relative inline-block w-14 h-7 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={selectedOption === "others"}
                  onChange={(e) => setSelectedOption(e.target.checked ? "others" : "self")}
                />
                {/* Track */}
                <div className="absolute w-full h-full bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                {/* Thumb */}
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-7"></div>
              </label>
              
              <span 
                className={`text-sm font-medium cursor-pointer ${
                  selectedOption === "others" ? "text-blue-600 font-semibold" : "text-gray-600"
                }`}
                onClick={() => setSelectedOption("others")}
              >
                Request for Others
              </span>
            </div>
          </div>

          {/* User Tabs - Show when "Request for Others" is selected */}
          {selectedOption === "others" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <HorizontalTabs
                tabs={userTabs}
                activeIndex={activeTab}
                onChange={setActiveTab}
              />
            </div>
          )}
        </>
      )}

      {/* Step 2 Content */}
      {currentStep === 2 && (
        <>
          {/* Show Selected Users at the top (if "Request for Others") */}
          {selectedUsers.length > 0 && selectedOption === "others" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Selected Users</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {selectedUsers.map((user) => {
                  return (
                    <div
                      key={user.id}
                      className="relative p-2 rounded-lg border-2 border-emerald-400 bg-white shadow-sm hover:shadow-md transition-all"
                    >
                      <button
                        onClick={() => removeUser(user.id)}
                        className="absolute top-1 right-1 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Remove user"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="pr-6">
                        <p className="font-semibold text-sm text-gray-900 truncate">{user.name}</p>
                        {/* <p className="text-xs text-gray-700 truncate mt-1">{user.username}</p> */}
                        <p className="text-xs text-gray-700 truncate mt-1">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-700">
                          <span className="truncate">{user.department}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Show Selected Groups (from User Group tab in Step 1) */}
          {selectedGroups.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="text-sm font-semibold mb-3 text-gray-900">
                Selected Groups ({selectedGroups.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedGroups.map((g) => (
                  <span
                    key={g.value}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                    title={g.label}
                  >
                    {g.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Role Catalog (from API, with search + dropdown inside) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
            />
          </div>
        </>
      )}

      {/* Step 3 Content - Details Tab */}
      {currentStep === 3 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <DetailsTab />
        </div>
      )}

      {/* Step 4 Content - Review and Submit */}
      {currentStep === 4 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <ReviewTab catalogRoles={apiRoles} />
        </div>
      )}

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="leave-confirm-title">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 id="leave-confirm-title" className="text-lg font-semibold text-gray-900 mb-2">Leave Access Request?</h2>
            <p className="text-sm text-gray-600 mb-6">
              All data will be lost. Do you still want to leave?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  pendingNavigateUrlRef.current = null;
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = pendingNavigateUrlRef.current;
                  setShowLeaveConfirm(false);
                  pendingNavigateUrlRef.current = null;
                  clearAccessRequestSelections(clearCart, clearUsers, clearItemDetails);
                  if (url) router.push(url);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRequest;
