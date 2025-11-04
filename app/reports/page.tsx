"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRightSidebar } from "@/contexts/RightSidebarContext";

export default function ReportsPage() {
  const { openSidebar } = useRightSidebar();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [campaignSearch, setCampaignSearch] = useState<string>("");
  const [reportTypeSearch, setReportTypeSearch] = useState<string>("");
  const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false);
  const [isReportTypeDropdownOpen, setIsReportTypeDropdownOpen] = useState(false);
  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const reportTypeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Sidebar form state
  const [sidebarFormData, setSidebarFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    tags: "",
  });

  // Sample campaign data - replace with actual API call
  const campaigns = [
    "Access Review Campaign 2024",
    "Q1 Access Certification",
    "Q2 Access Certification",
    "Annual Access Review",
    "Security Compliance Review",
    "User Access Audit",
  ];

  // Report types from Auditor's Corner
  const reportTypes = [
    {
      id: "high-risk-users",
      title: "High Risk Users",
      subtitle: "Identify and monitor users with elevated risk profiles",
      icon: "⚠️"
    },
    {
      id: "inactive-accounts",
      title: "Inactive Accounts",
      subtitle: "Find accounts that have been inactive for extended periods",
      icon: "💤"
    },
    {
      id: "sod-violations",
      title: "SOD Violations",
      subtitle: "Detect Segregation of Duties violations and conflicts",
      icon: "🚫"
    },
    {
      id: "privileged-accounts",
      title: "Privileged Accounts",
      subtitle: "Track and manage accounts with privileged access",
      icon: "🔐"
    },
    {
      id: "orphan-accounts",
      title: "Orphan Accounts",
      subtitle: "Identify accounts without active owners or assignments",
      icon: "👻"
    },
    {
      id: "certification-report",
      title: "Certification Report",
      subtitle: "Download full report filtered by reviewer, decision, delta, etc.",
      icon: "📋"
    },
    {
      id: "detailed-revocation-report",
      title: "Detailed Revocation Report",
      subtitle: "Download per-application revocation report",
      icon: "📄"
    },
  ];

  // Filter campaigns based on search
  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  // Filter report types based on search
  const filteredReportTypes = reportTypes.filter((reportType) =>
    reportType.title.toLowerCase().includes(reportTypeSearch.toLowerCase()) ||
    reportType.subtitle.toLowerCase().includes(reportTypeSearch.toLowerCase()) ||
    reportType.id.toLowerCase().includes(reportTypeSearch.toLowerCase())
  );

  // Reusable sidebar component
  const CampaignSidebar = useMemo(() => {
    return (
      <div className="flex flex-col h-full">
        {/* Top 1/3 - Form Fields */}
        <div className="flex-[0_0_33.333%] border-b border-gray-200 flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Campaign
            </h2>
            <div className="space-y-4">
              {/* Name */}
              <div className="relative">
                <input
                  type="text"
                  value={sidebarFormData.name}
                  onChange={(e) =>
                    setSidebarFormData({
                      ...sidebarFormData,
                      name: e.target.value,
                    })
                  }
                  onFocus={(e) => e.target.focus()}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  sidebarFormData.name
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Name *
                </label>
              </div>

              {/* Description */}
              <div className="relative">
                <textarea
                  value={sidebarFormData.description}
                  onChange={(e) =>
                    setSidebarFormData({
                      ...sidebarFormData,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  sidebarFormData.description
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Description *
                </label>
              </div>

              {/* Start Date */}
              <div className="relative">
                <input
                  type="date"
                  value={sidebarFormData.startDate}
                  onChange={(e) =>
                    setSidebarFormData({
                      ...sidebarFormData,
                      startDate: e.target.value,
                    })
                  }
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [&::-webkit-datetime-edit-text]:opacity-0 [&::-webkit-datetime-edit-month-field]:opacity-0 [&::-webkit-datetime-edit-day-field]:opacity-0 [&::-webkit-datetime-edit-year-field]:opacity-0 [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  style={{ colorScheme: 'light' }}
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  sidebarFormData.startDate
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Start Date *
                </label>
              </div>

              {/* End Date */}
              <div className="relative">
                <input
                  type="date"
                  value={sidebarFormData.endDate}
                  onChange={(e) =>
                    setSidebarFormData({
                      ...sidebarFormData,
                      endDate: e.target.value,
                    })
                  }
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [&::-webkit-datetime-edit-text]:opacity-0 [&::-webkit-datetime-edit-month-field]:opacity-0 [&::-webkit-datetime-edit-day-field]:opacity-0 [&::-webkit-datetime-edit-year-field]:opacity-0 [&::-webkit-inner-spin-button]:hidden [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  style={{ colorScheme: 'light' }}
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  sidebarFormData.endDate
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  End Date *
                </label>
              </div>

              {/* Tags */}
              <div className="relative">
                <input
                  type="text"
                  value={sidebarFormData.tags}
                  onChange={(e) =>
                    setSidebarFormData({
                      ...sidebarFormData,
                      tags: e.target.value,
                    })
                  }
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  sidebarFormData.tags
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Tags *
                </label>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
            <button
              onClick={() => {
                // Handle search logic here
                console.log("Search clicked", sidebarFormData);
              }}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </div>
        
        {/* Bottom 2/3 - Search Results (for future use) */}
        <div className="flex-1 p-4 overflow-y-auto bg-white">
          {/* Search results will be displayed here */}
        </div>
      </div>
    );
  }, [sidebarFormData, setSidebarFormData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        campaignDropdownRef.current &&
        !campaignDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCampaignDropdownOpen(false);
      }
      if (
        reportTypeDropdownRef.current &&
        !reportTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsReportTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCampaignSelect = (campaign: string) => {
    setSelectedCampaign(campaign);
    setCampaignSearch(campaign);
    setIsCampaignDropdownOpen(false);
    openSidebar(CampaignSidebar, { widthPx: 600 });
  };

  const handleReportTypeSelect = (reportTypeId: string) => {
    const reportType = reportTypes.find(rt => rt.id === reportTypeId);
    if (reportType) {
      setSelectedReportType(reportType.id);
      setReportTypeSearch(reportType.title);
      setIsReportTypeDropdownOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Reports
          </h1>
          
          <div className="space-y-6">
            <p className="text-gray-600">
              View and generate reports for your organization's identity and access management.
            </p>

            {/* Search Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campaign Search Box */}
              <div className="relative" ref={campaignDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={campaignSearch}
                    onChange={(e) => {
                      setCampaignSearch(e.target.value);
                      setIsCampaignDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsCampaignDropdownOpen(true);
                      // Open right sidebar when focusing on campaign search box
                      openSidebar(CampaignSidebar, { widthPx: 600 });
                    }}
                    placeholder=" "
                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline pr-10"
                  />
                  <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    campaignSearch || isCampaignDropdownOpen
                      ? 'top-0.5 text-xs text-blue-600' 
                      : 'top-3.5 text-sm text-gray-500'
                  }`}>
                    Select Campaign *
                  </label>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Report Type Search Box */}
              <div className="relative" ref={reportTypeDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={reportTypeSearch}
                    onChange={(e) => {
                      setReportTypeSearch(e.target.value);
                      setIsReportTypeDropdownOpen(true);
                    }}
                    onFocus={() => setIsReportTypeDropdownOpen(true)}
                    placeholder=" "
                    className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline pr-10"
                  />
                  <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    reportTypeSearch || isReportTypeDropdownOpen
                      ? 'top-0.5 text-xs text-blue-600' 
                      : 'top-3.5 text-sm text-gray-500'
                  }`}>
                    Select Report Type *
                  </label>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Type Boxes */}
            <div className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReportTypes.map((reportType) => (
                  <div
                    key={reportType.id}
                    onClick={() => handleReportTypeSelect(reportType.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedReportType === reportType.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-lg mr-3">
                        {reportType.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm">{reportType.title}</h3>
                        <p className="text-xs text-gray-500">{reportType.subtitle}</p>
                      </div>
                      {selectedReportType === reportType.id && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Values Display (Optional) */}
            {(selectedCampaign || selectedReportType) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Options:
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {selectedCampaign && (
                    <div>
                      <span className="font-medium">Campaign:</span> {selectedCampaign}
                    </div>
                  )}
                  {selectedReportType && (
                    <div>
                      <span className="font-medium">Report Type:</span> {reportTypes.find(rt => rt.id === selectedReportType)?.title || selectedReportType}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
