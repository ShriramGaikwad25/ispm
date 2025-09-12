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
              <h2 className="text-lg font-semibold text-red-800">Risk Assessment</h2>
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
              {/* Heading 1 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Heading 1</h1>
                <p className="text-sm text-gray-600">Content for heading 1</p>
              </div>

              {/* Heading 2 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-red-800 mb-3">Heading 2</h2>
                <p className="text-sm text-gray-600">Content for heading 2</p>
              </div>

              {/* Heading 3 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Heading 3</h3>
                <p className="text-sm text-gray-600">Content for heading 3</p>
              </div>

              {/* Heading 4 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-base font-semibold text-green-800 mb-3">Heading 4</h4>
                <p className="text-sm text-gray-600">Content for heading 4</p>
              </div>

              {/* Heading 5 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-yellow-800 mb-3">Heading 5</h5>
                <p className="text-sm text-gray-600">Content for heading 5</p>
              </div>

              {/* Heading 6 */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h6 className="text-xs font-semibold text-purple-800 mb-3">Heading 6</h6>
                <p className="text-sm text-gray-600">Content for heading 6</p>
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
