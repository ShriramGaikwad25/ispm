"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, ChevronDown, Edit, Trash2, Info, X, GripVertical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllSupportedApplicationTypesViaProxy, executeQuery, submitItAssetRequest, getInProgressApplications, getItAssetApp, getFlatfileAppMetadataUsers, getAppMetadataUsers, uploadAndGetSchemaUsers, uploadAndGetSchemaForField, saveBaseMetadataUsers, saveBaseMetadataForField, saveAppDetails, onboardApp, updateAppConfig } from "@/lib/api";
import AdvanceSettingTab, { type AdvanceSettingTabRef } from "../[id]/components/AdvanceSettingTab";

interface FormData {
  step1: {
    applicationName: string;
    type: string;
    oauthType: string;
  };
  step2: {
    applicationName: string;
    description: string;
    trustedSource: boolean;
    technicalOwner: string;
    businessOwner: string;
    technicalOwnerEmail: string;
    businessOwnerEmail: string;
  };
  step3: {
    // Dynamic fields based on application type
    [key: string]: any;
  };
  step4: {
    complianceRequirements: string[];
    securityControls: string[];
    monitoringEnabled: boolean;
  };
  step5: {
    backupFrequency: string;
    disasterRecovery: string;
    maintenanceWindow: string;
  };
  step6: {
    reviewNotes: string;
    approvalRequired: boolean;
    goLiveDate: string;
  };
}

  const steps = [
    { id: 1, title: "Select System", description: "" },
    { id: 2, title: "Add Details", description: "" },
    { id: 3, title: "Integration Setting", description: "" },
    { id: 4, title: "File Upload", description: "" },
    { id: 5, title: "Schema Mapping", description: "" },
    { id: 6, title: "Finish Up", description: "" }
  ];

