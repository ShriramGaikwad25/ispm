import { useEffect, useState } from "react";
import { Control, FieldValues, Resolver, useForm, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import MultiSelect from "@/components/MultiSelect";
import { loadUsers, loadGroups, customOption, loadIspmApps } from "@/components/MsAsyncData";
import FileDropzone from "@/components/FileDropzone";
import ToggleSwitch from "@/components/ToggleSwitch";
import { asterisk, downArrow, userGroups, excludeUsers, defaultExpression } from "@/utils/utils";
import ExpressionBuilder from "@/components/ExpressionBuilder";
import { StepProps, FormData } from "@/types/stepTypes";
import { validationSchema } from "./step1CombinedValidation";
import { apiRequestWithAuth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// Combined form data type
type CombinedStep1FormData = {
  // Step1 fields
  template?: string;
  ownerUser?: any[];
  ownerGroup?: any[];
  certificationTemplate: string;
  description: string;
  ownerType: string;
  // Step2 fields
  userType: string;
  specificUserExpression: { attribute: any; operator: any; value: string }[];
  specificApps: string[] | null;
  expressionApps: { attribute: any; operator: any; value: string }[];
  expressionEntitlement: { attribute: any; operator: any; value: string }[];
  groupListIsChecked: boolean;
  userGroupList: string | null;
  importNewUserGroup: File | null;
  excludeUsersIsChecked: boolean;
  excludeUsers: string | null;
  selectData: string;
};

// Function to fetch templates from API
const loadTemplates = async (inputValue: string) => {
  try {
    // Use apiRequestWithAuth for better error handling and automatic token refresh
    const data = await apiRequestWithAuth<any>("https://preview.keyforge.ai/campaign/api/v1/ACMECOM/getAllCampaigns", {
      method: "GET",
    });
    
    // Handle different response structures
    let campaignsArray: any[] = [];
    if (Array.isArray(data)) {
      campaignsArray = data;
    } else if (data && typeof data === "object") {
      campaignsArray = data.items || data.data || data.campaigns || data.results || [];
      if (campaignsArray.length === 0 && (data.id || data.name || data.campaignID)) {
        campaignsArray = [data];
      }
    }
    
    return campaignsArray.map((template: { id?: string; campaignID?: string; campaignId?: string; name?: string; campaignName?: string; templateName?: string }) => ({
      label: template.name || template.campaignName || template.templateName || "Unnamed Campaign",
      value: template.id || template.campaignID || template.campaignId || String(template.id || ""),
    }));
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    
    // Provide more specific error messages
    if (error instanceof TypeError && (error.message.includes("fetch") || error.message === "Failed to fetch")) {
      console.error("Network error: Unable to connect to the server. This could be due to CORS, network connectivity, or server availability.");
    } else if (error.message) {
      console.error("API error:", error.message);
    }
    
    // Return empty array on error - the component should handle this gracefully
    return [];
  }
};

const Step1: React.FC<StepProps> = ({
  formData,
  setFormData,
  onValidationChange,
}) => {
  // Combine step1 and step2 data for the form
  const combinedData: CombinedStep1FormData = {
    ...formData.step1,
    ...formData.step2,
    userType: formData.step2?.userType ?? "All users",
    selectData: formData.step2?.selectData ?? "All Applications",
    expressionEntitlement: formData.step2?.expressionEntitlement ?? [defaultExpression],
    groupListIsChecked: formData.step2?.groupListIsChecked ?? false,
    specificUserExpression: formData.step2?.specificUserExpression ?? [],
    specificApps: formData.step2?.specificApps ?? [],
    expressionApps: formData.step2?.expressionApps ?? [],
    ownerType: formData.step1?.ownerType ?? "User",
    ownerUser: formData.step1?.ownerUser ?? [],
    ownerGroup: formData.step1?.ownerGroup ?? [],
    certificationTemplate: formData.step1?.certificationTemplate ?? "",
    description: formData.step1?.description ?? "",
  };

  const {
    register,
    setValue,
    control,
    watch,
    resetField,
    trigger,
    formState: { errors, isValid },
  } = useForm<CombinedStep1FormData>({
    resolver: yupResolver(validationSchema) as unknown as Resolver<CombinedStep1FormData>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: combinedData,
  });

  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Watch for form value changes and trigger validation
  const watchedValues = watch();

  useEffect(() => {
    // Debug: Log validation state
    console.log("Step1 Validation State:", { 
      isValid, 
      errors: Object.keys(errors).length > 0 ? errors : "No errors",
      hasCertificationTemplate: !!watchedValues.certificationTemplate,
      hasDescription: !!watchedValues.description,
      ownerType: watchedValues.ownerType,
      hasOwnerUser: Array.isArray(watchedValues.ownerUser) && watchedValues.ownerUser.length > 0,
      hasOwnerGroup: Array.isArray(watchedValues.ownerGroup) && watchedValues.ownerGroup.length > 0,
      userType: watchedValues.userType,
      selectData: watchedValues.selectData,
    });
    onValidationChange(isValid);
  }, [isValid, onValidationChange, errors, watchedValues]);

  // Trigger validation on mount and when key form values change
  useEffect(() => {
    const validateForm = async () => {
      const result = await trigger();
      console.log("Step1 Validation Trigger Result:", result, "Errors:", Object.keys(errors));
    };
    // Delay slightly to ensure form is fully initialized
    const timeoutId = setTimeout(() => {
      validateForm();
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [trigger, watchedValues.certificationTemplate, watchedValues.description, watchedValues.ownerType, watchedValues.userType, watchedValues.selectData]);

  useEffect(() => {
    const subscription = watch((values) => {
      // Split the combined data back into step1 and step2
      const step1Data = {
        template: values.template,
        ownerUser: values.ownerUser,
        ownerGroup: values.ownerGroup,
        certificationTemplate: values.certificationTemplate,
        description: values.description,
        ownerType: values.ownerType,
      };
      const step2Data = {
        userType: values.userType,
        specificUserExpression: values.specificUserExpression,
        specificApps: values.specificApps,
        expressionApps: values.expressionApps,
        expressionEntitlement: values.expressionEntitlement,
        groupListIsChecked: values.groupListIsChecked,
        userGroupList: values.userGroupList,
        importNewUserGroup: values.importNewUserGroup,
        excludeUsersIsChecked: values.excludeUsersIsChecked,
        excludeUsers: values.excludeUsers,
        selectData: values.selectData,
      };
      setFormData({ ...formData, step1: step1Data, step2: step2Data });
    });
    return () => subscription.unsubscribe();
  }, [watch, setFormData, formData]);

  const ownerType = watch("ownerType");
  useEffect(() => {
    if (ownerType === "User") {
      setValue("ownerGroup", [], { shouldValidate: true });
    } else if (ownerType === "Group") {
      setValue("ownerUser", [], { shouldValidate: true });
    }
  }, [ownerType, setValue]);

  // Step2 field resets
  const userType = watch("userType");
  const groupListIsChecked = watch("groupListIsChecked");
  const excludeUsersIsChecked = watch("excludeUsersIsChecked");

  useEffect(() => {
    if (userType === "All users") {
      setValue("userGroupList", "", { shouldValidate: false });
      setValue("specificUserExpression", [], { shouldValidate: false });
      setValue("groupListIsChecked", false, { shouldValidate: false });
    } else if (userType === "Custom User Group") {
      setValue("specificUserExpression", [], { shouldValidate: false });
      if (groupListIsChecked) {
        setValue("userGroupList", "", { shouldValidate: false });
      }
    } else if (userType === "Specific users") {
      setValue("userGroupList", "", { shouldValidate: false });
      setValue("groupListIsChecked", false, { shouldValidate: false });
    }
    if (!groupListIsChecked) {
      resetField("importNewUserGroup");
    }
    if (!excludeUsersIsChecked) {
      resetField("excludeUsers");
    }
  }, [
    userType,
    groupListIsChecked,
    excludeUsersIsChecked,
    resetField,
    setValue,
  ]);

  const selectData = watch("selectData");
  useEffect(() => {
    if (
      selectData === "All Applications" ||
      selectData === "Select Entitlement"
    ) {
      setValue("specificApps", [], { shouldValidate: false });
      setValue("expressionApps", [], { shouldValidate: false });
    }
    if (selectData === "All Applications") {
      setValue("expressionEntitlement", [], { shouldValidate: false });
    }
    if (selectData === "Specific Applications") {
      setValue("expressionEntitlement", [], { shouldValidate: false });
    }
    if (selectData === "Select Entitlement") {
      setValue("specificApps", [], { shouldValidate: false });
    }
  }, [selectData, setValue]);

  const handleApplyTemplate = async () => {
    const selectedTemplate = watch("template");
    if (!selectedTemplate) {
      alert("Please select a template before applying.");
      return;
    }

    try {
      setIsLoadingTemplates(true);
      setTemplateError(null);
      
      // Fetch the full template/campaign data
      // Try multiple possible endpoints in case the API structure varies
      let templateData: any = null;
      try {
        // First try: Get campaign by ID
        templateData = await apiRequestWithAuth<any>(
          `https://preview.keyforge.ai/campaign/api/v1/ACMECOM/getCampaign/${selectedTemplate}`,
          { method: "GET" }
        );
      } catch (firstError) {
        // Fallback: Get all campaigns and find the matching one
        try {
          const allCampaigns = await apiRequestWithAuth<any>(
            "https://preview.keyforge.ai/campaign/api/v1/ACMECOM/getAllCampaigns",
            { method: "GET" }
          );
          
          let campaignsArray: any[] = [];
          if (Array.isArray(allCampaigns)) {
            campaignsArray = allCampaigns;
          } else if (allCampaigns && typeof allCampaigns === "object") {
            campaignsArray = allCampaigns.items || allCampaigns.data || allCampaigns.campaigns || allCampaigns.results || [];
          }
          
          templateData = campaignsArray.find(
            (campaign: any) =>
              campaign.id === selectedTemplate ||
              campaign.campaignID === selectedTemplate ||
              campaign.campaignId === selectedTemplate
          );
        } catch (secondError) {
          console.error("Error fetching template:", secondError);
          throw secondError;
        }
      }

      if (!templateData) {
        throw new Error("Template not found");
      }

      // Map the template data to FormData structure
      // Step1 data
      const step1Data = {
        template: selectedTemplate,
        certificationTemplate: templateData.name || templateData.campaignName || templateData.templateName || "",
        description: templateData.description || "",
        ownerType: templateData.ownerType || templateData.campaignOwner?.ownerType || "User",
        ownerUser: templateData.ownerUser || templateData.campaignOwner?.ownerName?.filter((_: any, idx: number) => 
          (templateData.ownerType || templateData.campaignOwner?.ownerType || "User") === "User"
        ).map((name: string) => ({ label: name, value: name })) || [],
        ownerGroup: templateData.ownerGroup || templateData.campaignOwner?.ownerName?.filter((_: any, idx: number) => 
          (templateData.ownerType || templateData.campaignOwner?.ownerType || "User") === "Group"
        ).map((name: string) => ({ label: name, value: name })) || [],
      };

      // Step2 data
      const userCriteria = templateData.userCriteria || {};
      const scopingCriteria = templateData.scopingCriteria || {};
      
      let userType = "All users";
      if (userCriteria.criteria === "selectedUsers") {
        userType = "Specific users";
      } else if (userCriteria.criteria === "customUserGroups") {
        userType = "Custom User Group";
      }

      let selectData = "All Applications";
      if (scopingCriteria.criteria === "selectedApplications") {
        selectData = "Specific Applications";
      } else if (scopingCriteria.criteria === "specificEntitlements") {
        selectData = "Select Entitlement";
      }

      const step2Data = {
        userType: userType,
        specificUserExpression: userCriteria.selectedUsers?.map((user: any) => ({
          id: uuidv4(),
          attribute: user.attribute ? { label: user.attribute, value: user.attribute } : null,
          operator: user.operator ? { label: user.operator, value: user.operator } : null,
          value: user.value || "",
          logicalOp: "AND",
        })) || [],
        specificApps: scopingCriteria.selectedApplications?.map((app: string) => ({ label: app, value: app })) || [],
        expressionApps: scopingCriteria.commonFilterForAccounts?.filtercriteria ? [{
          id: uuidv4(),
          attribute: scopingCriteria.commonFilterForAccounts.filtercriteria.attribute ? 
            { label: scopingCriteria.commonFilterForAccounts.filtercriteria.attribute, value: scopingCriteria.commonFilterForAccounts.filtercriteria.attribute } : null,
          operator: scopingCriteria.commonFilterForAccounts.filtercriteria.operator ? 
            { label: scopingCriteria.commonFilterForAccounts.filtercriteria.operator, value: scopingCriteria.commonFilterForAccounts.filtercriteria.operator } : null,
          value: scopingCriteria.commonFilterForAccounts.filtercriteria.value || "",
          logicalOp: "AND",
        }] : [],
        expressionEntitlement: scopingCriteria.commonFilterForEntitlements?.filtercriteria ? [{
          id: uuidv4(),
          attribute: scopingCriteria.commonFilterForEntitlements.filtercriteria.attribute ? 
            { label: scopingCriteria.commonFilterForEntitlements.filtercriteria.attribute, value: scopingCriteria.commonFilterForEntitlements.filtercriteria.attribute } : null,
          operator: scopingCriteria.commonFilterForEntitlements.filtercriteria.operator ? 
            { label: scopingCriteria.commonFilterForEntitlements.filtercriteria.operator, value: scopingCriteria.commonFilterForEntitlements.filtercriteria.operator } : null,
          value: scopingCriteria.commonFilterForEntitlements.filtercriteria.value || "",
          logicalOp: "AND",
        }] : [defaultExpression],
        groupListIsChecked: userCriteria.customUserGroups?.some((group: string) => group.includes("Imported") || group.includes("import")) || false,
        userGroupList: userCriteria.customUserGroups?.filter((group: string) => !group.includes("Imported") && !group.includes("import")).join(",") || null,
        importNewUserGroup: null,
        excludeUsersIsChecked: userCriteria.excludeUsersFromCampaign && userCriteria.excludeUsersFromCampaign.length > 0,
        excludeUsers: userCriteria.excludeUsersFromCampaign?.map((user: string) => ({ label: user, value: user })) || null,
        selectData: selectData,
      };

      // Step3 data
      const reviewers = templateData.reviewers || [];
      const step3Data = {
        multiStageReview: reviewers.length > 1,
        stages: reviewers.length > 0 ? reviewers.map((reviewer: any) => ({
          reviewer: reviewer.reviewerType || reviewer.reviewer || "",
          duration: reviewer.reviewDuration?.toString() || reviewer.duration || "",
          nextReviewerAction: reviewer.nextReviewerAction || false,
          reviewerlistIsChecked: reviewer.reviewerType === "custom-reviewer" || false,
          genericExpression: reviewer.customCertifiers?.map((cert: any) => ({
            id: uuidv4(),
            attribute: cert.attribute ? { label: cert.attribute, value: cert.attribute } : null,
            operator: cert.operator ? { label: cert.operator, value: cert.operator } : null,
            value: cert.value || "",
            logicalOp: "AND",
          })) || [],
          customReviewerlist: null,
        })) : [{
          reviewer: "",
          duration: "",
          nextReviewerAction: false,
          reviewerlistIsChecked: false,
          genericExpression: [],
          customReviewerlist: null,
        }],
      };

      // Step4 data
      const notifications = templateData.notifications || {};
      const reminders = templateData.reminders || {};
      const certificationOptions = templateData.certificationOptions || {};
      const escalation = templateData.escalation || {};
      const campaignSchedular = templateData.campaignSchedular || {};

      const step4Data = {
        socReminders: reminders.enabled ? (reminders.frequencyInDays ? [{ label: `Every ${reminders.frequencyInDays} days`, value: reminders.frequencyInDays.toString() }] : []) : [],
        eocReminders: notifications.beforeExpiry?.numOfDaysBeforeExpiry?.map((days: number) => ({ label: `${days} days before expiry`, value: days.toString() })) || [],
        msTeamsNotification: templateData.msTeamsNotification || false,
        msTeamsWebhookUrl: templateData.msTeamsWebhookUrl || "",
        remediationTicketing: certificationOptions.closedLoopRemediation || false,
        allowDownloadUploadCropNetwork: templateData.allowDownloadUploadCropNetwork || false,
        markUndecidedRevoke: templateData.markUndecidedRevoke || false,
        disableBulkAction: templateData.disableBulkAction || false,
        enforceComments: 
          (certificationOptions.requireCommentOnRevoke && certificationOptions.requireCommentOnCertify) ? "Custom Fields" :
          certificationOptions.requireCommentOnRevoke ? "Revoke" :
          certificationOptions.requireCommentOnCertify ? "Certify" : "",
        genericExpression: templateData.genericExpression?.map((exp: any) => ({
          id: uuidv4(),
          attribute: exp.attribute ? { label: exp.attribute, value: exp.attribute } : null,
          operator: exp.operator ? { label: exp.operator, value: exp.operator } : null,
          value: exp.value || "",
          logicalOp: "AND",
        })) || [],
        allowEscalation: escalation.enabled ? escalation.daysBeforeExpiry?.toString() || "" : "",
        certifierUnavailableUsers: certificationOptions.defaultCertifier?.reviewerId ? 
          [{ label: certificationOptions.defaultCertifier.reviewerId, value: certificationOptions.defaultCertifier.reviewerId }] : [],
        ticketConditionalApproval: templateData.ticketConditionalApproval || false,
        authenticationSignOff: templateData.authenticationSignOff || false,
        generatePin: templateData.generatePin || "",
        verifyUserAttribute: templateData.verifyUserAttribute || "",
        applicationScope: scopingCriteria.commonFilterForAccounts?.criteria === "allUserAccounts" || false,
        preDelegate: certificationOptions.allowPreDelegateToSignOff || false,
        campaignPreview: templateData.campaignPreview || false,
        campaignPreviewDuration: templateData.campaignPreviewDuration || "",
        campaignPreviewEmailNotificationsEnabled: templateData.campaignPreviewEmailNotificationsEnabled || false,
        campaignPreviewEmailNotifications: templateData.campaignPreviewEmailNotifications || false,
        duration: campaignSchedular.frequency?.toString() || templateData.certificationDuration?.toString() || "",
        reviewRecurrence: campaignSchedular.frequency?.toString() || "",
        startDate: campaignSchedular.startDate ? new Date(campaignSchedular.startDate) : null,
        end: campaignSchedular.endOfCampaign || "Never",
      };

      // Update all form data at once
      const updatedFormData: FormData = {
        step1: step1Data,
        step2: step2Data,
        step3: step3Data,
        step4: step4Data,
      };

      console.log("Applying template data:", {
        step1: step1Data,
        step2: step2Data,
        step3: step3Data,
        step4: step4Data,
      });

      // Use functional update to ensure state is properly set
      setFormData((prev) => ({
        ...prev,
        step1: step1Data,
        step2: step2Data,
        step3: step3Data,
        step4: step4Data,
      }));

      // Also update Step1 form values for immediate UI feedback
      setValue("certificationTemplate", step1Data.certificationTemplate, { shouldValidate: true });
      setValue("description", step1Data.description, { shouldValidate: true });
      setValue("ownerType", step1Data.ownerType, { shouldValidate: true });
      setValue("ownerUser", step1Data.ownerUser || [], { shouldValidate: true });
      setValue("ownerGroup", step1Data.ownerGroup || [], { shouldValidate: true });
      setValue("userType", step2Data.userType, { shouldValidate: true });
      setValue("specificUserExpression", step2Data.specificUserExpression || [], { shouldValidate: true });
      setValue("specificApps", step2Data.specificApps || [], { shouldValidate: true });
      setValue("expressionApps", step2Data.expressionApps || [], { shouldValidate: true });
      setValue("expressionEntitlement", step2Data.expressionEntitlement || [defaultExpression], { shouldValidate: true });
      setValue("groupListIsChecked", step2Data.groupListIsChecked, { shouldValidate: true });
      setValue("userGroupList", step2Data.userGroupList || "", { shouldValidate: true });
      setValue("excludeUsersIsChecked", step2Data.excludeUsersIsChecked, { shouldValidate: true });
      setValue("excludeUsers", step2Data.excludeUsers || null, { shouldValidate: true });
      setValue("selectData", step2Data.selectData || "All Applications", { shouldValidate: true });

      // Trigger validation after all values are set to ensure isValid is updated
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        trigger().then((isFormValid) => {
          // Force validation state update
          onValidationChange(isFormValid);
        });
      });

    } catch (error) {
      console.error("Error applying template:", error);
      setTemplateError("Failed to apply template. Please try again.");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl font-bold text-blue-950 text-center mb-2">
        Create an access review campaign
      </h2>
      <small className="block mb-6 text-blue-950 text-center">
        Name your new campaign and set its ownership and rules.
      </small>

        <div className="text-sm space-y-6 w-full max-w-4xl">
          {/* Step1 Fields */}
          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label htmlFor="certificationTemplate" className={`pl-2 ${asterisk}`}>Template Name</label>
            <div className="max-w-md">
              <input
                id="certificationTemplate"
                type="text"
                className="form-input"
                aria-invalid={!!errors.certificationTemplate}
                aria-describedby={errors.certificationTemplate ? "certificationTemplate-error" : undefined}
                {...register("certificationTemplate")}
              />
              {errors.certificationTemplate?.message &&
                typeof errors.certificationTemplate.message === "string" && (
                  <p id="certificationTemplate-error" className="text-red-500" role="alert" aria-live="polite">
                    {errors.certificationTemplate.message}
                  </p>
                )}
            </div>
          </div>

          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label htmlFor="description" className={`pl-2 ${asterisk}`}>Description</label>
            <div className="max-w-md">
              <textarea
                id="description"
                className="form-input"
                rows={3}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? "description-error" : undefined}
                {...register("description")}
              ></textarea>
              {errors.description?.message &&
                typeof errors.description.message === "string" && (
                  <p id="description-error" className="text-red-500" role="alert" aria-live="polite">
                    {errors.description.message}
                  </p>
                )}
            </div>
          </div>

          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label className={`pl-2`}>Copy from Template</label>
            <div className="max-w-md">
              <div className="grid grid-cols-[1fr_.5fr] gap-2">
                <MultiSelect
                  isMulti={false}
                  isAsync
                  control={control as unknown as Control<FieldValues>}
                  loadOptions={loadTemplates}
                  placeholder="Select a template"
                  components={{ Option: customOption }}
                  {...register("template")}
                />
                {errors.template?.message &&
                  typeof errors.template.message === "string" && (
                    <p className="text-red-500">{errors.template.message}</p>
                  )}
                {templateError && <p className="text-red-500">{templateError}</p>}
                <button
                  className={`rounded bg-blue-500 hover:bg-blue-500/80 text-white ${
                    isLoadingTemplates ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={handleApplyTemplate}
                  disabled={isLoadingTemplates}
                >
                  {isLoadingTemplates ? "Applying..." : "Apply"}
                </button>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label className={`pl-2 ${asterisk}`}>Owners</label>
            <div>
              {["User", "Group"].map((option, index, array) => (
                <button
                  key={option}
                  type="button"
                  className={`px-4 relative py-2 mb-3 min-w-16 rounded-md border border-gray-300 ${
                    watch("ownerType") === option && downArrow
                  } ${
                    watch("ownerType") === option ? "bg-[#15274E] text-white" : ""
                  } ${index === 0 && "rounded-r-none"} ${
                    array.length > 2 &&
                    index === 1 &&
                    "rounded-none border-r-0 border-l-0"
                  } ${index === array.length - 1 && "rounded-l-none"}`}
                  onClick={() =>
                    setValue("ownerType", option, { shouldValidate: true })
                  }
                >
                  {option}
                </button>
              ))}

              {watch("ownerType") === "User" && (
                <>
                  <MultiSelect
                    className="max-w-[420px]"
                    control={control as unknown as Control<FieldValues>}
                    isAsync
                    loadOptions={loadUsers}
                    components={{ Option: customOption }}
                    {...register("ownerUser")}
                  />
                  {errors.ownerUser?.message &&
                    typeof errors.ownerUser.message === "string" && (
                      <p className="text-red-500">{errors.ownerUser.message}</p>
                    )}
                </>
              )}

              {watch("ownerType") === "Group" && (
                <>
                  <MultiSelect
                    className="max-w-[420px]"
                    control={control as unknown as Control<FieldValues>}
                    isAsync
                    loadOptions={loadGroups}
                    components={{ Option: customOption }}
                    {...register("ownerGroup")}
                  />
                  {errors.ownerGroup?.message &&
                    typeof errors.ownerGroup.message === "string" && (
                      <p className="text-red-500">{errors.ownerGroup.message}</p>
                    )}
                </>
              )}
            </div>
          </div>

          {/* Step2 Fields - Campaign Scope Card */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Campaign Scope</h3>
            <div className="space-y-6">
              <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
                <label className={`pl-2 ${asterisk}`}>Select Users</label>
            <div>
              {["All users", "Specific users", "Custom User Group"].map(
                (option, index, array) => (
                  <button
                    key={option}
                    type="button"
                    className={`px-4 relative py-2 mb-3 min-w-16 rounded-md border border-gray-300 ${
                      watch("userType") === option && index > 0 && downArrow
                    } ${
                      watch("userType") === option
                        ? "bg-[#15274E] text-white"
                        : ""
                    } ${index === 0 && "rounded-r-none"} ${
                      array.length > 2 &&
                      index === 1 &&
                      "rounded-none border-r-0  border-l-0 "
                    } ${index === array.length - 1 && "rounded-l-none"}`}
                    onClick={() =>
                      setValue("userType", option, { shouldValidate: true })
                    }
                  >
                    {option}
                  </button>
                )
              )}

              {watch("userType") === "Specific users" && (
                <ExpressionBuilder
                  title="Build Expression"
                  control={control as unknown as Control<FieldValues>}
                  setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                  watch={watch as unknown as UseFormWatch<FieldValues>}
                  fieldName="specificUserExpression"
                />
              )}

              {watch("userType") === "Custom User Group" && (
                <>
                  <div className="flex items-center gap-1 mb-2">
                    <span
                      className={`flex items-center ${
                        !watch("groupListIsChecked")
                          ? `${asterisk} !pr-0 text-black`
                          : "text-black/50"
                      }`}
                    >
                      Select from List
                    </span>
                    <ToggleSwitch
                      checked={watch("groupListIsChecked")}
                      onChange={(checked) => {
                        setValue("groupListIsChecked", checked, {
                          shouldValidate: true,
                        });
                      }}
                      className="scale-80"
                    />
                    <span
                      className={`flex items-center ${
                        watch("groupListIsChecked")
                          ? `${asterisk} !pr-0 text-black`
                          : "text-black/50"
                      }`}
                    >
                      Import New User Group
                    </span>
                  </div>

                  {watch("groupListIsChecked") && (
                    <div className="w-[450px]">
                      <FileDropzone
                        name="importNewUserGroup"
                        control={control as unknown as Control<FieldValues>}
                      />
                    </div>
                  )}
                  {!watch("groupListIsChecked") && (
                    <>
                      <MultiSelect
                        className="max-w-[420px]"
                        isMulti={true}
                        control={control as unknown as Control<FieldValues>}
                        options={userGroups}
                        {...register("userGroupList")}
                      />

                      {errors.userGroupList?.message &&
                        typeof errors.userGroupList.message === "string" && (
                          <p className="text-red-500">
                            {errors.userGroupList.message}
                          </p>
                        )}
                    </>
                  )}
                </>
              )}
              <div className="">
                <div className="flex items-center gap-1 py-2">
                  <input type="checkbox" {...register("excludeUsersIsChecked")} />{" "}
                  <span
                    className={` ${watch("excludeUsersIsChecked") && asterisk}`}
                  >
                    exclude users from the certification campaign
                  </span>
                </div>

                <MultiSelect
                  isDisabled={!watch("excludeUsersIsChecked")}
                  className="max-w-[420px]"
                  isMulti={true}
                  control={control as unknown as Control<FieldValues>}
                  options={excludeUsers}
                  {...register("excludeUsers")}
                />

                {errors.excludeUsers?.message &&
                  typeof errors.excludeUsers.message === "string" && (
                    <p className="text-red-500">{errors.excludeUsers.message}</p>
                  )}
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label className={`pl-2 ${asterisk}`}>Select Data</label>
            <div>
              {[
                "All Applications",
                "Specific Applications",
                "Select Entitlement",
              ].map((option, index, array) => (
                <button
                  key={option}
                  type="button"
                  className={`px-4 relative py-2 mb-3 min-w-16 rounded-md border border-gray-300  ${
                    watch("selectData") === option && index > 0 && downArrow
                  } ${
                    watch("selectData") === option
                      ? "bg-[#15274E] text-white"
                      : ""
                  } ${index === 0 && "rounded-r-none"} ${
                    array.length > 2 &&
                    index === 1 &&
                    "rounded-none border-r-0  border-l-0 "
                  } ${index === array.length - 1 && "rounded-l-none"}`}
                  onClick={() =>
                    setValue("selectData", option, { shouldValidate: true })
                  }
                >
                  {option}
                </button>
              ))}

              {watch("selectData") === "Specific Applications" && (
                <div className="space-y-4 bg-[#F4F5FA]/60 border-1 border-gray-300 p-4 rounded-md">
                  <div>
                    <MultiSelect
                      className="max-w-md"
                      placeholder="Select Specific App(s)"
                      control={control as unknown as Control<FieldValues>}
                      isAsync
                      loadOptions={loadIspmApps}
                      components={{ Option: customOption }}
                      {...register("specificApps")}
                    />
                    {errors.specificApps?.message &&
                      typeof errors.specificApps.message === "string" && (
                        <p className="text-red-500">
                          {errors.specificApps.message}
                        </p>
                      )}
                  </div>
                  <div className="w-full bg-white">
                    <ExpressionBuilder
                      control={control as unknown as Control<FieldValues>}
                      setValue={
                        setValue as unknown as UseFormSetValue<FieldValues>
                      }
                      watch={watch as unknown as UseFormWatch<FieldValues>}
                      fieldName="expressionApps"
                      attributesOptions={[
                        { label: "Risk", value: "risk" },
                        { label: "Pre-Requisite", value: "pre_requisite" },
                        { label: "Shared Pwd", value: "shared_pwd" },
                        { label: "Regulatory Scope", value: "regulatory_scope" },
                        { label: "Access Scope", value: "access_scope" },
                        { label: "Review Schedule", value: "review_schedule" },
                        { label: "Business Unit", value: "business_unit" },
                        { label: "Data Classification", value: "data_classification" },
                        { label: "Privileged", value: "privileged" },
                        { label: "Non Persistent Access", value: "non_persistent_access" },
                        { label: "License Type", value: "license_type" },
                        { label: "Tags", value: "tags" },
                      ]}
                    />
                    {errors.expressionApps?.message &&
                      typeof errors.expressionApps.message === "string" && (
                        <p className="text-red-500">
                          {errors.expressionApps.message}
                        </p>
                      )}
                  </div>
                </div>
              )}
              {watch("selectData") === "Select Entitlement" && (
                <>
                  <ExpressionBuilder
                    title="Build Expression for Entitlement"
                    control={control as unknown as Control<FieldValues>}
                    setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                    watch={watch as unknown as UseFormWatch<FieldValues>}
                    fieldName="expressionEntitlement"
                    attributesOptions={[
                      { label: "Risk", value: "risk" },
                      { label: "Pre-Requisite", value: "pre_requisite" },
                      { label: "Shared Pwd", value: "shared_pwd" },
                      { label: "Regulatory Scope", value: "regulatory_scope" },
                      { label: "Access Scope", value: "access_scope" },
                      { label: "Review Schedule", value: "review_schedule" },
                      { label: "Business Unit", value: "business_unit" },
                      { label: "Data Classification", value: "data_classification" },
                      { label: "Privileged", value: "privileged" },
                      { label: "Non Persistent Access", value: "non_persistent_access" },
                      { label: "License Type", value: "license_type" },
                      { label: "Tags", value: "tags" },
                    ]}
                  />
                  {errors.expressionEntitlement?.message &&
                    typeof errors.expressionEntitlement.message === "string" && (
                      <p className="text-red-500">
                        {errors.expressionEntitlement.message}
                      </p>
                    )}
                </>
              )}
            </div>
          </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Step1;
