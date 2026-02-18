"use client";

import React from "react";

export default function SodAuditPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            SoD Audit
          </h1>
          <p className="text-gray-600 text-sm mb-4">
            Analyze and remediate Segregation of Duties (SoD) violations across your
            applications and entitlements.
          </p>
          <p className="text-gray-500 text-sm">
            This page is a placeholder for SoD rules, findings, and remediation workflows.
            Integrate your SoD analytics and reporting here.
          </p>
        </div>
      </div>
    </div>
  );
}

