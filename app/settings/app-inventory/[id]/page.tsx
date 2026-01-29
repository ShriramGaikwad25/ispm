"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getApplicationDetails } from "@/lib/api";
import { ArrowLeft, Loader2, Edit } from "lucide-react";

export default function ApplicationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = params?.id as string;
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
        const data = await getApplicationDetails(applicationId, apiToken);
        setAppDetails(data);
        setEditedApp(data);
        if (searchParams.get("edit") === "true") {
          setIsEditing(true);
        }
      } catch (err) {
        console.error("Error fetching application details:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch application details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [applicationId, searchParams]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading application details...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  // Current view data (original vs edited) and Application object from API: response.Application
  const currentData = isEditing ? editedApp : appDetails;
  const application = currentData?.Application ?? currentData;

  // Helper to get field value from data (exact key first, then naming variants)
  const getFieldValue = (data: any, field: string): any => {
    if (!data) return undefined;
    const camelCase = field.charAt(0).toLowerCase() + field.slice(1);
    const val =
      data[field] ??
      data[field.toLowerCase()] ??
      data[field.toUpperCase()] ??
      data[camelCase] ??
      data[field.charAt(0).toUpperCase() + field.slice(1).toLowerCase()];
    return val;
  };

  // Format API key as display label (e.g. "user_searchBase" -> "User Search Base")
  const formatLabel = (key: string): string =>
    key
      .replace(/_/g, " ")
      .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

  // Helper to render a field row (label on left, value on right)
  const renderFieldRow = (
    label: string,
    value: any,
    maskPassword = false,
    fieldKey?: string,
    editable: boolean = false,
    onChange?: (newValue: string) => void
  ) => {
    let displayValue: string;
    if (maskPassword && typeof value === "string" && value !== "") {
      displayValue = "••••••••";
    } else {
      displayValue = formatValue(value);
    }
    const isJson = displayValue.startsWith("{") || displayValue.startsWith("[");
    const noScroll = fieldKey?.toLowerCase() === "uniqueidschemamap";

    if (editable) {
      const editString =
        typeof value === "string" ? value : JSON.stringify(value ?? "", null, 2);
      return (
        <div className="flex flex-col gap-1 py-2 border-b border-gray-100 last:border-b-0">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700 shrink-0">{label}:</span>
          </div>
          <textarea
            className="mt-1 w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            rows={isJson ? 5 : 2}
            value={editString}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1 py-2 border-b border-gray-100 last:border-b-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-gray-700 shrink-0">{label}:</span>
        </div>
        {isJson ? (
          <pre className={`text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 font-mono ${noScroll ? "overflow-visible whitespace-pre-wrap break-words" : "overflow-auto max-h-48"}`}>
            {displayValue}
          </pre>
        ) : (
          <span className="text-sm text-gray-900 break-all min-w-0 text-right">{displayValue}</span>
        )}
      </div>
    );
  };

  // Helper to format value for display (handles primitives, arrays, objects)
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

  // Helper to check if value should be displayed
  const isDisplayableValue = (value: any): boolean => {
    // Show all values - we'll format them appropriately
    return true;
  };

  // Helper to render a section - dynamically shows all fields from data
  const renderSection = (title: string, data: any) => {
    if (!data || typeof data !== "object") return null;
    const fields = Object.keys(data).filter((key) => {
      const value = data[key];
      // For OAuth Details in view mode, completely hide sensitive fields instead of masking
      if (
        !isEditing &&
        title === "OAuth Details" &&
        (key.toLowerCase() === "clientsecret" || key.toLowerCase() === "adminpassword")
      ) {
        return false;
      }
      return isDisplayableValue(value);
    });
    if (fields.length === 0) return null;
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          {title}
        </h2>
        <div className="flex-1 space-y-0">
          {fields.map((field) => {
            const value = data[field];
            const fieldLower = field.toLowerCase();
            const maskPassword =
              fieldLower.includes("password") ||
              fieldLower.includes("secret") ||
              fieldLower.includes("token");
            const label = formatLabel(field);

            // Special handling in edit mode for sensitive OAuth fields: show buttons instead of editable text
            if (
              isEditing &&
              title === "OAuth Details" &&
              (fieldLower === "clientsecret" || fieldLower === "adminpassword")
            ) {
              const buttonLabel =
                fieldLower === "clientsecret" ? "Client Secret" : "Admin Password";
              return (
                <div
                  key={field}
                  className="flex flex-col gap-1 py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-700 shrink-0">
                      {label}:
                    </span>
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

            // Generic rendering: view vs edit
            const handleChange =
              isEditing && editedApp
                ? (newValue: string) => {
                    setEditedApp((prev: any) => {
                      if (!prev) return prev;
                      const updated = { ...prev };
                      const rootApp = updated.Application ?? updated;

                      // Determine which nested object to update based on section title
                      if (title === "Application Details") {
                        const detailsKey =
                          "ApplicationDetails" in rootApp
                            ? "ApplicationDetails"
                            : "applicationDetails";
                        const details = { ...(rootApp[detailsKey] || {}) };
                        details[field] = newValue;
                        rootApp[detailsKey] = details;
                      } else if (title === "OAuth Details") {
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
                {renderFieldRow(label, value, maskPassword, field, isEditing, handleChange)}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {application?.ApplicationName ?? appDetails?.ApplicationName ?? appDetails?.applicationName ?? appDetails?.name ?? "Application Details"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
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
                  onClick={async () => {
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

                      // OldAPIToken = token for this application (stored when opening details)
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

                      const url = `https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/updateApp/${encodeURIComponent(
                        appId
                      )}`;

                      const resp = await fetch(url, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                      });

                      if (!resp.ok) {
                        console.error("updateApp failed", await resp.text());
                        return;
                      }

                      // Optionally merge any response data back in
                      let data: any = null;
                      try {
                        data = await resp.json();
                      } catch {
                        data = null;
                      }
                      if (data && typeof data === "object") {
                        setAppDetails((prev: any) => {
                          const next = { ...(prev ?? {}) };
                          // If API returns an updated Application object, prefer it
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
                      router.push("/settings/app-inventory");
                    } catch (e) {
                      console.error("Error calling updateApp API", e);
                    }
                  }}
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Application Details - Left Column */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              {/* LDAP/connection details (API: Application.ApplicationDetails) */}
              {renderSection(
                "Application Details",
                application?.ApplicationDetails ?? application?.applicationDetails
              )}
            </div>

            {/* OAuth Details - Right Column (API: Application.OAuthDetails) */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {renderSection(
                "OAuth Details",
                application?.OAuthDetails ?? application?.oauthDetails
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secret modal */}
      {secretModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {secretModal.label}
            </h2>
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
                  onClick={async () => {
                    try {
                      const source = editedApp ?? appDetails;
                      const rootApp = source?.Application ?? source;
                      const appId = rootApp?.ApplicationID ?? applicationId;
                      const oauth =
                        rootApp?.OAuthDetails ?? rootApp?.oauthDetails ?? {};
                      const clientID = oauth.clientID ?? oauth.ClientID ?? "";

                      if (!appId || !clientID) {
                        console.error(
                          "Missing ApplicationID or clientID for regenerateClientSecret"
                        );
                        return;
                      }

                      const url = `https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/regenerateClientSecret/${encodeURIComponent(
                        appId
                      )}`;
                      const resp = await fetch(url, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ clientID }),
                      });

                      if (!resp.ok) {
                        console.error(
                          "regenerateClientSecret failed",
                          await resp.text()
                        );
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
                        // Update local application data so future views use the new secret
                        setAppDetails((prev: any) => {
                          if (!prev) return prev;
                          const updated = { ...prev };
                          const base = updated.Application ?? updated;
                          const oauthDetails =
                            base.OAuthDetails ?? base.oauthDetails ?? {};
                          oauthDetails.clientSecret = newSecret;
                          base.OAuthDetails = oauthDetails;
                          if (updated.Application) updated.Application = base;
                          return updated;
                        });
                        setEditedApp((prev: any) => {
                          if (!prev) return prev;
                          const updated = { ...prev };
                          const base = updated.Application ?? updated;
                          const oauthDetails =
                            base.OAuthDetails ?? base.oauthDetails ?? {};
                          oauthDetails.clientSecret = newSecret;
                          base.OAuthDetails = oauthDetails;
                          if (updated.Application) updated.Application = base;
                          return updated;
                        });
                        setSecretModal((prev) => ({
                          ...prev,
                          value: newSecret,
                        }));
                      }
                    } catch (e) {
                      console.error("Error calling regenerateClientSecret API", e);
                    }
                  }}
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
    </div>
  );
}
