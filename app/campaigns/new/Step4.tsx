import { BookTemplate, InfoIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  durationOptions,
  enforceComments,
  recurrenceOptions,
  startOfCampaign,
  optionsData,
  selectAttribute,
} from "@/utils/utils";
import { customOption, loadUsers } from "@/components/MsAsyncData";
import ExpressionBuilder from "@/components/ExpressionBuilder";
import { Step4FormData, StepProps } from "@/types/stepTypes";
import DateInput from "@/components/DatePicker";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import CustomMultiSelect from "@/components/CustomMultiSelect";

const validationSchema = yup.object().shape({
  // Notifications
  socReminders: yup.array(),
  eocReminders: yup.array(),
  msTeamsNotification: yup.boolean(),
  remediationTicketing: yup.boolean(),
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

  duration: yup.string().required("Duration is required"),
  reviewRecurrence: yup.string().required("Review recurrence is required"),
  startDate: yup.date().nullable().required("Start date is required"),
  end: yup.string().required("End is required"),
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
    formState: { errors, isValid },
  } = useForm<Step4FormData>({
    resolver: yupResolver(
      validationSchema
    ) as unknown as Resolver<Step4FormData>,
    shouldUnregister: !formData.step4,
    mode: "onChange",
    defaultValues: {
      ...formData.step4,
      // genericExpression:[],
      // certifierUnavailableUsers: []
    },
  });
  const enforComments = watch("enforceComments");
  const showGenericExpression = enforComments === "Custom Fields";
  const [showTemplateSidebar, setShowTemplateSidebar] = useState(false);

  useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  useEffect(() => {
    if (!watch("authenticationSignOff")) {
      setValue("options", null);
      setValue("userAttribute", null);
    }
  }, [watch("authenticationSignOff"), setValue]);

  useEffect(() => {
    const subscription = watch((values) =>
      setFormData({ ...formData, step4: values as Step4FormData })
    );
    return () => subscription.unsubscribe();
  }, [watch, setFormData, formData]);

  const rowData = [
    {
      name: "On Start",
      details: "Details for Notification 1",
      reviewer: { firstname: "Alice" },
    },
    {
      name: "Before Expiry",
      details: "Details for Notification 2",
      reviewer: { firstname: "Alice" },
    },
    {
      name: "On Completion",
      details: "Details for Notification 3",
      reviewer: { firstname: "Alice" },
    },
    {
      name: "On Escalation",
      details: "Details for Notification 4",
      reviewer: { firstname: "Alice" },
    },
  ];

  const columnDefs = [
    {
      headerName: "Notifications",
      field: "name",
      cellRenderer: "agGroupCellRenderer",
      filter: false, // Disable filtering
      sortable: false, // Optional: disable sorting
      suppressMenu: true, // Suppress column menu (3-dot icon)
      suppressFiltersToolPanel: true,
    },
  ];
  const defaultColDef = useMemo(() => {
    return {
      width: 440,
      cellStyle: { fontWeight: "bold" },
    };
  }, []);

  const CustomDetailRenderer = (props) => {
    const { campaign, reviewer } = props.data;
    return (
      <div style={{ padding: "5%", backgroundColor: "whitesmoke" }}>
        <p>Subject: Access Review Completed: "asd"</p>
        <br />
        <p>
          Dear {reviewer.firstname},<br />
          <br />
          The campaign <strong>"asd"</strong> has been completed.
          <br />
          Thank you for your participation.
          <br />
        </p>
      </div>
    );
  };
  return (
    <div className="p-6 bg-white shadow-lg rounded-lg mx-auto">
      <h2 className="text-lg font-bold">General Settings</h2>
      <small className="text-gray-600 block mb-6">
        Determine Settings for Notification, Campaign Management and others.
      </small>

      <h2 className="font-medium"> Notification(s) </h2>
      <dl className="px-4 py-8 border-b border-gray-300 space-y-4 mb-8 text-sm">
        <dd className="mb-10">
          Enable Email notification for:-
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="h-10 flex gap-4 items-center">
                During the Campaign
              </label>
              {/* <MultiSelect
                placeholder="Select reminders or add custom value"
                defaultValue={[startOfCampaign[0]]}
                isCreatable={true}
                control={control as unknown as Control<FieldValues>}
                options={startOfCampaign}
                {...register("socReminders")}
              /> */}
              <CustomMultiSelect
                control={control}
                name="socReminders"
                options={startOfCampaign}
                placeholder="Select reminders or add custom value"
              />
              {errors.socReminders?.message &&
                typeof errors.socReminders.message === "string" && (
                  <p className="text-red-500">{errors.socReminders.message}</p>
                )}
            </div>
            <div>
              <label className="h-10 flex gap-4 items-center">
                End of Campaign
              </label>

              <MultiSelect
                placeholder="Select reminders or add custom value"
                defaultValue={[beforeExpiryReminders[0]]}
                isCreatable={true}
                control={control as unknown as Control<FieldValues>}
                options={beforeExpiryReminders}
                {...register("eocReminders")}
              />
              {errors.eocReminders?.message &&
                typeof errors.eocReminders.message === "string" && (
                  <p className="text-red-500">{errors.eocReminders.message}</p>
                )}
            </div>
            <div className="flex items-start mt-10 justify-center">
              <button
                className="h-10 flex gap-4 items-center bg-blue-500 text-white rounded-md px-4 cursor-pointer"
                onClick={() => setShowTemplateSidebar(true)}
              >
                <BookTemplate size={16} />
                Review and Edit Template
              </button>
            </div>
          </div>
        </dd>

        <dd className="grid grid-cols-2">
          <span>Integrate with Microsoft Teams for notification(s)</span>
          <span className="flex gap-2 items-center">
            No
            <ToggleSwitch
              checked={watch("msTeamsNotification")}
              onChange={(checked) => setValue("msTeamsNotification", checked)}
            />
            Yes
          </span>
        </dd>
        <dd className="grid grid-cols-2">
          <span>Integrate with Ticketing tool for Remediation</span>
          <span className="flex gap-2 items-center">
            No
            <ToggleSwitch
              checked={watch("remediationTicketing")}
              onChange={(checked) => setValue("remediationTicketing", checked)}
            />
            Yes
          </span>
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
        <dt> Mark all undecided access as Revoke</dt>
        <dd className="flex gap-2 items-center">
          {" "}
          No
          <ToggleSwitch
            checked={watch("markUndecidedRevoke")}
            onChange={(checked) => setValue("markUndecidedRevoke", checked)}
          />
          Yes{" "}
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
      <dl className="px-4 py-8 space-y-4 mb-8 grid grid-cols-2 text-sm">
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
        <dt>Enable additional Authentication for certification sign off </dt>
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

              {watch("options") === "userAttribute" && (
                <div>
                  <span className={`flex items-center ${asterisk}`}>
                    Select Attribute
                  </span>
                  <MultiSelect
                    placeholder="Select Attribute"
                    control={control as unknown as Control<FieldValues>}
                    isMulti={false}
                    options={selectAttribute}
                    {...register("userAttribute")}
                  />
                </div>
              )}
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
      <h2 className="font-medium">Campaign Scheduling</h2>
      <dl className="px-4 py-8 space-y-4 mb-8 grid grid-cols-2 text-sm">
        <div className="w-108">
          <label className={`h-10 ${asterisk}`}>Duration</label>

          <MultiSelect
            className="mb-4"
            isSearchable={false}
            isMulti={false}
            control={control as unknown as Control<FieldValues>}
            options={durationOptions}
            {...register("duration")}
          />
          {errors.duration?.message &&
            typeof errors.duration.message === "string" && (
              <p className="text-red-500">{errors.duration.message}</p>
            )}

          <label className={`h-10 ${asterisk}`}>Start Date</label>
          <DateInput
            control={control as unknown as Control<FieldValues>}
            name="startDate"
            className="w-108 px-2 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="w-108">
          <label className={`h-10 ${asterisk}`}>Review Recurrence</label>
          <MultiSelect
            className="mb-4"
            isSearchable={false}
            isMulti={false}
            control={control as unknown as Control<FieldValues>}
            options={recurrenceOptions}
            {...register("reviewRecurrence")}
          />
          {errors.reviewRecurrence?.message &&
            typeof errors.reviewRecurrence.message === "string" && (
              <p className="text-red-500">{errors.reviewRecurrence.message}</p>
            )}

          <label className={`h-10 ${asterisk}`}>End</label>
          <div className="w-110">
            {["Never", "On specific date", "After number of occurences"].map(
              (option, index) => (
                <button
                  key={option}
                  type="button"
                  className={`px-4 py-2 rounded-md border border-gray-300 ${
                    watch("end") === option ? "bg-[#15274E] text-white" : ""
                  } ${
                    index === 0
                      ? "rounded-r-none"
                      : index === 1
                      ? "rounded-none border-r-0  border-l-0 px-4.5"
                      : "rounded-l-none"
                  }`}
                  onClick={() =>
                    setValue("end", option, { shouldValidate: true })
                  }
                >
                  {option}
                </button>
              )
            )}
          </div>
        </div>
      </dl>
      {showTemplateSidebar && (
        <div className="fixed top-16 right-0 h-[calc(100%-4rem)] w-[500px] bg-white shadow-lg z-50 overflow-auto">
          <div className="flex justify-between items-center p-4 border-b ">
            <h3 className="text-lg font-semibold">Notification Template</h3>
            <button
              onClick={() => setShowTemplateSidebar(false)}
              className="text-gray-600 hover:text-black text-lg"
            >
              &times;
            </button>
          </div>
          <div className="p-4">
            {/* You can replace this with the actual form or editor */}
            <div style={{ height: 700, width: 450 }}>
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                suppressMenuHide={true}
                suppressColumnVirtualisation={true}
                suppressContextMenu={true}
                masterDetail={true}
                defaultColDef={defaultColDef}
                detailCellRenderer={CustomDetailRenderer}
                detailRowHeight={200} // Adjust as needed
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step4;
