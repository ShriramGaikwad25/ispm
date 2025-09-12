// import { useEffect } from "react";
// import { Control, FieldValues, Resolver, useForm } from "react-hook-form";
// import { yupResolver } from "@hookform/resolvers/yup";
// import * as yup from "yup";
// import MultiSelect from "@/components/MultiSelect";
// import { loadUsers, customOption } from "@/components/MsAsyncData";
// import { asterisk, downArrow, template } from "@/utils/utils";
// import { Step1FormData, StepProps } from "@/types/stepTypes";

// const validationSchema = yup.object().shape({
//   certificationTemplate: yup
//     .string()
//     .required("Certification Template Name is required"),
//   description: yup.string().required("Description is required"),
//   template: yup.string(),
//   duration: yup
//     .string()
//     .required("Duration is required")
//     .test("is-number", "Duration must be a valid number", (value) => {
//       return /^\d+$/.test(value.trim()); // Ensures only numbers are entered
//     })
//     .test("is-greater-than-1", "Duration must be greater than 1", (value) => {
//       return Number(value) > 1; // Ensures number is greater than 1
//     }),
//   ownerType: yup.string().required("Owner Type is required"),

//   ownerUser: yup.array().when("ownerType", {
//     is: "User",
//     then: (schema) => schema.min(1, "Select at least one owner").required(),
//     otherwise: (schema) => schema.notRequired(),
//   }),

//   ownerGroup: yup.array().when("ownerType", {
//     is: "Group",
//     then: (schema) => schema.min(1, "Select at least one group").required(),
//     otherwise: (schema) => schema.notRequired(),
//   }),
// });

// const Step1: React.FC<StepProps> = ({
//   formData,
//   setFormData,
//   onValidationChange,
// }) => {
//   const {
//     register,
//     setValue,
//     control,
//     watch,
//     formState: { errors, isValid },
//   } = useForm<Step1FormData>({
//     resolver: yupResolver(
//       validationSchema
//     ) as unknown as Resolver<Step1FormData>,
//     mode: "onChange",
//     defaultValues: {
//       ...formData.step1,
//       ownerType: "User",
//     },
//   });

//   useEffect(() => {
//     onValidationChange(isValid);
//   }, [isValid, onValidationChange]);

//   useEffect(() => {
//     const subscription = watch((values) =>
//       setFormData({ ...formData, step1: values as Step1FormData })
//     );
//     return () => subscription.unsubscribe();
//   }, [watch, setFormData, formData]);

//   // **CLEAR THE OTHER FIELD WHEN OWNER TYPE CHANGES**
//   const ownerType = watch("ownerType");
//   useEffect(() => {
//     if (ownerType === "User") {
//       setValue("ownerGroup", [], { shouldValidate: true });
//     } else if (ownerType === "Group") {
//       setValue("ownerUser", [], { shouldValidate: true });
//     }
//   }, [ownerType, setValue]);

//   return (
//     <div className="container mx-auto px-4 py-10 flex justify-center">
//             <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-3xl">


//       <h2 className="text-xl font-bold text-blue-950 text-center">Create an access review campaign</h2>
//       <small className="block mb-6 text-blue-950 text-center">
//         Name your new campaign and set its ownership and rules.
//       </small>

//       <div className="text-sm space-y-6">
//         <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
//           <label className={`pl-2 ${asterisk}`}>Certification Template</label>
//           <div>
//             <input
//               type="text"
//               className="form-input"
//               {...register("certificationTemplate")}
//             />
//             {errors.certificationTemplate?.message &&
//               typeof errors.certificationTemplate.message === "string" && (
//                 <p className="text-red-500">
//                   {errors.certificationTemplate.message}
//                 </p>
//               )}
//           </div>
//         </div>

//         <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
//           <label className={`pl-2 ${asterisk}`}>Description</label>
//           <div>
//             <textarea
//               className="form-input"
//               rows={3}
//               {...register("description")}
//             ></textarea>
//             {errors.description?.message &&
//               typeof errors.description.message === "string" && (
//                 <p className="text-red-500">{errors.description.message}</p>
//               )}
//           </div>
//         </div>

//         <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
//           <label className={`pl-2`}>Copy from Template</label>
//           <div className="grid grid-cols-[1fr_.5fr] gap-2">
//             <MultiSelect
//               isMulti={false}
//               control={control as unknown as Control<FieldValues>}
//               options={template}
//               {...register("template")}
//             />
//             {errors.template?.message &&
//               typeof errors.template.message === "string" && (
//                 <p className="text-red-500">{errors.template.message}</p>
//               )}

//             <button className="rounded bg-blue-500 hover:bg-blue-500/80 text-white">
//               Apply
//             </button>
//           </div>
//         </div>

//         <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
//           <label className={`pl-2 ${asterisk}`}>Duration (days)</label>
//           <div>
//             <input
//               type="text"
//               className="form-input"
//               {...register("duration")}
//             />
//             {errors.duration?.message &&
//               typeof errors.duration.message === "string" && (
//                 <p className="text-red-500">{errors.duration.message}</p>
//               )}
//           </div>
//         </div>

//         <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
//           <label className={`pl-2 ${asterisk}`}>Owners</label>
//           <div>
//             {["User", "Group"].map((option, index, array) => (
//               <button
//                 key={option}
//                 type="button"
//                 className={`px-4 relative py-2 mb-3 min-w-16 rounded-md border border-gray-300 ${
//                   watch("ownerType") === option && downArrow
//                 }  ${
//                   watch("ownerType") === option ? "bg-[#15274E] text-white" : ""
//                 } ${index === 0 && "rounded-r-none"} ${
//                   array.length > 2 &&
//                   index === 1 &&
//                   "rounded-none border-r-0  border-l-0 "
//                 } ${index === array.length - 1 && "rounded-l-none"}`}
//                 onClick={() =>
//                   setValue("ownerType", option, { shouldValidate: true })
//                 }
//               >
//                 {option}
//               </button>
//             ))}

