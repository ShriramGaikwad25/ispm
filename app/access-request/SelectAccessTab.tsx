"use client";
import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Users, Check, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import HorizontalTabs from "@/components/HorizontalTabs";
import CustomPagination from "@/components/agTable/CustomPagination";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { getInProgressApplications, getItAssetApp } from "@/lib/api";

interface Role {
  id: string;
  name: string;
  risk: "Low" | "Medium" | "High";
  description: string;
  type?: string;
  /** Full catalog API row (resultSet item) for mapping and formcustomfields */
  catalogRow?: Record<string, unknown>;
}

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  department?: string;
  jobTitle?: string;
}

interface SelectAccessTabProps {
  onApply?: () => void;
  rolesFromApi?: Role[];
  apiCurrentPage?: number;
  onApiPageChange?: (page: number) => void;
  applicationInstances?: Array<{ id: string; name: string }>;
  selectedAppInstanceId?: string | null;
  onAppInstanceChange?: (id: string | null) => void;
  showApplicationInstancesOnly?: boolean;
  onShowApplicationInstancesOnlyChange?: (checked: boolean) => void;
}

const SelectAccessTab: React.FC<SelectAccessTabProps> = ({
  onApply,
  rolesFromApi,
  apiCurrentPage = 1,
  onApiPageChange,
  applicationInstances = [],
  selectedAppInstanceId = null,
  onAppInstanceChange,
  showApplicationInstancesOnly = false,
  onShowApplicationInstancesOnlyChange,
}) => {
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
  const { openSidebar, closeSidebar } = useRightSidebar();
  
  // Mirror Access state - moved to parent to persist across tab switches
  const [mirrorAccessState, setMirrorAccessState] = useState<{
    selectedUser: User | null;
    userAccess: Role[];
    selectedAccessIds: Set<string>;
  }>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mirrorAccessState');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            selectedUser: parsed.selectedUser,
            userAccess: parsed.userAccess || [],
            selectedAccessIds: new Set(parsed.selectedAccessIds || []),
          };
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return {
      selectedUser: null,
      userAccess: [],
      selectedAccessIds: new Set(),
    };
  });
  
  // Initialize activeTab - default to Mirror Access (2) if user is selected, otherwise 0
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectAccessActiveTab');
        if (saved !== null) {
          return parseInt(saved, 10);
        }
        // Check if Mirror Access has a selected user
        const mirrorState = localStorage.getItem('mirrorAccessState');
        if (mirrorState) {
          const parsed = JSON.parse(mirrorState);
          if (parsed.selectedUser) {
            return 2; // Mirror Access tab
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return 0; // Default to All tab
  });
  
  // Save activeTab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectAccessActiveTab', activeTab.toString());
    }
  }, [activeTab]);
  
  // Save mirrorAccessState to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mirrorAccessState', JSON.stringify({
          selectedUser: mirrorAccessState.selectedUser,
          userAccess: mirrorAccessState.userAccess,
          selectedAccessIds: Array.from(mirrorAccessState.selectedAccessIds),
        }));
      } catch (e) {
        // Ignore save errors
      }
    }
  }, [mirrorAccessState]);
  
  // Roles data: populated from API-driven catalog (passed from parent)
  const roles: Role[] = rolesFromApi || [];

  // Catalog search state (filter state for Application Instances checkbox is in parent so catalog refetches with correct query)
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High":
        return "text-red-600 bg-red-50 border-red-200";
      case "Medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "Low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // Sidebar content: header + Form custom fields only
  const AddDetailsSidebarContent: React.FC<{
    role: Role;
    riskClass: string;
    onAddToCart: () => void;
    onValidate: () => void;
  }> = ({ role, riskClass, onAddToCart, onValidate }) => {
    const isApplicationInstance =
      (role.type ?? (role.catalogRow?.type as string) ?? "").toString().toLowerCase() === "applicationinstance";

    const formcustomfields = (role.catalogRow?.formcustomfields as unknown[] | undefined) ?? [];
    const hasFormCustomFields = Array.isArray(formcustomfields) && formcustomfields.length > 0;

    const [fieldValues, setFieldValues] = useState<Record<number, string>>(() => {
      const initial: Record<number, string> = {};
      formcustomfields.forEach((item: unknown, idx: number) => {
        if (item != null && typeof item === "object" && !Array.isArray(item)) {
          const obj = item as Record<string, unknown>;
          initial[idx] = String(obj.value ?? obj.fieldValue ?? obj.val ?? "");
        }
      });
      return initial;
    });

    useEffect(() => {
      const initial: Record<number, string> = {};
      formcustomfields.forEach((item: unknown, idx: number) => {
        if (item != null && typeof item === "object" && !Array.isArray(item)) {
          const obj = item as Record<string, unknown>;
          initial[idx] = String(obj.value ?? obj.fieldValue ?? obj.val ?? "");
        }
      });
      setFieldValues(initial);
    }, [role.id]);

    const updateField = (idx: number, value: string) => {
      setFieldValues((prev) => ({ ...prev, [idx]: value }));
    };

    // Application Instance: fetch getallapp and show provisioningAttrMap as inputs (no variable value in inputs)
    type ProvisioningField = { target: string };
    const [provisioningLoading, setProvisioningLoading] = useState(false);
    const [provisioningError, setProvisioningError] = useState<string | null>(null);
    const [provisioningFields, setProvisioningFields] = useState<ProvisioningField[]>([]);
    const [provisioningValues, setProvisioningValues] = useState<Record<string, string>>({});

    useEffect(() => {
      if (!isApplicationInstance || !role.id) {
        setProvisioningFields([]);
        setProvisioningValues({});
        setProvisioningError(null);
        return;
      }
      const appInstanceId = String(role.catalogRow?.appinstanceid ?? role.catalogRow?.appInstanceId ?? role.id).trim();
      if (!appInstanceId) {
        setProvisioningFields([]);
        setProvisioningValues({});
        return;
      }
      setProvisioningLoading(true);
      setProvisioningError(null);

      const extractProvisioningFields = (app: any): void => {
        if (!app || typeof app !== "object") {
          setProvisioningFields([]);
          setProvisioningValues({});
          return;
        }
        const schema = app.schemaMappingDetails ?? app.SchemaMappingDetails ?? app.schemaMapping ?? null;
        const provisioning =
          schema && typeof schema === "object"
            ? (schema.provisioningAttrMap ?? schema.ProvisioningAttrMap ?? schema.provisioning_attr_map ?? {})
            : {};
        const fields: ProvisioningField[] = [];
        if (provisioning && typeof provisioning === "object" && !Array.isArray(provisioning)) {
          Object.entries(provisioning).forEach(([target]) => {
            if (target.trim()) fields.push({ target: target.trim() });
          });
        }
        setProvisioningFields(fields);
        setProvisioningValues({});
      };

      // 1) Try getapp by id first so we get provisioningAttrMap for any application (not only in getallapp list)
      getItAssetApp(appInstanceId)
        .then((app: any) => {
          if (app && typeof app === "object") {
            extractProvisioningFields(app);
            return;
          }
          // 2) Fallback: find app in getallapp list (e.g. in-progress apps)
          return getInProgressApplications().then((res: any) => {
            if (!res || typeof res !== "object") {
              setProvisioningFields([]);
              setProvisioningValues({});
              return;
            }
            const idKeys = [
              "ApplicationID", "applicationID", "ApplicationId", "applicationId",
              "id", "Id", "appId", "AppId", "appinstanceid", "appInstanceId",
            ];
            const getItemId = (item: any): string =>
              String(
                idKeys.reduce((acc: string | null, k) => acc ?? (item?.[k] != null && item[k] !== "" ? String(item[k]).trim() : null), null) ?? ""
              );
            const getItemName = (item: any): string =>
              String(item?.name ?? item?.ApplicationName ?? item?.applicationName ?? item?.Name ?? item?.appName ?? "").trim();
            const listArr: any[] = Array.isArray(res)
              ? res
              : (() => {
                  const direct = res.applications ?? res.Applications ?? res.apps ?? res.data ?? res.result ?? res.list ?? res.content ?? res.items ?? res.value ?? res.body ?? res.getallapp ?? res.appList;
                  if (Array.isArray(direct)) return direct;
                  if (direct && typeof direct === "object" && Array.isArray((direct as any).items)) return (direct as any).items;
                  if (direct && typeof direct === "object" && Array.isArray((direct as any).data)) return (direct as any).data;
                  return [];
                })();
            const roleIdNorm = String(role.id).trim().toLowerCase();
            const appInstanceIdNorm = appInstanceId.toLowerCase();
            const nameNorm = (role.name ?? "").toLowerCase();
            const app = listArr.find((item: any) => {
              const id = getItemId(item).trim().toLowerCase();
              const name = getItemName(item).toLowerCase();
              return id === roleIdNorm || id === appInstanceIdNorm || name === nameNorm || id.includes(roleIdNorm) || name.includes(nameNorm);
            });
            extractProvisioningFields(app);
          });
        })
        .catch((err) => {
          setProvisioningError(err instanceof Error ? err.message : "Failed to load application");
          setProvisioningFields([]);
          setProvisioningValues({});
        })
        .finally(() => setProvisioningLoading(false));
    }, [isApplicationInstance, role.id, role.name, role.catalogRow?.appinstanceid, role.catalogRow?.appInstanceId]);

    const updateProvisioningValue = (target: string, value: string) => {
      setProvisioningValues((prev) => ({ ...prev, [target]: value }));
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="p-3 border-b bg-gray-50 space-y-2">
            <div className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
              <span className="text-[11px] uppercase text-gray-500 font-medium">Entitlement Name</span>
              <div className="flex items-start justify-between gap-2 mt-0.5">
                <span className="text-xs font-medium break-words break-all whitespace-normal max-w-full flex-1">
                  {role.name}
                </span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium border ${riskClass}`}>
                  {role.risk} Risk
                </span>
              </div>
            </div>
            <div className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
              <span className="text-[11px] uppercase text-gray-500 font-medium">Description</span>
              <p className="text-xs text-gray-700 break-words break-all whitespace-pre-wrap max-w-full mt-0.5 leading-snug">
                {role.description || "—"}
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
              <span className="text-[11px] uppercase text-gray-500 font-medium">Entitlement Type</span>
              <p className="text-xs text-gray-700 break-words max-w-full mt-0.5">
                {(role.catalogRow?.entitlementtype ?? role.type ?? "—") as string}
              </p>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3 text-sm">
              {/* Application Instance: show provisioningAttrMap inputs from getallapp */}
              {isApplicationInstance && (
                <>
                  {provisioningLoading && (
                    <p className="text-gray-500">Loading application mapping…</p>
                  )}
                  {provisioningError && (
                    <p className="text-red-600">{provisioningError}</p>
                  )}
                  {!provisioningLoading && !provisioningError && provisioningFields.length > 0 && (
                    provisioningFields.map(({ target }) => {
                      const value = provisioningValues[target] ?? "";
                      const hasValue = value.length > 0;
                      const isPasswordLike = /password|secret|token|passphrase/i.test(target);
                      return (
                        <div key={target} className="relative">
                          <input
                            type={isPasswordLike ? "password" : "text"}
                            value={value}
                            onChange={(e) => updateProvisioningValue(target, e.target.value)}
                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 no-underline"
                            placeholder=" "
                            autoComplete={isPasswordLike ? "off" : undefined}
                          />
                          <label
                            className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                              hasValue ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"
                            }`}
                          >
                            {target.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                          </label>
                        </div>
                      );
                    })
                  )}
                  {!provisioningLoading && !provisioningError && provisioningFields.length === 0 && (
                    <p className="text-gray-500">No provisioning mapping for this application.</p>
                  )}
                </>
              )}
              {/* Form custom fields: show for both Application Instance and Entitlement */}
              {hasFormCustomFields ? (
                formcustomfields.map((item: unknown, idx: number) => {
                  if (item != null && typeof item === "object" && !Array.isArray(item)) {
                    const obj = item as Record<string, unknown>;
                    const label = (obj.label ?? obj.name ?? obj.fieldName ?? obj.key ?? "Field") as string;
                    const value = fieldValues[idx] ?? String(obj.value ?? obj.fieldValue ?? obj.val ?? "");
                    const isPasswordLike = /password|secret|token|passphrase/i.test(String(label));
                    const hasValue = value.length > 0;
                    return (
                      <div key={idx} className="relative">
                        <input
                          type={isPasswordLike ? "password" : "text"}
                          value={value}
                          onChange={(e) => updateField(idx, e.target.value)}
                          className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 no-underline"
                          placeholder=" "
                          autoComplete={isPasswordLike ? "off" : undefined}
                        />
                        <label
                          className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            hasValue ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"
                          }`}
                        >
                          {String(label)}
                        </label>
                      </div>
                    );
                  }
                  const value = fieldValues[idx] ?? "";
                  const hasValue = value.length > 0;
                  return (
                    <div key={idx} className="relative">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateField(idx, e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label
                        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          hasValue ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"
                        }`}
                      >
                        Field
                      </label>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No custom fields.</p>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddToCart}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to cart
          </button>
          <button
            type="button"
            onClick={onValidate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-sm transition-colors"
          >
            Validate
          </button>
        </div>
      </div>
    );
  };

  // All Tab Component (uses apiCurrentPage from parent so fetch offset increases correctly)
  const AllTab: React.FC = () => {
    const isInitialMount = React.useRef(true);
    const pageSize = 100;
    const currentPage = apiCurrentPage;

    const filteredRoles = roles.filter((role) => {
      const matchesSearch = role.name.toLowerCase().includes(catalogSearchQuery.toLowerCase());
      const matchesType =
        !showApplicationInstancesOnly ? true : (role.type || "").toLowerCase() === "applicationinstance";
      return matchesSearch && matchesType;
    });

    // Server-side pagination (100 rows per API page) – show all roles from current API page
    const isLastServerPage = filteredRoles.length < pageSize;
    const totalPages = isLastServerPage ? currentPage : currentPage + 1;

    useEffect(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      // Reset to first page only when user actually changes search or dropdown (not on mount/remount)
      if (onApiPageChange) onApiPageChange(1);
    }, [catalogSearchQuery, showApplicationInstancesOnly]);

    const handleAddToCart = (role: Role) => {
      if (isInCart(role.id)) {
        removeFromCart(role.id);
      } else {
        addToCart({ id: role.id, name: role.name, risk: role.risk });
      }
    };

    const handleReview = () => {
      console.log("Reviewing cart items:", cartCount);
    };

    const handlePageChange = (page: number) => {
      if (onApiPageChange) onApiPageChange(page);
    };

    return (
      <div className="w-full">
        {/* Search and Filter Section */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3 md:gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Catalog"
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                className="h-10 w-full pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="relative flex-shrink-0">
              <select
                value={selectedAppInstanceId ?? ""}
                onChange={(e) => onAppInstanceChange?.(e.target.value ? e.target.value : null)}
                className="h-10 appearance-none bg-white border border-gray-300 rounded-md pl-4 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[260px] text-sm"
              >
                <option value="">All</option>
                {applicationInstances.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 text-base text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={showApplicationInstancesOnly}
                onChange={(e) => onShowApplicationInstancesOnlyChange?.(e.target.checked)}
              />
              <span>Application Instances</span>
            </label>
          </div>
          <button
            type="button"
            onClick={handleReview}
            className="h-10 shrink-0 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-md font-medium transition-colors relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Pagination at top */}
        {filteredRoles.length > 0 && (
          <div className="mb-4">
            <CustomPagination
              totalItems={(currentPage - 1) * pageSize + filteredRoles.length}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              pageSizeOptions={[100]}
            />
          </div>
        )}

        {/* Roles List (all roles from current API page) */}
        <div className="space-y-3">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-800 font-medium">{role.name}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                        role.risk
                      )}`}
                    >
                      {role.risk} Risk
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const addToCartForRole = () => {
                      if (!isInCart(role.id)) addToCart({ id: role.id, name: role.name, risk: role.risk });
                      closeSidebar();
                    };
                    const onValidate = () => {
                      // Validate action – can be wired to validation API or flow later
                      closeSidebar();
                    };
                    openSidebar(
                      <AddDetailsSidebarContent
                        role={role}
                        riskClass={getRiskColor(role.risk)}
                        onAddToCart={addToCartForRole}
                        onValidate={onValidate}
                      />,
                      { widthPx: 500, title: "Add Details" }
                    );
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm"
                >
                  Add Details
                </button>
                <button
                  onClick={() => handleAddToCart(role)}
                  className={`inline-flex items-center justify-center px-3 py-2 rounded-md font-medium transition-colors ${
                    isInCart(role.id)
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No roles found matching your search.
          </div>
        )}
        {/* Pagination Controls (project-wide CustomPagination) */}
        {filteredRoles.length > 0 && (
          <div className="mt-4">
            <CustomPagination
              totalItems={(currentPage - 1) * pageSize + filteredRoles.length}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              pageSizeOptions={[100]}
            />
          </div>
        )}
      </div>
    );
  };

  // Recommended Tab Component
  const RecommendedTab: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    
    // Filter recommended roles (for demo, showing first 3 as recommended)
    const recommendedRoles = roles.slice(0, 3);
    const filteredRoles = recommendedRoles.filter((role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddToCart = (role: Role) => {
      if (isInCart(role.id)) {
        removeFromCart(role.id);
      } else {
        addToCart({ id: role.id, name: role.name, risk: role.risk });
      }
    };

    return (
      <div className="w-full">
        {/* Search Section */}
        <div className="mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search Recommended Roles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Recommended Roles List */}
        <div className="space-y-3">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-800 font-medium">{role.name}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                        role.risk
                      )}`}
                    >
                      {role.risk} Risk
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                  <Info className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => handleAddToCart(role)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                    isInCart(role.id)
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isInCart(role.id) ? "Remove" : "Add To Cart"}
                </button>
                <button className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No recommended roles found matching your search.
          </div>
        )}
      </div>
    );
  };

  // Mirror Access Tab Component
  const MirrorAccessTab: React.FC = () => {
    const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isRetrieving, setIsRetrieving] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Use state from parent component
    const { selectedUser, userAccess, selectedAccessIds } = mirrorAccessState;
    
    const setSelectedUser = (user: User | null) => {
      setMirrorAccessState(prev => ({ ...prev, selectedUser: user }));
    };
    
    const setUserAccess = (access: Role[]) => {
      setMirrorAccessState(prev => ({ ...prev, userAccess: access }));
    };
    
    const setSelectedAccessIds = (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setMirrorAccessState(prev => ({
        ...prev,
        selectedAccessIds: typeof ids === 'function' ? ids(prev.selectedAccessIds) : ids
      }));
    };

    // Mock function to retrieve user access
    const mockRetrieveAccess = (userId: string): Role[] => {
      // Return some roles as user's access (for demo purposes)
      return roles.slice(0, 3);
    };

    // API call to search users
    const handleSearch = async () => {
      if (!searchValue.trim()) {
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setSearchResults([]);
      setHasSearched(true);

      try {
        // Build query to get all users with specified fields
        const query = `SELECT firstname, lastname, email, username, employeeid, department, title FROM usr`;

        const response = await fetch(
          "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: query,
              parameters: [],
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle the response format - data is in resultSet
        let usersData: any[] = [];
        if (data?.resultSet && Array.isArray(data.resultSet)) {
          // Normalize the email field from different formats
          usersData = data.resultSet.map((user: any) => {
            let emailValue = "";
            
            // Handle email field - can be object, array, or missing
            if (user.email) {
              if (typeof user.email === "string") {
                emailValue = user.email;
              } else if (user.email.work) {
                // Format: { "work": "email@example.com" }
                emailValue = user.email.work;
              } else if (Array.isArray(user.email) && user.email.length > 0) {
                // Format: [{ "type": "work", "value": "email@example.com", "primary": true }]
                // Find primary email or first email
                const primaryEmail = user.email.find((e: any) => e.primary) || user.email[0];
                emailValue = primaryEmail?.value || "";
              }
            }
            
            // Construct name from firstname and lastname
            let nameValue = "";
            if (user.firstname || user.lastname) {
              const firstName = user.firstname || "";
              const lastName = user.lastname || "";
              nameValue = `${firstName} ${lastName}`.trim();
            } else {
              nameValue = user.username || "";
            }
            
            return {
              name: nameValue,
              email: emailValue,
              username: user.username || "",
              employeeid: (user.employeeid || "").toString(),
              department: user.department || "",
              jobtitle: user.title || "",
            };
          });
        }

        // Convert to User format expected by the component
        const normalizedUsers: User[] = usersData.map((user, index) => ({
          id: `user-${index}-${user.username || user.email || index}`,
          name: user.name || user.username || "",
          email: user.email,
          username: user.username,
          department: user.department || "",
          jobTitle: user.jobtitle || "",
          employeeId: user.employeeid || undefined,
        }));

        // Filter client-side based on search value
        const filteredUsers = normalizedUsers.filter((user) => {
          const searchLower = searchValue.toLowerCase().trim();
          if (!searchLower) return false;
          
          return (
            user.name?.toLowerCase().includes(searchLower) ||
            user.username?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.department?.toLowerCase().includes(searchLower) ||
            user.jobTitle?.toLowerCase().includes(searchLower) ||
            user.employeeId?.toLowerCase().includes(searchLower)
          );
        });

        setSearchResults(filteredUsers);
      } catch (error) {
        console.error("Error fetching users from API:", error);
        setSearchError(error instanceof Error ? error.message : "Failed to fetch users");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const handleUserSelect = (user: User) => {
      setSelectedUser(user);
      setUserAccess([]);
      setSelectedAccessIds(new Set());
    };

    const handleRetrieveAccess = () => {
      if (selectedUser) {
        setIsRetrieving(true);
        setTimeout(() => {
          const access = mockRetrieveAccess(selectedUser.id);
          setUserAccess(access);
          setIsRetrieving(false);
        }, 500);
      }
    };

    const handleAccessToggle = (accessId: string) => {
      setSelectedAccessIds((prev) => {
        const newSelected = new Set(prev);
        if (newSelected.has(accessId)) {
          newSelected.delete(accessId);
        } else {
          newSelected.add(accessId);
        }
        return newSelected;
      });
    };

    const handleSelectAllAccess = () => {
      setSelectedAccessIds((prev) => {
        if (prev.size === userAccess.length) {
          return new Set();
        } else {
          return new Set(userAccess.map((a) => a.id));
        }
      });
    };

    const handleApply = () => {
      // Add selected access to cart
      const selectedIds = Array.from(selectedAccessIds);
      selectedIds.forEach((accessId) => {
        const access = userAccess.find((a) => a.id === accessId);
        if (access && !isInCart(access.id)) {
          addToCart({ id: access.id, name: access.name, risk: access.risk });
        }
      });
      
      // Navigate to next step (Details)
      if (onApply) {
        onApply();
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    };

    return (
      <div className="w-full">
        {/* Cart Display */}
        <div className="mb-6 flex justify-end">
          <button 
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium transition-colors relative"
            title="View cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* User Search Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search User
          </label>
          <div className="flex gap-4 items-end">
            <div className="relative flex-1 max-w-md">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by name, username, email, department, job title..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchValue.trim() || isSearching}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                searchValue.trim() && !isSearching
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="mb-6 p-4 text-center text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Searching users...
            </div>
          </div>
        )}

        {/* Error Message */}
        {!isSearching && searchError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              Error: {searchError}
            </p>
          </div>
        )}

        {/* No Results Message */}
        {!isSearching && !searchError && hasSearched && searchResults.length === 0 && (
          <div className="mb-6 p-4 text-center text-gray-500">
            No users found matching "{searchValue}"
          </div>
        )}

        {!isSearching && !searchError && searchResults.length > 0 && !selectedUser && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Search Results ({searchResults.length})
            </h3>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="flex items-center gap-3 p-4 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <span className="text-xs text-gray-500">({user.username})</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                      {user.department && (
                        <p className="text-xs text-gray-500 mt-1">
                          {user.department} {user.jobTitle && `• ${user.jobTitle}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected User Display */}
        {selectedUser && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedUser.name}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                {selectedUser.department && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedUser.department} {selectedUser.jobTitle && `• ${selectedUser.jobTitle}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserAccess([]);
                  setSelectedAccessIds(new Set());
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Change User
              </button>
            </div>
          </div>
        )}

        {/* Retrieve Access Button */}
        {selectedUser && userAccess.length === 0 && (
          <div className="mb-6">
            <button
              onClick={handleRetrieveAccess}
              disabled={isRetrieving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isRetrieving
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isRetrieving ? "Retrieving..." : "Retrieve Access"}
            </button>
          </div>
        )}

        {/* User Access List */}
        {isRetrieving && (
          <div className="mb-6 p-4 text-center text-gray-500">
            Retrieving user access...
          </div>
        )}

        {userAccess.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                User Access ({userAccess.length})
              </h3>
              <button
                onClick={handleSelectAllAccess}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedAccessIds.size === userAccess.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="space-y-3">
              {userAccess.map((access) => {
                const isSelected = selectedAccessIds.has(access.id);
                const inCart = isInCart(access.id);
                return (
                  <div
                    key={access.id}
                    className={`flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded-lg p-4 transition-colors ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccessToggle(access.id);
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded">
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-800 font-medium">{access.name}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                              access.risk
                            )}`}
                          >
                            {access.risk} Risk
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{access.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (inCart) {
                            removeFromCart(access.id);
                          } else {
                            addToCart({ id: access.id, name: access.name, risk: access.risk });
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                          inCart
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {inCart ? "Remove" : "Add To Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Apply Button */}
        {userAccess.length > 0 && selectedAccessIds.size > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    {
      label: "All",
      component: AllTab,
    },
    {
      label: "Recommended",
      component: RecommendedTab,
    },
    {
      label: "Mirror Access",
      component: MirrorAccessTab,
    },
  ];

  return (
    <div className="w-full">
      <HorizontalTabs
        tabs={tabs}
        activeIndex={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
};

export default SelectAccessTab;
