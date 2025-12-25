"use client";

import React from "react";
import { useRouter } from "next/navigation";
import TemplateTable from "./TemplateTable";

const TemplateTab: React.FC = () => {
  const router = useRouter();

  const handleEdit = (template: any) => {
    // Navigate to edit page with template ID
    router.push(`/campaigns/new?edit=${template.id}`);
  };

  const handleRunNow = (template: any) => {
    // Navigate to schedule page with template ID and name
    const templateName = encodeURIComponent(template.name || "Template");
    router.push(`/campaigns/schedule/${template.id}?name=${templateName}`);
  };

  return <TemplateTable onEdit={handleEdit} onRunNow={handleRunNow} />;
};

export default TemplateTab;

