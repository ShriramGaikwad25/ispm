"use client";

import React from "react";
import { useRouter } from "next/navigation";
import TemplateTable from "./TemplateTable";

interface TemplateTabProps {
  campaignId?: string;
}

const TemplateTab: React.FC<TemplateTabProps> = ({ campaignId }) => {
  const router = useRouter();

  const handleEdit = (template: any) => {
    // Navigate to edit page with template ID
    router.push(`/campaigns/new?edit=${template.id}`);
  };

  const handleRunNow = (template: any) => {
    // Navigate to schedule page with template ID and name
    const templateName = encodeURIComponent(template.name || "Template");
    const queryParams = new URLSearchParams({ name: templateName });
    if (campaignId) {
      queryParams.append("campaignId", campaignId);
    }
    router.push(`/campaigns/schedule/${template.id}?${queryParams.toString()}`);
  };

  return <TemplateTable onEdit={handleEdit} onRunNow={handleRunNow} />;
};

export default TemplateTab;

