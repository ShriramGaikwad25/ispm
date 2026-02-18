"use client";

import React from "react";

export default function PendingApprovalsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Pending Approvals
          </h1>
          <p className="text-gray-600 text-sm mb-4">
            View and manage access requests that are awaiting your approval.
          </p>
          <p className="text-gray-500 text-sm">
            This page is a placeholder for the Pending Approvals workflow. Integrate your
            approval listing and actions here.
          </p>
        </div>
      </div>
    </div>
  );
}