//             {watch("ownerType") === "User" && (
//               <>
//                 <MultiSelect
//                   className="max-w-[420px]"
//                   control={control as unknown as Control<FieldValues>}
//                   isAsync
//                   loadOptions={loadUsers}
//                   components={{ Option: customOption }}
//                   {...register("ownerUser")}
//                 />
//                 {errors.ownerUser?.message &&
//                   typeof errors.ownerUser.message === "string" && (
//                     <p className="text-red-500">{errors.ownerUser.message}</p>
//                   )}
//               </>
//             )}

//             {watch("ownerType") === "Group" && (
//               <>
//                 <MultiSelect
//                   className="max-w-[420px]"
//                   control={control as unknown as Control<FieldValues>}
//                   isAsync
//                   loadOptions={loadUsers}
//                   components={{ Option: customOption }}
//                   {...register("ownerGroup")}
//                 />
//                 {errors.ownerGroup?.message &&
//                   typeof errors.ownerGroup.message === "string" && (
//                     <p className="text-red-500">{errors.ownerGroup.message}</p>
//                   )}
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//     </div>
//   );
// };

// export default Step1;


import { useEffect, useState } from "react";
import { Control, FieldValues, Resolver, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import MultiSelect from "@/components/MultiSelect";
import { loadUsers, customOption } from "@/components/MsAsyncData";
import { asterisk, downArrow } from "@/utils/utils";
import { Step1FormData, StepProps } from "@/types/stepTypes";

const validationSchema = yup.object().shape({
  certificationTemplate: yup
    .string()
    .required("Certification Template Name is required"),
  description: yup.string().required("Description is required"),
  template: yup.string().notRequired(), // Optional field
  duration: yup
    .string()
    .required("Duration is required")
    .test("is-number", "Duration must be a valid number", (value) => {
      return /^\d+$/.test(value.trim());
    })
    .test("is-greater-than-1", "Duration must be greater than 1", (value) => {
      return Number(value) > 1;
    }),
  ownerType: yup.string().required("Owner Type is required"),
  ownerUser: yup.array().when("ownerType", {
    is: "User",
    then: (schema) => schema.min(1, "Select at least one owner").required(),
    otherwise: (schema) => schema.notRequired(),
  }),
  ownerGroup: yup.array().when("ownerType", {
    is: "Group",
    then: (schema) => schema.min(1, "Select at least one group").required(),
    otherwise: (schema) => schema.notRequired(),
  }),
});

// Function to fetch templates from API
const loadTemplates = async (inputValue: string) => {
  try {
    // Replace with your actual API endpoint
    const response = await fetch("https://preview.keyforge.ai/campaign/api/v1/ACMEPOC/getAllCampaigns", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add authentication headers if required
        // "Authorization": `Bearer ${yourToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }

    const data = await response.json();
    // Assuming API returns an array of templates in format [{ id: string, name: string }, ...]
    // Transform to react-select format: [{ label: string, value: string }, ...]
    return data.map((template: { id: string; name: string }) => ({
      label: template.name,
      value: template.id,
    }));
  } catch (error) {
    console.error("Error fetching templates:", error);
    return [];
  }
};

const Step1: React.FC<StepProps> = ({
  formData,
  setFormData,
  onValidationChange,
}) => {
  const {
    register,
    setValue,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<Step1FormData>({
    resolver: yupResolver(validationSchema) as unknown as Resolver<Step1FormData>,
    mode: "onChange",
    defaultValues: {
      ...formData.step1,
      ownerType: "User",
    },
  });

  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  useEffect(() => {
    const subscription = watch((values) =>
      setFormData({ ...formData, step1: values as Step1FormData })
    );
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

  const handleApplyTemplate = async () => {
    const selectedTemplate = watch("template");
    if (!selectedTemplate) {
      alert("Please select a template before applying.");
      return;
    }

    try {
      setIsLoadingTemplates(true);
      setTemplateError(null);
      // Fetch template details by ID
      const response = await fetch(`YOUR_TEMPLATE_API_ENDPOINT/${selectedTemplate}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Add authentication headers if required
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch template details: ${response.status}`);
      }

      const templateData = await response.json();
      // Update form fields with template data (adjust based on API response structure)
      setValue("certificationTemplate", templateData.name || "", { shouldValidate: true });
      setValue("description", templateData.description || "", { shouldValidate: true });
      setValue("duration", templateData.duration?.toString() || "", { shouldValidate: true });
      // Add other fields as needed
    } catch (error) {
      console.error("Error applying template:", error);
      setTemplateError("Failed to apply template. Please try again.");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 flex justify-center">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-3xl">
        <h2 className="text-xl font-bold text-blue-950 text-center">
          Create an access review campaign
        </h2>
        <small className="block mb-6 text-blue-950 text-center">
          Name your new campaign and set its ownership and rules.
        </small>

        <div className="text-sm space-y-6">
          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label className={`pl-2 ${asterisk}`}>Certification Template</label>
            <div>
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
            <div>
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

          <div className={`grid grid-cols-[280px_1.5fr] gap-2`}>
            <label className={`pl-2 ${asterisk}`}>Duration (days)</label>
            <div>
              <input
                type="text"
                className="form-input"
                {...register("duration")}
              />
              {errors.duration?.message &&
                typeof errors.duration.message === "string" && (
                  <p className="text-red-500">{errors.duration.message}</p>
                )}
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
                    loadOptions={loadUsers}
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
        </div>
      </div>
    </div>
  );
};

export default Step1;


