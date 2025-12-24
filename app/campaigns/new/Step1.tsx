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
import { StepProps } from "@/types/stepTypes";
import { validationSchema } from "./step1CombinedValidation";
import { apiRequestWithAuth } from "@/lib/auth";

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
    userType: formData.step2?.userType ?? "",
    expressionEntitlement: formData.step2?.expressionEntitlement ?? [defaultExpression],
    groupListIsChecked: formData.step2?.groupListIsChecked ?? false,
  };

  const {
    register,
    setValue,
    control,
    watch,
    resetField,
    formState: { errors, isValid },
  } = useForm<CombinedStep1FormData>({
    resolver: yupResolver(validationSchema) as unknown as Resolver<CombinedStep1FormData>,
    mode: "onChange",
    defaultValues: {
      ...combinedData,
      ownerType: combinedData.ownerType || "User",
    },
  });

  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

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
      
      // Use apiRequestWithAuth for better error handling and automatic token refresh
      const templateData = await apiRequestWithAuth<any>(`YOUR_TEMPLATE_API_ENDPOINT/${selectedTemplate}`, {
        method: "GET",
      });
      setValue("certificationTemplate", templateData.name || "", { shouldValidate: true });
      setValue("description", templateData.description || "", { shouldValidate: true });
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
            <label className={`pl-2 ${asterisk}`}>Template Name</label>
            <div className="max-w-md">
              <input
                type="text"
                className="form-input"
                {...register("certificationTemplate")}
              />
              {errors.certificationTemplate?.message &&
                typeof errors.certificationTemplate.message === "string" && (
                  <p className="text-red-500">{errors.certificationTemplate.message}</p>
                )}
            </div>
          </div>

          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label className={`pl-2 ${asterisk}`}>Description</label>
            <div className="max-w-md">
              <textarea
                className="form-input"
                rows={3}
                {...register("description")}
              ></textarea>
              {errors.description?.message &&
                typeof errors.description.message === "string" && (
                  <p className="text-red-500">{errors.description.message}</p>
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
