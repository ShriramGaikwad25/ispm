"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import WizardForm from "./WizardForm";
import Step1 from "./Step1";
import Step3 from "./Step3";
import Step4 from "./Step4";
import { StepProps } from "@/types/stepTypes";
import { FormData } from "@/types/stepTypes";

const CreateCampaign = () => {
  const searchParams = useSearchParams();
  const editTemplateId = searchParams.get("edit");
  const [initialFormData, setInitialFormData] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editTemplateId) {
      // Fetch template data for editing
      setIsLoading(true);
      // TODO: Replace with actual API call to fetch template by ID
      // For now, using mock data
      const fetchTemplate = async () => {
        try {
          // const response = await fetch(`/api/templates/${editTemplateId}`);
          // const template = await response.json();
          
          // Mock template data - replace with actual API response
          const mockTemplate: FormData = {
            step1: {
              certificationTemplate: "Quarterly Access Review",
              description: "Quarterly review of all user access",
              template: "",
              ownerType: "User",
              ownerUser: [],
              ownerGroup: [],
            },
            step2: {
              userType: "All users",
              specificUserExpression: [],
              groupListIsChecked: false,
              userGroupList: "",
              importNewUserGroup: null,
              excludeUsersIsChecked: false,
              excludeUsers: "",
              selectData: "All Applications",
              specificApps: [],
              expressionApps: [],
              expressionEntitlement: [],
            },
            step3: {
              multiStageReview: false,
              stages: [],
              duration: "",
              reviewRecurrence: "",
              startDate: null,
              end: "",
            },
            step4: {
              socReminders: [],
              eocReminders: [],
              msTeamsNotification: false,
              remediationTicketing: false,
              allowDownloadUploadCropNetwork: false,
              markUndecidedRevoke: false,
              disableBulkAction: false,
              enforceComments: "",
              genericExpression: [],
              allowEscalation: "",
              certifierUnavailableUsers: [],
              ticketConditionalApproval: false,
              authenticationSignOff: false,
              generatePin: "",
              verifyUserAttribute: "",
              applicationScope: false,
              preDelegate: false,
              campaignPreview: false,
              campaignPreviewDuration: "",
              campaignPreviewEmailNotificationsEnabled: false,
              campaignPreviewEmailNotifications: false,
            },
          };
          
          setInitialFormData(mockTemplate);
        } catch (error) {
          console.error("Error fetching template:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchTemplate();
    }
  }, [editTemplateId]);

  const steps = [
    {
      name: "Basic Information",
      component: (props: React.JSX.IntrinsicAttributes & StepProps) => (
        <Step1 {...props} />
      ),
    },
    {
      name: "Approval Workflow",
      component: (props: React.JSX.IntrinsicAttributes & StepProps) => (
        <Step3 {...props} />
      ),
    },
    {
      name: "General Settings",
      component: (props: React.JSX.IntrinsicAttributes & StepProps) => (
        <Step4 {...props} />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Loading template...</div>
      </div>
    );
  }

  return <WizardForm steps={steps} initialFormData={initialFormData} />;
};

export default CreateCampaign;