export default function AddApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompleteIntegration = searchParams.get("completeIntegration") === "1";
  const [currentStep, setCurrentStep] = useState(1);

  const appIdFromUrl = searchParams.get("appId") ?? "";
  const appNameFromUrl = searchParams.get("appName") ?? "";
  const appTypeFromUrl = searchParams.get("appType") ?? "";

  // Attribute mapping state (declared early so getallapp effect can call setAttributeMappingData)
  type AttributeMapping = { id: string; source: string; target: string; defaultValue?: string; type: string; keyfieldMapping?: boolean };
  const [attributeMappingData, setAttributeMappingData] = useState<AttributeMapping[]>([]);

  // Ref to step 5 AdvanceSettingTab so we can read hooks + threshold config on submit / OnBoard
  const advanceSettingRef = useRef<AdvanceSettingTabRef | null>(null);
  // Flatfile step 3: file input element and selected file
  const flatfileFileInputRef = useRef<HTMLInputElement>(null);
  const flatfileFileRef = useRef<File | null>(null);
  const flatfilePerFieldFileInputRef = useRef<HTMLInputElement>(null);
  const flatfileUploadForFieldRef = useRef<string | null>(null);
  const [flatfileMetadataUsers, setFlatfileMetadataUsers] = useState<any>(null);
  const [flatfilePreviewPage, setFlatfilePreviewPage] = useState(1);
  const [flatfilePreviewCollapsed, setFlatfilePreviewCollapsed] = useState(false);
  const [flatfilePerFieldPreviewCollapsed, setFlatfilePerFieldPreviewCollapsed] = useState<Record<string, boolean>>({});
  const [flatfilePerFieldExpanded, setFlatfilePerFieldExpanded] = useState<Record<string, boolean>>({});
  const FLATFILE_PREVIEW_PAGE_SIZE = 10;
  // Disconnected app: metadata users loaded on File Upload step
  const [disconnectedMetadataUsers, setDisconnectedMetadataUsers] = useState<any | null>(null);
  const [disconnectedFile, setDisconnectedFile] = useState<File | null>(null);
  const [disconnectedUploadLoading, setDisconnectedUploadLoading] = useState(false);
  const [disconnectedPerFieldExpanded, setDisconnectedPerFieldExpanded] =
    useState<Record<string, boolean>>({});
  const [disconnectedMetadataSaved, setDisconnectedMetadataSaved] = useState(false);
  const [disconnectedPerFieldPreview, setDisconnectedPerFieldPreview] = useState<
    Record<string, any[]>
  >({});
  const [disconnectedPerFieldFile, setDisconnectedPerFieldFile] = useState<
    Record<string, File | null>
  >({});

  // Edit mode: application details from IT Asset getapp (shown in card at top)
  const [appDetails, setAppDetails] = useState<Record<string, unknown> | null>(null);
  const [appDetailsLoading, setAppDetailsLoading] = useState(false);

  // When opening from Settings for a non-integrated app, start at step 3 (Integration Setting)
  useEffect(() => {
    if (isCompleteIntegration) setCurrentStep(3);
  }, [isCompleteIntegration]);

  // Edit mode: fetch application details from IT Asset getapp when we have appId
  useEffect(() => {
    if (!isCompleteIntegration || !appIdFromUrl?.trim() || typeof window === "undefined") return;
    setAppDetailsLoading(true);
    setAppDetails(null);
    getItAssetApp(appIdFromUrl.trim())
      .then((data) => {
        if (data != null && typeof data === "object") {
          setAppDetails(data as Record<string, unknown>);
          const desc = (data as Record<string, unknown>).description ?? (data as Record<string, unknown>).Description;
          if (desc != null && String(desc).trim() !== "") {
            setFormData((prev) => ({ ...prev, step2: { ...prev.step2, description: String(desc).trim() } }));
          }
        } else {
          setAppDetails(null);
        }
      })
      .catch(() => setAppDetails(null))
      .finally(() => setAppDetailsLoading(false));
  }, [isCompleteIntegration, appIdFromUrl]);

  // Prefill from URL params (app name/type from app-inventory row) so step 3 never shows "No Application Selected"
  useEffect(() => {
    if (!isCompleteIntegration || (!appNameFromUrl && !appTypeFromUrl)) return;
    setFormData((prev) => ({
      ...prev,
      step1: {
        ...prev.step1,
        type: appTypeFromUrl || prev.step1.type,
      },
      step2: {
        ...prev.step2,
        applicationName: appNameFromUrl || prev.step2.applicationName,
      },
    }));
  }, [isCompleteIntegration, appNameFromUrl, appTypeFromUrl]);

  // Fetch and map application data from getallapp (getInProgressApplications) when in complete-integration mode
  useEffect(() => {
    if (!isCompleteIntegration || !appIdFromUrl || typeof window === "undefined") return;
    getInProgressApplications()
      .then((res: any) => {
        if (!res || typeof res !== "object") return;
        const idKeys = [
          "ApplicationID", "applicationID", "ApplicationId", "applicationId",
          "id", "Id", "appId", "AppId", "appid", "application_id",
        ];
        const getItemId = (item: any): string =>
          String(
            idKeys.reduce((acc: string | null, k) => acc ?? (item?.[k] != null && item[k] !== "" ? String(item[k]).trim() : null), null) ?? ""
          );
        const getItemName = (item: any): string =>
          String(item?.name ?? item?.ApplicationName ?? item?.applicationName ?? item?.Name ?? item?.appName ?? item?.application_name ?? item?.title ?? "").trim();
        // getallapp can return root array or { applications, ... }; category = application type
        const list: any[] = Array.isArray(res)
          ? res
          : (() => {
              const direct = res.applications ?? res.Applications ?? res.apps ?? res.data ?? res.result ?? res.list ?? res.content ?? res.items ?? res.value ?? res.body ?? res.getallapp ?? res.appList;
              if (Array.isArray(direct)) return direct;
              if (direct && typeof direct === "object" && Array.isArray((direct as any).items)) return (direct as any).items;
              if (direct && typeof direct === "object" && Array.isArray((direct as any).data)) return (direct as any).data;
              if (res.data && Array.isArray(res.data)) return res.data;
              if (res.data && res.data.applications && Array.isArray(res.data.applications)) return res.data.applications;
              return [];
            })();
        const appIdNorm = appIdFromUrl.trim().toLowerCase();
        // Find app by id (appid, etc.) or by name when appid is empty; match case-insensitive and trimmed
        const app = list.find((item: any) => {
          const id = getItemId(item).trim().toLowerCase();
          const name = getItemName(item).toLowerCase();
          return id === appIdNorm || name === appIdNorm || (appIdNorm && (id.includes(appIdNorm) || name.includes(appIdNorm)));
        });
        if (!app || typeof app !== "object") return;
        const conn = app.connectionDetails ?? app.ConnectionDetails ?? app.connection ?? {};
        const owner = app.owner ?? app.Owner;
        const ownerValue = typeof owner === "string" ? owner : owner?.value ?? owner?.email ?? "";
        const ownerDisplay = typeof owner === "object" && owner?.value ? owner.value : ownerValue;
        const str = (v: unknown) => (v != null && v !== "" ? String(v) : "");
        const toSnake = (s: string) => s.replace(/([A-Z])/g, (_, c: string) => `_${c.toLowerCase()}`);
        // Map connectionDetails into step3 with camelCase and snake_case so API-driven and custom fields get values
        const step3FromConn: Record<string, string> = {};
        Object.entries(conn).forEach(([k, v]) => {
          const val = str(v);
          step3FromConn[k] = val;
          const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
          if (camel !== k) step3FromConn[camel] = val;
          const snake = toSnake(k);
          if (snake !== k) step3FromConn[snake] = val;
        });
        setFormData((prev) => {
          const step3Mapped = {
            ...prev.step3,
            ...step3FromConn,
            hostname: str(conn.hostname ?? conn.Hostname ?? prev.step3.hostname),
            port: str(conn.port ?? conn.Port ?? prev.step3.port),
            username: str(conn.username ?? conn.Username ?? prev.step3.username),
            password: str(conn.password ?? conn.Password ?? prev.step3.password),
            userSearchBase: str(conn.userSearchBase ?? conn.user_searchBase ?? conn.UserSearchBase ?? prev.step3.userSearchBase),
            groupSearchBase: str(conn.groupSearchBase ?? conn.group_searchBase ?? conn.GroupSearchBase ?? prev.step3.groupSearchBase),
            user_searchBase: str(conn.userSearchBase ?? conn.user_searchBase ?? conn.UserSearchBase ?? prev.step3.userSearchBase),
            group_searchBase: str(conn.groupSearchBase ?? conn.group_searchBase ?? conn.GroupSearchBase ?? prev.step3.groupSearchBase),
          };
          return {
          ...prev,
          step1: {
            ...prev.step1,
            // category = application type in getallapp response
            type: app.category ?? app.ApplicationType ?? app.applicationType ?? app.type ?? app.Type ?? prev.step1.type,
            oauthType: app.OAuthType ?? app.oauthType ?? prev.step1.oauthType,
          },
          step2: {
            ...prev.step2,
            applicationName: app.ApplicationName ?? app.applicationName ?? app.name ?? app.Name ?? app.appName ?? app.application_name ?? app.title ?? prev.step2.applicationName,
            description: app.description ?? app.Description ?? prev.step2.description,
            technicalOwner: ownerDisplay || prev.step2.technicalOwner,
            technicalOwnerEmail: ownerValue || prev.step2.technicalOwnerEmail,
            businessOwner: prev.step2.businessOwner,
            businessOwnerEmail: prev.step2.businessOwnerEmail,
          },
          step3: step3Mapped,
          };
        });

        // Map only provisioningAttrMap to attributeMappingData (Schema Mapping step); payload may have schemaMappingDetails null
        const schema = app.schemaMappingDetails ?? app.SchemaMappingDetails ?? app.schemaMapping ?? null;
        const provisioning =
          schema && typeof schema === "object"
            ? (schema.provisioningAttrMap ?? schema.ProvisioningAttrMap ?? schema.provisioning_attr_map ?? {})
            : {};
        const getVariable = (val: unknown): string => {
          if (val == null) return "";
          if (typeof val === "string") return val.trim();
          if (typeof val !== "object") return "";
          const o = val as Record<string, unknown>;
          const v = o.variable ?? o.Variable ?? (o.value && typeof o.value === "object" ? (o.value as Record<string, unknown>).variable : null);
          return (v != null && v !== "" ? String(v) : "").trim();
        };
        const mapped: AttributeMapping[] = [];
        let idx = 0;
        if (provisioning && typeof provisioning === "object" && !Array.isArray(provisioning)) {
          Object.entries(provisioning).forEach(([targetAttr, val]) => {
            const variable = getVariable(val);
            if (variable || targetAttr.trim()) mapped.push({ id: `p-${idx++}`, source: variable || "", target: targetAttr.trim(), defaultValue: "", type: "provisioning" });
          });
        }
        if (mapped.length > 0) setAttributeMappingData(mapped);
      })
      .catch((err) => {
        console.error("Error fetching getallapp data for mapping:", err);
      });
  }, [isCompleteIntegration, appIdFromUrl]);

  const [searchQuery, setSearchQuery] = useState("");
  const [attributeMappingPage, setAttributeMappingPage] = useState(1);
  const [isEditingAttribute, setIsEditingAttribute] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<any>(null);
  const ATTR_MAPPING_PAGE_SIZE = 10;
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // SCIM Attributes state
  const [scimAttributes, setScimAttributes] = useState<string[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [sourceAttributeValue, setSourceAttributeValue] = useState("");
  const [editSourceAttributeValue, setEditSourceAttributeValue] = useState("");
  const [targetAttributeValue, setTargetAttributeValue] = useState("");
  const [defaultAttributeValue, setDefaultAttributeValue] = useState("");
  const [keyfieldChecked, setKeyfieldChecked] = useState(false);
  const [mappingType, setMappingType] = useState<string>("direct");
  const [filteredAttributes, setFilteredAttributes] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);
  
  // Application types from API
  const [applicationTypes, setApplicationTypes] = useState<Array<{ id: string; title: string; subtitle: string; icon: string }>>([]);
  const [oauthTypes, setOauthTypes] = useState<string[]>([]);
  const [isLoadingAppTypes, setIsLoadingAppTypes] = useState(false);
  // Field definitions from API
  const [applicationTypeFields, setApplicationTypeFields] = useState<Record<string, string[]>>({});
  const [oauthTypeFields, setOauthTypeFields] = useState<Record<string, string[]>>({});
  // User search (Add Details step - Technical Owner / Business Owner)
  type OwnerField = "technicalOwner" | "businessOwner";
  type UserSearchHit = { id: string; name: string; email: string; username: string; department?: string; jobTitle?: string; employeeId?: string };
  const [userSearchAllUsers, setUserSearchAllUsers] = useState<UserSearchHit[]>([]);
  const [userSearchField, setUserSearchField] = useState<OwnerField | null>(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [submitRequestLoading, setSubmitRequestLoading] = useState(false);
  const [submitRequestError, setSubmitRequestError] = useState<string | null>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const step2UserFetchedRef = useRef(false);
  const technicalOwnerDropdownRef = useRef<HTMLDivElement>(null);
  const businessOwnerDropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    step1: {
      applicationName: "",
      type: "",
      oauthType: ""
    },
    step2: {
      applicationName: "",
      description: "",
      trustedSource: false,
      technicalOwner: "",
      businessOwner: "",
      technicalOwnerEmail: "",
      businessOwnerEmail: ""
    },
    step3: {
      // Dynamic fields will be populated based on application type
    },
    step4: {
      complianceRequirements: [],
      securityControls: [],
      monitoringEnabled: false
    },
    step5: {
      backupFrequency: "",
      disasterRecovery: "",
      maintenanceWindow: ""
    },
    step6: {
      reviewNotes: "",
      approvalRequired: false,
      goLiveDate: ""
    }
  });

  // When entering File Upload step for Disconnected Application, clear previous metadata users
  useEffect(() => {
    if (currentStep === 4 && formData.step1.type === "Disconnected Application") {
      setDisconnectedMetadataUsers(null);
      setDisconnectedFile(null);
      setDisconnectedMetadataSaved(false);
    }
  }, [currentStep, formData.step1.type]);

  // When entering File Upload step for Disconnected Application, call getappmetadata/<applicationname>/users
  useEffect(() => {
    if (currentStep !== 4 || formData.step1.type !== "Disconnected Application") return;
    const appName = formData.step2.applicationName?.trim();
    if (!appName) return;
    let cancelled = false;
    getAppMetadataUsers(appName)
      .then((data) => {
        if (!cancelled && data) {
          const anyData = data as any;
          const preview =
            (anyData && Array.isArray(anyData.preview) && anyData.preview) ||
            (Array.isArray(anyData) ? anyData : []);

          // If upload schema has not yet been loaded, seed from getappmetadata preview if available
          if (!disconnectedMetadataUsers && Array.isArray(preview)) {
            setDisconnectedMetadataUsers(data);
          }

          // Map parentFieldDefinition + multivaluedFieldDefinition into formData.step3
          const parent = anyData.parentFieldDefinition ?? {};
          const mvDef = Array.isArray(anyData.multivaluedFieldDefinition)
            ? anyData.multivaluedFieldDefinition
            : [];

          setFormData((prev) => {
            const prevStep3 = prev.step3 || {};
            const baseMv = parent.multivaluedField;
            const mvList = Array.isArray(baseMv)
              ? baseMv
              : baseMv
              ? [String(baseMv)]
              : Array.isArray(prevStep3.multivaluedField)
              ? (prevStep3.multivaluedField as string[])
              : prevStep3.multivaluedField
              ? [String(prevStep3.multivaluedField)]
              : [];

            const existingTypes =
              (prevStep3.multivaluedFieldEntitlementType as Record<
                string,
                string
              >) || {};
            const mappedTypes: Record<string, string> = { ...existingTypes };
            mvDef.forEach((entry: any) => {
              const fname = String(entry?.fieldName ?? "").trim();
              const etype = String(entry?.entitlementType ?? "").trim();
              if (fname && etype) mappedTypes[fname] = etype;
            });

            return {
              ...prev,
              step3: {
                ...prevStep3,
                uidAttribute:
                  parent.uidAttribute ??
                  prevStep3.uidAttribute ??
                  "",
                statusField:
                  parent.statusField ?? prevStep3.statusField ?? "",
                dateFormat:
                  parent.dateFormat ?? prevStep3.dateFormat ?? "",
                multivaluedField: mvList,
                fieldDelimiter:
                  anyData.fieldDelimiter ??
                  prevStep3.fieldDelimiter ??
                  ",",
                multivalueDelimiter:
                  anyData.multivalueDelimiter ??
                  prevStep3.multivalueDelimiter ??
                  "#",
                multivaluedFieldEntitlementType: mappedTypes,
              },
            };
          });

          // If metadata already exists, show multivalued entity section
          if (parent && preview && Array.isArray(preview)) {
            setDisconnectedMetadataSaved(true);
          }

          console.debug("getappmetadata/<app>/users response:", data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch app metadata users for disconnected app:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentStep, formData.step1.type, formData.step2.applicationName, disconnectedMetadataUsers]);

  // When we land on step 3 with Flatfile type, call getappmetadata/ACME_FlatfileLoad/users
  useEffect(() => {
    if (currentStep !== 3 || formData.step1.type !== "Flatfile" || typeof window === "undefined") return;
    setFlatfileMetadataUsers(null);
    setFlatfilePreviewPage(1);
    getFlatfileAppMetadataUsers()
      .then((data) => setFlatfileMetadataUsers(data))
      .catch(() => setFlatfileMetadataUsers(null));
  }, [currentStep, formData.step1.type]);

  const handleInputChange = (step: keyof FormData, field: string, value: any) => {
    setFormData(prev => {
      const nextStep = { ...prev[step], [field]: value };
      if (step === "step3") {
        if (field === "userSearchBase") nextStep.user_searchBase = value;
        else if (field === "groupSearchBase") nextStep.group_searchBase = value;
        else if (field === "user_searchBase") nextStep.userSearchBase = value;
        else if (field === "group_searchBase") nextStep.groupSearchBase = value;
      }
      return { ...prev, [step]: nextStep };
    });
  };

  const handleNext = async () => {
    const isDisconnectedApp = formData.step1.type === "Disconnected Application";
    const maxStep = isDisconnectedApp ? 6 : 5;
    if (currentStep >= maxStep) return;
    if (currentStep === 2) {
      setSubmitRequestError(null);
      setSubmitRequestLoading(true);
      try {
        const ownerEmail = formData.step2.technicalOwnerEmail || formData.step2.businessOwnerEmail || "";
        const step3 = formData.step3 || {};
        // Build connectionDetails dynamically from step3 so payload reflects selected application type fields
        const connectionDetails: Record<string, string> = {};
        Object.entries(step3).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          connectionDetails[k] = String(v);
        });
        // Normalize LDAP-style search base keys if present
        const userSearchBaseVal = step3.userSearchBase ?? step3.user_searchBase;
        const groupSearchBaseVal = step3.groupSearchBase ?? step3.group_searchBase;
        if (userSearchBaseVal != null) {
          connectionDetails.user_searchBase = String(userSearchBaseVal);
        }
        if (groupSearchBaseVal != null) {
          connectionDetails.group_searchBase = String(groupSearchBaseVal);
        }
        const payload = {
          name: formData.step2.applicationName || "",
          description: formData.step2.description || "",
          category: formData.step1.type || "",
          iga: false,
          sso: false,
          lcm: false,
          owner: { type: "User", value: ownerEmail },
          connectionDetails,
        };
        await submitItAssetRequest(payload);
        setCurrentStep(currentStep + 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit request";
        setSubmitRequestError(message);
      } finally {
        setSubmitRequestLoading(false);
      }
    } else if (!isCompleteIntegration && currentStep === 3 && isDisconnectedApp) {
      // Integration Settings: Disconnected Application - save app details via saveappdetails
      setSubmitRequestError(null);
      setSubmitRequestLoading(true);
      try {
        const ownerValue = formData.step2.technicalOwnerEmail || formData.step2.businessOwnerEmail || "";
        const step3 = formData.step3 || {};
        // Build connectionDetails exactly as disconnected app expects
        const connectionDetails: Record<string, unknown> = {
          owner: step3.owner ?? "",
          oimAppId: step3.oimAppId ?? "",
          ticketingAppId: step3.ticketingAppId ?? "",
          oimAPIToken: step3.oimAPIToken ?? "",
          ticketingSystem: step3.ticketingSystem ?? "",
          ticketingAPIToken: step3.ticketingAPIToken ?? "",
          isIntegratedWithOIM: step3.isIntegratedWithOIM ?? false,
          manuallyFulfill: step3.manuallyFulfill ?? true,
          assignTo: step3.assignTo ?? "",
          raiseTicket: step3.raiseTicket ?? "",
          applicationName: step3.applicationName ?? "",
        };

        // Build provisioning/reconcilliation maps from Schema Mapping state; if none, apply disconnected defaults
        let provisioningAttrMap: Record<string, { variable: string }> = {};
        let reconcilliationAttrMap: Record<string, { variable: string }> = {};

        attributeMappingData.forEach((mapping) => {
          if (mapping.target?.trim()) {
            provisioningAttrMap[mapping.target.trim()] = { variable: mapping.source?.trim() ?? "" };
          }
        });

        if (Object.keys(provisioningAttrMap).length === 0) {
          provisioningAttrMap = {
            id: { variable: "id" },
            userName: { variable: "userName" },
            userid: { variable: "externalId" },
          };
          reconcilliationAttrMap = {
            externalId: { variable: "userid" },
            id: { variable: "id" },
            userName: { variable: "userName" },
          };
        }

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        const discoveredOn = `${dd}/${mm}/${yyyy}`;

        const savePayload = {
          tenantId: "ACMECOM",
          appid: "",
          serviceURL: "",
          name: formData.step2.applicationName || "",
          description: formData.step2.description || "",
          category: formData.step1.type || "",
          owner: { type: "User", value: ownerValue },
          status: "New",
          connectionDetails,
          dicoveredOn: discoveredOn,
          integratedOn: "",
          schemaMappingDetails: {
            provisioningAttrMap,
            reconcilliationAttrMap,
          },
          // Default empty applicationConfigurationDetails structure expected by disconnected app
          applicationConfigurationDetails: {
            hook: {
              name: "",
              postProcessEvent: [
                {
                  authorization: "",
                  endpoint: "",
                  isEnabled: false,
                  type: "service",
                  priority: -1,
                  operation: "",
                  customHeaders: {},
                },
                {
                  agentId: "",
                  isEnabled: false,
                  implementationClass: "",
                  type: "sdk",
                  priority: -1,
                  operation: "",
                },
              ],
              preProcessEvent: [
                {
                  authorization: "",
                  endpoint: "",
                  isEnabled: false,
                  type: "service",
                  priority: -1,
                  operation: "",
                  customHeaders: {},
                },
                {
                  agentId: "",
                  isEnabled: false,
                  implementationClass: "",
                  type: "sdk",
                  priority: -1,
                  operation: "",
                },
              ],
            },
            threshold: [
              {
                exceptionalCases: {
                  peakDays: [{ endData: "", startDate: "" }],
                  peakTime: [{ startTime: "", endTime: "" }],
                },
                cutOff: {
                  maximumAllowed: -1,
                  stopFurtherOperations: false,
                  sendAlertTo: "",
                  durationInMinutes: 0,
                },
                operation: "Disable",
              },
              {
                exceptionalCases: {
                  peakDays: [{ endData: "", startDate: "" }],
                  peakTime: [{ startTime: "", endTime: "" }],
                },
                cutOff: {
                  maximumAllowed: -1,
                  stopFurtherOperations: false,
                  sendAlertTo: "",
                  durationInMinutes: 0,
                },
                operation: "Create",
              },
              {
                exceptionalCases: {
                  peakDays: [{ endData: "", startDate: "" }],
                  peakTime: [{ startTime: "", endTime: "" }],
                },
                cutOff: {
                  maximumAllowed: -1,
                  stopFurtherOperations: false,
                  sendAlertTo: "",
                  durationInMinutes: 0,
                },
                operation: "Delete",
              },
            ],
            autoRetry: {
              isEnabled: false,
              interval: -1,
              maximumRetry: 0,
            },
          },
          iga: false,
          lcm: false,
          sso: false,
        };
        await saveAppDetails(savePayload);
        setCurrentStep(currentStep + 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save application details";
        setSubmitRequestError(message);
      } finally {
        setSubmitRequestLoading(false);
      }
    } else if (isCompleteIntegration && (currentStep === 3 || currentStep === 4)) {
      setSubmitRequestError(null);
      setSubmitRequestLoading(true);
      try {
        const ownerEmail = formData.step2.technicalOwnerEmail || formData.step2.businessOwnerEmail || "";
        const step3 = formData.step3 || {};
        // Build provisioningAttrMap from Schema Mapping step: { [target]: { variable: source } }
        const provisioningAttrMap: Record<string, { variable: string }> = {};
        attributeMappingData.forEach((mapping) => {
          if (mapping.target?.trim()) {
            provisioningAttrMap[mapping.target.trim()] = { variable: mapping.source?.trim() ?? "" };
          }
        });
        const userSearchBaseVal = String(step3.userSearchBase ?? step3.user_searchBase ?? "").trim();
        const groupSearchBaseVal = String(step3.groupSearchBase ?? step3.group_searchBase ?? "").trim();
        const { userSearchBase: _u, groupSearchBase: _g, user_searchBase: _ub, group_searchBase: _gb, ...step3Rest } = step3 as Record<string, unknown>;
        const connectionDetails: Record<string, unknown> = {
          ...step3Rest,
          hostname: step3.hostname ?? "",
          port: step3.port ?? "",
          username: step3.username ?? "",
          password: step3.password ?? "",
          user_searchBase: userSearchBaseVal,
          group_searchBase: groupSearchBaseVal,
        };
        const savePayload = {
          tenantId: "ACMECOM",
          appid: appIdFromUrl || "",
          serviceURL: "",
          name: formData.step2.applicationName || "",
          description: formData.step2.description || "",
          category: formData.step1.type || "",
          owner: { type: "User", value: ownerEmail },
          status: "InProgress",
          connectionDetails,
          dicoveredOn: null,
          integratedOn: null,
          schemaMappingDetails: {
            provisioningAttrMap,
            reconcilliationAttrMap: {},
          },
          applicationConfigurationDetails: null,
          iga: false,
          lcm: false,
          sso: false,
          ...(appIdFromUrl && !Number.isNaN(Number(appIdFromUrl)) ? { key: Number(appIdFromUrl) } : {}),
        };
        await saveAppDetails(savePayload);
        setCurrentStep(currentStep + 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save application details";
        setSubmitRequestError(message);
      } finally {
        setSubmitRequestLoading(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setSubmitRequestError(null);
      if (isCompleteIntegration && currentStep === 3) {
        router.push("/settings/app-inventory");
        return;
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const isDisconnectedApp = formData.step1.type === "Disconnected Application";
    // If we're on the last step for Disconnected Application (step 6), include Advanced settings
    if (isDisconnectedApp && currentStep === 6 && advanceSettingRef.current) {
      const config = advanceSettingRef.current.getConfig();
      const appId = appIdFromUrl?.trim();
      const token =
        typeof window !== "undefined" && appId
          ? sessionStorage.getItem(`app-inventory-token-${appId}`) ?? ""
          : "";
      if (appId && token) {
        try {
          await updateAppConfig(appId, token, config);
        } catch (err) {
          console.error("Failed to save advanced settings:", err);
          alert("Application submitted but advanced settings could not be saved: " + (err instanceof Error ? err.message : "Unknown error"));
        }
      }
    }
    console.log("Form submitted:", formData);
    alert("Application added successfully!");
    router.push("/settings/app-inventory");
  };

  // Attribute mapping helper functions
  const getCurrentPageData = (): AttributeMapping[] => {
    const start = (attributeMappingPage - 1) * ATTR_MAPPING_PAGE_SIZE;
    const end = start + ATTR_MAPPING_PAGE_SIZE;
    return attributeMappingData.slice(start, end);
  };

  const getAttributeMappingTotalPages = (): number => {
    return Math.max(1, Math.ceil(attributeMappingData.length / ATTR_MAPPING_PAGE_SIZE));
  };

  // Fetch application types from API
  const fetchApplicationTypes = async () => {
    setIsLoadingAppTypes(true);
    try {
      console.log("Fetching application types from API...");
      const data = await getAllSupportedApplicationTypesViaProxy();
      console.log("API Response:", data);
      
      // Extract application types from API response
      // API returns: { applicationType: [{ "LDAP": [...] }, { "Generic LDAP": [...] }, ...] }
      if (data?.applicationType && Array.isArray(data.applicationType)) {
        const fieldMap: Record<string, string[]> = {};
        const extractedTypes = data.applicationType.map((item: any) => {
          // Each item is an object with one key (the app type name)
          const typeName = Object.keys(item)[0];
          const fields = item[typeName];
          if (Array.isArray(fields)) fieldMap[typeName] = fields;
          return {
            id: typeName,
            title: typeName,
            subtitle: `${typeName} application type`,
            icon: "📦" // Default icon, you can customize based on typeName
          };
        });
        console.log("Extracted application types:", extractedTypes);
        setApplicationTypes(extractedTypes);
        setApplicationTypeFields(fieldMap);
      } else {
        console.warn("No applicationType found in API response or invalid format:", data);
      }
      
      // Extract OAuth types from API response
      // API returns: { oauthType: [{ "OKTA": [...] }, { "IDCS": [...] }, ...] }
      if (data?.oauthType && Array.isArray(data.oauthType)) {
        const oauthFieldMap: Record<string, string[]> = {};
        const extractedOauthTypes = data.oauthType.map((item: any) => {
          // Each item is an object with one key (the oauth type name)
          const key = Object.keys(item)[0];
          const fields = item[key];
          if (Array.isArray(fields)) oauthFieldMap[key] = fields;
          return key;
        });
        console.log("Extracted OAuth types:", extractedOauthTypes);
        setOauthTypes(extractedOauthTypes);
        setOauthTypeFields(oauthFieldMap);
      } else {
        console.warn("No oauthType found in API response or invalid format:", data);
      }
    } catch (error) {
      console.error("Error fetching application types:", error);
      setApplicationTypes([]);
      setOauthTypes([]);
      setApplicationTypeFields({});
      setOauthTypeFields({});
    } finally {
      setIsLoadingAppTypes(false);
    }
  };

  // Fetch application types on component mount
  useEffect(() => {
    fetchApplicationTypes();
  }, []);

  // When in complete-integration mode, ensure step1.type matches a loaded application type so step 3 shows correct fields
  useEffect(() => {
    if (!isCompleteIntegration || !formData.step1.type || applicationTypes.length === 0) return;
    const currentType = formData.step1.type.trim();
    const hasExactMatch = applicationTypeFields[currentType] !== undefined;
    if (hasExactMatch) return;
    const matched = applicationTypes.find(
      (t) =>
        t.id === currentType ||
        t.title === currentType ||
        t.id.toLowerCase() === currentType.toLowerCase() ||
        t.title.toLowerCase() === currentType.toLowerCase()
    );
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        step1: { ...prev.step1, type: matched.id },
      }));
    }
  }, [isCompleteIntegration, formData.step1.type, applicationTypes, applicationTypeFields]);

  // Fetch SCIM attributes from API
  const fetchScimAttributes = async () => {
    setIsLoadingAttributes(true);
    try {
      const response = await fetch("https://preview.keyforge.ai/schemamapper/getscim/ACMECOM", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch SCIM attributes: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === "success" && Array.isArray(data.scimAttributes)) {
        setScimAttributes(data.scimAttributes);
        setFilteredAttributes(data.scimAttributes);
      } else {
        console.error("Invalid API response format");
        setScimAttributes([]);
        setFilteredAttributes([]);
      }
    } catch (error) {
      console.error("Error fetching SCIM attributes:", error);
      setScimAttributes([]);
      setFilteredAttributes([]);
    } finally {
      setIsLoadingAttributes(false);
    }
  };

  // Handle dropdown click - fetch attributes if not already fetched
  const handleDropdownToggle = () => {
    if (scimAttributes.length === 0 && !isLoadingAttributes) {
      fetchScimAttributes();
    }
    setIsDropdownOpen(!isDropdownOpen);
    setFilteredAttributes(scimAttributes);
  };

  const handleEditDropdownToggle = () => {
    if (scimAttributes.length === 0 && !isLoadingAttributes) {
      fetchScimAttributes();
    }
    setIsEditDropdownOpen(!isEditDropdownOpen);
    setFilteredAttributes(scimAttributes);
  };

  // Filter attributes based on search input
  const filterAttributes = (searchTerm: string, isEdit: boolean = false) => {
    if (searchTerm === "") {
      setFilteredAttributes(scimAttributes);
    } else {
      const search = searchTerm.toLowerCase();
      const filtered = scimAttributes.filter((attr) =>
        attr.toLowerCase().includes(search)
      );
      setFilteredAttributes(filtered);
    }
    
    if (isEdit) {
      setEditSourceAttributeValue(searchTerm);
    } else {
      setSourceAttributeValue(searchTerm);
    }
  };

  // Select an attribute from dropdown
  const selectAttribute = (attribute: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditSourceAttributeValue(attribute);
      setIsEditDropdownOpen(false);
    } else {
      setSourceAttributeValue(attribute);
      setIsDropdownOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        editDropdownRef.current &&
        !editDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEditDropdownOpen(false);
      }
      if (
        technicalOwnerDropdownRef.current &&
        !technicalOwnerDropdownRef.current.contains(event.target as Node)
      ) {
        setUserSearchField((f) => (f === "technicalOwner" ? null : f));
      }
      if (
        businessOwnerDropdownRef.current &&
        !businessOwnerDropdownRef.current.contains(event.target as Node)
      ) {
        setUserSearchField((f) => (f === "businessOwner" ? null : f));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch users once when Add Details step loads
  useEffect(() => {
    if (currentStep !== 2 || step2UserFetchedRef.current) return;
    step2UserFetchedRef.current = true;
    setUserSearchLoading(true);
    setUserSearchError(null);
    const query = `SELECT firstname, lastname, email, username, employeeid, department, title FROM usr`;
    executeQuery<{ resultSet?: any[] }>(query, [])
      .then((data) => {
        let usersData: UserSearchHit[] = [];
        if (data?.resultSet && Array.isArray(data.resultSet)) {
          usersData = data.resultSet.map((user: any, index: number) => {
            let emailValue = "";
            if (user.email) {
              if (typeof user.email === "string") emailValue = user.email;
              else if (user.email.work) emailValue = user.email.work;
              else if (Array.isArray(user.email) && user.email.length > 0) {
                const primary = user.email.find((e: any) => e.primary) || user.email[0];
                emailValue = primary?.value || "";
              }
            }
            const nameValue =
              [user.firstname, user.lastname].filter(Boolean).join(" ").trim() || user.username || "";
            return {
              id: `user-${index}-${user.username || user.email || index}`,
              name: nameValue,
              email: emailValue,
              username: user.username || "",
              department: user.department || "",
              jobTitle: user.title || "",
              employeeId: (user.employeeid != null && user.employeeid !== "") ? String(user.employeeid) : undefined,
            };
          });
        }
        setUserSearchAllUsers(usersData);
      })
      .catch((err) => {
        console.error("User search failed:", err);
        setUserSearchError(err instanceof Error ? err.message : "Failed to load users");
        setUserSearchAllUsers([]);
      })
      .finally(() => setUserSearchLoading(false));
  }, [currentStep]);

  // Filter loaded users by current input (client-side only)
  const getFilteredOwnerUsers = (field: OwnerField): UserSearchHit[] => {
    const term = (field === "technicalOwner" ? formData.step2.technicalOwner : formData.step2.businessOwner)
      .trim().toLowerCase();
    if (!term) return userSearchAllUsers;
    return userSearchAllUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        (u.department && u.department.toLowerCase().includes(term)) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(term)) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(term))
    );
  };

  const handleOwnerInputChange = (field: OwnerField, value: string) => {
    handleInputChange("step2", field, value);
    setUserSearchError(null);
    if (value.trim()) setUserSearchField(field);
    else setUserSearchField(null);
  };

  const handleOwnerSelect = (field: OwnerField, user: UserSearchHit) => {
    const display = user.name ? (user.email ? `${user.name} (${user.email})` : user.name) : user.email || user.username;
    handleInputChange("step2", field, display);
    // Store username instead of email for payload owner.value
    handleInputChange("step2", field === "technicalOwner" ? "technicalOwnerEmail" : "businessOwnerEmail", user.username || "");
    setUserSearchField(null);
  };

  // Initialize edit source attribute value when editing starts
  useEffect(() => {
    if (isEditingAttribute && editingAttribute) {
      setEditSourceAttributeValue(editingAttribute.source || "");
    }
  }, [isEditingAttribute, editingAttribute]);

  // Schema Mapping: Add new row (same behavior as SchemaMappingTab)
  const handleAddMapping = () => {
    const source = sourceAttributeValue.trim();
    const target = targetAttributeValue.trim();
    if (!source || !target) return;
    setAttributeMappingData((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        source,
        target,
        defaultValue: defaultAttributeValue?.trim() ?? "",
        type: mappingType || "direct",
        keyfieldMapping: keyfieldChecked,
      },
    ]);
    setSourceAttributeValue("");
    setTargetAttributeValue("");
    setDefaultAttributeValue("");
    setKeyfieldChecked(false);
    setMappingType("direct");
    setIsDropdownOpen(false);
  };

  // Schema Mapping: Update existing row (same behavior as SchemaMappingTab)
  const saveEdit = () => {
    if (!editingAttribute?.id) return;
    const source = (editSourceAttributeValue || editingAttribute.source || "").trim();
    setAttributeMappingData((prev) =>
      prev.map((m) =>
        m.id === editingAttribute.id
          ? {
              ...m,
              source,
              target: (editingAttribute.target || "").trim(),
              defaultValue: editingAttribute.defaultValue ?? "",
              type: editingAttribute.type || "direct",
              keyfieldMapping: editingAttribute.keyfieldMapping ?? false,
            }
          : m
      )
    );
    setIsEditingAttribute(false);
    setEditingAttribute(null);
    setEditSourceAttributeValue("");
    setIsEditDropdownOpen(false);
  };

  // Schema Mapping: Delete row (same behavior as SchemaMappingTab)
  const handleDeleteMapping = (id: string) => {
    if (!id) return;
    setAttributeMappingData((prev) => prev.filter((m) => m.id !== id));
    if (editingAttribute?.id === id) {
      setIsEditingAttribute(false);
      setEditingAttribute(null);
      setEditSourceAttributeValue("");
      setIsEditDropdownOpen(false);
    }
  };

  // Shared UI for Disconnected Application integration fields
  const renderDisconnectedApplicationFields = () => {
    const manuallyFulfillChecked =
      formData.step3.manuallyFulfill === undefined ||
      formData.step3.manuallyFulfill === null ||
      formData.step3.manuallyFulfill === true;

                return (
                  <div className="space-y-6">
        {/* Manually Fulfill toggle */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              checked={manuallyFulfillChecked}
              onChange={(e) =>
                handleInputChange("step3", "manuallyFulfill", e.target.checked)
              }
            />
            <span className="ml-2 text-sm text-gray-700">
              Manually fulfill all access requests
            </span>
          </label>
        </div>

        {/* Remaining Integration Settings – only when NOT manually fulfilled */}
        {!manuallyFulfillChecked && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="text"
                value={formData.step3.raiseTicket || ""}
                onChange={(e) => handleInputChange("step3", "raiseTicket", e.target.value)}
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                placeholder=" "
              />
              <label
                className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step3.raiseTicket
                    ? "top-0.5 text-xs text-blue-600"
                    : "top-3.5 text-sm text-gray-500"
                }`}
              >
                Raise Ticket *
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={formData.step3.ticketingSystem || ""}
                onChange={(e) =>
                  handleInputChange("step3", "ticketingSystem", e.target.value)
                }
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                placeholder=" "
              />
              <label
                className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step3.ticketingSystem
                    ? "top-0.5 text-xs text-blue-600"
                    : "top-3.5 text-sm text-gray-500"
                }`}
              >
                Ticketing System *
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={formData.step3.ticketingAppId || ""}
                onChange={(e) =>
                  handleInputChange("step3", "ticketingAppId", e.target.value)
                }
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                placeholder=" "
              />
              <label
                className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step3.ticketingAppId
                    ? "top-0.5 text-xs text-blue-600"
                    : "top-3.5 text-sm text-gray-500"
                }`}
              >
                Ticketing App ID *
              </label>
            </div>
            <div className="relative">
              <input
                type="password"
                value={formData.step3.ticketingAPIToken || ""}
                onChange={(e) =>
                  handleInputChange("step3", "ticketingAPIToken", e.target.value)
                }
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                placeholder=" "
              />
              <label
                className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step3.ticketingAPIToken
                    ? "top-0.5 text-xs text-blue-600"
                    : "top-3.5 text-sm text-gray-500"
                }`}
              >
                Ticketing API Token *
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={formData.step3.assignTo || ""}
                onChange={(e) => handleInputChange("step3", "assignTo", e.target.value)}
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                placeholder=" "
              />
              <label
                className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step3.assignTo
                    ? "top-0.5 text-xs text-blue-600"
                    : "top-3.5 text-sm text-gray-500"
                }`}
              >
                Assign To *
              </label>
            </div>
            <div className="relative">
              <input
                type="password"
                value={formData.step3.oimAPIToken || ""}
                onChange={(e) => handleInputChange("step3", "oimAPIToken", e.target.value)}
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                placeholder=" "
              />
              <label
                className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step3.oimAPIToken
                    ? "top-0.5 text-xs text-blue-600"
                    : "top-3.5 text-sm text-gray-500"
                }`}
              >
                OIM API Token *
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Shared Schema Mapping step content (used for both normal and disconnected flows)
  const renderSchemaMappingStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Existing Mappings Table */}
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source Attribute
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Attribute
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageData().length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                      No attribute mappings configured.
                    </td>
                  </tr>
                ) : (
                  getCurrentPageData().map((mapping, index) => (
                    <tr key={mapping.id ?? `row-${index}`}>
                      <td
                        className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words break-all align-top"
                        style={{
                          position: "static",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {mapping.source}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words break-all align-top"
                        style={{
                          position: "static",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {mapping.target}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {mapping.defaultValue || ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            aria-label="Edit"
                            onClick={() => {
                              setEditingAttribute(mapping);
                              setIsEditingAttribute(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            aria-label="Delete"
                            onClick={() => handleDeleteMapping(mapping.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => setAttributeMappingPage(Math.max(1, attributeMappingPage - 1))}
                disabled={attributeMappingPage === 1}
              >
                &lt;
              </button>
              <span className="text-sm text-gray-700">
                Page {attributeMappingPage} of {getAttributeMappingTotalPages()}
              </span>
              <button
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                onClick={() =>
                  setAttributeMappingPage(
                    Math.min(getAttributeMappingTotalPages(), attributeMappingPage + 1)
                  )
                }
                disabled={attributeMappingPage === getAttributeMappingTotalPages()}
              >
                &gt;
              </button>
            </div>
          </div>

          {/* Action Buttons - Save calls saveappdetails API in edit mode */}
          <div className="flex space-x-3">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={submitRequestLoading}
              onClick={async () => {
                setSubmitRequestError(null);
                setSubmitRequestLoading(true);
                try {
                  const ownerEmail =
                    formData.step2.technicalOwnerEmail || formData.step2.businessOwnerEmail || "";
                  const step3 = formData.step3 || {};
                  const provisioningAttrMap: Record<string, { variable: string }> = {};
                  attributeMappingData.forEach((mapping) => {
                    if (mapping.target?.trim()) {
                      provisioningAttrMap[mapping.target.trim()] = {
                        variable: mapping.source?.trim() ?? "",
                      };
                    }
                  });
                  const userSearchBaseVal = String(
                    step3.userSearchBase ?? step3.user_searchBase ?? ""
                  ).trim();
                  const groupSearchBaseVal = String(
                    step3.groupSearchBase ?? step3.group_searchBase ?? ""
                  ).trim();
                  const {
                    userSearchBase: _u2,
                    groupSearchBase: _g2,
                    user_searchBase: _ub2,
                    group_searchBase: _gb2,
                    ...step3Rest
                  } = step3 as Record<string, unknown>;
                  const connectionDetails: Record<string, unknown> = {
                    ...step3Rest,
                    hostname: step3.hostname ?? "",
                    port: step3.port ?? "",
                    username: step3.username ?? "",
                    password: step3.password ?? "",
                    user_searchBase: userSearchBaseVal,
                    group_searchBase: groupSearchBaseVal,
                  };
                  const savePayload = {
                    tenantId: "ACMECOM",
                    appid: appIdFromUrl || "",
                    serviceURL: "",
                    name: formData.step2.applicationName || "",
                    description: formData.step2.description || "",
                    category: formData.step1.type || "",
                    owner: { type: "User", value: ownerEmail },
                    status: "InProgress",
                    connectionDetails,
                    dicoveredOn: null,
                    integratedOn: null,
                    schemaMappingDetails: {
                      provisioningAttrMap,
                      reconcilliationAttrMap: {},
                    },
                    applicationConfigurationDetails: null,
                    iga: false,
                    lcm: false,
                    sso: false,
                    ...(appIdFromUrl && !Number.isNaN(Number(appIdFromUrl))
                      ? { key: Number(appIdFromUrl) }
                      : {}),
                  };
                  await saveAppDetails(savePayload);
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : "Failed to save application details";
                  setSubmitRequestError(message);
                } finally {
                  setSubmitRequestLoading(false);
                }
              }}
            >
              {submitRequestLoading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
              onClick={() => router.push("/settings/app-inventory")}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Add New Attribute Form or Edit Attribute Form */}
        <div className="space-y-4">
          {isEditingAttribute ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mapping Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingAttribute?.type ?? "direct"}
                    onChange={(e) =>
                      setEditingAttribute((prev) =>
                        prev ? { ...prev, type: e.target.value } : null
                      )
                    }
                  >
                    <option value="direct">Direct</option>
                    <option value="expression">Expression</option>
                    <option value="constant">Constant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Attribute
                    <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingAttribute?.target ?? ""}
                    onChange={(e) =>
                      setEditingAttribute((prev) =>
                        prev ? { ...prev, target: e.target.value } : null
                      )
                    }
                  />
                  <div className="mt-2 flex justify-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={editingAttribute?.keyfieldMapping ?? false}
                        onChange={(e) =>
                          setEditingAttribute((prev) =>
                            prev ? { ...prev, keyfieldMapping: e.target.checked } : null
                          )
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">Keyfield</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Attribute
                    <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                    <span className="text-xs text-gray-500 ml-1">Help</span>
                  </label>
                  <div className="relative" ref={editDropdownRef}>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editSourceAttributeValue || editingAttribute?.source || ""}
                      onChange={(e) => {
                        filterAttributes(e.target.value, true);
                      }}
                      onFocus={() => {
                        if (scimAttributes.length === 0 && !isLoadingAttributes) {
                          fetchScimAttributes();
                        }
                        setIsEditDropdownOpen(true);
                      }}
                      placeholder="Select or enter source attribute"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      onClick={handleEditDropdownToggle}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isEditDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isEditDropdownOpen && (
                      <div
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                        style={{ scrollBehavior: "smooth" }}
                      >
                        {isLoadingAttributes ? (
                          <div className="px-4 py-2 text-sm text-gray-500">Loading attributes...</div>
                        ) : filteredAttributes.length > 0 ? (
                          filteredAttributes.map((attr, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => selectAttribute(attr, true)}
                            >
                              {attr}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No attributes found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default value (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter default value"
                    value={editingAttribute?.defaultValue ?? ""}
                    onChange={(e) =>
                      setEditingAttribute((prev) =>
                        prev ? { ...prev, defaultValue: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>

              {/* Edit Form Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                  onClick={saveEdit}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
                  onClick={() => {
                    setIsEditingAttribute(false);
                    setEditingAttribute(null);
                    setEditSourceAttributeValue("");
                    setIsEditDropdownOpen(false);
                  }}
                >
                  Discard
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mapping Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={mappingType ?? "direct"}
                    onChange={(e) => setMappingType(e.target.value)}
                  >
                    <option value="direct">Direct</option>
                    <option value="expression">Expression</option>
                    <option value="constant">Constant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Attribute
                    <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                    <span className="text-xs text-gray-500 ml-1">Help</span>
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={sourceAttributeValue ?? ""}
                      onChange={(e) => {
                        filterAttributes(e.target.value, false);
                      }}
                      onFocus={() => {
                        if (scimAttributes.length === 0 && !isLoadingAttributes) {
                          fetchScimAttributes();
                        }
                        setIsDropdownOpen(true);
                      }}
                      placeholder="Select or enter source attribute"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      onClick={handleDropdownToggle}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isDropdownOpen && (
                      <div
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-height-60 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                        style={{ scrollBehavior: "smooth", maxHeight: "15rem" }}
                      >
                        {isLoadingAttributes ? (
                          <div className="px-4 py-2 text-sm text-gray-500">Loading attributes...</div>
                        ) : filteredAttributes.length > 0 ? (
                          filteredAttributes.map((attr, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => selectAttribute(attr, false)}
                            >
                              {attr}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No attributes found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Attribute
                    <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter target attribute"
                      value={targetAttributeValue ?? ""}
                      onChange={(e) => setTargetAttributeValue(e.target.value)}
                    />
                    <button className="absolute right-2 top-2 text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={keyfieldChecked}
                        onChange={(e) => setKeyfieldChecked(e.target.checked)}
                      />
                      <span className="ml-2 text-sm text-gray-700">Keyfield</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default value (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter default value"
                    value={defaultAttributeValue ?? ""}
                    onChange={(e) => setDefaultAttributeValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Add Form Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!sourceAttributeValue.trim() || !targetAttributeValue.trim()}
                  onClick={handleAddMapping}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
                  onClick={() => {
                    setSourceAttributeValue("");
                    setTargetAttributeValue("");
                    setDefaultAttributeValue("");
                    setKeyfieldChecked(false);
                    setMappingType("direct");
                    setIsDropdownOpen(false);
                  }}
                >
                  Discard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
             <div className="relative">
               <input
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onFocus={() => setIsSearchFocused(true)}
                 onBlur={() => setIsSearchFocused(false)}
                 className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                 placeholder=" "
               />
               <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                 searchQuery || isSearchFocused
                   ? 'top-0.5 text-xs text-blue-600' 
                   : 'top-3.5 text-sm text-gray-500'
               }`}>
                 Search *
               </label>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-4">
                 Application Type *
               </label>
               {isLoadingAppTypes ? (
                 <div className="flex items-center justify-center p-8">
                   <div className="text-gray-500">Loading application types...</div>
                 </div>
               ) : (
               <div className="grid grid-cols-3 gap-4">
                 {applicationTypes.length === 0 ? (
                   <div className="col-span-3 text-center text-gray-500 p-4">
                     No application types available. Please check the API connection.
                   </div>
                 ) : (
                   applicationTypes
                     .filter((type) => 
                       searchQuery === "" || 
                       type.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       type.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       type.id.toLowerCase().includes(searchQuery.toLowerCase())
                     )
                     .map((type) => (
                   <div
                     key={type.id}
                     onClick={() => handleInputChange("step1", "type", type.id)}
                     className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                       formData.step1.type === type.id
                         ? "border-blue-500 bg-blue-50"
                         : "border-gray-200 bg-white hover:border-gray-300"
                     }`}
                   >
                     <div className="flex items-center mb-2">
                       <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-lg mr-3">
                         {type.icon}
                       </div>
                       <div className="flex-1">
                         <h3 className="font-medium text-gray-900 text-sm">{type.title}</h3>
                         <p className="text-xs text-gray-500">{type.subtitle}</p>
                       </div>
                       {formData.step1.type === type.id && (
                         <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                           <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                           </svg>
                         </div>
                       )}
                     </div>
                   </div>
                     ))
                 )}
               </div>
               )}
             </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Selected summary from Step 1 */}
            <div className="p-4 border border-blue-100 rounded-md bg-blue-50 text-sm text-blue-800">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="font-medium">Selected System:</span>{' '}
                  <span>{formData.step1.type || "Not selected"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-[3] relative">
                <input
                  type="text"
                  value={formData.step2.applicationName}
                  onChange={(e) => handleInputChange("step2", "applicationName", e.target.value)}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step2.applicationName
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Application Name *
                </label>
              </div>
              <div className="flex-none flex items-center pt-1">
                <input
                  type="checkbox"
                  id="trustedSource"
                  checked={formData.step2.trustedSource}
                  onChange={(e) => handleInputChange("step2", "trustedSource", e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="trustedSource" className="ml-2 text-sm text-gray-700 cursor-pointer">
                  Trusted Source
                </label>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={formData.step2.description}
                onChange={(e) => handleInputChange("step2", "description", e.target.value)}
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline resize-none"
                rows={3}
                placeholder=" "
              />
              <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                formData.step2.description
                  ? 'top-0.5 text-xs text-blue-600' 
                  : 'top-3.5 text-sm text-gray-500'
              }`}>
                Description *
              </label>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative" ref={technicalOwnerDropdownRef}>
                <input
                  type="text"
                  value={formData.step2.technicalOwner}
                  onChange={(e) => handleOwnerInputChange("technicalOwner", e.target.value)}
                  onFocus={() => setUserSearchField("technicalOwner")}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step2.technicalOwner
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Technical Owner *
                </label>
                {userSearchField === "technicalOwner" && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {userSearchLoading && (
                      <div className="px-4 py-3 text-sm text-gray-500">Loading users...</div>
                    )}
                    {!userSearchLoading && userSearchError && (
                      <div className="px-4 py-3 text-sm text-red-600">{userSearchError}</div>
                    )}
                    {!userSearchLoading && !userSearchError && getFilteredOwnerUsers("technicalOwner").length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">No users found</div>
                    )}
                    {!userSearchLoading && getFilteredOwnerUsers("technicalOwner").map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleOwnerSelect("technicalOwner", user)}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-gray-900 text-sm">{user.name || user.username}</div>
                        {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 relative" ref={businessOwnerDropdownRef}>
                <input
                  type="text"
                  value={formData.step2.businessOwner}
                  onChange={(e) => handleOwnerInputChange("businessOwner", e.target.value)}
                  onFocus={() => setUserSearchField("businessOwner")}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step2.businessOwner
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Business Owner *
                </label>
                {userSearchField === "businessOwner" && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {userSearchLoading && (
                      <div className="px-4 py-3 text-sm text-gray-500">Loading users...</div>
                    )}
                    {!userSearchLoading && userSearchError && (
                      <div className="px-4 py-3 text-sm text-red-600">{userSearchError}</div>
                    )}
                    {!userSearchLoading && !userSearchError && getFilteredOwnerUsers("businessOwner").length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">No users found</div>
                    )}
                    {!userSearchLoading && getFilteredOwnerUsers("businessOwner").map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleOwnerSelect("businessOwner", user)}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-gray-900 text-sm">{user.name || user.username}</div>
                        {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        const selectedAppType = formData.step1.type;

        // For Disconnected Application (both create and edit), step 3 = Integration Settings
        if (selectedAppType === "Disconnected Application") {
          return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
                Integration Settings
              </h3>
              {renderDisconnectedApplicationFields()}
            </div>
          );
        }

        const renderIntegrationFields = () => {
          // Flatfile: step 3 is File Upload (upload button, file name, field/multivalue delimiters + Uid/Status/DateFormat/Multivalued + drag-drop fields)
          if (selectedAppType === "Flatfile") {
            const flatfileFieldsFromApi = (() => {
              const data = flatfileMetadataUsers as any;
              if (!data) return [];
              const fromParent = data?.parentFieldDefinition?.fields;
              if (Array.isArray(fromParent) && fromParent.length > 0) return fromParent;
              const preview = data?.preview;
              if (Array.isArray(preview) && preview[0] && typeof preview[0] === "object") return Object.keys(preview[0]);
              if (Array.isArray(data) && data[0] && typeof data[0] === "object") return Object.keys(data[0]);
              return [];
            })();
            const flatfileAttrOptions = flatfileFieldsFromApi.length > 0
              ? flatfileFieldsFromApi
              : ["UserID", "Username", "Email", "Status", "RoleName", "LastLogin", "DateFormat"];
            const fieldOrder: string[] = Array.isArray(formData.step3.fieldOrder) && formData.step3.fieldOrder.length > 0
              ? formData.step3.fieldOrder
              : flatfileFieldsFromApi.length > 0 ? flatfileFieldsFromApi : [];
            const multivaluedFieldList: string[] = Array.isArray(formData.step3.multivaluedField) ? formData.step3.multivaluedField : (formData.step3.multivaluedField ? [String(formData.step3.multivaluedField)] : []);

            const FIELD_DRAG_TYPE = "application/x-flatfile-field-index";
            const handleFieldDragStart = (e: React.DragEvent, index: number) => {
              e.dataTransfer.effectAllowed = "all";
              const fieldName = fieldOrder[index] ?? "";
              e.dataTransfer.setData("text/plain", fieldName);
              e.dataTransfer.setData(FIELD_DRAG_TYPE, String(index));
              e.dataTransfer.setData("text", fieldName);
            };
            const handleFieldDragOver = (e: React.DragEvent) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            };
            const handleFieldDragEnter = (e: React.DragEvent) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            };
            const handleFieldDropOnList = (e: React.DragEvent, dropIndex: number) => {
              e.preventDefault();
              const fromIndexStr = e.dataTransfer.getData(FIELD_DRAG_TYPE);
              if (fromIndexStr === "") return;
              const fromIndex = parseInt(fromIndexStr, 10);
              if (Number.isNaN(fromIndex) || fromIndex === dropIndex || fromIndex < 0 || fromIndex >= fieldOrder.length || dropIndex < 0 || dropIndex >= fieldOrder.length) return;
              const next = [...fieldOrder];
              const [removed] = next.splice(fromIndex, 1);
              next.splice(dropIndex, 0, removed);
              handleInputChange("step3", "fieldOrder", next);
            };
            const handleFieldDropOnInput = (e: React.DragEvent, step3Key: string) => {
              e.preventDefault();
              e.stopPropagation();
              const fieldName = (e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text") || "").trim();
              if (fieldName && (fieldOrder.includes(fieldName) || flatfileAttrOptions.includes(fieldName))) {
                handleInputChange("step3", step3Key, fieldName);
              }
            };
            const inputDragOver = (e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
            };
            const inputDragEnter = (e: React.DragEvent) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            };

            return (
              <div className="space-y-6">
                <input
                  type="file"
                  ref={flatfileFileInputRef}
                  className="hidden"
                  accept=".csv,.txt,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      flatfileFileRef.current = file;
                      handleInputChange("step3", "uploadedFileName", file.name);
                    }
                    e.target.value = "";
                  }}
                />
                <input
                  type="file"
                  ref={flatfilePerFieldFileInputRef}
                  className="hidden"
                  accept=".csv,.txt,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    const forField = flatfileUploadForFieldRef.current;
                    if (file && forField) {
                      handleInputChange("step3", `uploadedFileName_${forField}`, file.name);
                      flatfileUploadForFieldRef.current = null;
                    }
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => flatfileFileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Upload
                  </button>
                  {flatfileMetadataUsers && formData.step3.uploadedFileName && (
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        readOnly
                        value={formData.step3.uploadedFileName}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md bg-gray-50 no-underline"
                        placeholder=" "
                      />
                      <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">
                        File name
                      </label>
                    </div>
                  )}
                </div>
                {flatfileMetadataUsers && formData.step3.uploadedFileName && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.fieldDelimiter ?? ","}
                        onChange={(e) => handleInputChange("step3", "fieldDelimiter", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">
                        Field Delimiter
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.multivalueDelimiter ?? "#"}
                        onChange={(e) => handleInputChange("step3", "multivalueDelimiter", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">
                        Multivalue Delimiter
                      </label>
                    </div>
                  </div>
                )}
                {/* Box: Fields + Uid / Status / Date Format / Multivalued */}
                <div className="border border-gray-300 rounded-lg bg-white p-5 shadow-sm">
                  <div className="space-y-5">
                    {/* Fields: drag-and-drop list in rows */}
                    {fieldOrder.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fields</label>
                        <div className="flex flex-wrap gap-2 border border-gray-200 rounded-md p-3 bg-gray-50/50">
                          {fieldOrder.map((fieldName, index) => (
                            <div
                              key={`field-${index}-${fieldName}`}
                              draggable
                              onDragStart={(e) => handleFieldDragStart(e, index)}
                              onDragOver={handleFieldDragOver}
                              onDragEnter={handleFieldDragEnter}
                              onDrop={(e) => handleFieldDropOnList(e, index)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing text-sm text-gray-900"
                            >
                              <GripVertical className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                              <span>{fieldName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Row 1: Uid Attribute * | Status Field */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative rounded-md border-2 border-dashed border-transparent transition-colors hover:border-gray-200">
                        <input
                          type="text"
                          readOnly
                          value={formData.step3.uidAttribute ?? ""}
                          onDragOver={inputDragOver}
                          onDragEnter={inputDragEnter}
                          onDrop={(e) => handleFieldDropOnInput(e, "uidAttribute")}
                          className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline bg-gray-50"
                          placeholder=" "
                        />
                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          (formData.step3.uidAttribute ?? "")
                            ? "top-0.5 text-xs text-blue-600"
                            : "top-3.5 text-sm text-gray-500"
                        }`}>
                          Uid Attribute *
                        </label>
                        {fieldOrder.length > 0 && !(formData.step3.uidAttribute ?? "") && (
                          <span className="absolute right-3 top-3.5 text-xs text-gray-400 pointer-events-none">Drop field here</span>
                        )}
                      </div>
                      <div className="relative rounded-md border-2 border-dashed border-transparent transition-colors hover:border-gray-200">
                        <input
                          type="text"
                          readOnly
                          value={formData.step3.statusField ?? ""}
                          onDragOver={inputDragOver}
                          onDragEnter={inputDragEnter}
                          onDrop={(e) => handleFieldDropOnInput(e, "statusField")}
                          className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline bg-gray-50"
                          placeholder=" "
                        />
                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          (formData.step3.statusField ?? "")
                            ? "top-0.5 text-xs text-blue-600"
                            : "top-3.5 text-sm text-gray-500"
                        }`}>
                          Status Field
                        </label>
                        {fieldOrder.length > 0 && !(formData.step3.statusField ?? "") && (
                          <span className="absolute right-3 top-3.5 text-xs text-gray-400 pointer-events-none">Drop field here</span>
                        )}
                      </div>
                    </div>
                    {/* Row 2: Date Format | Multivalued Field */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.step3.dateFormat ?? ""}
                          onChange={(e) => handleInputChange("step3", "dateFormat", e.target.value)}
                          className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                          placeholder=" "
                        />
                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          (formData.step3.dateFormat ?? "")
                            ? "top-0.5 text-xs text-blue-600"
                            : "top-3.5 text-sm text-gray-500"
                        }`}>
                          Date Format
                        </label>
                      </div>
                      <div className="relative rounded-md border-2 border-dashed border-transparent transition-colors hover:border-gray-200">
                        <div
                          className="flex flex-wrap gap-2 min-h-[52px] pl-4 pt-5 pb-1.5 pr-9 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 bg-white"
                          onDragOver={inputDragOver}
                          onDragEnter={inputDragEnter}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const fieldName = (e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text") || "").trim();
                            if (fieldName && (fieldOrder.includes(fieldName) || flatfileAttrOptions.includes(fieldName)) && !multivaluedFieldList.includes(fieldName) && multivaluedFieldList.length < 3) {
                              handleInputChange("step3", "multivaluedField", [...multivaluedFieldList, fieldName]);
                            }
                          }}
                        >
                          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            multivaluedFieldList.length > 0
                              ? "top-0.5 text-xs text-blue-600"
                              : "top-3.5 text-sm text-gray-500"
                          }`}>
                            Multivalued Field
                          </label>
                          <span title="Please select that attribute for which multiple values are assigned to a user" className="absolute right-3 top-3.5 text-gray-500 cursor-help pointer-events-auto">
                            <Info className="w-4 h-4" />
                          </span>
                          {multivaluedFieldList.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-sm"
                            >
                              {item}
                              <button
                                type="button"
                                onClick={() => handleInputChange("step3", "multivaluedField", multivaluedFieldList.filter((x) => x !== item))}
                                className="p-0.5 rounded hover:bg-blue-200"
                                aria-label={`Remove ${item}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                          {fieldOrder.length > 0 && multivaluedFieldList.length === 0 && (
                            <span className="text-xs text-gray-400 self-center">Drop fields here (max 3)</span>
                          )}
                          {multivaluedFieldList.length >= 3 && (
                            <span className="text-xs text-gray-400 self-center">Maximum 3 fields</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Per–Field Name: collapsible sections (Upload, File Name, Delimiters, Field, Primary Attribute, Entitlement Type, Preview) */}
                  {multivaluedFieldList.length > 0 && (
                    <div className="pt-5 mt-5 border-t border-gray-200 space-y-3">
                      {multivaluedFieldList.map((fieldName) => {
                        const step3 = formData.step3 as Record<string, string>;
                        const isExpanded = flatfilePerFieldExpanded[fieldName] ?? false;
                        const toggleExpanded = () => setFlatfilePerFieldExpanded((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
                        const fieldLabel = fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim() + " Entity";
                        const currentValue = step3[`entitlementType_${fieldName}`] ?? "";
                        const selectedByOtherFields = multivaluedFieldList
                          .filter((f) => f !== fieldName)
                          .map((f) => step3[`entitlementType_${f}`])
                          .filter(Boolean);
                        const entitlementOptions = [
                          { value: "", label: "Select type..." },
                          { value: "Groups", label: "Groups" },
                          { value: "Roles", label: "Roles" },
                          { value: "Entitlement", label: "Entitlement" },
                        ].filter((opt) => !opt.value || opt.value === currentValue || !selectedByOtherFields.includes(opt.value));
                        const previewCollapsed = flatfilePerFieldPreviewCollapsed[fieldName] ?? true;
                        const togglePreview = () => setFlatfilePerFieldPreviewCollapsed((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
                        return (
                          <div key={fieldName} className="border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden">
                            <button
                              type="button"
                              onClick={toggleExpanded}
                              className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-100/80 transition-colors"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-blue-600 shrink-0" aria-hidden />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-blue-600 shrink-0" aria-hidden />
                              )}
                              <span className="text-blue-600 font-medium">{fieldLabel}</span>
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-gray-200 space-y-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      flatfileUploadForFieldRef.current = fieldName;
                                      flatfilePerFieldFileInputRef.current?.click();
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium shrink-0"
                                  >
                                    Upload
                                  </button>
                                  <div className="flex-1 relative min-w-0">
                                    <input
                                      type="text"
                                      readOnly
                                      value={step3[`uploadedFileName_${fieldName}`] ?? ""}
                                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md bg-gray-50 no-underline"
                                      placeholder=" "
                                    />
                                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${step3[`uploadedFileName_${fieldName}`] ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"}`}>
                                      File Name
                                    </label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={step3[`fieldDelimiter_${fieldName}`] ?? ","}
                                      onChange={(e) => handleInputChange("step3", `fieldDelimiter_${fieldName}`, e.target.value)}
                                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                                      placeholder=" "
                                    />
                                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${(step3[`fieldDelimiter_${fieldName}`] ?? ",") ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"}`}>
                                      Field Delimiter
                                    </label>
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={step3[`multivalueDelimiter_${fieldName}`] ?? "#"}
                                      onChange={(e) => handleInputChange("step3", `multivalueDelimiter_${fieldName}`, e.target.value)}
                                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                                      placeholder=" "
                                    />
                                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${(step3[`multivalueDelimiter_${fieldName}`] ?? "#") ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"}`}>
                                      Multivalue Delimiter
                                    </label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      readOnly
                                      value={fieldName}
                                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md bg-gray-50 no-underline"
                                      tabIndex={-1}
                                      aria-readonly
                                    />
                                    <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">Field</label>
                                  </div>
                                  <div className="relative rounded-md border-2 border-dashed border-transparent transition-colors hover:border-gray-200">
                                    <input
                                      type="text"
                                      readOnly
                                      value={step3[`primaryAttribute_${fieldName}`] ?? ""}
                                      onDragOver={inputDragOver}
                                      onDragEnter={inputDragEnter}
                                      onDrop={(e) => handleFieldDropOnInput(e, `primaryAttribute_${fieldName}`)}
                                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline bg-gray-50"
                                      placeholder=" "
                                    />
                                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${(step3[`primaryAttribute_${fieldName}`] ?? "") ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"}`}>
                                      Primary Attribute *
                                    </label>
                                    {fieldOrder.length > 0 && !(step3[`primaryAttribute_${fieldName}`] ?? "") && (
                                      <span className="absolute right-3 top-3.5 text-xs text-gray-400 pointer-events-none">Drop field here</span>
                                    )}
                                  </div>
                                </div>
                                <div className="relative">
                                  <select
                                    value={currentValue}
                                    onChange={(e) => handleInputChange("step3", `entitlementType_${fieldName}`, e.target.value)}
                                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline appearance-none bg-white text-gray-900"
                                  >
                                    {entitlementOptions.map((opt) => (
                                      <option key={opt.value || "empty"} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                  <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">Entitlement Type</label>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden />
                                </div>
                                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={togglePreview}
                                    className="flex items-center gap-2 px-4 py-3 w-full text-left border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    aria-expanded={!previewCollapsed}
                                  >
                                    <ChevronDown className={`w-5 h-5 text-blue-600 shrink-0 transition-transform ${previewCollapsed ? "" : "rotate-180"}`} aria-hidden />
                                    <span className="text-blue-600 font-medium">Preview</span>
                                  </button>
                                  {!previewCollapsed && (
                                    <div className="p-4 text-sm text-gray-500">
                                      {step3[`uploadedFileName_${fieldName}`] ? "Preview will appear here when supported." : "Upload a file to see preview."}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                </div>
            );
          }

          // Dynamic rendering based on API-provided fields + custom fields from step3/connectionDetails
          const typeFields = applicationTypeFields[selectedAppType] || [];
          const selectedOauth = formData.step1.oauthType;
          const oauthFieldsForType = oauthTypeFields[selectedOauth] || [];
          const allKnownFields = new Set<string>([...typeFields, ...oauthFieldsForType]);
          const customFieldKeys = Object.keys(formData.step3 || {}).filter(
            (k) => typeof k === "string" && k.trim() !== "" && !allKnownFields.has(k)
          );

          if (typeFields.length > 0 || oauthFieldsForType.length > 0 || customFieldKeys.length > 0) {
            const renderField = (fieldKey: string) => {
              const label = fieldKey
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              const value = (formData.step3 as any)[fieldKey] ?? "";
              const isPasswordLike = /password|secret|token|passphrase/i.test(fieldKey);
              return (
                <div className="flex-1 relative" key={fieldKey}>
                  <input
                    type={isPasswordLike ? "password" : "text"}
                    value={value}
                    onChange={(e) => handleInputChange("step3", fieldKey, e.target.value)}
                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                    placeholder=" "
                    autoComplete={isPasswordLike ? "off" : undefined}
                  />
                  <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    value ? "top-0.5 text-xs text-blue-600" : "top-3.5 text-sm text-gray-500"
                  }`}>
                    {label}
                  </label>
                </div>
              );
            };

            return (
              <div className="space-y-6">
                {typeFields.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">{selectedAppType} Settings</div>
                    <div className="flex flex-col gap-3">
                      {typeFields.reduce<string[][]>((rows, field, idx) => {
                        if (idx % 2 === 0) rows.push([field]);
                        else rows[rows.length - 1].push(field);
                        return rows;
                      }, []).map((row, i) => (
                        <div className="flex items-center gap-3" key={`type-row-${i}`}>
                          {row.map((f) => renderField(f))}
                          {row.length === 1 && <div className="flex-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {oauthFieldsForType.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">{selectedOauth} OAuth Settings</div>
                    <div className="flex flex-col gap-3">
                      {oauthFieldsForType.reduce<string[][]>((rows, field, idx) => {
                        if (idx % 2 === 0) rows.push([field]);
                        else rows[rows.length - 1].push(field);
                        return rows;
                      }, []).map((row, i) => (
                        <div className="flex items-center gap-3" key={`oauth-row-${i}`}>
                          {row.map((f) => renderField(f))}
                          {row.length === 1 && <div className="flex-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {customFieldKeys.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Custom fields</div>
                    <div className="flex flex-col gap-3">
                      {customFieldKeys.reduce<string[][]>((rows, field, idx) => {
                        if (idx % 2 === 0) rows.push([field]);
                        else rows[rows.length - 1].push(field);
                        return rows;
                      }, []).map((row, i) => (
                        <div className="flex items-center gap-3" key={`custom-row-${i}`}>
                          {row.map((f) => renderField(f))}
                          {row.length === 1 && <div className="flex-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Fallback to existing hardcoded layouts if API did not return fields for the selected type
          switch (selectedAppType) {
            case "LDAP":
            case "Generic LDAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Active Directory":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.useSSL || ""}
                        onChange={(e) => handleInputChange("step3", "useSSL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.useSSL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Use SSL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.domain || ""}
                        onChange={(e) => handleInputChange("step3", "domain", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.domain
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Domain *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Database":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.databaseType || ""}
                        onChange={(e) => handleInputChange("step3", "databaseType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.databaseType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Database Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.connectionURL || ""}
                        onChange={(e) => handleInputChange("step3", "connectionURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.connectionURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Connection URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetAllUsers || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetAllUsers", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetAllUsers
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get All Users *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetAllGroups || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetAllGroups", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetAllGroups
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get All Groups *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetAllRoleContents || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetAllRoleContents", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetAllRoleContents
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get All Role Contents *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetUser || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetUser", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetUser
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get User *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetGroup || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetGroup", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetGroup
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get Group *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetRoleContent || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetRoleContent", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetRoleContent
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get Role Content *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.uniqueIDSchemaMap || ""}
                        onChange={(e) => handleInputChange("step3", "uniqueIDSchemaMap", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.uniqueIDSchemaMap
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Unique ID Schema Map *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spRevokeGroupMembership || ""}
                        onChange={(e) => handleInputChange("step3", "spRevokeGroupMembership", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spRevokeGroupMembership
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Revoke Group Membership *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeGroupMembershipDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "revokeGroupMembershipDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeGroupMembershipDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Group Membership Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeGroupMembershipResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "revokeGroupMembershipResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeGroupMembershipResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Group Membership Response Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spAddGroupMembership || ""}
                        onChange={(e) => handleInputChange("step3", "spAddGroupMembership", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spAddGroupMembership
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Add Group Membership *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.addGroupMembershipDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "addGroupMembershipDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.addGroupMembershipDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Add Group Membership Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.addGroupMembershipResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "addGroupMembershipResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.addGroupMembershipResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Add Group Membership Response Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSchemaMap || ""}
                        onChange={(e) => handleInputChange("step3", "groupSchemaMap", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSchemaMap
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Schema Map *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.roleContentSchemaMap || ""}
                        onChange={(e) => handleInputChange("step3", "roleContentSchemaMap", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.roleContentSchemaMap
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Role Content Schema Map *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spCreateAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spCreateAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spCreateAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Create Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "createAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create Account Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "createAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create Account Response Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spUpdateAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spUpdateAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spUpdateAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Update Account *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "updateAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update Account Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "updateAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update Account Response Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spDeleteAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spDeleteAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spDeleteAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Delete Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account Response Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spEnableAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spEnableAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spEnableAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Enable Account *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.enableAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "enableAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.enableAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Enable Account Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.enableAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "enableAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.enableAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Enable Account Response Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spDisableAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spDisableAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spDisableAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Disable Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.disableAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "disableAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.disableAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Disable Account Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.disableAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "disableAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.disableAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Disable Account Response Definition *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Database Collector":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.collector || ""}
                        onChange={(e) => handleInputChange("step3", "collector", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.collector
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Collector *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Database User Management":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Disconnected Application":
              return (
                <div className="text-sm text-gray-600">
                  Integration settings for disconnected applications are configured in the
                  &nbsp;
                  <span className="font-medium">Add Details</span> step.
                </div>
              );

            case "E2EMigration Client":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.validFrom || ""}
                        onChange={(e) => handleInputChange("step3", "validFrom", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.validFrom
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Valid From *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.validUpto || ""}
                        onChange={(e) => handleInputChange("step3", "validUpto", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.validUpto
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Valid Upto *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.validityToken || ""}
                        onChange={(e) => handleInputChange("step3", "validityToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.validityToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Validity Token *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Epic":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Generic LDAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "LDAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.serviceId || ""}
                        onChange={(e) => handleInputChange("step3", "serviceId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.serviceId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Service Id *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "AWS":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.accessID || ""}
                        onChange={(e) => handleInputChange("step3", "accessID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.accessID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Access ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.accessSecret || ""}
                        onChange={(e) => handleInputChange("step3", "accessSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.accessSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Access Secret *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Logical Application":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.applicationId || ""}
                        onChange={(e) => handleInputChange("step3", "applicationId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.applicationId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Application Id *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "LogicalApp Active Directory":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.useSSL || ""}
                        onChange={(e) => handleInputChange("step3", "useSSL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.useSSL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Use SSL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.domain || ""}
                        onChange={(e) => handleInputChange("step3", "domain", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.domain
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Domain *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupScope || ""}
                        onChange={(e) => handleInputChange("step3", "groupScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Scope *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userScope || ""}
                        onChange={(e) => handleInputChange("step3", "userScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Scope *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultGroupOfNewAccount || ""}
                        onChange={(e) => handleInputChange("step3", "defaultGroupOfNewAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultGroupOfNewAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Group Of New Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account On Delete Request *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeMembershipOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "revokeMembershipOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeMembershipOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Membership On Delete Request *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.primaryIdentityAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "primaryIdentityAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.primaryIdentityAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Primary Identity Attribute *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "OKTA":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.apiKey || ""}
                        onChange={(e) => handleInputChange("step3", "apiKey", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.apiKey
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        API Key *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostURL || ""}
                        onChange={(e) => handleInputChange("step3", "hostURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Host URL *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "OIMOUD Management":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.restServiceURL || ""}
                        onChange={(e) => handleInputChange("step3", "restServiceURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.restServiceURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        RESTService URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.t3ServiceHostname || ""}
                        onChange={(e) => handleInputChange("step3", "t3ServiceHostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.t3ServiceHostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        T3Service Hostname *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.t3ServicePort || ""}
                        onChange={(e) => handleInputChange("step3", "t3ServicePort", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.t3ServicePort
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        T3Service Port *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.t3ServiceAuthloginConfigFile || ""}
                        onChange={(e) => handleInputChange("step3", "t3ServiceAuthloginConfigFile", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.t3ServiceAuthloginConfigFile
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        T3Service Authlogin Config File *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantId || ""}
                        onChange={(e) => handleInputChange("step3", "tenantId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant Id *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.oudServiceAccountId || ""}
                        onChange={(e) => handleInputChange("step3", "oudServiceAccountId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.oudServiceAccountId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        OUDService Account Id *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.oudServiceAccountPWD || ""}
                        onChange={(e) => handleInputChange("step3", "oudServiceAccountPWD", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.oudServiceAccountPWD
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        OUDService Account PWD *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Oracle E-Business":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Oracle IDCS":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientId || ""}
                        onChange={(e) => handleInputChange("step3", "clientId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.endpointURL || ""}
                        onChange={(e) => handleInputChange("step3", "endpointURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.endpointURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Endpoint URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.enableAutoRetry || ""}
                        onChange={(e) => handleInputChange("step3", "enableAutoRetry", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.enableAutoRetry
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Enable Auto Retry *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.autoRetryInterval || ""}
                        onChange={(e) => handleInputChange("step3", "autoRetryInterval", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.autoRetryInterval
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Auto Retry Interval *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.maximumAutoRetry || ""}
                        onChange={(e) => handleInputChange("step3", "maximumAutoRetry", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.maximumAutoRetry
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Maximum Auto Retry *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Oracle Identity Manager":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.applicationServerType || ""}
                        onChange={(e) => handleInputChange("step3", "applicationServerType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.applicationServerType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Application Server Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.namingProviderUrl || ""}
                        onChange={(e) => handleInputChange("step3", "namingProviderUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.namingProviderUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Naming Provider Url *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authLoginConfigPath || ""}
                        onChange={(e) => handleInputChange("step3", "authLoginConfigPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authLoginConfigPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Auth Login Config Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.dbSchema || ""}
                        onChange={(e) => handleInputChange("step3", "dbSchema", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.dbSchema
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Db Schema *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "OracleFusionApps":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.endpoint || ""}
                        onChange={(e) => handleInputChange("step3", "endpoint", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.endpoint
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Endpoint *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "PeopleSoft":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "PeopleSoftHR":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "PeopleSoftUM":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.serviceURL || ""}
                        onChange={(e) => handleInputChange("step3", "serviceURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.serviceURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Service URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.host || ""}
                        onChange={(e) => handleInputChange("step3", "host", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.host
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Host *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.senderNode || ""}
                        onChange={(e) => handleInputChange("step3", "senderNode", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.senderNode
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Sender Node *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.receiverNode || ""}
                        onChange={(e) => handleInputChange("step3", "receiverNode", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.receiverNode
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Receiver Node *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "createUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create User Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "updateUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update User Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "deleteUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete User Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get User Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllUsersOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getAllUsersOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllUsersOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All Users Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createGroupOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "createGroupOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createGroupOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create Group Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteGroupOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "deleteGroupOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteGroupOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Group Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getGroupOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getGroupOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getGroupOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get Group Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllGroupsOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getAllGroupsOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllGroupsOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All Groups Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultRole || ""}
                        onChange={(e) => handleInputChange("step3", "defaultRole", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultRole
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Role *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultPrimaryPermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultPrimaryPermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultPrimaryPermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Primary Permission *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultNavigatorPermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultNavigatorPermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultNavigatorPermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Navigator Permission *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultRowSecurityPermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultRowSecurityPermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultRowSecurityPermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Row Security Permission *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultProcessProfilePermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultProcessProfilePermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultProcessProfilePermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Process Profile Permission *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Provisioning Agent":
              return (
                <div className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.applicationId || ""}
                      onChange={(e) => handleInputChange("step3", "applicationId", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.applicationId
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Application ID *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.applicationHooks || ""}
                      onChange={(e) => handleInputChange("step3", "applicationHooks", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.applicationHooks
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Application Hooks *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.isEnabled || ""}
                      onChange={(e) => handleInputChange("step3", "isEnabled", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.isEnabled
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Is Enabled *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.enableAutoRetry || ""}
                      onChange={(e) => handleInputChange("step3", "enableAutoRetry", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.enableAutoRetry
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Enable Auto Retry *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.autoRetryInterval || ""}
                      onChange={(e) => handleInputChange("step3", "autoRetryInterval", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.autoRetryInterval
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Auto Retry Interval *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.maximumAutoRetry || ""}
                      onChange={(e) => handleInputChange("step3", "maximumAutoRetry", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.maximumAutoRetry
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Maximum Auto Retry *
                    </label>
                  </div>
                </div>
              );

            case "RSA":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.adminId || ""}
                        onChange={(e) => handleInputChange("step3", "adminId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.adminId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Admin ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.adminPassword || ""}
                        onChange={(e) => handleInputChange("step3", "adminPassword", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.adminPassword
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Admin Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "SAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "SailPointIIQApplications":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.baseUri || ""}
                        onChange={(e) => handleInputChange("step3", "baseUri", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.baseUri
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Base URI *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                </div>
              );

            case "SailPointIdentityIQ":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.baseUri || ""}
                        onChange={(e) => handleInputChange("step3", "baseUri", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.baseUri
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Base URI *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                </div>
              );

            case "SalesForce":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientId || ""}
                        onChange={(e) => handleInputChange("step3", "clientId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Id *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.endpoint || ""}
                        onChange={(e) => handleInputChange("step3", "endpoint", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.endpoint
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Endpoint *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.securityToken || ""}
                        onChange={(e) => handleInputChange("step3", "securityToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.securityToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Security Token *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Service Now Ticketing":
              return (
                <div className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.tenantUrl || ""}
                      onChange={(e) => handleInputChange("step3", "tenantUrl", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.tenantUrl
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Tenant URL *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.baseUri || ""}
                      onChange={(e) => handleInputChange("step3", "baseUri", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.baseUri
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Base URI *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.username || ""}
                      onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.username
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Username *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                </div>
              );

            case "Unix":
              return (
                <div className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.connectionType || ""}
                      onChange={(e) => handleInputChange("step3", "connectionType", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.connectionType
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Connection Type *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.host || ""}
                      onChange={(e) => handleInputChange("step3", "host", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.host
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Host *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.port || ""}
                      onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.port
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Port *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.username || ""}
                      onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.username
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Username *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.passphrase || ""}
                      onChange={(e) => handleInputChange("step3", "passphrase", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.passphrase
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Passphrase *
                    </label>
                  </div>
                </div>
              );

            case "RESTService Application":
              return (
                <div className="space-y-6">
                  {/* Service Endpoints/Operations */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getUserService || ""}
                        onChange={(e) => handleInputChange("step3", "getUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get User Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllUserService || ""}
                        onChange={(e) => handleInputChange("step3", "getAllUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All User Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getGroupService || ""}
                        onChange={(e) => handleInputChange("step3", "getGroupService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getGroupService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get Group Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllGroupsService || ""}
                        onChange={(e) => handleInputChange("step3", "getAllGroupsService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllGroupsService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All Groups Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.assignAccessToUserService || ""}
                        onChange={(e) => handleInputChange("step3", "assignAccessToUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.assignAccessToUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Assign Access To User Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeAccessFromUserService || ""}
                        onChange={(e) => handleInputChange("step3", "revokeAccessFromUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeAccessFromUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Access From User Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeAccessFromGroupService || ""}
                        onChange={(e) => handleInputChange("step3", "revokeAccessFromGroupService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeAccessFromGroupService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Access From Group Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteUserService || ""}
                        onChange={(e) => handleInputChange("step3", "deleteUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete User Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createUserService || ""}
                        onChange={(e) => handleInputChange("step3", "createUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create User Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateUserService || ""}
                        onChange={(e) => handleInputChange("step3", "updateUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update User Service *
                      </label>
                    </div>
                  </div>

                  {/* Authentication & Authorization */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authorizationType || ""}
                        onChange={(e) => handleInputChange("step3", "authorizationType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authorizationType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Authorization Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authorizationURL || ""}
                        onChange={(e) => handleInputChange("step3", "authorizationURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authorizationURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Authorization URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.grantType || ""}
                        onChange={(e) => handleInputChange("step3", "grantType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.grantType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Grant Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.scope || ""}
                        onChange={(e) => handleInputChange("step3", "scope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.scope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Scope *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authUserName || ""}
                        onChange={(e) => handleInputChange("step3", "authUserName", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authUserName
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Auth User Name *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.bearerToken || ""}
                        onChange={(e) => handleInputChange("step3", "bearerToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.bearerToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Bearer Token *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientId || ""}
                        onChange={(e) => handleInputChange("step3", "clientId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client ID *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.refreshToken || ""}
                        onChange={(e) => handleInputChange("step3", "refreshToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.refreshToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Refresh Token *
                      </label>
                    </div>
                  </div>

                  {/* Header & Payload Configuration */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.headerAttributes || ""}
                        onChange={(e) => handleInputChange("step3", "headerAttributes", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.headerAttributes
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Header Attributes *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "usersPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Payload Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupsPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "groupsPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupsPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Groups Payload Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createUserPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "createUserPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createUserPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create User Payload Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateUserPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "updateUserPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateUserPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update User Payload Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getUserPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "getUserPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getUserPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get User Payload Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getGroupPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "getGroupPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getGroupPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get Group Payload Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersGroupIdAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersGroupIdAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersGroupIdAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Group ID Attribute Path *
                      </label>
                    </div>
                  </div>

                  {/* Attribute & Mapping Paths */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersGroupIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersGroupIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersGroupIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Group IDAD Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersGroupDisplayAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersGroupDisplayAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersGroupDisplayAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Group Display Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandIdAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandIdAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandIdAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand ID Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand IDAD Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand IDAD Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandDisplayAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandDisplayAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandDisplayAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand Display Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersRoleIdAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersRoleIdAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersRoleIdAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Role ID Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersRoleIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersRoleIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersRoleIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Role IDAD Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersRoleDisplayAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersRoleDisplayAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersRoleDisplayAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Role Display Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupMembersAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "groupMembersAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupMembersAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Members Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupMembersIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "groupMembersIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupMembersIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Members IDAD Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userIdadAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "userIdadAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userIdadAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User IDAD Attribute *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupIdadAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "groupIdadAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupIdadAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group IDAD Attribute *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupDisplayNameAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "groupDisplayNameAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupDisplayNameAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Display Name Attribute *
                      </label>
                    </div>
                  </div>

                  {/* Total Results Configuration */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsHdPerUsersPath || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsHdPerUsersPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsHdPerUsersPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results HD Per Users Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsHdPerGroupsPath || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsHdPerGroupsPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsHdPerGroupsPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results HD Per Groups Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsAttributePerUsers || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsAttributePerUsers", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsAttributePerUsers
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results Attribute Per Users *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsAttributePerGroups || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsAttributePerGroups", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsAttributePerGroups
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results Attribute Per Groups *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Active Directory Collector":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.collector || ""}
                        onChange={(e) => handleInputChange("step3", "collector", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.collector
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Collector *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupScope || ""}
                        onChange={(e) => handleInputChange("step3", "groupScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Scope *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userScope || ""}
                        onChange={(e) => handleInputChange("step3", "userScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Scope *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultGroupOfNewAccount || ""}
                        onChange={(e) => handleInputChange("step3", "defaultGroupOfNewAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultGroupOfNewAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Group Of New Account *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account On Delete Request *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeMembershipOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "revokeMembershipOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeMembershipOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Membership On Delete Request *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.primaryIdentityAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "primaryIdentityAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.primaryIdentityAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Primary Identity Attribute *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Azure":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantURL || ""}
                        onChange={(e) => handleInputChange("step3", "tenantURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.operationalURL || ""}
                        onChange={(e) => handleInputChange("step3", "operationalURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.operationalURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Operational URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantID || ""}
                        onChange={(e) => handleInputChange("step3", "tenantID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientID || ""}
                        onChange={(e) => handleInputChange("step3", "clientID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client ID *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.trustedSource || ""}
                        onChange={(e) => handleInputChange("step3", "trustedSource", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.trustedSource
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Trusted Source *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Centrify":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantID || ""}
                        onChange={(e) => handleInputChange("step3", "tenantID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantURL || ""}
                        onChange={(e) => handleInputChange("step3", "tenantURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "ATG Web Commerce":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            default:
              return (
                <div className="space-y-6">
                  <p className="text-gray-500 text-center py-8">
                    Please select an application type in Step 1 to see integration settings
                  </p>
                </div>
              );
          }
        };

        const getFieldDescriptions = () => {
          switch (selectedAppType) {
            case "LDAP":
            case "Generic LDAP":
              return {
                hostname: "The hostname or IP address of the LDAP server",
                port: "The port number for LDAP connection (usually 389 or 636)",
                username: "Username for LDAP authentication",
                password: "Password for LDAP authentication",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "Active Directory":
              return {
                hostname: "The hostname or IP address of the Active Directory server",
                port: "The port number for Active Directory connection (e.g., 389, 636)",
                useSSL: "Whether to use SSL for the Active Directory connection",
                username: "Username for connecting to Active Directory",
                password: "Password for the Active Directory username",
                domain: "The domain name of the Active Directory",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "Active Directory Collector":
              return {
                collector: "The collector configuration for Active Directory",
                groupScope: "Scope for group collection in Active Directory",
                userScope: "Scope for user collection in Active Directory",
                defaultGroupOfNewAccount: "Default group assignment for new accounts",
                deleteAccountOnDeleteRequest: "Whether to delete account when delete request is made",
                revokeMembershipOnDeleteRequest: "Whether to revoke membership when delete request is made",
                primaryIdentityAttribute: "Primary attribute used for identity in Active Directory"
              };
            case "Database":
              return {
                databaseType: "Type of database (MySQL, PostgreSQL, Oracle, etc.)",
                connectionURL: "JDBC connection URL for the database",
                driver: "JDBC driver class name for database connection",
                username: "Database username for authentication",
                password: "Database password for authentication",
                viewGetAllUsers: "Database view or stored procedure to get all users",
                viewGetAllGroups: "Database view or stored procedure to get all groups",
                viewGetAllRoleContents: "Database view or stored procedure to get all role contents",
                viewGetUser: "Database view or stored procedure to get a specific user",
                viewGetGroup: "Database view or stored procedure to get a specific group",
                viewGetRoleContent: "Database view or stored procedure to get role content",
                uniqueIDSchemaMap: "Schema mapping for unique identifiers",
                spRevokeGroupMembership: "Stored procedure to revoke group membership",
                revokeGroupMembershipDefinition: "Definition for revoke group membership operation",
                revokeGroupMembershipResponseDefinition: "Response definition for revoke group membership",
                spAddGroupMembership: "Stored procedure to add group membership",
                addGroupMembershipDefinition: "Definition for add group membership operation",
                addGroupMembershipResponseDefinition: "Response definition for add group membership",
                groupSchemaMap: "Schema mapping for group attributes",
                roleContentSchemaMap: "Schema mapping for role content attributes",
                spCreateAccount: "Stored procedure to create account",
                createAccountDefinition: "Definition for create account operation",
                createAccountResponseDefinition: "Response definition for create account",
                spUpdateAccount: "Stored procedure to update account",
                updateAccountDefinition: "Definition for update account operation",
                updateAccountResponseDefinition: "Response definition for update account",
                spDeleteAccount: "Stored procedure to delete account",
                deleteAccountDefinition: "Definition for delete account operation",
                deleteAccountResponseDefinition: "Response definition for delete account",
                spEnableAccount: "Stored procedure to enable account",
                enableAccountDefinition: "Definition for enable account operation",
                enableAccountResponseDefinition: "Response definition for enable account",
                spDisableAccount: "Stored procedure to disable account",
                disableAccountDefinition: "Definition for disable account operation",
                disableAccountResponseDefinition: "Response definition for disable account"
              };
            case "Database Collector":
              return {
                driver: "JDBC driver class name for database connection",
                collector: "Database collector configuration for data collection"
              };
            case "Database User Management":
              return {
                driver: "JDBC driver class name for database connection",
                jdbcUrl: "JDBC connection URL for the database",
                username: "Database username for authentication",
                password: "Database password for authentication"
              };
            case "Disconnected Application":
              return {
                applicationName: "Name of the disconnected application",
                owner: "Owner of the disconnected application",
                manuallyFulfill: "Whether to manually fulfill requests for this application",
                isIntegratedWithOIM: "Whether the application is integrated with OIM",
                raiseTicket: "Whether to raise tickets for this application",
                ticketingSystem: "Name of the ticketing system to use",
                ticketingAppId: "Application ID in the ticketing system",
                ticketingAPIToken: "API token for ticketing system authentication",
                assignTo: "Default assignee for tickets",
                oimAPIToken: "API token for OIM system authentication"
              };
            case "E2EMigration Client":
              return {
                validFrom: "Start date/time for validity period",
                validUpto: "End date/time for validity period",
                validityToken: "Token for validating end-to-end migration client"
              };
            case "Epic":
              return {
                driver: "JDBC driver class name for Epic database connection",
                jdbcUrl: "JDBC connection URL for Epic database",
                username: "Database username for Epic authentication",
                password: "Database password for Epic authentication"
              };
            case "Flatfile":
              return {
                uploadedFileName: "Name of the uploaded flat file",
                fieldDelimiter: "Character used to separate fields (e.g. comma)",
                multivalueDelimiter: "Character used to separate multiple values within a field (e.g. #)",
                uidAttribute: "Required attribute that uniquely identifies each user (e.g. UserID)",
                statusField: "Attribute that indicates user or account status",
                dateFormat: "Format string for date fields in the file (e.g. yyyy-MM-dd)",
                multivaluedField: "Attributes that can contain multiple values (e.g. roles, groups)",
                fieldOrder: "Order of fields from the file; drag and drop to reorder",
                flatfileFieldName: "Name of the multivalued field being configured",
                entitlementType: "Type of entitlement: Groups, Roles, or Entitlement"
              };
            case "LDAP":
              return {
                hostname: "The hostname or IP address of the LDAP server",
                port: "The port number for LDAP connection (usually 389 or 636)",
                serviceId: "Service ID for LDAP authentication",
                password: "Password for LDAP authentication",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "Generic LDAP":
              return {
                hostname: "The hostname or IP address of the LDAP server",
                port: "The port number for LDAP connection (usually 389 or 636)",
                username: "Username for LDAP authentication",
                password: "Password for LDAP authentication",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "AWS":
              return {
                accessID: "AWS Access Key ID for authentication",
                accessSecret: "AWS Secret Access Key for authentication"
              };
            case "Logical Application":
              return {
                applicationId: "Application ID for the logical application"
              };
            case "LogicalApp Active Directory":
              return {
                hostname: "The hostname or IP address of the Active Directory server",
                port: "The port number for Active Directory connection (e.g., 389, 636)",
                useSSL: "Whether to use SSL for the Active Directory connection",
                username: "Username for connecting to Active Directory",
                password: "Password for the Active Directory username",
                domain: "The domain name of the Active Directory",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory",
                groupScope: "Scope for group collection in Active Directory",
                userScope: "Scope for user collection in Active Directory",
                defaultGroupOfNewAccount: "Default group assignment for new accounts",
                deleteAccountOnDeleteRequest: "Whether to delete account when delete request is made",
                revokeMembershipOnDeleteRequest: "Whether to revoke membership when delete request is made",
                primaryIdentityAttribute: "Primary attribute used for identity in Active Directory"
              };
            case "OKTA":
              return {
                apiKey: "OKTA API key for authentication",
                hostURL: "OKTA organization URL"
              };
            case "OIMOUD Management":
              return {
                restServiceURL: "REST service URL for OIMOUD management",
                t3ServiceHostname: "T3 service hostname for OIMOUD connection",
                t3ServicePort: "T3 service port number for OIMOUD connection",
                t3ServiceAuthloginConfigFile: "T3 service authentication login configuration file path",
                username: "Username for OIMOUD authentication",
                password: "Password for OIMOUD authentication",
                tenantId: "Tenant ID for OIMOUD management",
                oudServiceAccountId: "OUD service account ID for authentication",
                oudServiceAccountPWD: "OUD service account password for authentication"
              };
            case "Oracle E-Business":
              return {
                driver: "JDBC driver class name for Oracle E-Business database connection",
                username: "Database username for Oracle E-Business authentication",
                jdbcUrl: "JDBC connection URL for Oracle E-Business database",
                password: "Database password for Oracle E-Business authentication"
              };
            case "Oracle IDCS":
              return {
                clientId: "Oracle IDCS client ID for application authentication",
                clientSecret: "Oracle IDCS client secret for secure authentication",
                endpointURL: "Oracle IDCS endpoint URL for API access",
                username: "Username for Oracle IDCS authentication",
                password: "Password for Oracle IDCS authentication",
                enableAutoRetry: "Enable automatic retry for failed operations",
                autoRetryInterval: "Interval in seconds between automatic retry attempts",
                maximumAutoRetry: "Maximum number of automatic retry attempts"
              };
            case "Oracle Identity Manager":
              return {
                applicationServerType: "Type of application server for Oracle Identity Manager",
                namingProviderUrl: "Naming provider URL for Oracle Identity Manager connection",
                authLoginConfigPath: "Authentication login configuration file path",
                username: "Username for Oracle Identity Manager authentication",
                password: "Password for Oracle Identity Manager authentication",
                dbSchema: "Database schema for Oracle Identity Manager"
              };
            case "OracleFusionApps":
              return {
                endpoint: "Oracle Fusion Applications endpoint URL for API access",
                username: "Username for Oracle Fusion Applications authentication",
                password: "Password for Oracle Fusion Applications authentication"
              };
            case "PeopleSoft":
              return {
                driver: "JDBC driver class name for PeopleSoft database connection",
                jdbcUrl: "JDBC connection URL for PeopleSoft database",
                username: "Database username for PeopleSoft authentication",
                password: "Database password for PeopleSoft authentication"
              };
            case "PeopleSoftHR":
              return {
                driver: "JDBC driver class name for PeopleSoft HR database connection",
                jdbcUrl: "JDBC connection URL for PeopleSoft HR database",
                username: "Database username for PeopleSoft HR authentication",
                password: "Database password for PeopleSoft HR authentication"
              };
            case "PeopleSoftUM":
              return {
                serviceURL: "PeopleSoft User Management service URL for API access",
                host: "Host server for PeopleSoft User Management connection",
                senderNode: "Sender node identifier for PeopleSoft communication",
                receiverNode: "Receiver node identifier for PeopleSoft communication",
                createUserOperationMethod: "Method name for creating users in PeopleSoft",
                updateUserOperationMethod: "Method name for updating users in PeopleSoft",
                deleteUserOperationMethod: "Method name for deleting users in PeopleSoft",
                getUserOperationMethod: "Method name for retrieving single user from PeopleSoft",
                getAllUsersOperationMethod: "Method name for retrieving all users from PeopleSoft",
                createGroupOperationMethod: "Method name for creating groups in PeopleSoft",
                deleteGroupOperationMethod: "Method name for deleting groups in PeopleSoft",
                getGroupOperationMethod: "Method name for retrieving single group from PeopleSoft",
                getAllGroupsOperationMethod: "Method name for retrieving all groups from PeopleSoft",
                defaultRole: "Default role assigned to new users in PeopleSoft",
                defaultPrimaryPermission: "Default primary permission for new users in PeopleSoft",
                defaultNavigatorPermission: "Default navigator permission for new users in PeopleSoft",
                defaultRowSecurityPermission: "Default row security permission for new users in PeopleSoft",
                defaultProcessProfilePermission: "Default process profile permission for new users in PeopleSoft"
              };
            case "Provisioning Agent":
              return {
                applicationId: "Unique identifier for the provisioning agent application",
                applicationHooks: "Configuration hooks for the provisioning agent application",
                isEnabled: "Enable or disable status for the provisioning agent",
                enableAutoRetry: "Enable automatic retry functionality for failed operations",
                autoRetryInterval: "Time interval between automatic retry attempts",
                maximumAutoRetry: "Maximum number of automatic retry attempts allowed"
              };
            case "RSA":
              return {
                adminId: "RSA administrator ID for authentication",
                adminPassword: "RSA administrator password for authentication"
              };
            case "SAP":
              return {
                driver: "JDBC driver class name for SAP database connection",
                jdbcUrl: "JDBC connection URL for SAP database",
                username: "Database username for SAP authentication",
                password: "Database password for SAP authentication"
              };
            case "SailPointIIQApplications":
              return {
                hostname: "SailPoint IIQ server hostname for connection",
                port: "SailPoint IIQ server port number",
                baseUri: "Base URI for SailPoint IIQ API endpoints",
                username: "Username for SailPoint IIQ authentication",
                password: "Password for SailPoint IIQ authentication"
              };
            case "SailPointIdentityIQ":
              return {
                hostname: "SailPoint Identity IIQ server hostname for connection",
                port: "SailPoint Identity IIQ server port number",
                baseUri: "Base URI for SailPoint Identity IIQ API endpoints",
                username: "Username for SailPoint Identity IIQ authentication",
                password: "Password for SailPoint Identity IIQ authentication"
              };
            case "SalesForce":
              return {
                clientId: "Salesforce OAuth client ID for authentication",
                clientSecret: "Salesforce OAuth client secret for authentication",
                endpoint: "Salesforce API endpoint URL",
                username: "Salesforce username for authentication",
                password: "Salesforce password for authentication",
                securityToken: "Salesforce security token for API access"
              };
            case "Service Now Ticketing":
              return {
                tenantUrl: "ServiceNow tenant URL for ticketing system connection",
                baseUri: "ServiceNow base URI for API endpoints",
                username: "ServiceNow username for authentication",
                password: "ServiceNow password for authentication"
              };
            case "Unix":
              return {
                connectionType: "Type of connection to use (SSH, Telnet, Rlogin)",
                host: "Unix hostname or IP address for connection",
                port: "Port number for Unix connection",
                username: "Unix username for authentication",
                password: "Unix password for authentication",
                passphrase: "Passphrase for SSH key authentication"
              };
            case "RESTService Application":
              return {
                getUserService: "REST service endpoint for retrieving a single user",
                getAllUserService: "REST service endpoint for retrieving all users",
                getGroupService: "REST service endpoint for retrieving a single group",
                getAllGroupsService: "REST service endpoint for retrieving all groups",
                assignAccessToUserService: "REST service endpoint for assigning access to a user",
                revokeAccessFromUserService: "REST service endpoint for revoking access from a user",
                revokeAccessFromGroupService: "REST service endpoint for revoking access from a group",
                deleteUserService: "REST service endpoint for deleting a user",
                createUserService: "REST service endpoint for creating a user",
                updateUserService: "REST service endpoint for updating a user",
                authorizationType: "Type of authorization used for REST service authentication",
                authorizationURL: "URL for authorization endpoint",
                grantType: "OAuth grant type for authentication",
                scope: "OAuth scope for API access permissions",
                authUserName: "Username for REST service authentication",
                password: "Password for REST service authentication",
                bearerToken: "Bearer token for API authentication",
                clientId: "OAuth client ID for authentication",
                clientSecret: "OAuth client secret for authentication",
                refreshToken: "OAuth refresh token for token renewal",
                headerAttributes: "Custom header attributes for REST requests",
                usersPayloadPath: "JSON path to users data in API response",
                groupsPayloadPath: "JSON path to groups data in API response",
                createUserPayloadPath: "JSON path for user creation payload",
                updateUserPayloadPath: "JSON path for user update payload",
                getUserPayloadPath: "JSON path for user retrieval payload",
                getGroupPayloadPath: "JSON path for group retrieval payload",
                usersGroupIdAttributePath: "JSON path to group ID attribute in user data",
                usersGroupIdadAttributePath: "JSON path to group IDAD attribute in user data",
                usersGroupDisplayAttributePath: "JSON path to group display attribute in user data",
                usersOnDemandIdAttributePath: "JSON path to OnDemand ID attribute in user data",
                usersOnDemandIdadAttributePath: "JSON path to OnDemand IDAD attribute in user data",
                usersOnDemandDisplayAttributePath: "JSON path to OnDemand display attribute in user data",
                usersRoleIdAttributePath: "JSON path to role ID attribute in user data",
                usersRoleIdadAttributePath: "JSON path to role IDAD attribute in user data",
                usersRoleDisplayAttributePath: "JSON path to role display attribute in user data",
                groupMembersAttributePath: "JSON path to group members attribute",
                groupMembersIdadAttributePath: "JSON path to group members IDAD attribute",
                userIdadAttribute: "User IDAD attribute identifier",
                groupIdadAttribute: "Group IDAD attribute identifier",
                groupDisplayNameAttribute: "Group display name attribute",
                totalResultsHdPerUsersPath: "JSON path to total results header for users",
                totalResultsHdPerGroupsPath: "JSON path to total results header for groups",
                totalResultsAttributePerUsers: "Total results attribute for users pagination",
                totalResultsAttributePerGroups: "Total results attribute for groups pagination"
              };
            case "Azure":
              return {
                tenantURL: "Azure tenant URL for authentication",
                operationalURL: "Azure operational URL for operations",
                tenantID: "Azure tenant ID for identification",
                clientID: "Azure client ID for application authentication",
                clientSecret: "Azure client secret for secure authentication",
                trustedSource: "Trusted source configuration for Azure integration"
              };
            case "Centrify":
              return {
                tenantID: "Centrify tenant ID for identification",
                tenantURL: "Centrify tenant URL for authentication",
                username: "Username for Centrify authentication",
                password: "Password for Centrify authentication"
              };
            case "ATG Web Commerce":
              return {
                driver: "JDBC driver class name for database connection",
                jdbcUrl: "JDBC connection URL for ATG database",
                username: "Database username for ATG authentication",
                password: "Database password for ATG authentication"
              };
            default:
              return {};
          }
        };

        const fieldDescriptions = getFieldDescriptions();
        const previewList: Record<string, unknown>[] = selectedAppType === "Flatfile" && Array.isArray((flatfileMetadataUsers as any)?.preview) ? (flatfileMetadataUsers as any).preview : [];
        const previewColumns = previewList.length > 0 && typeof previewList[0] === "object" && previewList[0] !== null ? Object.keys(previewList[0]) : [];
        const totalPreviewPages = Math.max(1, Math.ceil(previewList.length / FLATFILE_PREVIEW_PAGE_SIZE));
        const previewStartIdx = (flatfilePreviewPage - 1) * FLATFILE_PREVIEW_PAGE_SIZE;
        const previewPageRows = previewList.slice(previewStartIdx, previewStartIdx + FLATFILE_PREVIEW_PAGE_SIZE);
        const formatPreviewHeader = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

        return (
          <div className="space-y-6 w-full">
            <div className="flex flex-wrap gap-6 items-start w-full min-w-0 overflow-x-auto">
              <div className="flex-1 space-y-6 min-w-0">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedAppType === "Flatfile"
                      ? "File Upload"
                      : `Integration Settings for: ${isCompleteIntegration && formData.step2.applicationName
                        ? `${formData.step2.applicationName} (${selectedAppType || "—"})`
                        : selectedAppType || "No Application Selected"}`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedAppType === "Flatfile"
                      ? "Upload your flat file and set field and multivalue delimiters."
                      : isCompleteIntegration
                        ? "Configure the integration settings for this application."
                        : "Configure the integration settings for your selected application type."}
                  </p>
                </div>
                {renderIntegrationFields()}
              </div>
              
              <div className="w-96 shrink-0 max-w-full bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  {Object.entries(fieldDescriptions).map(([field, description]) => (
                    <div key={field} className="border-b border-gray-200 pb-3 last:border-b-0">
                      <h5 className="text-sm font-medium text-gray-700 capitalize mb-1">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </h5>
                      <p className="text-xs text-gray-600">{description}</p>
                    </div>
                  ))}
                  {Object.keys(fieldDescriptions).length === 0 && (
                    <p className="text-sm text-gray-500">
                      Select an application type to see field descriptions.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Preview table - full width below the two columns (Flatfile only), collapsible */}
            {selectedAppType === "Flatfile" && previewList.length > 0 && (
              <div className="border border-gray-300 rounded-lg bg-white overflow-hidden w-full">
                <button
                  type="button"
                  onClick={() => setFlatfilePreviewCollapsed((c) => !c)}
                  className="flex items-center gap-2 px-4 py-3 w-full text-left border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                  aria-expanded={!flatfilePreviewCollapsed}
                >
                  <ChevronDown className={`w-5 h-5 text-blue-600 shrink-0 transition-transform ${flatfilePreviewCollapsed ? "" : "rotate-180"}`} aria-hidden />
                  <span className="text-blue-600 font-medium">Preview</span>
                </button>
                {!flatfilePreviewCollapsed && (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed border-collapse">
                    <colgroup>
                      {previewColumns.map((col) => {
                        const isEmail = col === "Email";
                        const isRootPlan = col === "RootPlan";
                        const width = isEmail ? "14%" : isRootPlan ? "18%" : undefined;
                        return <col key={col} style={width ? { width } : undefined} />;
                      })}
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        {previewColumns.map((col) => (
                          <th key={col} className="px-2 py-2.5 font-semibold text-gray-700 align-top whitespace-normal break-words">
                            {formatPreviewHeader(col)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewPageRows.map((row, rowIdx) => (
                        <tr key={previewStartIdx + rowIdx} className="bg-white hover:bg-gray-50">
                          {previewColumns.map((col) => (
                            <td key={col} className="px-2 py-2 text-gray-900 whitespace-normal break-words align-top leading-snug">
                              {String((row as Record<string, unknown>)[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-end gap-1 px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setFlatfilePreviewPage((p) => Math.max(1, p - 1))}
                    disabled={flatfilePreviewPage <= 1}
                    className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPreviewPages }, (_, i) => i + 1)
                    .slice(0, 10)
                    .map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setFlatfilePreviewPage(pageNum)}
                        className={`min-w-[2rem] py-1.5 px-2 rounded text-sm font-medium ${
                          flatfilePreviewPage === pageNum ? "bg-blue-600 text-white" : "hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setFlatfilePreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                    disabled={flatfilePreviewPage >= totalPreviewPages}
                    className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                </>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        // For Disconnected Application (create + edit), step 4 is File Upload + preview (like Flatfile)
        if (formData.step1.type === "Disconnected Application") {
          const disconnectedPreviewList: Record<string, unknown>[] =
            disconnectedMetadataUsers && Array.isArray((disconnectedMetadataUsers as any).preview)
              ? (disconnectedMetadataUsers as any).preview
              : Array.isArray(disconnectedMetadataUsers)
                ? (disconnectedMetadataUsers as any)
                : [];
          const disconnectedPreviewColumns =
            disconnectedPreviewList.length > 0 && typeof disconnectedPreviewList[0] === "object"
              ? Object.keys(disconnectedPreviewList[0] as Record<string, unknown>)
              : [];
          const disconnectedTotalPreviewPages = Math.max(
            1,
            Math.ceil(disconnectedPreviewList.length / FLATFILE_PREVIEW_PAGE_SIZE)
          );
          const disconnectedPreviewStartIdx =
            (flatfilePreviewPage - 1) * FLATFILE_PREVIEW_PAGE_SIZE;
          const disconnectedPreviewPageRows = disconnectedPreviewList.slice(
            disconnectedPreviewStartIdx,
            disconnectedPreviewStartIdx + FLATFILE_PREVIEW_PAGE_SIZE
          );

          return (
            <div className="space-y-6">
              {!isCompleteIntegration && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
                    File Upload
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload any reference or supporting file for this disconnected application.
                  </p>
                </>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setDisconnectedFile(file);
                  }}
                  className="flex-1 text-sm text-gray-700 file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  type="button"
                  disabled={disconnectedUploadLoading || !disconnectedFile}
                  onClick={async () => {
                    const file = disconnectedFile;
                    if (!file) return;
                    const appName =
                      formData.step2.applicationName?.trim() ||
                      formData.step1.applicationName?.trim() ||
                      "";
                    if (!appName) {
                      alert("Please enter Application Name before uploading.");
                      return;
                    }
                    setDisconnectedUploadLoading(true);
                    try {
                      const basicDefinition = {
                        tenantId: "ACMECOM",
                        applicationName: appName,
                        fieldDelimiter: formData.step3.fieldDelimiter ?? ",",
                        multivalueDelimiter: formData.step3.multivalueDelimiter ?? "#",
                      };
                      const data = await uploadAndGetSchemaUsers(file, basicDefinition);
                      setDisconnectedMetadataUsers(data);
                      console.debug("uploadandgetschema/users response:", data);
                    } catch (err) {
                      console.error("uploadandgetschema/users failed:", err);
                      alert(
                        err instanceof Error
                          ? err.message
                          : "Failed to upload file and fetch schema. Please try again."
                      );
                    } finally {
                      setDisconnectedUploadLoading(false);
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    disconnectedUploadLoading || !disconnectedFile
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {disconnectedUploadLoading ? "Uploading…" : "Upload"}
                </button>
              </div>

              {/* File name + delimiters, show File Name after file selection, delimiters always editable */}
              {disconnectedFile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={disconnectedFile?.name || ""}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md bg-gray-50 no-underline"
                      placeholder=" "
                    />
                    <label
                      className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none"
                    >
                      File Name
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.fieldDelimiter ?? ","}
                      onChange={(e) =>
                        handleInputChange("step3", "fieldDelimiter", e.target.value)
                      }
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label
                      className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none"
                    >
                      Field Delimiter
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.multivalueDelimiter ?? "#"}
                      onChange={(e) =>
                        handleInputChange("step3", "multivalueDelimiter", e.target.value)
                      }
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">
                      Multivalue Delimiter
                    </label>
                  </div>
                </div>
              )}

              {/* Fields / Uid / Status / Date Format / Multivalued Field (drag & drop from Fields) */}
              {disconnectedPreviewColumns.length > 0 && (
                <div className="border border-gray-300 rounded-lg bg-white p-5 shadow-sm space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fields
                    </label>
                    <div className="flex flex-wrap gap-2 border border-gray-200 rounded-md p-3 bg-gray-50/50">
                      {disconnectedPreviewColumns.map((fieldName) => (
                        <div
                          key={fieldName}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "copy";
                            e.dataTransfer.setData("text/plain", fieldName);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing text-sm text-gray-900"
                        >
                          <span>{fieldName}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative rounded-md border-2 border-dashed border-transparent transition-colors hover:border-gray-200">
                      <input
                        type="text"
                        value={formData.step3.uidAttribute ?? ""}
                        readOnly
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fieldName =
                            (e.dataTransfer.getData("text/plain") ||
                              e.dataTransfer.getData("text") ||
                              "").trim();
                          if (fieldName) {
                            handleInputChange("step3", "uidAttribute", fieldName);
                          }
                        }}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline bg-gray-50"
                        placeholder=" "
                      />
                      {formData.step3.uidAttribute && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                          onClick={() => handleInputChange("step3", "uidAttribute", "")}
                          aria-label="Clear Uid Attribute"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <label
                        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          formData.step3.uidAttribute
                            ? "top-0.5 text-xs text-blue-600"
                            : "top-3.5 text-sm text-gray-500"
                        }`}
                      >
                        Uid Attribute *
                      </label>
                    </div>
                    <div className="relative rounded-md border-2 border-dashed border-transparent transition-colors hover:border-gray-200">
                      <input
                        type="text"
                        value={formData.step3.statusField ?? ""}
                        readOnly
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fieldName =
                            (e.dataTransfer.getData("text/plain") ||
                              e.dataTransfer.getData("text") ||
                              "").trim();
                          if (fieldName) {
                            handleInputChange("step3", "statusField", fieldName);
                          }
                        }}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline bg-gray-50"
                        placeholder=" "
                      />
                      {formData.step3.statusField && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                          onClick={() => handleInputChange("step3", "statusField", "")}
                          aria-label="Clear Status Field"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <label
                        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          formData.step3.statusField
                            ? "top-0.5 text-xs text-blue-600"
                            : "top-3.5 text-sm text-gray-500"
                        }`}
                      >
                        Status Field
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.step3.dateFormat ?? ""}
                        onChange={(e) =>
                          handleInputChange("step3", "dateFormat", e.target.value)
                        }
                        onDragOver={(e) => {
                          // Do not allow drag-and-drop into Date Format
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "none";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label
                        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          formData.step3.dateFormat
                            ? "top-0.5 text-xs text-blue-600"
                            : "top-3.5 text-sm text-gray-500"
                        }`}
                      >
                        Date Format
                      </label>
                    </div>
                    <div
                      className="relative rounded-md border-2 border-dashed border-transparent transition-colors hover:border-gray-200"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fieldName =
                          (e.dataTransfer.getData("text/plain") ||
                            e.dataTransfer.getData("text") ||
                            "").trim();
                        if (!fieldName) return;
                        const current = Array.isArray(formData.step3.multivaluedField)
                          ? (formData.step3.multivaluedField as string[])
                          : formData.step3.multivaluedField
                          ? [String(formData.step3.multivaluedField)]
                          : [];
                        if (!current.includes(fieldName)) {
                          handleInputChange("step3", "multivaluedField", [
                            ...current,
                            fieldName,
                          ]);
                        }
                      }}
                    >
                      <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">
                        Multivalued Field
                      </label>
                      <div className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md bg-gray-50 min-h-[40px] flex flex-wrap items-center gap-2">
                        {Array.isArray(formData.step3.multivaluedField) &&
                          (formData.step3.multivaluedField as string[]).length > 0 &&
                          (formData.step3.multivaluedField as string[]).map((val) => (
                            <span
                              key={val}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200"
                            >
                              <span>{val}</span>
                              <button
                                type="button"
                                className="text-blue-400 hover:text-blue-700"
                                onClick={() => {
                                  const current =
                                    formData.step3.multivaluedField as string[];
                                  const updated = current.filter((v) => v !== val);
                                  const currentTypes =
                                    (formData.step3
                                      .multivaluedFieldEntitlementType as Record<
                                      string,
                                      string
                                    >) || {};
                                  const { [val]: _removed, ...restTypes } = currentTypes;
                                  handleInputChange("step3", "multivaluedField", updated);
                                  handleInputChange(
                                    "step3",
                                    "multivaluedFieldEntitlementType",
                                    restTypes
                                  );
                                }}
                                aria-label={`Remove ${val}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        {!Array.isArray(formData.step3.multivaluedField) &&
                          formData.step3.multivaluedField && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">
                              <span>{String(formData.step3.multivaluedField)}</span>
                              <button
                                type="button"
                                className="text-blue-400 hover:text-blue-700"
                                onClick={() => {
                                  const key = String(formData.step3.multivaluedField);
                                  const currentTypes =
                                    (formData.step3
                                      .multivaluedFieldEntitlementType as Record<
                                      string,
                                      string
                                    >) || {};
                                  const { [key]: _removed, ...restTypes } = currentTypes;
                                  handleInputChange("step3", "multivaluedField", []);
                                  handleInputChange(
                                    "step3",
                                    "multivaluedFieldEntitlementType",
                                    restTypes
                                  );
                                }}
                                aria-label="Remove value"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                        {!formData.step3.multivaluedField && (
                          <span className="text-xs text-gray-400">
                            Drag fields here to add
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Entitlement type dropdowns shown below all 4 fields */}
                  {formData.step3.multivaluedField && (
                    <div className="mt-5 space-y-3">
                      <div className="text-sm font-medium text-gray-700">
                        Entitlement Type (for each multivalued field)
                      </div>
                            <div className="space-y-2">
                        {(
                          Array.isArray(formData.step3.multivaluedField)
                            ? (formData.step3.multivaluedField as string[])
                            : [String(formData.step3.multivaluedField)]
                        ).map((val) => {
                          const allTypes = ["Groups", "Roles", "Entitlement"];
                          const currentTypes =
                            (formData.step3
                              .multivaluedFieldEntitlementType as Record<string, string>) ||
                            {};
                          const currentValue = currentTypes[val] || "";
                          const selectedForOthers = new Set(
                            Object.entries(currentTypes)
                              .filter(([key]) => key !== val)
                              .map(([, v]) => v)
                          );
                          const availableOptions = allTypes.filter(
                            (t) => !selectedForOthers.has(t) || t === currentValue
                          );
                          return (
                            <div
                              key={val}
                              className="grid grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)] items-center gap-3 text-sm"
                            >
                              <span className="truncate text-gray-800">
                                {val}
                              </span>
                              <select
                                className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full"
                                value={currentValue}
                                onChange={(e) => {
                                  const updatedTypes = {
                                    ...currentTypes,
                                    [val]: e.target.value,
                                  };
                                  handleInputChange(
                                    "step3",
                                    "multivaluedFieldEntitlementType",
                                    updatedTypes
                                  );
                                }}
                              >
                                <option value="">Select Entitlement Type</option>
                                {availableOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Save button before Preview (calls savebasemetadata/users; enabled only when Uid Attribute + Entitlement Type are set as required) */}
                  <div className="flex justify-end">
                    {(() => {
                      const mv = formData.step3.multivaluedField;
                      const mvList = Array.isArray(mv)
                        ? (mv as string[])
                        : mv
                        ? [String(mv)]
                        : [];
                      const types =
                        (formData.step3
                          .multivaluedFieldEntitlementType as Record<string, string>) ||
                        {};
                      const hasAllEntitlementTypes =
                        mvList.length === 0 ||
                        mvList.every((name) => !!types[name]);
                      const canSave =
                        !!formData.step3.uidAttribute &&
                        hasAllEntitlementTypes &&
                        !!disconnectedFile;
                      return (
                    <button
                      type="button"
                          disabled={!canSave}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => {
                            if (!canSave) return;
                            if (!disconnectedFile) return;
                            (async () => {
                              try {
                                const appName =
                                  formData.step2.applicationName?.trim() ||
                                  formData.step1.applicationName?.trim() ||
                                  "";
                                const mvField = formData.step3
                                  .multivaluedField;
                                const mvList = Array.isArray(mvField)
                                  ? (mvField as string[])
                                  : mvField
                                  ? [String(mvField)]
                                  : [];
                                const types =
                                  (formData.step3
                                    .multivaluedFieldEntitlementType as Record<
                                    string,
                                    string
                                  >) || {};
                                const parentFieldDefinition = {
                                  fieldNames: disconnectedPreviewColumns.join(
                                    ","
                                  ),
                                  fields: disconnectedPreviewColumns,
                                  uidAttribute:
                                    formData.step3.uidAttribute ?? "",
                                  statusField:
                                    formData.step3.statusField ?? "",
                                  dateFormat:
                                    formData.step3.dateFormat ?? "",
                                  multivaluedField: mvList,
                                };
                                const multivaluedFieldDefinition = mvList.map(
                                  (fieldName) => ({
                                    fieldName,
                                    uidAttribute: fieldName,
                                    entitlementName: "",
                                    entitlementType: types[fieldName] || "",
                                    entitlement: false,
                                  })
                                );
                                const payload = {
                                  tenantId: "ACMECOM",
                                  appId: "BASEREPO",
                                  applicationName: appName,
                                  appType: "users",
                                  fileName: disconnectedFile.name,
                                  parentFieldDefinition,
                                  multivaluedFieldDefinition,
                                  preview: disconnectedPreviewList,
                                  fieldDelimiter:
                                    formData.step3.fieldDelimiter ?? ",",
                                  multivalueDelimiter:
                                    formData.step3.multivalueDelimiter ?? "#",
                                };
                                const resp = await saveBaseMetadataUsers(
                                  payload
                                );
                                console.debug(
                                  "savebasemetadata/users success",
                                  resp
                                );
                                setDisconnectedMetadataSaved(true);
                              } catch (err) {
                                console.error(
                                  "savebasemetadata/users failed",
                                  err
                                );
                                alert(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to save base metadata. Please try again."
                                );
                              }
                            })();
                      }}
                    >
                      Save
                    </button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {disconnectedPreviewList.length > 0 && (
                <div className="border border-gray-300 rounded-lg bg-white overflow-hidden w-full">
                  <button
                    type="button"
                    onClick={() => setFlatfilePreviewCollapsed((c) => !c)}
                    className="flex items-center gap-2 px-4 py-3 w-full text-left border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                    aria-expanded={!flatfilePreviewCollapsed}
                  >
                    <ChevronDown
                      className={`w-5 h-5 text-blue-600 shrink-0 transition-transform ${
                        flatfilePreviewCollapsed ? "" : "rotate-180"
                      }`}
                      aria-hidden
                    />
                    <span className="text-blue-600 font-medium">Preview</span>
                  </button>
                  {!flatfilePreviewCollapsed && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs table-fixed border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                              {disconnectedPreviewColumns.map((col) => (
                                <th
                                  key={col}
                                  className="px-2 py-2.5 font-semibold text-gray-700 align-top whitespace-normal break-words"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {disconnectedPreviewPageRows.map((row, rowIdx) => (
                              <tr
                                key={disconnectedPreviewStartIdx + rowIdx}
                                className="bg-white hover:bg-gray-50"
                              >
                                {disconnectedPreviewColumns.map((col) => (
                                  <td
                                    key={col}
                                    className="px-2 py-2 text-gray-900 whitespace-normal break-words align-top leading-snug"
                                  >
                                    {String((row as Record<string, unknown>)[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-end gap-1 px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <button
                          type="button"
                          onClick={() =>
                            setFlatfilePreviewPage((p) => Math.max(1, p - 1))
                          }
                          disabled={flatfilePreviewPage <= 1}
                          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from(
                          { length: disconnectedTotalPreviewPages },
                          (_, i) => i + 1
                        )
                          .slice(0, 10)
                          .map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setFlatfilePreviewPage(pageNum)}
                              className={`min-w-[2rem] py-1.5 px-2 rounded text-sm font-medium ${
                                flatfilePreviewPage === pageNum
                                  ? "bg-blue-600 text-white"
                                  : "hover:bg-gray-200 text-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        <button
                          type="button"
                          onClick={() =>
                            setFlatfilePreviewPage((p) =>
                              Math.min(disconnectedTotalPreviewPages, p + 1)
                            )
                          }
                          disabled={flatfilePreviewPage >= disconnectedTotalPreviewPages}
                          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Per-field accordion for each Multivalued Field shown below Preview (only after base metadata save) */}
              {disconnectedMetadataSaved &&
                Array.isArray(formData.step3.multivaluedField) &&
                formData.step3.multivaluedField.length > 0 &&
                disconnectedPreviewList.length > 0 && (
                  <div className="mt-6 border border-gray-200 rounded-lg bg-white">
                    <div className="border-b border-gray-200 px-4 pt-3 pb-2">
                      <div className="text-sm font-medium text-gray-800">
                        Field Name
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {(formData.step3.multivaluedField as string[]).map(
                        (fieldName) => {
                          const step3 = formData.step3 as Record<string, any>;
                          const isExpanded =
                            disconnectedPerFieldExpanded[fieldName] ?? false;
                          const toggleExpanded = () =>
                            setDisconnectedPerFieldExpanded((prev) => ({
                              ...prev,
                              [fieldName]: !prev[fieldName],
                            }));

                          // For per‑multivalued field config, only show preview after a file is uploaded for that field
                          const fileName =
                            (step3[`mv_fileName_${fieldName}`] as string) || "";
                          const fieldDelimiterValue =
                            (step3[`mv_fieldDelimiter_${fieldName}`] as string) ??
                            (formData.step3.fieldDelimiter as string) ??
                            ",";
                          const multivalueDelimiterValue =
                            (step3[`mv_multivalueDelimiter_${fieldName}`] as string) ??
                            (formData.step3.multivalueDelimiter as string) ??
                            "#";
                          const selectedField =
                            (step3[`mv_field_${fieldName}`] as string) ||
                            fieldName;
                          const multivaluedList = Array.isArray(
                            formData.step3.multivaluedField
                          )
                            ? (formData.step3.multivaluedField as string[])
                            : [];
                          const primaryAttribute =
                            (step3.primaryAttribute as string) || "";

                          const fieldLabel =
                            fieldName
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (s) => s.toUpperCase())
                              .trim() + " Entity";

                          return (
                            <div key={fieldName} className="bg-white">
                              <button
                                type="button"
                                onClick={toggleExpanded}
                                className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? (
                                  <ChevronDown
                                    className="w-4 h-4 text-blue-600 shrink-0"
                                    aria-hidden
                                  />
                                ) : (
                                  <ChevronRight
                                    className="w-4 h-4 text-blue-600 shrink-0"
                                    aria-hidden
                                  />
                                )}
                                <span className="text-blue-600 font-medium">
                                  {fieldLabel}
                                </span>
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-200">
                                  {/* File Upload + config for this multivalued field */}
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <div className="text-xs font-medium text-gray-700">
                                        File Upload
                                      </div>
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <input
                                          type="file"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            handleInputChange(
                                              "step3",
                                              `mv_fileName_${fieldName}`,
                                              file ? file.name : ""
                                            );
                                            setDisconnectedPerFieldFile((prev) => ({
                                              ...prev,
                                              [fieldName]: file,
                                            }));
                                            if (!file) {
                                              setDisconnectedPerFieldPreview((prev) => ({
                                                ...prev,
                                                [fieldName]: [],
                                              }));
                                            }
                                          }}
                                          className="flex-1 text-sm text-gray-700 file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100 border border-gray-300 rounded-md px-3 py-2"
                                        />
                                        <button
                                          type="button"
                                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium whitespace-nowrap"
                                          onClick={async () => {
                                            const file = disconnectedPerFieldFile[fieldName];
                                            if (!file) {
                                              alert("Please choose a file for this field first.");
                                              return;
                                            }
                                            const appName =
                                              formData.step2.applicationName?.trim() ||
                                              formData.step1.applicationName?.trim() ||
                                              "";
                                            if (!appName) {
                                              alert(
                                                "Please enter Application Name before uploading."
                                              );
                                              return;
                                            }
                                            try {
                                              const basicDefinition = {
                                                tenantId: "ACMECOM",
                                                applicationName: appName,
                                                fieldDelimiter: fieldDelimiterValue,
                                                multivalueDelimiter: multivalueDelimiterValue,
                                              };
                                              const data = await uploadAndGetSchemaForField(
                                                fieldName,
                                                file,
                                                basicDefinition
                                              );
                                              const anyData = data as any;
                                              const preview =
                                                (anyData &&
                                                  Array.isArray(anyData.preview) &&
                                                  anyData.preview) ||
                                                (Array.isArray(anyData) ? anyData : []);
                                              setDisconnectedPerFieldPreview((prev) => ({
                                                ...prev,
                                                [fieldName]: preview,
                                              }));
                                              console.debug(
                                                "uploadandgetschema/field response",
                                                fieldName,
                                                data
                                              );
                                            } catch (err) {
                                              console.error(
                                                "uploadandgetschema/field failed",
                                                fieldName,
                                                err
                                              );
                                              alert(
                                                err instanceof Error
                                                  ? err.message
                                                  : "Failed to upload file and fetch multivalued field schema. Please try again."
                                              );
                                            }
                                          }}
                                        >
                                          Upload
                                        </button>
                                      </div>
                                      {fileName && (
                                        <div className="mt-1 text-xs text-gray-600">
                                          File Name:{" "}
                                          <span className="font-medium text-gray-800">
                                            {fileName}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {disconnectedPerFieldPreview[fieldName] &&
                                      (disconnectedPerFieldPreview[fieldName] as any[]).length >
                                        0 && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div className="relative">
                                          <input
                                            type="text"
                                            value={fieldDelimiterValue}
                                            onChange={(e) =>
                                              handleInputChange(
                                                "step3",
                                                `mv_fieldDelimiter_${fieldName}`,
                                                e.target.value
                                              )
                                            }
                                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                                            placeholder=" "
                                          />
                                          <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">
                                            Field Delimiter
                                          </label>
                                        </div>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            value={multivalueDelimiterValue}
                                            onChange={(e) =>
                                              handleInputChange(
                                                "step3",
                                                `mv_multivalueDelimiter_${fieldName}`,
                                                e.target.value
                                              )
                                            }
                                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                                            placeholder=" "
                                          />
                                          <label className="absolute left-4 top-0.5 text-xs text-blue-600 pointer-events-none">
                                            Multivalue Delimiter
                                          </label>
                                        </div>
                                        <div className="flex flex-col max-w-xs">
                                          <span className="text-xs text-gray-500 mb-1">
                                            Primary Attribute
                                          </span>
                                          <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
                                            value={primaryAttribute}
                                            onChange={(e) =>
                                              handleInputChange(
                                                "step3",
                                                "primaryAttribute",
                                                e.target.value
                                              )
                                            }
                                          >
                                            <option value="">Select</option>
                                            {multivaluedList.map((mv) => (
                                              <option key={mv} value={mv}>
                                                {mv}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Per-field preview for this multivalued attribute */}
                                  {fileName ? (
                                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                                      <table className="w-full text-left text-xs table-fixed border-collapse">
                                        <thead>
                                          <tr className="bg-gray-100 border-b border-gray-200">
                                            <th className="px-2 py-2.5 font-semibold text-gray-700 align-top whitespace-normal break-words">
                                              {fieldName}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          {(() => {
                                            const fromPerField =
                                              (disconnectedPerFieldPreview[fieldName] as any[]) ||
                                              [];
                                            const rows =
                                              fromPerField.length > 0
                                                ? fromPerField
                                                : disconnectedPreviewList.map((row) => ({
                                                    [fieldName]: (row as any)[fieldName],
                                                  }));
                                            return rows.map((row, rowIdx) => (
                                              <tr
                                                key={`mv-${rowIdx}`}
                                                className="bg-white hover:bg-gray-50"
                                              >
                                                <td className="px-2 py-2 text-gray-900 whitespace-normal break-words align-top leading-snug">
                                                  {String(
                                                    (row as Record<string, unknown>)[fieldName] ??
                                                      ""
                                                  )}
                                                </td>
                                              </tr>
                                            ));
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="border border-dashed border-gray-300 rounded-md px-4 py-6 text-xs text-gray-500 text-center">
                                      Upload a file for this field to see preview rows.
                                    </div>
                                  )}

                                  {fileName && (
                                    <div className="flex justify-end pt-3">
                                      <button
                                        type="button"
                                        disabled={
                                          !primaryAttribute ||
                                          (() => {
                                            const fromPerField =
                                              (disconnectedPerFieldPreview[fieldName] as any[]) ||
                                              [];
                                            const rows =
                                              fromPerField.length > 0
                                                ? fromPerField
                                                : disconnectedPreviewList.map((row) => ({
                                                    [fieldName]: (row as any)[fieldName],
                                                  }));
                                            return rows.length === 0;
                                          })()
                                        }
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                        onClick={async () => {
                                          const fromPerField =
                                            (disconnectedPerFieldPreview[fieldName] as any[]) || [];
                                          const previewForField =
                                            fromPerField.length > 0
                                              ? fromPerField
                                              : disconnectedPreviewList.map((row) => ({
                                                  [fieldName]: (row as any)[fieldName],
                                                }));
                                          if (!primaryAttribute || previewForField.length === 0) {
                                            return;
                                          }
                                          try {
                                            const appName =
                                              formData.step2.applicationName?.trim() ||
                                              formData.step1.applicationName?.trim() ||
                                              "";
                                            const payload = {
                                              tenantId: "ACMECOM",
                                              appId: "BASEREPO",
                                              applicationName: appName,
                                              appType: fieldName,
                                              fileName,
                                              parentFieldDefinition: {
                                                fieldNames: fieldName,
                                                fields: [fieldName],
                                                uidAttribute: primaryAttribute,
                                                statusField: null,
                                                dateFormat: null,
                                                multivaluedField: [],
                                              },
                                              multivaluedFieldDefinition: [],
                                              preview: previewForField,
                                              fieldDelimiter: fieldDelimiterValue,
                                              multivalueDelimiter: multivalueDelimiterValue,
                                            };
                                            const resp = await saveBaseMetadataForField(
                                              fieldName,
                                              payload
                                            );
                                            console.debug(
                                              "savebasemetadata/field success",
                                              fieldName,
                                              resp
                                            );
                                          } catch (err) {
                                            console.error(
                                              "savebasemetadata/field failed",
                                              fieldName,
                                              err
                                            );
                                            alert(
                                              err instanceof Error
                                                ? err.message
                                                : "Failed to save multivalued field metadata. Please try again."
                                            );
                                          }
                                        }}
                                      >
                                        Save
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
            </div>
          );
        }

        return (
          <div className="space-y-6">


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Existing Mappings Table */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source Attribute
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Target Attribute
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Default Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getCurrentPageData().length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                            No attribute mappings configured.
                          </td>
                        </tr>
                      ) : (
                        getCurrentPageData().map((mapping, index) => (
                        <tr key={mapping.id ?? `row-${index}`}>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words break-all align-top" style={{ position: "static", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                            {mapping.source}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words break-all align-top" style={{ position: "static", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                            {mapping.target}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {mapping.defaultValue || ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                aria-label="Edit"
                                onClick={() => {
                                  setEditingAttribute(mapping);
                                  setIsEditingAttribute(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                aria-label="Delete"
                                onClick={() => handleDeleteMapping(mapping.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <button
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => setAttributeMappingPage(Math.max(1, attributeMappingPage - 1))}
                    disabled={attributeMappingPage === 1}
                    >
                      &lt;
                    </button>
                  <span className="text-sm text-gray-700">
                    Page {attributeMappingPage} of {getAttributeMappingTotalPages()}
                  </span>
                    <button
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => setAttributeMappingPage(Math.min(getAttributeMappingTotalPages(), attributeMappingPage + 1))}
                    disabled={attributeMappingPage === getAttributeMappingTotalPages()}
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Action Buttons - Save calls saveappdetails API */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={submitRequestLoading}
                    onClick={async () => {
                      setSubmitRequestError(null);
                      setSubmitRequestLoading(true);
                      try {
                        const ownerEmail = formData.step2.technicalOwnerEmail || formData.step2.businessOwnerEmail || "";
                        const step3 = formData.step3 || {};
                        const provisioningAttrMap: Record<string, { variable: string }> = {};
                        attributeMappingData.forEach((mapping) => {
                          if (mapping.target?.trim()) {
                            provisioningAttrMap[mapping.target.trim()] = { variable: mapping.source?.trim() ?? "" };
                          }
                        });
                        const userSearchBaseVal = String(step3.userSearchBase ?? step3.user_searchBase ?? "").trim();
                        const groupSearchBaseVal = String(step3.groupSearchBase ?? step3.group_searchBase ?? "").trim();
                        const { userSearchBase: _u2, groupSearchBase: _g2, user_searchBase: _ub2, group_searchBase: _gb2, ...step3Rest } = step3 as Record<string, unknown>;
                        const connectionDetails: Record<string, unknown> = {
                          ...step3Rest,
                          hostname: step3.hostname ?? "",
                          port: step3.port ?? "",
                          username: step3.username ?? "",
                          password: step3.password ?? "",
                          user_searchBase: userSearchBaseVal,
                          group_searchBase: groupSearchBaseVal,
                        };
                        const savePayload = {
                          tenantId: "ACMECOM",
                          appid: appIdFromUrl || "",
                          serviceURL: "",
                          name: formData.step2.applicationName || "",
                          description: formData.step2.description || "",
                          category: formData.step1.type || "",
                          owner: { type: "User", value: ownerEmail },
                          status: "InProgress",
                          connectionDetails,
                          dicoveredOn: null,
                          integratedOn: null,
                          schemaMappingDetails: {
                            provisioningAttrMap,
                            reconcilliationAttrMap: {},
                          },
                          applicationConfigurationDetails: null,
                          iga: false,
                          lcm: false,
                          sso: false,
                          ...(appIdFromUrl && !Number.isNaN(Number(appIdFromUrl)) ? { key: Number(appIdFromUrl) } : {}),
                        };
                        await saveAppDetails(savePayload);
                      } catch (err) {
                        const message = err instanceof Error ? err.message : "Failed to save application details";
                        setSubmitRequestError(message);
                      } finally {
                        setSubmitRequestLoading(false);
                      }
                    }}
                  >
                    {submitRequestLoading ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
                    onClick={() => router.push("/settings/app-inventory")}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Add New Attribute Form or Edit Attribute Form */}
              <div className="space-y-4">
                {isEditingAttribute ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mapping Type
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingAttribute?.type ?? "direct"}
                          onChange={(e) => setEditingAttribute((prev) => (prev ? { ...prev, type: e.target.value } : null))}
                        >
                          <option value="direct">Direct</option>
                          <option value="expression">Expression</option>
                          <option value="constant">Constant</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Attribute
                          <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingAttribute?.target ?? ""}
                          onChange={(e) => setEditingAttribute((prev) => (prev ? { ...prev, target: e.target.value } : null))}
                        />
                        <div className="mt-2 flex justify-end">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={editingAttribute?.keyfieldMapping ?? false}
                              onChange={(e) => setEditingAttribute((prev) => (prev ? { ...prev, keyfieldMapping: e.target.checked } : null))}
                            />
                            <span className="ml-2 text-sm text-gray-700">Keyfield</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Source Attribute
                          <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                          <span className="text-xs text-gray-500 ml-1">
                            Help
                          </span>
                        </label>
                        <div className="relative" ref={editDropdownRef}>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editSourceAttributeValue || editingAttribute?.source || ""}
                            onChange={(e) => {
                              filterAttributes(e.target.value, true);
                            }}
                            onFocus={() => {
                              if (scimAttributes.length === 0 && !isLoadingAttributes) {
                                fetchScimAttributes();
                              }
                              setIsEditDropdownOpen(true);
                            }}
                            placeholder="Select or enter source attribute"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                            onClick={handleEditDropdownToggle}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isEditDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isEditDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100" style={{ scrollBehavior: 'smooth' }}>
                              {isLoadingAttributes ? (
                                <div className="px-4 py-2 text-sm text-gray-500">Loading attributes...</div>
                              ) : filteredAttributes.length > 0 ? (
                                filteredAttributes.map((attr, index) => (
                                  <div
                                    key={index}
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    onClick={() => selectAttribute(attr, true)}
                                  >
                                    {attr}
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-2 text-sm text-gray-500">No attributes found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default value (optional)
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter default value"
                          value={editingAttribute?.defaultValue ?? ""}
                          onChange={(e) => setEditingAttribute((prev) => (prev ? { ...prev, defaultValue: e.target.value } : null))}
                        />
                      </div>
                    </div>

                    {/* Edit Form Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                        onClick={saveEdit}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
                        onClick={() => {
                          setIsEditingAttribute(false);
                          setEditingAttribute(null);
                          setEditSourceAttributeValue("");
                          setIsEditDropdownOpen(false);
                        }}
                      >
                        Discard
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mapping Type
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={mappingType ?? "direct"}
                          onChange={(e) => setMappingType(e.target.value)}
                        >
                          <option value="direct">Direct</option>
                          <option value="expression">Expression</option>
                          <option value="constant">Constant</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Source Attribute
                          <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                          <span className="text-xs text-gray-500 ml-1">
                            Help
                          </span>
                        </label>
                        <div className="relative" ref={dropdownRef}>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={sourceAttributeValue ?? ""}
                            onChange={(e) => {
                              filterAttributes(e.target.value, false);
                            }}
                            onFocus={() => {
                              if (scimAttributes.length === 0 && !isLoadingAttributes) {
                                fetchScimAttributes();
                              }
                              setIsDropdownOpen(true);
                            }}
                            placeholder="Select or enter source attribute"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                            onClick={handleDropdownToggle}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100" style={{ scrollBehavior: 'smooth' }}>
                              {isLoadingAttributes ? (
                                <div className="px-4 py-2 text-sm text-gray-500">Loading attributes...</div>
                              ) : filteredAttributes.length > 0 ? (
                                filteredAttributes.map((attr, index) => (
                                  <div
                                    key={index}
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    onClick={() => selectAttribute(attr, false)}
                                  >
                                    {attr}
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-2 text-sm text-gray-500">No attributes found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Attribute
                          <Info className="w-4 h-4 inline ml-1 text-gray-400" />
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter target attribute"
                            value={targetAttributeValue ?? ""}
                            onChange={(e) => setTargetAttributeValue(e.target.value)}
                          />
                          <button className="absolute right-2 top-2 text-gray-400">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={keyfieldChecked}
                              onChange={(e) => setKeyfieldChecked(e.target.checked)}
                            />
                            <span className="ml-2 text-sm text-gray-700">Keyfield</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default value (optional)
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter default value"
                          value={defaultAttributeValue ?? ""}
                          onChange={(e) => setDefaultAttributeValue(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Add Form Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!sourceAttributeValue.trim() || !targetAttributeValue.trim()}
                        onClick={handleAddMapping}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
                        onClick={() => {
                          setSourceAttributeValue("");
                          setTargetAttributeValue("");
                          setDefaultAttributeValue("");
                          setKeyfieldChecked(false);
                          setMappingType("direct");
                          setIsDropdownOpen(false);
                        }}
                      >
                        Discard
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 5:
        // For Disconnected Application (create + edit), step 5 should be Schema Mapping
        if (formData.step1.type === "Disconnected Application") {
          return renderSchemaMappingStep();
        }

        // For all other flows, step 5 is Advanced settings / Finish Up
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced settings</h2>
            <AdvanceSettingTab ref={advanceSettingRef} applicationId="wizard" wizardMode />
          </div>
        );

      case 6:
        // Step 6 is only reachable for new Disconnected apps; show Advanced settings (Hooks & Threshold)
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced settings</h2>
            <AdvanceSettingTab ref={advanceSettingRef} applicationId="wizard" wizardMode />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/settings/app-inventory")}
            className="flex items-center text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="ml-2">Back to App Inventory</span>
          </button>
        </div>

        {/* Edit mode: app summary card from IT Asset getapp */}
        {isCompleteIntegration && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex">
            <div className="w-1.5 shrink-0 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-xl" aria-hidden />
            <div className="flex-1 p-6">
              {appDetailsLoading ? (
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
                  <span className="text-sm font-medium">Loading…</span>
                </div>
              ) : appDetails ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 sm:gap-y-0">
                    {[
                      { label: "Application Name", keys: ["applicationName", "ApplicationName", "name", "Name"] },
                      { label: "Category", keys: ["category", "Category", "applicationType", "ApplicationType"] },
                      { label: "Owner", keys: ["owner", "Owner"] },
                    ].map(({ label, keys }, i) => {
                      let val = keys.reduce<unknown>((acc, k) => acc != null && acc !== "" ? acc : appDetails[k], null);
                      if (label === "Owner" && typeof val === "object" && val !== null && "value" in val) {
                        val = (val as { value?: unknown }).value;
                      }
                      const display = typeof val === "object" && val !== null ? JSON.stringify(val) : val != null && val !== "" ? String(val) : "—";
                      return (
                        <div
                          key={label}
                          className={`flex items-baseline gap-2 min-w-0 ${i < 2 ? "sm:border-r sm:border-gray-200 sm:pr-6" : ""}`}
                        >
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">{label}:</span>
                          <span className="text-[15px] font-semibold text-gray-900 leading-snug break-words min-w-0" title={display}>
                            {display}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <label htmlFor="edit-mode-description" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="edit-mode-description"
                      rows={2}
                      className="w-full px-3 py-2 text-[15px] font-medium text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[60px]"
                      placeholder="Enter description"
                      value={formData.step2.description ?? ""}
                      onChange={(e) => handleInputChange("step2", "description", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 font-medium">Could not load details.</p>
              )}
            </div>
          </div>
        )}

        {/* Progress Steps - clickable in edit mode to move between steps without Save and Next */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            {(() => {
              const isDisconnected = formData.step1.type === "Disconnected Application";
              const stepsShown = isCompleteIntegration
                ? (isDisconnected
                    ? steps.filter((s) => s.id >= 3 && s.id <= 6)
                    : steps.filter((s) => s.id >= 3 && s.id <= 5))
                : isDisconnected
                  ? steps
                  : steps.filter((s) => s.id <= 5);
              return stepsShown.map((step, index) => {
                const isClickable = isCompleteIntegration || step.id > 1;
                const displayNumber = isCompleteIntegration ? index + 1 : step.id;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={isClickable ? () => setCurrentStep(step.id) : undefined}
                    onKeyDown={
                      isClickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setCurrentStep(step.id);
                            }
                          }
                        : undefined
                    }
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    aria-label={
                      isClickable ? `Go to step ${displayNumber}: ${step.title}` : undefined
                    }
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      } ${isClickable ? "hover:ring-2 hover:ring-blue-400" : ""}`}
                    >
                      {currentStep > step.id ? <Check className="w-4 h-4" /> : displayNumber}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {(() => {
                          const type = formData.step1.type;
                          if (type === "Flatfile" && step.id === 3) return "File Upload";
                          if (type === "Disconnected Application") {
                            if (step.id === 4) return "File Upload";
                            if (step.id === 5) return "Schema Mapping";
                            if (step.id === 6) return "Finish Up";
                          } else {
                            if (step.id === 4) return "Schema Mapping";
                            if (step.id === 5) return "Finish Up";
                          }
                          return step.title;
                        })()}
                      </p>
                    </div>
                    {index < stepsShown.length - 1 && (
                      <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Navigation Buttons - moved to top */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          {submitRequestError && (
            <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-md">
              {submitRequestError}
            </div>
          )}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={(!isCompleteIntegration && currentStep === 1) || submitRequestLoading}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                ((!isCompleteIntegration && currentStep === 1) || submitRequestLoading)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {isCompleteIntegration && currentStep === 3 ? "Back to Inventory" : "Previous"}
            </button>

            <div className="flex gap-3 ml-auto">
              {currentStep < (!isCompleteIntegration && formData.step1.type === "Disconnected Application" ? 6 : 5) ? (
                <button
                  onClick={handleNext}
                  disabled={submitRequestLoading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitRequestLoading ? "Submitting…" : currentStep === 1 ? "Next" : "Save and Next"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              ) : !isCompleteIntegration ? (
                <button
                  onClick={handleSubmit}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Submit Application
                </button>
              ) : null}
              {isCompleteIntegration && formData.step1.type === "Disconnected Application" && currentStep === 6 && (
                <button
                  type="button"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={onboardLoading || submitRequestLoading}
                  onClick={async () => {
                    if (onboardLoading || submitRequestLoading) return;
                    setSubmitRequestError(null);
                    setOnboardLoading(true);
                    try {
                      const ownerEmail = formData.step2.technicalOwnerEmail || formData.step2.businessOwnerEmail || "";
                      const step3 = formData.step3 || {};
                      const provisioningAttrMap: Record<string, { variable: string }> = {};
                      attributeMappingData.forEach((mapping) => {
                        if (mapping.target?.trim()) {
                          provisioningAttrMap[mapping.target.trim()] = { variable: mapping.source?.trim() ?? "" };
                        }
                      });
                      const userSearchBaseVal = String(step3.userSearchBase ?? step3.user_searchBase ?? "").trim();
                      const groupSearchBaseVal = String(step3.groupSearchBase ?? step3.group_searchBase ?? "").trim();
                      const { userSearchBase: _uo, groupSearchBase: _go, user_searchBase: _ubo, group_searchBase: _gbo, ...step3Rest } = step3 as Record<string, unknown>;
                      const connectionDetails: Record<string, unknown> = {
                        ...step3Rest,
                        hostname: step3.hostname ?? "",
                        port: step3.port ?? "",
                        username: step3.username ?? "",
                        password: step3.password ?? "",
                        user_searchBase: userSearchBaseVal,
                        group_searchBase: groupSearchBaseVal,
                      };
                      const applicationConfigurationDetails =
                        (formData.step1.type === "Disconnected Application" && currentStep === 6 && advanceSettingRef.current?.getConfig?.()) ?? null;
                      const onboardPayload = {
                        tenantId: "ACMECOM",
                        appid: appIdFromUrl || "",
                        serviceURL: "",
                        name: formData.step2.applicationName || "",
                        description: formData.step2.description || "",
                        category: formData.step1.type || "",
                        owner: { type: "User", value: ownerEmail },
                        status: "InProgress",
                        connectionDetails,
                        dicoveredOn: null,
                        integratedOn: null,
                        schemaMappingDetails: {
                          provisioningAttrMap,
                          reconcilliationAttrMap: {},
                        },
                        applicationConfigurationDetails,
                        iga: false,
                        lcm: false,
                        sso: false,
                        ...(appIdFromUrl && !Number.isNaN(Number(appIdFromUrl)) ? { key: Number(appIdFromUrl) } : {}),
                      };
                      await onboardApp(onboardPayload);
                      router.push("/settings/app-inventory");
                    } catch (err) {
                      const message = err instanceof Error ? err.message : "Failed to onboard application";
                      setSubmitRequestError(message);
                    } finally {
                      setOnboardLoading(false);
                    }
                  }}
                >
                  {onboardLoading ? "Onboarding…" : "OnBoard"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
