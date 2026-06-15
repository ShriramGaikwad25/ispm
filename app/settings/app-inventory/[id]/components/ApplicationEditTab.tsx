"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getApplicationDetails,
  getAllSupportedApplicationTypesViaProxy,
  parseSupportedObjectsApplicationTypeItem,
  partitionApplicationDetailsByIntegrationGroups,
  sortIntegrationFieldGroups,
  isAdvancedIntegrationGroupId,
  type ApplicationTypeIntegrationFieldGroup,
} from "@/lib/api";
import { Edit } from "lucide-react";
import AdvancedIntegrationOperationTabs from "../../components/AdvancedIntegrationOperationTabs";

interface ApplicationEditTabProps {
  applicationId: string;
  /** Called after successful submit (e.g. navigate back to inventory). If not provided, uses router.push("/settings/app-inventory"). */
  onBackToInventory?: () => void;
}

/** Match API keys like Password, admin_password, PWD, Passphrase, etc. */
function fieldKeyLooksSensitive(field: string): boolean {
  const n = field.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/_/g, "");
  return (
    /password|passwd|secret|token|passphrase|credential|apikey|privatekey|clientsecret|adminpassword|refreshtoken|accesstoken|authorization/i.test(
      n
    ) ||
    n === "pwd"
  );
}

function labelLooksLikePasswordOnly(label: string): boolean {
  const base = label.replace(/:\s*$/, "").trim().toLowerCase();
  return base === "password" || /\bpassword\b/.test(base);
}

function scalarEditValue(value: unknown): { text: string; isScalar: boolean } {
  if (value == null) {
    return { text: JSON.stringify(value ?? "", null, 2), isScalar: false };
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { text: String(value), isScalar: true };
  }
  if (typeof value === "object" && value instanceof String) {
    return { text: String(value), isScalar: true };
  }
  return { text: JSON.stringify(value ?? "", null, 2), isScalar: false };
}

/** Plaintext for secret inputs: APIs may return strings, numbers, or (rarely) char arrays. */
function coerceSecretPlaintext(value: unknown): string | null {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && value instanceof String) {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (
      value.every((x) => typeof x === "string" || typeof x === "number" || typeof x === "boolean")
    ) {
      return value.map((x) => String(x)).join("");
    }
    return null;
  }
  return null;
}

