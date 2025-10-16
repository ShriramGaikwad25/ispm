import { useState } from "react";
import WizardSteps from "@/components/WizardSteps";
import SubmitDialog from "@/components/SubmitDialog";
import { useFormData } from "@/hooks/useFormData";
import { Step } from "@/types/stepTypes";
import { BookType, MoveLeft, MoveRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
interface WizardFormProps {
  steps: Step[];
}

const WizardForm: React.FC<WizardFormProps> = ({ steps }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useFormData();
  const [validationStatus, setValidationStatus] = useState<boolean[]>(
    Array(steps.length).fill(false)
  );

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter(); // Initialize router for navigation


  const handleSubmit = async () => {
    try {
      // Show the loading dialog (optional)
      setIsDialogOpen(true);

      // Send the form data to the server (replace with your API URL)
      const response = await fetch(
        "https://run.mocky.io/v3/ecaeebf3-b936-41b0-9d8e-176afc79099c",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData), // Send the formData directly without modifications
        }
      );

      // Check if the response is ok (status code 2xx)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Parse the response as JSON
      const responseText = await response.text(); // Get the raw response text

      if (responseText) {
        const jsonData = JSON.parse(responseText); // Try to parse it to JSON
        console.log("Form submission successful:", jsonData);
        // You can process the response here if needed
        // e.g., redirect the user or show a success message
        setIsDialogOpen(false); // Close the dialog after success
        alert("Data submitted successfully!"); // You can show a custom success message here
      } else {
        console.warn("Empty response received from server.");
        alert("Submission failed. No data received.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsDialogOpen(false); // Close dialog on error
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  const handleValidationChange = (isValid: boolean) => {
    setValidationStatus((prev) => {
      if (prev[currentStep] !== isValid) {
        const newStatus = [...prev];
        newStatus[currentStep] = isValid;
        return newStatus;
      }
      return prev;
    });
  };

  const nextStep = () => {
    if (validationStatus[currentStep] && currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1); // Go to the previous step
    }
  };
    const handleClose = () => {
    router.push("/campaigns"); // Navigate back to campaigns page
  };

  return (
    <>
          <button
        className="absolute top-14 right-10 p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-red-400 transition-colors duration-200"
        onClick={handleClose}
        title="Close Form"
        aria-label="Close form"
      >
        <X size={24} />
      </button>
      <WizardSteps
        currentStep={currentStep}
        steps={steps}
        validationStatus={validationStatus}
        onStepChange={(step) => {
          if (
            step <= currentStep ||
            validationStatus.slice(0, step).every(Boolean)
          ) {
            setCurrentStep(step);
          }
        }}
      />
      <div className="mb-6">
        {steps[currentStep].component({
          formData,
          setFormData,
          onValidationChange: handleValidationChange,
        })}
      </div>
      <SubmitDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        saveAsTemplate={saveAsTemplate}
        setSaveAsTemplate={setSaveAsTemplate}
        certificationTemplate={formData.step1?.certificationTemplate || ""}
        setCertificationTemplate={(value) =>
          setFormData((prev) => ({
            ...prev,
            step1: { ...prev.step1, certificationTemplate: value }, // Update formData
          }))
        }
      />
      <div className="flex gap-5 my-8 px-2 justify-center">
        {/* Previous Button */}
        
        <button
          className={`rounded px-4 py-2 flex gap-2 bg-blue-500 hover:bg-blue-500/80 text-white ${
            currentStep === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={prevStep}
          disabled={currentStep === 0}
          hidden={currentStep===0}
        >
          <MoveLeft /> Previous
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            className={`rounded px-4 py-2 flex gap-2 bg-blue-500 hover:bg-blue-500/80 text-white 
        ${validationStatus[currentStep] ? "" : "opacity-50 cursor-not-allowed"}
      `}
            onClick={nextStep}
            disabled={!validationStatus[currentStep]}
          >
            Next <MoveRight />
          </button>
        ) : (
          <div className="flex gap-5">
            <button
              className={`px-4 py-2 rounded cursor-pointer flex gap-2 items-center bg-[#8b03c6] text-white hover:bg-[#8b03c6]/80 ${
                currentStep === steps.length - 1 &&
                validationStatus[currentStep]
                  ? ""
                  : "opacity-50 cursor-not-allowed"
              }`}
              disabled={
                currentStep === steps.length - 1
                  ? !validationStatus[currentStep]
                  : true
              }
              onClick={() => {
                setIsDialogOpen(true);
                setSaveAsTemplate(true);
                handleSubmit();
              }}
            >
              <BookType size={18} /> Save As Template
            </button>
          </div>
        )}

        {}
      </div>
    </>
  );
};

export default WizardForm;





// "use client";

// interface WizardFormProps {
//   steps: Step[];
// }

//     Array(steps.length).fill(false)
//   );

//     try {
//       setIsDialogOpen(true);

//       // Transform formData into the API body structure
//         name: formData.step1?.certificationTemplate || "",
//         description: formData.step1?.description || "",
//         campaignType: formData.step2?.campaignType || "User", // Map campaignType (adjust if needed)
//         copyFromTemplate: formData.step1?.template || "",
//         campaignOwner: {
//           ownerType: formData.step1?.ownerType || "User",
//           ownerName: formData.step1?.ownerType === "User"
//             ? formData.step1?.ownerUser?.map(user => user.value) || []
//             : formData.step1?.ownerGroup?.map(group => group.value) || [],
//         },
//         certificationDuration: Number(formData.step1?.duration) || 90,
//         campaignID: "",
//         campaignDefinitionType: "MASTER",
//         campaignDefinitionParentID: "",
//         campaignDefinitionMasterID: "",
//         reviewers: formData.step3?.stages?.map((stage, index) => ({
//           stage: index + 1,
//           reviewDuration: Number(stage.duration) || 30,
//           reviewerType: stage.reviewer || "Manager",
//           description: `Stage ${index + 1} review`,
//           reviewerID: stage.reviewer === "custom-reviewer" && stage.customReviewerlist
//             ? "custom" // Adjust based on actual logic
//             : "",
//           customCertifiers: stage.reviewer === "custom-reviewer"
//             ? stage.genericExpression?.map(exp => ({
//                 attribute: exp.attribute?.value,
//                 operator: exp.operator?.value,
//                 value: exp.value,
//               })) || []
//             : [],
//         })) || [],
//         userCriteria: {
//           criteria: formData.step2?.userType === "All users" ? "allUsers"
//             : formData.step2?.userType === "Specific users" ? "selectedUsers"
//             : "customUserGroups",
//           selectedUsers: formData.step2?.specificUserExpression?.map(exp => ({
//             attribute: exp.attribute?.value,
//             operator: exp.operator?.value,
//             value: exp.value,
//           })) || [],
//           excludeUsersFromCampaign: formData.step2?.excludeUsersIsChecked
//             ? formData.step2?.excludeUsers?.map(user => user.value) || []
//             : [],
//           customUserGroups: formData.step2?.userType === "Custom User Group" && formData.step2?.groupListIsChecked
//             ? [formData.step2?.importNewUserGroup?.name || "Imported Group"]
//             : formData.step2?.userGroupList ? [formData.step2.userGroupList] : [],
//           filtercriteria: formData.step2?.specificUserExpression?.length > 0
//             ? {
//                 condition: "AND", // Adjust based on ExpressionBuilder logic
//                 children: null,
//                 attribute: formData.step2?.specificUserExpression[0]?.attribute?.value || null,
//                 operator: formData.step2?.specificUserExpression[0]?.operator?.value || null,
//                 value: formData.step2?.specificUserExpression[0]?.value || null,
//               }
//             : { condition: null, children: null, attribute: null, operator: null, value: null },
//         },
//         scopingCriteria: {
//           criteria: formData.step2?.selectData === "All Applications" ? "allApplications"
//             : formData.step2?.selectData === "Specific Applications" ? "selectedApplications"
//             : "specificEntitlements",
//           selectedApplications: formData.step2?.specificApps?.map(app => app.value) || [],
//           commonFilterForAccounts: {
//             criteria: formData.step2?.applicationScope ? "allUserAccounts" : "allAccounts",
//             filtercriteria: formData.step2?.expressionApps?.length > 0
//               ? {
//                   condition: "AND",
//                   children: null,
//                   attribute: formData.step2?.expressionApps[0]?.attribute?.value || null,
//                   operator: formData.step2?.expressionApps[0]?.operator?.value || null,
//                   value: formData.step2?.expressionApps[0]?.value || null,
//                 }
//               : { condition: null, children: null, attribute: null, operator: null, value: null },
//             createdAfter: "",
//             assignedAfter: null,
//           },
//           appSpecificFilter: [],
//           commonFilterForEntitlements: {
//             criteria: formData.step2?.selectData === "Select Entitlement" ? "specificEntitlements" : "allEntitlementsOfAccount",
//             filtercriteria: formData.step2?.expressionEntitlement?.length > 0
//               ? {
//                   condition: "AND",
//                   children: null,
//                   attribute: formData.step2?.expressionEntitlement[0]?.attribute?.value || null,
//                   operator: formData.step2?.expressionEntitlement[0]?.operator?.value || null,
//                   value: formData.step2?.expressionEntitlement[0]?.value || null,
//                 }
//               : { condition: null, children: null, attribute: null, operator: null, value: null },
//             createdAfter: null,
//             assignedAfter: formData.step2?.selectData === "Select Entitlement" ? "All Entitlements assigned after particular date" : null,
//           },
//           specificEntitlementsFilter: [],
//         },
//         reminders: {
//           enabled: formData.step4?.socReminders?.length > 0 || formData.step4?.eocReminders?.length > 0,
//           frequencyInDays: 7, // Hardcoded as per API body; adjust if form captures this
//           notificationTemplate: {
//             subject: `Reminder: Access Review for Campaign ${formData.step1?.certificationTemplate || "Campaign"}`,
//           },
//         },
//         notifications: {
//           onStart: {
//             notificationTemplate: {
//               subject: `Access Review Started: ${formData.step1?.certificationTemplate || "Campaign"}`,
//             },
//           },
//           onCompletion: {
//             notificationTemplate: {
//               subject: `Access Review Completed: ${formData.step1?.certificationTemplate || "Campaign"}`,
//             },
//           },
//           beforeExpiry: {
//             numOfDaysBeforeExpiry: formData.step4?.eocReminders?.map(reminder => Number(reminder.value)) || [7, 5, 3, 2],
//             notificationTemplate: {
//               subject: `Access Review about to Expire: ${formData.step1?.certificationTemplate || "Campaign"}`,
//             },
//           },
//           onEscalation: {
//             notificationTemplate: {
//               subject: `Escalation: Pending Access Review for ${formData.step1?.certificationTemplate || "Campaign"}`,
//             },
//           },
//         },
//         escalation: {
//           enabled: formData.step4?.allowEscalation ? true : false,
//           daysBeforeExpiry: Number(formData.step4?.allowEscalation) || 1,
//         },
//         certificationOptions: {
//           allowDelegation: false, // Not captured in form; hardcoded as per API body
//           allowPreDelegateToSignOff: formData.step4?.preDelegate || false,
//           requireCommentOnRevoke: formData.step4?.enforceComments === "Revoke" || formData.step4?.enforceComments === "Custom Fields",
//           requireCommentOnCertify: formData.step4?.enforceComments === "Certify" || formData.step4?.enforceComments === "Custom Fields",
//           closedLoopRemediation: formData.step4?.remediationTicketing || false,
//           defaultCertifier: {
//             type: formData.step4?.certifierUnavailableUsers?.length > 0 ? "User" : "",
//             reviewerId: formData.step4?.certifierUnavailableUsers?.[0]?.value || "ASRO",
//           },
//         },
//         campaignSchedular: {
//           startDate: formData.step4?.startDate?.toISOString() || "",
//           frequency: Number(formData.step4?.reviewRecurrence) || 7,
//           endOfCampaign: formData.step4?.end || "",
//         },
//       };

//       // Replace with your actual API endpoint
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(apiBody),

//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }

//       if (responseText) {
//         console.log("Form submission successful:", jsonData);
//         setIsDialogOpen(false);
//         alert("Campaign created successfully!");
//       } else {
//         console.warn("Empty response received from server.");
//         alert("Submission failed. No data received.");
//       }
//     } catch (error) {
//       console.error("Error submitting form:", error);
//       setIsDialogOpen(false);
//       alert("An error occurred while creating the campaign. Please try again.");
//     }
//   };

//       if (prev[currentStep] !== isValid) {
//         newStatus[currentStep] = isValid;
//       }
//   };

//     if (validationStatus[currentStep] && currentStep < steps.length - 1) {
//       setCurrentStep((prev) => prev + 1);
//     }
//   };

//     if (currentStep > 0) {
//       setCurrentStep((prev) => prev - 1);
//     }
//   };

//     <>
//       <WizardSteps
//         currentStep={currentStep}
//         steps={steps}
//         validationStatus={validationStatus}
//           if (
//             step <= currentStep ||
//             validationStatus.slice(0, step).every(Boolean)
//           ) {
//             setCurrentStep(step);
//           }
//         }}
//       />
//         {steps[currentStep].component({
//           formData,
//           setFormData,
//           onValidationChange: handleValidationChange,
//         })}
//       </div>
//       <SubmitDialog
//         isOpen={isDialogOpen}
//         onClose={() => setIsDialogOpen(false)}
//         saveAsTemplate={saveAsTemplate}
//         setSaveAsTemplate={setSaveAsTemplate}
//         certificationTemplate={formData.step1?.certificationTemplate || ""}
//         setCertificationTemplate={(value) =>
//           setFormData((prev) => ({
//             ...prev,
//             step1: { ...prev.step1, certificationTemplate: value },
//           }))
//         }
//       />
//         <button
//           className={`rounded px-4 py-2 flex gap-2 bg-blue-500 hover:bg-blue-500/80 text-white ${
//             currentStep === 0 ? "opacity-50 cursor-not-allowed" : ""
//           }`}
//           onClick={prevStep}
//           disabled={currentStep === 0}
//           hidden={currentStep === 0}
//         >
//         </button>

//         {currentStep < steps.length - 1 ? (
//           <button
//             className={`rounded px-4 py-2 flex gap-2 bg-blue-500 hover:bg-blue-500/80 text-white 
//         ${validationStatus[currentStep] ? "" : "opacity-50 cursor-not-allowed"}`}
//             onClick={nextStep}
//             disabled={!validationStatus[currentStep]}
//           >
//           </button>
//         ) : (
//             <button
//               className={`px-4 py-2 rounded cursor-pointer flex gap-2 items-center bg-[#8b03c6] text-white hover:bg-[#8b03c6]/80 ${
//                 currentStep === steps.length - 1 &&
//                 validationStatus[currentStep]
//                   ? ""
//                   : "opacity-50 cursor-not-allowed"
//               }`}
//               disabled={
//                 currentStep === steps.length - 1
//                   ? !validationStatus[currentStep]
//                   : true
//               }
//                 setIsDialogOpen(true);
//                 setSaveAsTemplate(true);
//                 handleSubmit();
//               }}
//             >
//             </button>
//             <button
//               className={`px-4 py-2 rounded cursor-pointer flex gap-2 items-center bg-[#15274E] text-white hover:bg-[#15274E]/80 ${
//                 currentStep === steps.length - 1 &&
//                 validationStatus[currentStep]
//                   ? ""
//                   : "opacity-50 cursor-not-allowed"
//               }`}
//               disabled={
//                 currentStep === steps.length - 1
//                   ? !validationStatus[currentStep]
//                   : true
//               }
//                 setIsDialogOpen(true);
//                 setSaveAsTemplate(false);
//                 handleSubmit();
//               }}
//             >
//               Prepare Campaign
//             </button>
//           </div>
//         )}
//       </div>
//     </>
//   );
// };

