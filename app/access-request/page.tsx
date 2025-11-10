"use client";
import React, { useState, useEffect } from "react";
import HorizontalTabs from "@/components/HorizontalTabs";
import CatalogTab from "./CatalogTab";
import AccessAdvisorTab from "./AccessAdvisorTab";
import { ChevronRight, ChevronDown } from "lucide-react";

const AccessRequest: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  // Listen for tab switch events from child components
  useEffect(() => {
    const handleTabSwitch = (event: CustomEvent) => {
      const tabIndex = event.detail?.tabIndex;
      if (typeof tabIndex === 'number') {
        setActiveTab(tabIndex);
      }
    };

    const handleHashChange = () => {
      if (window.location.hash === '#request-for-self') {
        setActiveTab(1);
      }
    };

    window.addEventListener('switchToTab', handleTabSwitch as EventListener);
    window.addEventListener('hashchange', handleHashChange);
    
    // Check initial hash
    if (window.location.hash === '#request-for-self') {
      setActiveTab(1);
    }

    return () => {
      window.removeEventListener('switchToTab', handleTabSwitch as EventListener);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const tabs = [
    {
      label: "Request Access",
      component: CatalogTab,
      icon: ChevronDown,
      iconOff: ChevronRight,
    },
    {
      label: "Request for Self",
      component: AccessAdvisorTab,
      icon: ChevronDown,
      iconOff: ChevronRight,
    },
  ];

  return (
    <>
      <h1 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2 text-blue-950">
        Access Request
      </h1>
      
      <HorizontalTabs
        tabs={tabs}
        activeIndex={activeTab}
        onChange={setActiveTab}
      />
    </>
  );
};

export default AccessRequest;