export default function ApplicationEditTab({ applicationId, onBackToInventory }: ApplicationEditTabProps) {
  const router = useRouter();
  const [appDetails, setAppDetails] = useState<any>(null);
  const [editedApp, setEditedApp] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [secretModal, setSecretModal] = useState<{
    open: boolean;
    label: string;
    value: string;
  }>({
    open: false,
    label: "",
    value: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrationGroups, setIntegrationGroups] = useState<ApplicationTypeIntegrationFieldGroup[]>(
    []
  );
  const [activeConfigGroupIndex, setActiveConfigGroupIndex] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!applicationId) return;
      const apiToken =
        typeof window !== "undefined"
          ? sessionStorage.getItem(`app-inventory-token-${applicationId}`) ?? ""
          : "";
      setIsLoading(true);
      setError(null);
      try {
        const [data, supported] = await Promise.all([
          getApplicationDetails(applicationId, apiToken),
          getAllSupportedApplicationTypesViaProxy().catch(() => null),
        ]);
        setAppDetails(data);
        setEditedApp(data);

        const app = data?.Application ?? data ?? {};
        const category = String(
          app.category ?? app.Category ?? app.applicationType ?? app.ApplicationType ?? ""
        ).trim();

        let groups: ApplicationTypeIntegrationFieldGroup[] = [];
        if (category && supported?.applicationType && Array.isArray(supported.applicationType)) {
          for (const raw of supported.applicationType as unknown[]) {
            const parsed = parseSupportedObjectsApplicationTypeItem(raw);
            if (parsed?.typeName === category && parsed.integrationFieldGroups?.length) {
              groups = sortIntegrationFieldGroups(parsed.integrationFieldGroups);
              break;
            }
          }
        }
        setIntegrationGroups(groups);
        setActiveConfigGroupIndex(0);
      } catch (err) {
        console.error("Error fetching application details:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch application details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [applicationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading application details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center text-red-600">Error: {error}</div>
    );
  }

  const currentData = isEditing ? editedApp : appDetails;
  const application = currentData?.Application ?? currentData;

  const formatLabel = (key: string): string =>
    key
      .replace(/_/g, " ")
      .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

  const formatValue = (value: any): string => {
    if (value == null) return "—";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return "—";
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === "object") {
      if (Object.keys(value).length === 0) return "—";
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const isDisplayableValue = (value: any): boolean => true;

  const renderFieldRow = (
    label: string,
    value: any,
    maskPassword: boolean,
    fieldKey?: string,
    editable: boolean = false,
    onChange?: (newValue: string) => void,
    compact: boolean = false
  ) => {
    const isSensitiveField =
      maskPassword ||
      (fieldKey != null &&
        fieldKey !== "" &&
        fieldKeyLooksSensitive(String(fieldKey))) ||
      labelLooksLikePasswordOnly(label);
    const keyIsExactlyPassword =
      fieldKey != null &&
      String(fieldKey).replace(/^\uFEFF/, "").trim().toLowerCase() === "password";

    let displayValue: string;
    if ((isSensitiveField || keyIsExactlyPassword) && value != null && String(value) !== "") {
      displayValue = "••••••••";
    } else {
      displayValue = formatValue(value);
    }
    const isJson = displayValue.startsWith("{") || displayValue.startsWith("[");
    const noScroll = fieldKey?.toLowerCase() === "uniqueidschemamap";

    const fieldShell = compact
      ? "min-w-0 rounded-md border border-gray-100 bg-gray-50/60 px-2 py-2 h-full"
      : "min-w-0 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3 h-full";
    const labelClass = compact
      ? "text-[11px] font-medium text-gray-500 mb-1"
      : "text-xs font-medium text-gray-500 mb-1.5";
    const valueClass = compact
      ? "text-xs text-gray-900 break-words leading-snug"
      : "text-sm text-gray-900 break-words leading-snug";

    if (editable) {
      const secretPlain = coerceSecretPlaintext(value);
      if ((isSensitiveField || keyIsExactlyPassword) && secretPlain !== null) {
        return (
          <div className={fieldShell}>
            <label className={`block ${labelClass}`}>{label}</label>
            <input
              type="password"
              className="w-full text-xs text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={secretPlain}
              onChange={(e) => onChange?.(e.target.value)}
              autoComplete="off"
            />
          </div>
        );
      }

      const { text: editString } = scalarEditValue(value);
      const editLooksLikeJson =
        !(isSensitiveField || keyIsExactlyPassword) &&
        (editString.startsWith("{") || editString.startsWith("["));

      return (
        <div className={fieldShell}>
          <label className={`block ${labelClass}`}>{label}</label>
          <textarea
            className="w-full text-xs text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical bg-white"
            rows={editLooksLikeJson ? 4 : compact ? 2 : 2}
            value={editString}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </div>
      );
    }
    return (
      <div className={fieldShell}>
        <div className={labelClass}>{label}</div>
        {isJson ? (
          <pre
            className={`text-[11px] text-gray-800 bg-white p-2 rounded border border-gray-200 font-mono ${
              noScroll
                ? "overflow-visible whitespace-pre-wrap break-words"
                : "overflow-auto max-h-32"
            }`}
          >
            {displayValue}
          </pre>
        ) : (
          <div className={valueClass}>{displayValue}</div>
        )}
      </div>
    );
  };

  const renderSection = (
    title: string,
    data: any,
    options?: {
      fieldKeys?: string[];
      hideTitle?: boolean;
      sectionKind?: "Application Details" | "OAuth Details";
      compact?: boolean;
      singleColumn?: boolean;
    }
  ) => {
    if (!data || typeof data !== "object") return null;
    const sectionKind = options?.sectionKind ?? (title as "Application Details" | "OAuth Details");
    const compact = options?.compact ?? false;
    const singleColumn = options?.singleColumn ?? false;
    let fields = Object.keys(data).filter((key) => {
      const value = data[key];
      if (
        !isEditing &&
        sectionKind === "OAuth Details" &&
        (key.toLowerCase() === "clientsecret" || key.toLowerCase() === "adminpassword")
      ) {
        return false;
      }
      return isDisplayableValue(value);
    });
    if (options?.fieldKeys) {
      const allowed = new Set(options.fieldKeys);
      fields = fields.filter((key) => allowed.has(key));
      if (options.fieldKeys.length > 0) {
        fields.sort((a, b) => options.fieldKeys!.indexOf(a) - options.fieldKeys!.indexOf(b));
      }
    }
    if (fields.length === 0) {
      return (
        <div className="flex flex-col h-full">
          {!options?.hideTitle && (
            <h2
              className={
                compact
                  ? "text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200"
                  : "text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200"
              }
            >
              {title}
            </h2>
          )}
          <p className="text-sm text-gray-500 py-4">No fields configured for this section.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full">
        {!options?.hideTitle && (
          <h2
            className={
              compact
                ? "text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200"
                : "text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200"
            }
          >
            {title}
          </h2>
        )}
        <div
          className={
            singleColumn
              ? "grid grid-cols-1 gap-3 items-start"
              : compact
                ? "grid grid-cols-1 gap-2 items-start"
                : "grid grid-cols-2 gap-4 items-start"
          }
        >
          {fields.map((field) => {
            const value = data[field];
            const fieldLower = field.toLowerCase();
            const label = formatLabel(field);
            const maskPassword =
              fieldKeyLooksSensitive(field) || labelLooksLikePasswordOnly(label);

            if (
              isEditing &&
              sectionKind === "OAuth Details" &&
              (fieldLower === "clientsecret" || fieldLower === "adminpassword")
            ) {
              const buttonLabel =
                fieldLower === "clientsecret" ? "Client Secret" : "Admin Password";
              return (
                <div
                  key={field}
                  className="col-span-2 min-w-0 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-gray-500">{label}</span>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-medium transition-colors"
                      onClick={() => {
                        const rootApp = (editedApp ?? appDetails)?.Application ??
                          (editedApp ?? appDetails);
                        const oauth =
                          rootApp?.OAuthDetails ?? rootApp?.oauthDetails ?? {};
                        const rawValue =
                          fieldLower === "clientsecret"
                            ? oauth.clientSecret ?? oauth.ClientSecret ?? ""
                            : oauth.adminPassword ?? oauth.AdminPassword ?? "";
                        setSecretModal({
                          open: true,
                          label: buttonLabel,
                          value: rawValue ?? "",
                        });
                      }}
                    >
                      {`Show ${buttonLabel}`}
                    </button>
                  </div>
                </div>
              );
            }

            const handleChange =
              isEditing && editedApp
                ? (newValue: string) => {
                    setEditedApp((prev: any) => {
                      if (!prev) return prev;
                      const updated = { ...prev };
                      const rootApp = updated.Application ?? updated;

                      if (sectionKind === "Application Details") {
                        const detailsKey =
                          "ApplicationDetails" in rootApp
                            ? "ApplicationDetails"
                            : "applicationDetails";
                        const details = { ...(rootApp[detailsKey] || {}) };
                        details[field] = newValue;
                        rootApp[detailsKey] = details;
                      } else if (sectionKind === "OAuth Details") {
                        const oauthKey =
                          "OAuthDetails" in rootApp ? "OAuthDetails" : "oauthDetails";
                        const oauth = { ...(rootApp[oauthKey] || {}) };
                        oauth[field] = newValue;
                        rootApp[oauthKey] = oauth;
                      }

                      if (updated.Application) {
                        updated.Application = rootApp;
                      } else {
                        Object.assign(updated, rootApp);
                      }
                      return updated;
                    });
                  }
                : undefined;

            return (
              <React.Fragment key={field}>
                {renderFieldRow(label, value, maskPassword, field, isEditing, handleChange, compact)}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const applicationDetails =
    application?.ApplicationDetails ?? application?.applicationDetails ?? {};

  const { groupedFields, ungroupedFieldKeys } = partitionApplicationDetailsByIntegrationGroups(
    applicationDetails,
    integrationGroups
  );

  const hasGroupedConfig = integrationGroups.length > 0;
  const activeGroupEntry =
    hasGroupedConfig && groupedFields[activeConfigGroupIndex]
      ? groupedFields[activeConfigGroupIndex]
      : null;

  const renderConfigurationPanel = () => {
    if (!hasGroupedConfig) {
      return renderSection("Application Details", applicationDetails, {
        sectionKind: "Application Details",
      });
    }

    return (
      <div className="flex flex-col h-full min-w-0 w-full">
        <div className="flex flex-wrap gap-2 mb-5 border-b border-gray-200 pb-3">
          {groupedFields.map(({ group }, index) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveConfigGroupIndex(index)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeConfigGroupIndex === index
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {group.label}
            </button>
          ))}
          {ungroupedFieldKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveConfigGroupIndex(groupedFields.length)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeConfigGroupIndex === groupedFields.length
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Other
            </button>
          )}
        </div>
        {activeConfigGroupIndex < groupedFields.length && activeGroupEntry ? (
          isAdvancedIntegrationGroupId(activeGroupEntry.group.id) ? (
            <AdvancedIntegrationOperationTabs
              fieldKeys={activeGroupEntry.fieldKeys}
              renderFields={(keys) =>
                renderSection(activeGroupEntry.group.label, applicationDetails, {
                  fieldKeys: keys,
                  hideTitle: true,
                  sectionKind: "Application Details",
                })
              }
            />
          ) : (
            renderSection(activeGroupEntry.group.label, applicationDetails, {
              fieldKeys: activeGroupEntry.fieldKeys,
              hideTitle: true,
              sectionKind: "Application Details",
            })
          )
        ) : (
          renderSection("Other", applicationDetails, {
            fieldKeys: ungroupedFieldKeys,
            hideTitle: true,
            sectionKind: "Application Details",
          })
        )}
      </div>
    );
  };

  const handleSubmit = async () => {
    try {
      const source = editedApp ?? appDetails;
      if (!source) return;

      const rootApp = source.Application ?? source;
      const appId = rootApp.ApplicationID ?? applicationId;

      if (!appId) {
        console.error("Missing ApplicationID for updateApp");
        return;
      }

      const applicationDetails = {
        ...(rootApp.ApplicationDetails ?? rootApp.applicationDetails ?? {}),
      };
      const oauthDetails = {
        ...(rootApp.OAuthDetails ?? rootApp.oauthDetails ?? {}),
      };

      const oldToken =
        (typeof window !== "undefined"
          ? (sessionStorage.getItem(`app-inventory-token-${appId}`) ?? "")
          : "") ||
        (rootApp.APIToken ??
        rootApp.apiToken ??
        rootApp.OldAPIToken ??
        rootApp.oldApiToken ??
        "");

      const payload: any = {
        ApplicationDetails: applicationDetails,
        OAuthDetails: oauthDetails,
      };
      if (oldToken) {
        payload.OldAPIToken = oldToken;
      }

      const url = `https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/updateApp/${encodeURIComponent(appId)}`;

      const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        console.error("updateApp failed", await resp.text());
        return;
      }

      let data: any = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }
      if (data && typeof data === "object") {
        setAppDetails((prev: any) => {
          const next = { ...(prev ?? {}) };
          if (data.Application) {
            next.Application = data.Application;
          } else {
            Object.assign(next, data);
          }
          return next;
        });
      } else {
        setAppDetails(editedApp);
      }

      setIsEditing(false);
      if (onBackToInventory) {
        onBackToInventory();
      } else {
        router.push("/settings/app-inventory");
      }
    } catch (e) {
      console.error("Error calling updateApp API", e);
    }
  };

  const handleRegenerateSecret = async () => {
    try {
      const source = editedApp ?? appDetails;
      const rootApp = source?.Application ?? source;
      const appId = rootApp?.ApplicationID ?? applicationId;
      const oauth =
        rootApp?.OAuthDetails ?? rootApp?.oauthDetails ?? {};
      const clientID = oauth.clientID ?? oauth.ClientID ?? "";

      if (!appId || !clientID) {
        console.error("Missing ApplicationID or clientID for regenerateClientSecret");
        return;
      }

      const url = `https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/regenerateClientSecret/${encodeURIComponent(appId)}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientID }),
      });

      if (!resp.ok) {
        console.error("regenerateClientSecret failed", await resp.text());
        return;
      }

      let data: any = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      const newSecret =
        data?.clientSecret ??
        data?.ClientSecret ??
        data?.newClientSecret ??
        data?.NewClientSecret ??
        data?.secret ??
        data?.Secret ??
        data?.OAuthDetails?.clientSecret ??
        data?.OAuthDetails?.ClientSecret ??
        "";

      if (newSecret && typeof newSecret === "string") {
        setAppDetails((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          const base = updated.Application ?? updated;
          const oauthDetails = base.OAuthDetails ?? base.oauthDetails ?? {};
          oauthDetails.clientSecret = newSecret;
          base.OAuthDetails = oauthDetails;
          if (updated.Application) updated.Application = base;
          return updated;
        });
        setEditedApp((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          const base = updated.Application ?? updated;
          const oauthDetails = base.OAuthDetails ?? base.oauthDetails ?? {};
          oauthDetails.clientSecret = newSecret;
          base.OAuthDetails = oauthDetails;
          if (updated.Application) updated.Application = base;
          return updated;
        });
        setSecretModal((prev) => ({ ...prev, value: newSecret }));
      }
    } catch (e) {
      console.error("Error calling regenerateClientSecret API", e);
    }
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="flex justify-end gap-2 mb-4">
          {isEditing ? (
            <>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                onClick={() => {
                  setEditedApp(appDetails);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex items-center gap-2 rounded-full px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-medium"
              onClick={() => {
                setEditedApp(appDetails);
                setIsEditing(true);
              }}
              aria-label="Edit Application"
              title="Edit Application"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full">
          <div className="bg-white rounded-lg shadow-sm p-5 sm:p-6 space-y-6 min-h-[20rem] min-w-0 w-full">
            {renderConfigurationPanel()}
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 sm:p-6 min-w-0 w-full">
            {renderSection(
              "OAuth Details",
              application?.OAuthDetails ?? application?.oauthDetails,
              { sectionKind: "OAuth Details" }
            )}
          </div>
        </div>
      </div>

      {secretModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{secretModal.label}</h2>
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-1">Value:</p>
              <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-40 break-all">
                {secretModal.value || "—"}
              </pre>
            </div>
            <div className="flex justify-end gap-3">
              {secretModal.label === "Client Secret" && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  onClick={handleRegenerateSecret}
                >
                  Regenerate Secret
                </button>
              )}
              <button
                type="button"
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => setSecretModal({ open: false, label: "", value: "" })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
