"use client";

import React, { useState, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { getInProgressApplications, getItAssetApp } from "@/lib/api";

export interface Role {
  id: string;
  name: string;
  risk: "Low" | "Medium" | "High";
  description: string;
  type?: string;
  catalogRow?: Record<string, unknown>;
}

export function getRiskColor(risk: string): string {
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
}

type ProvisioningField = { target: string };

const AddDetailsSidebarContent: React.FC<{
  role: Role;
  riskClass: string;
  onAddToCart: () => void;
  onValidate: () => void;
  showActions?: boolean;
}> = ({ role, riskClass, onAddToCart, onValidate, showActions = true }) => {
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

    getItAssetApp(appInstanceId)
      .then((app: any) => {
        if (app && typeof app === "object") {
          extractProvisioningFields(app);
          return;
        }
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
            {isApplicationInstance && (
              <>
                {provisioningLoading && <p className="text-gray-500">Loading application mapping…</p>}
                {provisioningError && <p className="text-red-600">{provisioningError}</p>}
                {!provisioningLoading && !provisioningError && provisioningFields.length > 0 &&
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
                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${hasValue ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"}`}>
                          {target.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                        </label>
                      </div>
                    );
                  })}
                {!provisioningLoading && !provisioningError && provisioningFields.length === 0 && (
                  <p className="text-gray-500">No provisioning mapping for this application.</p>
                )}
              </>
            )}
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
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${hasValue ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"}`}>
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
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${hasValue ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"}`}>
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
      {showActions && (
        <div className="shrink-0 p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-2">
          <button type="button" onClick={onAddToCart} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
            <ShoppingCart className="w-4 h-4" />
            Add to cart
          </button>
          <button type="button" onClick={onValidate} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-sm transition-colors">
            Validate
          </button>
        </div>
      )}
    </div>
  );
};

export default AddDetailsSidebarContent;
