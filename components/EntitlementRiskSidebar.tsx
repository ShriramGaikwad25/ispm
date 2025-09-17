"use client";

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface EntitlementRiskSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  entitlementData: {
    name: string;
    description?: string;
    type?: string;
    applicationName?: string;
    risk?: string | null;
    lastReviewed?: string;
    lastSync?: string;
    appInstanceId?: string;
    entitlementId?: string;
  } | null;
}

const EntitlementRiskSidebar: React.FC<EntitlementRiskSidebarProps> = ({
  isOpen,
  onClose,
  entitlementData,
}) => {

  if (!isOpen || !entitlementData) return null;

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold text-red-800 break-words whitespace-normal">Risk Assessment</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Entitlement Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Entitlement Details</h1>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Name:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Description:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.description || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Type:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.type || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-blue-800 mb-3">Application Information</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Application Name:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.applicationName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700">App Instance ID:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.appInstanceId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Information */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-red-800 mb-3">Risk Assessment</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Risk Level:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entitlementData.risk === "High" 
                          ? "bg-red-100 text-red-800" 
                          : entitlementData.risk === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {entitlementData.risk || "N/A"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Last Reviewed:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.lastReviewed || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Last Sync:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.lastSync || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-3">Additional Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Entitlement ID:</span>
                    <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1">
                      {entitlementData.entitlementId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EntitlementRiskSidebar;
