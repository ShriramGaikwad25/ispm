"use client";
import React, { useState } from "react";
import HorizontalTabs from "@/components/HorizontalTabs";
import OpenTab from "./OpenTab";
import CompleteTab from "./CompleteTab";
import { ChevronRight, ChevronDown } from "lucide-react";
import { formatDateMMDDYY as formatDateShared } from "@/utils/utils";

// Re-export the date formatter for other components that depend on it
export const formatDateMMDDYY = (dateString?: string) =>
  formatDateShared(dateString);

const AccessReview: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      label: "Open",
      component: OpenTab,
      icon: ChevronDown,
      iconOff: ChevronRight,
    },
    {
      label: "Complete", 
      component: CompleteTab,
      icon: ChevronDown,
      iconOff: ChevronRight,
    },
  ];

  return (
    <>
      <h1 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2 text-blue-950">
        Access Review
      </h1>
      
      <HorizontalTabs
        tabs={tabs}
        activeIndex={activeTab}
        onChange={setActiveTab}
      />
    </>
  );
};

export default AccessReview;