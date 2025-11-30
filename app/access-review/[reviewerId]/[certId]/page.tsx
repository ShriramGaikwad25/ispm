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

  return (
    <>
      <div className="mb-4">
        <BackButton />
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
