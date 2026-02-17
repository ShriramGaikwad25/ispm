"use client";
import React, { useState, useRef } from "react";
import { Check, ChevronLeft, ChevronRight, X, ShoppingCart } from "lucide-react";
import HorizontalTabs from "@/components/HorizontalTabs";
import UserSearchTab from "./UserSearchTab";
import UserGroupTab from "./UserGroupTab";
import SelectAccessTab from "./SelectAccessTab";
import DetailsTab from "./DetailsTab";
import ReviewTab from "./ReviewTab";
import { useSelectedUsers } from "@/contexts/SelectedUsersContext";
import { useCart } from "@/contexts/CartContext";

const AccessRequest: React.FC = () => {
  const { selectedUsers, removeUser } = useSelectedUsers();
  const { addToCart, removeFromCart, isInCart } = useCart();
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
          id: String(idValue),
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

    const fetchKey = `2-${catalogPage}-${selectedAppInstanceId ?? "all"}-${showApplicationInstancesOnly}`;
    if (catalogFetchKeyRef.current === fetchKey) return;
    catalogFetchKeyRef.current = fetchKey;

    const pageRequested = catalogPage;
    setCatalogLoading(true);
    setCatalogError(null);

    const limit = 100;
    const offset = (catalogPage - 1) * limit;

    const isFilteredByAppInstance = !!selectedAppInstanceId?.trim() && !showApplicationInstancesOnly;

    const body = showApplicationInstancesOnly
      ? {
          query: "SELECT * FROM vw_catalog WHERE type = 'ApplicationInstance' ORDER BY appinstanceid LIMIT ? OFFSET ?",
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
  }, [currentStep, catalogPage, selectedAppInstanceId, showApplicationInstancesOnly]);

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
    <div>
      <h1 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2 text-blue-950">
        Access Request
      </h1>

      {/* Steps + Navigation in one panel: Previous | Steps | Next */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3.5 mb-5">
        <div className="flex items-center justify-between gap-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`flex items-center px-5 py-2 rounded-lg text-sm font-medium shrink-0 ${
              currentStep === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ChevronLeft className="w-4 h-4 mr-2.5" />
            Previous
          </button>
          <div className="flex items-center justify-center flex-1 min-w-0">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                    currentStep >= step.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <div className="ml-3 shrink-0">
                  <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{step.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-14 sm:w-20 h-0.5 bg-gray-200 mx-5 sm:mx-6 shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-4 shrink-0">
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="flex items-center px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2.5" />
              </button>
            ) : (
              <button
                className="flex items-center px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <Check className="w-4 h-4 mr-2.5" />
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Selected Users</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedUsers.map((user, index) => {
                  const cardColors = [
                    "from-emerald-50 via-green-50 to-lime-50",
                    "from-green-50 via-emerald-50 to-teal-50",
                    "from-lime-50 via-green-50 to-emerald-50",
                    "from-teal-50 via-emerald-50 to-green-50",
                  ];
                  const colorClass = cardColors[index % cardColors.length];

                  return (
                    <div
                      key={user.id}
                      className={`relative p-3 rounded-lg border border-emerald-300 bg-gradient-to-br ${colorClass} shadow-sm hover:shadow-md transition-all`}
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
                        <p className="text-xs text-gray-700 truncate mt-1">{user.username}</p>
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
    </div>
  );
};

export default AccessRequest;
