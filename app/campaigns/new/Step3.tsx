import { CirclePlus, InfoIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm, Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import MultiStageReview from "./MultiStageReview";
import { Step3FormData, StepProps } from "@/types/stepTypes";
import validationSchema from "./step3Validation";

const Step3: React.FC<StepProps> = ({
  formData,
  setFormData,
  onValidationChange,
}) => {
  const {
    register,
    watch,
    control,
    setValue,
    reset,
    formState: { errors, isValid },
    resetField,
    unregister,
  } = useForm<Step3FormData>({
    resolver: yupResolver(validationSchema) as Resolver<Step3FormData>,
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: formData.step3 || {
      multiStageReview: false,
      stages: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "stages",
  });

  const prevStep3Ref = useRef<string | undefined>();
  const isInitialMount = useRef(true);

  // Reset form when formData.step3 changes externally (e.g., when template is applied)
  // Use serialized comparison to avoid infinite loops
  useEffect(() => {
    if (formData.step3) {
      const currentSerialized = JSON.stringify({
        multiStageReview: formData.step3.multiStageReview,
        stages: formData.step3.stages,
      });
      
      // Always reset on initial mount or if data actually changed
      if (isInitialMount.current || prevStep3Ref.current !== currentSerialized) {
        const newValues = {
          multiStageReview: formData.step3.multiStageReview ?? false,
          stages: formData.step3.stages ?? [],
        };
        console.log("Step3: Resetting form with values:", newValues, "Previous:", prevStep3Ref.current, "Current formData:", formData.step3);
        
        // Mark that we're resetting from template to prevent auto-append
        hasResetFromTemplate.current = true;
        
        // Reset the form with new values - this should update all fields
        reset(newValues);
        
        prevStep3Ref.current = currentSerialized;
        isInitialMount.current = false;
      }
    }
  }, [formData.step3, reset, setValue]);

  useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  useEffect(() => {
    const subscription = watch((values) => {
      setFormData((prev) => {
        // Only update if values actually changed to prevent infinite loops
        const currentSerialized = JSON.stringify({
          multiStageReview: prev.step3?.multiStageReview,
          stages: prev.step3?.stages,
        });
        const newSerialized = JSON.stringify({
          multiStageReview: values.multiStageReview,
          stages: values.stages,
        });
        
        if (currentSerialized !== newSerialized) {
          return { ...prev, step3: values as Step3FormData };
        }
        return prev;
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, setFormData]);

  const multiStageReviewEnabled = watch("multiStageReview");
  const hasResetFromTemplate = useRef(false);
  
  useEffect(() => {
    // Don't auto-append if we just reset from template data
    if (hasResetFromTemplate.current) {
      hasResetFromTemplate.current = false;
      return;
    }
    
    if (fields.length === 0 || multiStageReviewEnabled) {
      append({
        reviewer: "",
        duration: "",
        nextReviewerAction: false,
        reviewerlistIsChecked: false,
        genericExpression: [],
        customReviewerlist: null,
      });
    }

    if (!multiStageReviewEnabled && fields.length > 0) {
      fields.forEach((_, index) => {
        if (index > 0) remove(fields.length - index);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiStageReviewEnabled]);

  return (
    <div className="container flex justify-center p-4">

      <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-lg font-bold">Approval Workflow</h2>
      <small className="text-gray-600 block mb-6">
        Determine review stages, reviewers, and timeline below.
      </small>
      <div className="text-sm space-y-4 min-w-max lg:w-1/2">
        <div className="grid grid-cols-[280px_1.5fr] items-center gap-2 mb-10">
          <span className="flex gap-2 items-center">
            {" "}
            Multi-stage Review <InfoIcon className=" text-gray-500" size={16} />
          </span>
          <div>
            <input
              type="checkbox"
              className="scale-130"
              {...register("multiStageReview")}
            />
          </div>
        </div>

        {fields.map((item, index) => {
          return (
            <div key={item.id + 1}>
              <MultiStageReview
                index={index}
                control={control}
                register={register}
                errors={errors?.stages}
                removeStage={() => remove(index)}
                watch={watch}
                setValue={setValue}
                resetField={resetField}
                unregister={unregister}
              >
                {index < fields.length - 1 && (
                  <div className="my-2 flex items-center gap-2 px-1">
                    <input
                      type="checkbox"
                      className="scale-130"
                      {...register(`stages.${index}.nextReviewerAction`)}
                    />
                    Show action to next reviewer{" "}
                    <InfoIcon className="text-gray-500" size={16} />
                  </div>
                )}
              </MultiStageReview>
            </div>
          );
        })}
        {watch("multiStageReview") && (
          <button
            type="button"
            onClick={() => {
              append({
                reviewer: "",
                duration: "",
                nextReviewerAction: false,
                reviewerlistIsChecked: false,
                genericExpression: [],
                customReviewerlist: null,
              });
            }}
            className="mt-4 flex gap-2 text-blue-500 cursor-pointer group "
          >
            <CirclePlus
              size={18}
              className="group-hover:bg-blue-500 rounded-full group-hover:text-white"
            />
            Add a stage
          </button>
        )}
      </div>
    </div>
    </div>
  );
};

export default Step3;
