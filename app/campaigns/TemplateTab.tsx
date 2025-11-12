"use client";

import React from "react";
import { useRouter } from "next/navigation";
import TemplateTable from "./TemplateTable";
import RunNowSidebar from "./RunNowSidebar";
import { useRightSidebar } from "@/contexts/RightSidebarContext";

const TemplateTab: React.FC = () => {
  const router = useRouter();
  const { openSidebar } = useRightSidebar();

  const handleEdit = (template: any) => {
    // Navigate to edit page with template ID
    router.push(`/campaigns/new?edit=${template.id}`);
  };

  const handleRunNow = (template: any) => {
    const handleRunNowSubmit = (data: any) => {
      // Handle Run Now submission
      console.log("Run Now data:", data);
      // TODO: Call API to run the template
      alert("Campaign started successfully!");
    };

    openSidebar(
      <RunNowSidebar
        template={template}
        onRunNow={handleRunNowSubmit}
      />,
      { widthPx: 600 }
    );
  };

  return <TemplateTable onEdit={handleEdit} onRunNow={handleRunNow} />;
};

export default TemplateTab;

