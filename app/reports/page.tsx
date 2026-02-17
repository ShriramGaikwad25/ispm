"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const GET_ALL_SIGNATURE_URL = "https://preview.keyforge.ai/reports/api/v1/ACMECOM/getallsignature";

export default function ReportsPage() {
  const router = useRouter();
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [reportTypeSearch, setReportTypeSearch] = useState<string>("");
  const [isReportTypeDropdownOpen, setIsReportTypeDropdownOpen] = useState(false);
  const reportTypeDropdownRef = useRef<HTMLDivElement>(null);

  // All Signatures data from getallsignature API
  const [signatureData, setSignatureData] = useState<any[] | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(true);
  const [signatureError, setSignatureError] = useState<string | null>(null);

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

  // Filter report types based on search
  const filteredReportTypes = reportTypes.filter((reportType) =>
    reportType.title.toLowerCase().includes(reportTypeSearch.toLowerCase()) ||
    reportType.subtitle.toLowerCase().includes(reportTypeSearch.toLowerCase()) ||
    reportType.id.toLowerCase().includes(reportTypeSearch.toLowerCase())
  );

  // Fetch getallsignature API on mount
  useEffect(() => {
    let cancelled = false;
    setSignatureLoading(true);
    setSignatureError(null);
    fetch(GET_ALL_SIGNATURE_URL, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data && typeof data === "object" && "data" in (data as object) ? (data as { data: unknown }).data : data);
        setSignatureData(Array.isArray(list) ? list : list != null ? [list] : []);
      })
      .catch((err) => {
        if (!cancelled) setSignatureError(err?.message || "Failed to load signatures");
        setSignatureData(null);
      })
      .finally(() => {
        if (!cancelled) setSignatureLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  const handleReportTypeSelect = (reportTypeId: string) => {
    const reportType = reportTypes.find(rt => rt.id === reportTypeId);
    if (reportType) {
      setSelectedReportType(reportType.id);
      // Do not show the selected value in the search box; keep it blank
      setReportTypeSearch("");
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

            {/* All Signatures from getallsignature API */}
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <h2 className="text-lg font-medium text-gray-900 px-4 py-3 border-b border-gray-200 bg-gray-50">
                All Signatures
              </h2>
              <div className="p-4">
                {signatureLoading && (
                  <p className="text-sm text-gray-500">Loading signatures…</p>
                )}
                {signatureError && (
                  <p className="text-sm text-red-600">{signatureError}</p>
                )}
                {!signatureLoading && !signatureError && signatureData && (
                  signatureData.length === 0 ? (
                    <p className="text-sm text-gray-500">No signature data.</p>
                  ) : (() => {
                    const first = signatureData[0];
                    const isObj = typeof first === "object" && first !== null;
                    const keys = isObj ? Object.keys(first as Record<string, unknown>) : ["Value"];
                    return (
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {keys.map((key) => (
                                <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {signatureData.map((row, idx) =>
                              typeof row === "object" && row !== null ? (
                                <tr key={idx}>
                                  {keys.map((key) => {
                                    const val = (row as Record<string, unknown>)[key];
                                    return (
                                      <td key={key} className="px-4 py-2 text-gray-900 whitespace-pre-wrap break-words">
                                        {val == null ? "" : typeof val === "object" ? JSON.stringify(val) : String(val)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ) : (
                                <tr key={idx}>
                                  <td className="px-4 py-2 text-gray-900">{String(row)}</td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Search Boxes */}
            <div className="grid grid-cols-1 gap-6 max-w-md">
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
            {selectedReportType && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Options:
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {selectedReportType && (
                    <div>
                      <span className="font-medium">Report Type:</span> {reportTypes.find(rt => rt.id === selectedReportType)?.title || selectedReportType}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next Button */}
            {selectedReportType && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    const reportTypeTitle = reportTypes.find(rt => rt.id === selectedReportType)?.title || selectedReportType;
                    router.push(`/reports/filter?reportType=${encodeURIComponent(reportTypeTitle)}`);
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
