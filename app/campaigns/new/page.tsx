"use client";
import React from "react";
import WizardForm from "./WizardForm";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import { StepProps } from "@/types/stepTypes";

const CreateCampaign = () => {
  const steps = [
    {
      name: "Basic Information",
      component: (props: React.JSX.IntrinsicAttributes & StepProps) => (
        <Step1 {...props} />
      ),
    },
    {
      name: "Campaign Scope",
      component: (props: React.JSX.IntrinsicAttributes & StepProps) => (
        <Step2 {...props} />
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

  return <WizardForm steps={steps} />;
};

export default CreateCampaign;
