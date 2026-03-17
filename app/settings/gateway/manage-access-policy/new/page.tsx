"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, Control, FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Trash2, Plus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import ExpressionBuilder from "@/components/ExpressionBuilder";
import { useLeftSidebar } from "@/contexts/LeftSidebarContext";
import SelectAccessTab from "@/app/access-request/SelectAccessTab";
import { executeQuery } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";

type AccessProvision = {
  id: string;
  type: string;
  application: string;
  name: string;
};

export default function CreateAccessPolicyPage() {
  const { control, setValue, watch, register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: {
      policyName: "",
      description: "",
      owner: "",
      priority: "",
      enabled: false,
      userAttributeConditions: [],
    },
  });

  const { isVisible: isSidebarVisible, sidebarWidthPx } = useLeftSidebar();
  const searchParams = useSearchParams();
  const { addToCart, clearCart, isInCart, items: cartItems } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [advanced, setAdvanced] = useState(false);
  // If policyId is present, we are editing an existing policy
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [accessProvisions, setAccessProvisions] = useState<AccessProvision[]>([]);
  // In edit mode, keep track of granted access ids and names so Step 3 list can preselect/match them
  const [preselectedAccessIds, setPreselectedAccessIds] = useState<string[]>([]);
  const [preselectedAccessNames, setPreselectedAccessNames] = useState<string[]>([]);

  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedAppInstanceId, setSelectedAppInstanceId] = useState<string | null>(null);
  const [showApplicationInstancesOnly, setShowApplicationInstancesOnly] = useState(false);
  const [applicationInstances, setApplicationInstances] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<string>("All");
  const [tagFilter, setTagFilter] = useState<string>("");
  const catalogFetchKeyRef = useRef<string | null>(null);
  const catalogPageRef = useRef(catalogPage);

  catalogPageRef.current = catalogPage;

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

  // Load application instances when on Select Access step
  useEffect(() => {
    if (currentStep !== 3) return;
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

  // Load catalog data in Select Access step
  useEffect(() => {
    if (currentStep !== 3) return;

    const fetchKey = `3-${catalogPage}-${selectedAppInstanceId ?? "all"}-${showApplicationInstancesOnly}-${catalogTypeFilter}-${tagFilter || "all"}`;
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

  const onSubmit = async (data: any) => {
    try {
      const rawConditions = Array.isArray(data.userAttributeConditions)
        ? data.userAttributeConditions
        : [];

      const conditions = rawConditions.map((cond: any) => {
        const attribute =
          cond?.attribute && typeof cond.attribute === "object"
            ? cond.attribute.value ?? cond.attribute.label ?? cond.attribute
            : cond?.attribute ?? "";
        const operator =
          cond?.operator && typeof cond.operator === "object"
            ? cond.operator.value ?? cond.operator.label ?? cond.operator
            : cond?.operator ?? "";

        return {
          value: cond?.value ?? "",
          operator,
          attribute,
        };
      });

      const conditionPayload = {
        operator: "AND",
        conditions,
      };

      const accessGranted =
        Array.isArray(cartItems) && cartItems.length > 0
          ? cartItems.map((item) => ({
              type: "entitlement",
              value: item.id,
            }))
          : [];

      const priorityNumber =
        data.priority !== undefined && data.priority !== null && data.priority !== ""
          ? Number(data.priority)
          : 0;

      if (editingPolicyId) {
        // EDIT mode: PATCH existing access policy
        const status =
          data.enabled === true || data.enabled === "true"
            ? "ACTIVE"
            : "INACTIVE";

        const patchPayload = {
          policyName: data.policyName,
          id: editingPolicyId,
          policyDescription: data.description,
          priority: priorityNumber,
          status,
        };

        console.log("Updating policy with payload:", {
          query:
            "SELECT kf_apply_object_change('access_policy', 'PATCH', ?::jsonb )",
          parameters: [patchPayload],
        });

        const result = await executeQuery(
          "SELECT kf_apply_object_change('access_policy', 'PATCH', ?::jsonb )",
          [patchPayload]
        );

        console.log("Update policy result:", result);
        alert("Policy updated successfully!");
      } else {
        // CREATE mode: existing PUT behavior
        const parameters = [
          "access_policy",
          "PUT",
          {
            policyName: data.policyName,
            policyDescription: data.description,
            priority: priorityNumber,
            accessGranted,
            condition: conditionPayload,
          },
        ];

        console.log("Creating policy with payload:", {
          query: "SELECT kf_apply_object_change(?,?,?::jsonb)",
          parameters,
        });

        const result = await executeQuery(
          "SELECT kf_apply_object_change(?,?,?::jsonb)",
          parameters
        );

        console.log("Create policy result:", result);
        alert("Policy created successfully!");
      }
    } catch (error) {
      console.error("Failed to create policy:", error);
      alert("Failed to create policy. Please check console for details.");
    }
  };

  // Load existing policy into form when editing
  useEffect(() => {
    const policyId = searchParams.get("policyId");
    if (!policyId) return;
    setEditingPolicyId(policyId);

    const fetchPolicy = async () => {
      try {
        const query =
          "select * from kf_ap_access_policies_vw where policy_id=?::uuid";
        const parameters = [policyId];
        const result = await executeQuery<any>(query, parameters);

        const rows: any[] = Array.isArray(result)
          ? result
          : Array.isArray((result as any).resultSet)
          ? (result as any).resultSet
          : Array.isArray((result as any).rows)
          ? (result as any).rows
          : [];

        if (!rows.length) return;
        const row = rows[0];

        // Try to hydrate ExpressionBuilder from any JSON condition / expression field on the row
        let expressionConditions: any[] = [];
        try {
          const rawKeys = Object.keys(row || {});
          const lowerKeys = rawKeys.map((k) => k.toLowerCase());

          // Look for fields like condition_block, conditions_json, expression, membership_rule, etc.
          const candidateIndex = lowerKeys.findIndex((k) =>
            ["condition", "expression", "rule"].some((needle) =>
              k.includes(needle)
            )
          );

          if (candidateIndex !== -1) {
            const key = rawKeys[candidateIndex];
            const rawVal = row[key];

            if (typeof rawVal === "string" && rawVal.trim()) {
              const parsed = JSON.parse(rawVal);
              if (Array.isArray(parsed)) {
                expressionConditions = parsed;
              } else if (
                parsed &&
                typeof parsed === "object" &&
                Array.isArray((parsed as any).conditions)
              ) {
                expressionConditions = (parsed as any).conditions;
              }
            } else if (Array.isArray(rawVal)) {
              expressionConditions = rawVal;
            } else if (
              rawVal &&
              typeof rawVal === "object" &&
              Array.isArray((rawVal as any).conditions)
            ) {
              expressionConditions = (rawVal as any).conditions;
            }
          }

          // Helpful debug log so we can see what is actually coming back
          console.log("Loaded policy row for ExpressionBuilder", {
            row,
            expressionConditions,
          });
        } catch (e) {
          console.warn("Failed to parse condition block from policy row:", e);
          expressionConditions = [];
        }

        const mappedConditions =
          Array.isArray(expressionConditions) && expressionConditions.length > 0
            ? expressionConditions.map((cond: any, index: number) => ({
                id:
                  cond.id ||
                  `cond-${index}-${Date.now()}`,
                attribute:
                  cond.attribute && typeof cond.attribute === "object"
                    ? cond.attribute
                    : cond.attribute
                    ? {
                        label: cond.attributeLabel || cond.attribute,
                        value: cond.attribute,
                      }
                    : null,
                operator:
                  cond.operator && typeof cond.operator === "object"
                    ? cond.operator
                    : cond.operator
                    ? {
                        label: cond.operatorLabel || cond.operator,
                        value: cond.operator,
                      }
                    : null,
                value: cond.value ?? "",
                logicalOp:
                  cond.logicalOp ||
                  cond.condition ||
                  "AND",
              }))
            : [];

        // Map granted entitlements/access (JSON on the row) into cart (step 3)
        try {
          const rawKeys = Object.keys(row || {});
          const lowerKeys = rawKeys.map((k) => k.toLowerCase());
          const entIndex = lowerKeys.findIndex((k) =>
            [
              "entitlements_json",
              "entitlement_json",
              "entitlements",
              "entitlements_granted",
              "access_granted",
              "access_json",
              "granted_access",
            ].some((needle) => k.includes(needle))
          );
            if (entIndex !== -1) {
            const key = rawKeys[entIndex];
            const rawEnt = row[key];
            let entList: any[] = [];
            if (typeof rawEnt === "string" && rawEnt.trim()) {
              const parsed = JSON.parse(rawEnt);
              if (Array.isArray(parsed)) entList = parsed;
              else if (
                parsed &&
                typeof parsed === "object" &&
                Array.isArray((parsed as any).items)
              ) {
                entList = (parsed as any).items;
              }
            } else if (Array.isArray(rawEnt)) {
              entList = rawEnt;
            } else if (
              rawEnt &&
              typeof rawEnt === "object" &&
              Array.isArray((rawEnt as any).items)
            ) {
              entList = (rawEnt as any).items;
            }

            if (entList.length > 0) {
              clearCart();
              const grantedIds: string[] = [];
              const grantedNames: string[] = [];

              entList.forEach((ent, idx) => {
                const id =
                  String(
                    ent.id ??
                      ent.entitlement_id ??
                      ent.entitlementid ??
                      ent.catalogid ??
                      idx
                  ).trim() || String(idx);
                const name =
                  ent.name ??
                  ent.entitlement_name ??
                  ent.entitlementName ??
                  ent.role_name ??
                  `Entitlement ${idx + 1}`;

                let risk: "High" | "Medium" | "Low" | undefined;
                const rawRisk = String(
                  ent.risk ?? ent.risk_level ?? ent.riskLevel ?? ""
                ).toLowerCase();
                if (rawRisk.startsWith("high")) risk = "High";
                else if (rawRisk.startsWith("medium")) risk = "Medium";
                else if (rawRisk.startsWith("low")) risk = "Low";

                grantedIds.push(id);
                if (name) {
                  grantedNames.push(String(name));
                }

                if (!isInCart(id)) {
                  addToCart({
                    id,
                    name,
                    risk,
                  });
                }
              });

              // Used by Step 3 catalog list to show granted access first and selected
              setPreselectedAccessIds(grantedIds);
              setPreselectedAccessNames(grantedNames);
              // Reset catalog filters so edit mode Step 3 starts from a clean view
              setCatalogPage(1);
              setSelectedAppInstanceId(null);
              setShowApplicationInstancesOnly(false);
              setCatalogTypeFilter("All");
              setTagFilter("");
            }
          }
        } catch (e) {
          console.warn(
            "Failed to hydrate entitlements_json into cart from policy row:",
            e
          );
        }

        reset({
          policyName:
            row.policy_name ??
            row.POLICY_NAME ??
            row.name ??
            "",
          description:
            row.policy_description ??
            row.POLICY_DESCRIPTION ??
            row.description ??
            "",
          owner:
            row.created_by ??
            row.CREATED_BY ??
            row.owner ??
            "",
          priority:
            row.priority !== undefined && row.priority !== null
              ? String(row.priority)
              : "",
          enabled: Boolean(
            row.enabled ??
              (row.status &&
                String(row.status).toLowerCase() === "enabled")
          ),
          userAttributeConditions: mappedConditions,
        });
      } catch (e) {
        console.error("Failed to load policy into form:", e);
      }
    };

    fetchPolicy();
  }, [searchParams, reset]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 1 Component - Policy Details
  const Step1Content = () => (
    <>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Owner
            </label>
            <input
              type="text"
              {...register("owner")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

    </>
  );

  // Step 2 Component - Membership Rule
  const Step2Content = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Membership Rule</h2>

      </div>
      <p className="text-sm text-gray-600 mb-4">
        Define which users are in scope for this access policy. All conditions must be true (AND) for the policy to apply.
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
  );

  // Step 3 Component - Select Access
  const Step3Content = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <SelectAccessTab
          onApply={() => setCurrentStep(4)}
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
          preselectedAccessIds={preselectedAccessIds}
          preselectedAccessNames={preselectedAccessNames}
        />
      </div>

      {/* Optional manual access definitions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Additional Access</h2>
        <p className="text-sm text-gray-600 mb-4">
          Optionally define additional access that will be provisioned when the policy applies.
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
  );

  // Step 4 Component - Review/Additional Info
  const Step4Content = () => {
    const membershipConditions: any[] = watch("userAttributeConditions") || [];

    const hasConditions =
      Array.isArray(membershipConditions) && membershipConditions.length > 0;

    return (
      <div className="space-y-6">
        {/* Policy summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3 text-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Review Access Policy
          </h2>
          <div>
            <span className="font-medium text-gray-700">Policy Name:</span>
            <span className="ml-2 text-gray-900">
              {watch("policyName") || "-"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Owner:</span>
            <span className="ml-2 text-gray-900">
              {watch("owner") || "-"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Priority:</span>
            <span className="ml-2 text-gray-900">
              {watch("priority") || "N/A"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Enabled:</span>
            <span className="ml-2 text-gray-900">
              {watch("enabled") ? "Yes" : "No"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Description:</span>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">
              {watch("description") || "-"}
            </p>
          </div>
        </div>

        {/* Membership rule details (Step 2 summary) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-gray-900">
              Membership Rule Details
            </h3>
            <span className="text-xs text-gray-500">
              All conditions are combined with AND
            </span>
          </div>

          {!hasConditions ? (
            <p className="text-gray-500">
              No membership rule is defined. This policy will apply to all
              users in scope.
            </p>
          ) : (
            <ol className="list-decimal list-inside space-y-1">
              {membershipConditions.map((cond: any, index: number) => {
                const attributeLabel =
                  cond?.attribute?.label ??
                  cond?.attribute?.value ??
                  cond?.attribute ??
                  "";
                const operatorLabel =
                  cond?.operator?.label ??
                  cond?.operator?.value ??
                  cond?.operator ??
                  "";
                const valueLabel =
                  cond?.value !== undefined && cond?.value !== null
                    ? String(cond.value)
                    : "";

                return (
                  <li key={cond.id ?? index} className="text-gray-800">
                    <span className="font-medium">
                      {attributeLabel || "(attribute)"}
                    </span>{" "}
                    <span className="text-gray-600">
                      {operatorLabel || "(operator)"}
                    </span>{" "}
                    <span className="font-medium break-all">
                      {valueLabel || "(value)"}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Selected access summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-gray-900">
              Selected Access ({cartItems.length})
            </h3>
          </div>
          {cartItems.length === 0 ? (
            <p className="text-gray-500">
              No access items selected in Step 3.
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
    );
  };

  const steps = [
    { id: 1, title: "Policy Details" },
    { id: 2, title: "Membership Rule" },
    { id: 3, title: "Select Access" },
    { id: 4, title: "Review" },
  ];

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
                  <div className="flex-1 h-0.5 bg-gray-200 mx-4 min-w-[16px]" aria-hidden />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="shrink-0">
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                <Check className="w-4 h-4 mr-2" />
                {editingPolicyId ? "Update Policy" : "Create Policy"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer so content is not hidden under fixed step bar */}
      <div className="h-[72px]" aria-hidden />

      <div className="w-full py-3 px-2">
        <div className="w-full">
          <div className="space-y-6">
            {currentStep === 1 && <Step1Content />}
            {currentStep === 2 && <Step2Content />}
            {currentStep === 3 && <Step3Content />}
            {currentStep === 4 && <Step4Content />}
          </div>
        </div>
      </div>
    </div>
  );
}

