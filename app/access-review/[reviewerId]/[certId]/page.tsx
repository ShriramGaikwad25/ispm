"use client";
import { use, useState, useCallback } from "react";
import TreeClient from "./TreeClient";
import dynamic from "next/dynamic";
import Accordion from "@/components/Accordion";
import { BackButton } from "@/components/BackButton";

const ChartComponent = dynamic(() => import("@/components/ChartComponent"), {
  ssr: false,
}) as React.ComponentType<{
  progressData?: {
    totalItems: number;
    approvedCount: number;
    pendingCount: number;
    revokedCount: number;
    delegatedCount: number;
    remediatedCount: number;
  };
}>;

export default function CertificationDetailsPage({
  params,
}: {
  params: Promise<{ reviewerId: string; certId: string }>;
}) {
  const { reviewerId, certId } = use(params);
  const [isAccordionOpen, setAccordionOpen] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [progressData, setProgressData] = useState({
    totalItems: 0,
    approvedCount: 0,
    pendingCount: 0,
    revokedCount: 0,
    delegatedCount: 0,
    remediatedCount: 0,
  });

  // Callback to collapse the accordion
  const handleRowExpand = useCallback(() => {
    setAccordionOpen(false);
  }, []);

  // Callback to handle progress data changes
  const handleProgressDataChange = useCallback((data: any) => {
    setProgressData(data);
    
    // Don't send entitlement-based progress to header
    // The header should get user-based progress from localStorage or other sources
  }, []);

  // Handle filter selection
  const handleFilterToggle = useCallback((filterName: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterName) 
        ? prev.filter(f => f !== filterName)
        : [...prev, filterName]
    );
  }, []);

  const filterOptions = [
    { name: "Dormant Access", color: "bg-yellow-100 border-yellow-300 text-yellow-800" },
    { name: "Violation", color: "bg-red-100 border-red-300 text-red-800" },
    { name: "High Risk", color: "bg-orange-100 border-orange-300 text-orange-800" },
    { name: "Delta Access", color: "bg-blue-100 border-blue-300 text-blue-800" }
  ];

  return (
    <>
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="relative mb-4">
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <h2 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
            Filters:
          </h2>
          
          <div className="flex gap-2 flex-wrap ml-auto">
            {filterOptions.map((filter) => {
              const isSelected = selectedFilters.includes(filter.name);
              return (
                <div
                  key={filter.name}
                  onClick={() => handleFilterToggle(filter.name)}
                  className={`
                    px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow
                    ${isSelected 
                      ? `${filter.color} shadow transform scale-105` 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm">{filter.name}</span>
                    {isSelected && (
                      <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {}
      </div>
      <TreeClient
        reviewerId={reviewerId}
        certId={certId}
        onRowExpand={handleRowExpand}
        onProgressDataChange={handleProgressDataChange}
      />
    </>
  );
}
