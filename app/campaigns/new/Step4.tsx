import { BookTemplate, InfoIcon } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  Control,
  FieldValues,
  Resolver,
  useForm,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ToggleSwitch from "@/components/ToggleSwitch";
import MultiSelect from "@/components/MultiSelect";
import {
  asterisk,
  beforeExpiryReminders,
  enforceComments,
  startOfCampaign,
  everyDayReminders,
  beforeReminders,
  optionsData,
  selectAttribute,
} from "@/utils/utils";
import { customOption, loadUsers } from "@/components/MsAsyncData";
import ExpressionBuilder from "@/components/ExpressionBuilder";
import { Step4FormData, StepProps } from "@/types/stepTypes";
import CustomMultiSelect from "@/components/CustomMultiSelect";
import CustomMultiSelectBeforeExpiry from "@/components/CustomMultiSelectBeforeExpiry";
import CustomMultiSelectBeforeEscalation from "@/components/CustomMultiSelectBeforeEscalation";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import EmailTemplateEditor from "@/components/EmailTemplateEditor";


const validationSchema = yup.object().shape({
  // Notifications
  socReminders: yup.array(),
  eocReminders: yup.array(),
  // New notification fields
  startOfCampaign: yup.boolean(),
  startOfCampaignReminders: yup.array().when("startOfCampaign", {
    is: true,
    then: (schema) => schema.min(1, "At least one reminder is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  remindersDuringCampaign: yup.boolean(),
  remindersDuringCampaignReminders: yup.array().when("remindersDuringCampaign", {
    is: true,
    then: (schema) => schema.min(1, "At least one reminder is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  atEscalation: yup.boolean(),
  atEscalationReminders: yup.array().when("atEscalation", {
    is: true,
    then: (schema) => schema.min(1, "At least one reminder is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  campaignClosure: yup.boolean(),
  msTeamsNotification: yup.boolean(),
  msTeamsChannelName: yup.string().when("msTeamsNotification", {
    is: true,
    then: (schema) => schema
      .required("Channel name is required")
      .max(50, "Channel name must be no more than 50 characters"),
    otherwise: (schema) => schema.notRequired(),
  }),
  msTeamsDescription: yup.string().when("msTeamsNotification", {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.notRequired(),
  }),
  msTeamsTeamId: yup.string().when("msTeamsNotification", {
    is: true,
    then: (schema) => schema.required("Team ID/Microsoft 365 Group ID is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  allowDownloadUploadCropNetwork: yup.boolean(),

  // Campaign Management
  markUndecidedRevoke: yup.boolean(),
  disableBulkAction: yup.boolean(),
  enforceComments: yup.string(),
  genericExpression: yup.array().when("enforceComments", {
    is: "Custom Fields",
    then: (schema) =>
      schema
        .of(
          yup.object().shape({
            attribute: yup
              .object()
              .nullable()
              .required("Attribute is required"),
            operator: yup.object().nullable().required("Operator is required"),
            value: yup.string().required("Value is required"),
          })
        )
        .min(1, "At least one condition is required")
        .default([]), // 👈 Ensures validation even if untouched
    otherwise: (schema) => schema.notRequired(),
  }),
  // Advanced Setting
  allowEscalation: yup.string(),
  certifierUnavailableUsers: yup.array().nullable().notRequired(),
  ticketConditionalApproval: yup.boolean(),
  authenticationSignOff: yup.boolean(),
  // generatePin: yup.string().when("authenticationSignOff", {
  //   is: true,
  //   then: (schema) => schema.required("User Pin is required"),
  //   otherwise: (schema) => schema.notRequired(),
  // }),
  // verifyUserAttribute: yup.string().when("authenticationSignOff", {
  //   is: true,
  //   then: (schema) => schema.required("User Attribute is required"),
  //   otherwise: (schema) => schema.notRequired(),
  // }),
  applicationScope: yup.boolean(),
  preDelegate: yup.boolean(),
});

const Step4: React.FC<StepProps> = ({
  formData,
  setFormData,
  onValidationChange,
}) => {
  const {
    register,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<Step4FormData>({
    resolver: yupResolver(
      validationSchema
    ) as unknown as Resolver<Step4FormData>,
    shouldUnregister: !formData.step4,
    mode: "onChange",
    defaultValues: formData.step4 || {},
  });
  const enforComments = watch("enforceComments");
  const showGenericExpression = enforComments === "Custom Fields";
  const { openSidebar, closeSidebar } = useRightSidebar();

  // Options for dropdowns
  // During campaign options (includes Start Of Campaign)
  const duringCampaignOptions = [...startOfCampaign, ...everyDayReminders];
  // During campaign options without Start Of Campaign
  const duringCampaignWithoutStartOptions = [...everyDayReminders];
  // During campaign before escalation options (includes On Day of Escalation)
  const onDayOfEscalation = [{ value: "On Day of Escalation", label: "On Day of Escalation" }];
  const beforeEscalationOptions = [...onDayOfEscalation, ...beforeReminders];

  // Helper function to open email template editor in right sidebar
  const handleOpenTemplateEditor = (templateType: "start" | "reminders" | "escalation" | "closure") => {
    const titles = {
      start: "Email Template - Start of Campaign",
      reminders: "Email Template - Reminders during Campaign",
      escalation: "Email Template - At Escalation",
      closure: "Email Template - Campaign Closure",
    };

    openSidebar(
      <EmailTemplateEditor
        templateType={templateType}
        onSave={(data) => {
          console.log("Template saved:", templateType, data);
          // You can save this to formData or make an API call here
        }}
      />,
      {
        widthPx: 600,
        title: titles[templateType],
      }
    );
  };

  const prevStep4Ref = useRef<string | undefined>();
  const isInitialMount = useRef(true);

  // Reset form when formData.step4 changes externally (e.g., when template is applied)
  // Use serialized comparison to avoid infinite loops
  useEffect(() => {
    const currentSerialized = formData.step4 ? JSON.stringify({
      socReminders: formData.step4.socReminders,
      eocReminders: formData.step4.eocReminders,
      startOfCampaign: formData.step4.startOfCampaign,
      startOfCampaignReminders: formData.step4.startOfCampaignReminders,
      remindersDuringCampaign: formData.step4.remindersDuringCampaign,
      remindersDuringCampaignReminders: formData.step4.remindersDuringCampaignReminders,
      atEscalation: formData.step4.atEscalation,
      atEscalationReminders: formData.step4.atEscalationReminders,
      campaignClosure: formData.step4.campaignClosure,
      msTeamsNotification: formData.step4.msTeamsNotification,
      msTeamsChannelName: formData.step4.msTeamsChannelName,
      msTeamsDescription: formData.step4.msTeamsDescription,
      msTeamsTeamId: formData.step4.msTeamsTeamId,
      enforceComments: formData.step4.enforceComments,
      genericExpression: formData.step4.genericExpression,
    }) : "";
    
    // Always reset on initial mount or if data actually changed
    if (isInitialMount.current || prevStep4Ref.current !== currentSerialized) {
      if (formData.step4) {
        const newValues = { ...formData.step4 };
        console.log("Step4: Resetting form with values:", newValues, "Previous:", prevStep4Ref.current, "Current formData:", formData.step4);
        
        // Reset the form with new values - this should update all fields
        reset(newValues);
        
        prevStep4Ref.current = currentSerialized;
      }
      isInitialMount.current = false;
    }
  }, [formData.step4, reset]);

  useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  useEffect(() => {
    if (!watch("authenticationSignOff")) {
      setValue("options", undefined);
      setValue("userAttribute", undefined);
    }
  }, [watch("authenticationSignOff"), setValue]);

  useEffect(() => {
    const subscription = watch((values) => {
      setFormData((prev) => {
        // Only update if values actually changed to prevent infinite loops
        const currentSerialized = JSON.stringify({
          socReminders: prev.step4?.socReminders,
          eocReminders: prev.step4?.eocReminders,
          startOfCampaign: prev.step4?.startOfCampaign,
          startOfCampaignReminders: prev.step4?.startOfCampaignReminders,
          remindersDuringCampaign: prev.step4?.remindersDuringCampaign,
          remindersDuringCampaignReminders: prev.step4?.remindersDuringCampaignReminders,
          atEscalation: prev.step4?.atEscalation,
          atEscalationReminders: prev.step4?.atEscalationReminders,
          campaignClosure: prev.step4?.campaignClosure,
          msTeamsNotification: prev.step4?.msTeamsNotification,
          enforceComments: prev.step4?.enforceComments,
        });
        const newSerialized = JSON.stringify({
          socReminders: values.socReminders,
          eocReminders: values.eocReminders,
          startOfCampaign: values.startOfCampaign,
          startOfCampaignReminders: values.startOfCampaignReminders,
          remindersDuringCampaign: values.remindersDuringCampaign,
          remindersDuringCampaignReminders: values.remindersDuringCampaignReminders,
          atEscalation: values.atEscalation,
          atEscalationReminders: values.atEscalationReminders,
          campaignClosure: values.campaignClosure,
          msTeamsNotification: values.msTeamsNotification,
          enforceComments: values.enforceComments,
        });
        
        if (currentSerialized !== newSerialized) {
          return { ...prev, step4: values as Step4FormData };
        }
        return prev;
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, setFormData]);

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg mx-auto">
      <h2 className="text-lg font-bold">General Settings</h2>
      <small className="text-gray-600 block mb-6">
        Determine Settings for Notification, Campaign Management and others.
      </small>

      <h2 className="font-medium"> Notification(s) </h2>
      <dl className="px-4 py-8 border-b border-gray-300 space-y-6 mb-8 text-sm">
        {/* Start of Campaign */}
        <dd className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-48">Start of Campaign</span>
            <div className="flex gap-2 items-center">
              No
              <ToggleSwitch
                checked={watch("startOfCampaign")}
                onChange={(checked) => {
                  setValue("startOfCampaign", checked);
                  if (!checked) {
                    setValue("startOfCampaignReminders", []);
                  }
                }}
              />
              Yes
            </div>
          </div>
          {watch("startOfCampaign") && (
            <div className="ml-52 space-y-2">
              <div className="flex gap-2 items-start">
                <div className="w-1/2">
                  <CustomMultiSelect
                    control={control}
                    name="startOfCampaignReminders"
                    options={duringCampaignOptions}
                    placeholder="Select reminders or add custom value"
                  />
                </div>
                <button
                  type="button"
                  className="flex gap-2 items-center bg-blue-500 text-white rounded-md px-4 py-2 cursor-pointer hover:bg-blue-600 whitespace-nowrap"
                  onClick={() => handleOpenTemplateEditor("start")}
                >
                  <BookTemplate size={16} />
                  Select Template
                </button>
              </div>
              {errors.startOfCampaignReminders?.message &&
                typeof errors.startOfCampaignReminders.message === "string" && (
                  <p className="text-red-500">{errors.startOfCampaignReminders.message}</p>
                )}
            </div>
          )}
        </dd>

        {/* Reminders during Campaign */}
        <dd className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-48">Reminders during Campaign</span>
            <div className="flex gap-2 items-center">
              No
              <ToggleSwitch
                checked={watch("remindersDuringCampaign")}
                onChange={(checked) => {
                  setValue("remindersDuringCampaign", checked);
                  if (!checked) {
                    setValue("remindersDuringCampaignReminders", []);
                  }
                }}
              />
              Yes
            </div>
          </div>
          {watch("remindersDuringCampaign") && (
            <div className="ml-52 space-y-2">
              <div className="flex gap-2 items-start">
                <div className="w-1/2">
                  <CustomMultiSelect
                    control={control}
                    name="remindersDuringCampaignReminders"
                    options={duringCampaignWithoutStartOptions}
                    placeholder="Select reminders or add custom value"
                  />
                </div>
                <button
                  type="button"
                  className="flex gap-2 items-center bg-blue-500 text-white rounded-md px-4 py-2 cursor-pointer hover:bg-blue-600 whitespace-nowrap"
                  onClick={() => handleOpenTemplateEditor("reminders")}
                >
                  <BookTemplate size={16} />
                  Select Template
                </button>
              </div>
              {errors.remindersDuringCampaignReminders?.message &&
                typeof errors.remindersDuringCampaignReminders.message === "string" && (
                  <p className="text-red-500">{errors.remindersDuringCampaignReminders.message}</p>
                )}
            </div>
          )}
        </dd>

        {/* At Escalation */}
        <dd className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-48">At Escalation</span>
            <div className="flex gap-2 items-center">
              No
              <ToggleSwitch
                checked={watch("atEscalation")}
                onChange={(checked) => {
                  setValue("atEscalation", checked);
                  if (!checked) {
                    setValue("atEscalationReminders", []);
                  }
                }}
              />
              Yes
            </div>
          </div>
          {watch("atEscalation") && (
            <div className="ml-52 space-y-2">
              <div className="flex gap-2 items-start">
                <div className="w-1/2">
                  <CustomMultiSelectBeforeEscalation
                    control={control}
                    name="atEscalationReminders"
                    options={beforeEscalationOptions}
                    placeholder="every - days before escalation"
                  />
                </div>
                <button
                  type="button"
                  className="flex gap-2 items-center bg-blue-500 text-white rounded-md px-4 py-2 cursor-pointer hover:bg-blue-600 whitespace-nowrap"
                  onClick={() => handleOpenTemplateEditor("escalation")}
                >
                  <BookTemplate size={16} />
                  Select Template
                </button>
              </div>
              {errors.atEscalationReminders?.message &&
                typeof errors.atEscalationReminders.message === "string" && (
                  <p className="text-red-500">{errors.atEscalationReminders.message}</p>
                )}
            </div>
          )}
        </dd>

        {/* Campaign Closure */}
        <dd className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-48">Campaign Closure</span>
            <div className="flex gap-2 items-center">
              No
              <ToggleSwitch
                checked={watch("campaignClosure")}
                onChange={(checked) => setValue("campaignClosure", checked)}
              />
              Yes
            </div>
          </div>
          {watch("campaignClosure") && (
            <div className="ml-52">
              <button
                type="button"
                className="flex gap-2 items-center bg-blue-500 text-white rounded-md px-4 py-2 cursor-pointer hover:bg-blue-600"
                onClick={() => handleOpenTemplateEditor("closure")}
              >
                <BookTemplate size={16} />
                Select Template
              </button>
            </div>
          )}
        </dd>

        <dd className="grid grid-cols-2">
          <span>Integrate with Microsoft Teams for notification(s)</span>
          <div className="flex flex-col gap-2">
            <span className="flex gap-2 items-center">
              No
              <ToggleSwitch
                checked={watch("msTeamsNotification")}
                onChange={(checked) => {
                  setValue("msTeamsNotification", checked);
                  if (!checked) {
                    setValue("msTeamsChannelName", "");
                    setValue("msTeamsDescription", "");
                    setValue("msTeamsTeamId", "");
                  }
                }}
              />
              Yes
            </span>
            {watch("msTeamsNotification") && (
              <div className="flex flex-col gap-3 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("msTeamsChannelName")}
                    maxLength={50}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide channel name (no more than 50 characters)"
                  />
                  {errors.msTeamsChannelName?.message && (
                    <p className="text-red-500 text-sm mt-1">{errors.msTeamsChannelName.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {watch("msTeamsChannelName")?.length || 0}/50 characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register("msTeamsDescription")}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 resize-y"
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team ID/Microsoft 365 Group ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("msTeamsTeamId")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Team ID or Microsoft 365 Group ID"
                  />
                  {errors.msTeamsTeamId?.message && (
                    <p className="text-red-500 text-sm mt-1">{errors.msTeamsTeamId.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </dd>
        <dd className="grid grid-cols-2">
          <span className="flex gap-2 items-center">
            Only allow Download/Upload on “Sharepoint/Corporate Network”
            <InfoIcon className=" text-gray-500" size={16} />
          </span>
          <span>
            <input
              type="checkbox"
              className="scale-130"
              {...register("allowDownloadUploadCropNetwork")}
            />
          </span>
        </dd>
      </dl>
      <h2 className="font-medium">Campaign Management</h2>
      <dl className="px-4 py-8 border-b border-gray-300 space-y-4 mb-8 grid grid-cols-2 text-sm">
        <dt> Mark undecided access as</dt>
        <dd className="flex gap-2 items-center">
          <span
            className={`flex items-center ${
              !watch("markUndecidedRevoke") ? ` text-black` : "text-black/50"
            }`}
          >
            {" "}
            Revoke
          </span>
          <ToggleSwitch
            checked={watch("markUndecidedRevoke")}
            onChange={(checked) => setValue("markUndecidedRevoke", checked)}
          />
          <span
            className={`flex items-center ${
              watch("markUndecidedRevoke") ? ` text-black` : "text-black/50"
            }`}
          >
            Certify{" "}
          </span>
        </dd>
        <dt> Disable Bulk Action</dt>
        <dd className="flex gap-2 items-center">
          {" "}
          No
          <ToggleSwitch
            checked={watch("disableBulkAction")}
            onChange={(checked) => setValue("disableBulkAction", checked)}
          />
          Yes{" "}
        </dd>
        <dt>Enforce Comments/Justification on </dt>
        <dd>
          <MultiSelect
            isSearchable={false}
            isMulti={false}
            control={control as unknown as Control<FieldValues>}
            options={enforceComments}
            {...register("enforceComments")}
          />
          {errors.enforceComments?.message &&
            typeof errors.enforceComments.message === "string" && (
              <p className="text-red-500">{errors.enforceComments.message}</p>
            )}
          {showGenericExpression && (
            <div className="mt-4">
              <ExpressionBuilder
                title="Build Expressions"
                control={control as unknown as Control<FieldValues>}
                setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                watch={watch as unknown as UseFormWatch<FieldValues>}
                fieldName={"genericExpression"}
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
              {errors.genericExpression?.message &&
                typeof errors.genericExpression.message === "string" && (
                  <p className="text-red-500">
                    {errors.genericExpression.message}
                  </p>
                )}
            </div>
          )}
        </dd>
      </dl>
      <h2 className="font-medium">Advanced Setting</h2>
      <dl className="px-4 border-b border-gray-300 py-8 space-y-4 mb-8 grid grid-cols-2 text-sm">
        <dt> Allow Escalation</dt>
        <dd className="flex gap-2 items-center">
          <input
            type="text"
            className="form-input !w-1/3"
            {...register("allowEscalation")}
          />
          <span> days before end of campaign.</span>
        </dd>

        <dt> If Certifier is Unavailable, then select user</dt>
        <dd>
          <MultiSelect
            placeholder="Select User(s)"
            control={control as unknown as Control<FieldValues>}
            isAsync
            loadOptions={loadUsers}
            components={{ Option: customOption }}
            {...register("certifierUnavailableUsers")}
          />
          {errors.certifierUnavailableUsers?.message &&
            typeof errors.certifierUnavailableUsers.message === "string" && (
              <p className="text-red-500">
                {errors.certifierUnavailableUsers.message}
              </p>
            )}
        </dd>
        <dt>
          Open ticket for Conditional Approval tasks with future termination
          date
        </dt>
        <dd className="flex gap-2 items-center">
          {" "}
          No
          <ToggleSwitch
            checked={watch("ticketConditionalApproval")}
            onChange={(checked) =>
              setValue("ticketConditionalApproval", checked)
            }
          />
          Yes{" "}
        </dd>
        <dt>Enable additional Authentication for certification sign off(Password)</dt>
        <dd>
          <div className="flex gap-2 items-center">
            No
            <ToggleSwitch
              checked={watch("authenticationSignOff")}
              onChange={(checked) => setValue("authenticationSignOff", checked)}
            />
            Yes{" "}
          </div>

          {watch("authenticationSignOff") && (
            <div className="grid grid-cols-2 gap-2 mt-6">
              <div>
                <span className={`flex items-center ${asterisk}`}>Options</span>
                <MultiSelect
                  placeholder="Select Option"
                  control={control as unknown as Control<FieldValues>}
                  isMulti={false}
                  options={optionsData}
                  isSearchable={false}
                  {...register("options")}
                />
              </div>

              {}
            </div>
          )}
        </dd>
        <dt>Application Scope </dt>
        <dd className="flex gap-2 items-center">
          <span
            className={`flex items-center ${
              !watch("applicationScope") ? ` text-black` : "text-black/50"
            }`}
          >
            {" "}
            All Active Accounts
          </span>
          <ToggleSwitch
            checked={watch("applicationScope")}
            onChange={(checked) => setValue("applicationScope", checked)}
          />
          <span
            className={`flex items-center ${
              watch("applicationScope") ? ` text-black` : "text-black/50"
            }`}
          >
            All User Accounts
          </span>
        </dd>

        <dt>Do you want to allow pre-delegate to sign off</dt>
        <dd className="flex gap-2 items-center">
          {" "}
          No
          <ToggleSwitch
            checked={watch("preDelegate")}
            onChange={(checked) => setValue("preDelegate", checked)}
          />
          Yes{" "}
        </dd>
      </dl>
    </div>
  );
};

export default Step4;
