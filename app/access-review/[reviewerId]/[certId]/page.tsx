"use client";
import { use, useState, useCallback } from "react";
import TreeClient from "./TreeClient";
import dynamic from "next/dynamic";
import Accordion from "@/components/Accordion";

const ChartComponent = dynamic(() => import("@/components/ChartComponent"), {
  ssr: false,
});

export default function CertificationDetailsPage({
  params,
}: {
  params: Promise<{ reviewerId: string; certId: string }>;
}) {
  const { reviewerId, certId } = use(params);
  const [isAccordionOpen, setAccordionOpen] = useState(true);

  // Callback to collapse the accordion
  const handleRowExpand = useCallback(() => {
    setAccordionOpen(false);
  }, []);

  return (
    <>
      <div className="relative">
        <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
          Manager Actions
        </h1>
        <Accordion
          open={isAccordionOpen}
          onToggle={() => setAccordionOpen((prev) => !prev)}
          iconClass="absolute top-1 right-0 rounded-full text-white bg-purple-800"
          title="Expand/Collapse"
        >
          <ChartComponent />
        </Accordion>
      </div>
      <TreeClient
        reviewerId={reviewerId}
        certId={certId}
        onRowExpand={handleRowExpand}
      />
    </>
  );
}
