"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { ColDef } from "ag-grid-enterprise";
import Accordion from "@/components/Accordion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { formatDateMMDDYY } from "../access-review/page";

ChartJS.register(ArcElement, Tooltip, Legend);

// const reviewerID = "430ea9e6-3cff-449c-a24e-59c057f81e3d";

export default function Application() {
  const router = useRouter();
  const [rowData, setRowData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://preview.keyforge.ai/entities/api/v1/ACMEPOC/getApplications/430ea9e6-3cff-449c-a24e-59c057f81e3d`);
        const data = await response.json();
        if (data.executionStatus === "success") {
          setRowData(data.items);
          setTotalPages(data.total_pages);
          setHasNext(data.has_next);
          setHasPrevious(data.has_previous);
          setTotalItems(data.total_items);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [currentPage]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "App Name",
        field: "applicationinstancename",
        width:350,
        cellRenderer: (params: any) => {
          const name = params.data.applicationinstancename;
          const LOGO_BY_NAME: Record<string, string> = {
            "Active Directory": "/ActiveDirectory.svg",
            "AcmeCorporateDirectory": "/ActiveDirectory.svg",
            "Oracle": "/Oracle.svg",
            "SAP": "/SAP.svg",
            "Workday": "/workday.svg",
          };
          const LOGO_BY_KEYWORD: Array<{ keyword: string; src: string }> = [
            { keyword: "active directory", src: "/ActiveDirectory.svg" },
            { keyword: "corporate directory", src: "/ActiveDirectory.svg" },
            { keyword: "oracle", src: "/Oracle.svg" },
            { keyword: "sap", src: "/SAP.svg" },
            { keyword: "workday", src: "/workday.svg" },
          ];
          const getLogoSrc = (appName: string) => {
            if (!appName) return "/window.svg";
            // 1) Exact match mapping (case-sensitive to allow precision)
            if (LOGO_BY_NAME[appName]) return LOGO_BY_NAME[appName];
            // 2) Keyword-based mapping (case-insensitive contains)
            const lower = appName.toLowerCase();
            const kw = LOGO_BY_KEYWORD.find((k) => lower.includes(k.keyword));
            if (kw) return kw.src;
            // 3) Slug fallback: put a file at /public/logos/<slug>.svg
            const slug = appName
              .toLowerCase()
              .replace(/&/g, "and")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            return `/logos/${slug}.svg`;
          };
          const riskStatus = params.data.risk || "Unknown";
          const riskInitial =
            riskStatus === "High" ? "H" : riskStatus === "Medium" ? "M" : "L";
          const riskColor =
            riskStatus === "High" ? "red" : riskStatus === "Medium" ? "orange" : "green";
          
          // Special styling for High risk - show app name in red bubble
          if (riskStatus === "High") {
            return (
              <div className="flex items-center h-full">
                <img
                  src={getLogoSrc(name)}
                  alt={`${name} logo`}
                  width={28}
                  height={28}
                  className="mr-2"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/window.svg";
                  }}
                />
                <span
                  className="px-2 py-1 text-sm font-medium rounded-full inline-flex items-center cursor-help"
                  style={{ 
                    backgroundColor: "#ffebee", 
                    color: "#d32f2f",
                    border: "1px solid #ffcdd2",
                    minHeight: "24px"
                  }}
                  title="High Risk"
                >
                  {name}
                </span>
                {/* <span
                  className="ml-2 px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: riskColor, color: "white" }}
                >
                  {riskInitial}
                </span> */}
              </div>
            );
          }
          
          // Default styling for other risk levels
          return (
            <div className="flex items-center h-full">
              <img
                src={getLogoSrc(name)}
                alt={`${name} logo`}
                width={28}
                height={28}
                className="mr-2"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/window.svg";
                }}
              />
              <a
                // href={`#${params.data.applicationInstanceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium inline-flex items-center py-2"
              >
                {name}
              </a>
              {/* <span
                className="ml-2 px-2 py-1 text-xs rounded"
                style={{ backgroundColor: riskColor, color: "white" }}
              >
                {riskInitial}
              </span> */}
            </div>
          );
        },
      },
      { headerName: "Department", field: "businessUnit",width:200 },
      { headerName: "Owner", field: "ownername",width:200 },
      {
        headerName: "#Accounts",
        field: "numofaccounts",
        width:200,
        valueFormatter: (params: any) =>
          params.value?.toLocaleString("en-US") || "0",
      },
      {
        headerName: "Last Review",
        field: "lastAccessReview",
        width:200,
        valueFormatter: (params) => formatDateMMDDYY(params.value),
       
      },
      {
        headerName: "Last Sync",
        field: "lastSync",
        width:200,
      valueFormatter: (params) => formatDateMMDDYY(params.value),
      },
      { headerName: "Sync Type", field: "syncType",width:200, },
      { headerName: "App Risk", field: "risk", hide: true,width:200, },
      { headerName: "App Type", field: "applicationtype", hide: true,width:200, },
      { headerName: "App Description", field: "applicationcategory", hide: true,width:200, },
    ],
    []
  );

  const handleRowClick = (event: any) => {
    const appId = event.data.applicationInstanceId;
    const applicationData = {
      applicationName: event.data.applicationinstancename || "N/A",
      owner: event.data.ownername || "N/A",
      lastSync: event.data.lastSync || "N/A"
    };
    
    console.log('Row clicked - Application data:', applicationData);
    console.log('Row clicked - App ID:', appId);
    
    // Store application data in localStorage for HeaderContent
    localStorage.setItem('applicationDetails', JSON.stringify(applicationData));
    
    // Dispatch custom event
    const customEvent = new CustomEvent('applicationDataChange', {
      detail: applicationData
    });
    window.dispatchEvent(customEvent);
    console.log('Custom event dispatched from applications page');
    
    router.push(`/applications/${appId}`);
  };

  // Data for the doughnut chart (based on syncType)
  const syncTypeData = useMemo(() => {
    const syncTypes = [...new Set(rowData.map((row: any) => row.syncType))];
    const counts = syncTypes.map(
      (type) => rowData.filter((row: any) => row.syncType === type).length
    );
    return {
      labels: syncTypes,
      datasets: [
        {
          data: counts,
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
          hoverOffset: 20,
        },
      ],
    };
  }, [rowData]);

  // Pagination controls
  const handleNextPage = () => {
    if (hasNext) setCurrentPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (hasPrevious) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
      <div className="relative mb-2">
        <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
          Applications
        </h1>
        <div className="mb-1">
          <div className="bg-gray-100 p-2 rounded-lg shadow-sm">
            <p className="text-sm font-semibold text-gray-700">
              Total Number of Applications: <span className="text-blue-600">{totalItems}</span>
            </p>
          </div>
        </div>
        {/* <Accordion
          iconClass="absolute right-0 rounded-full text-white bg-purple-800"
          title="Expand/Collapse"
        >
          <div>
            <h2 className="text-sm font-semibold">App Distribution by Sync Type</h2>
            <div className="w-80 h-80">
              <Doughnut
                data={syncTypeData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "right" },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${context.raw}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </Accordion> */}
      </div>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={20}
        domLayout="autoHeight"
        onRowClicked={handleRowClick}
        rowHeight={60}
        headerHeight={50}
      />
      {/* <div className="flex justify-between">
        <button
          onClick={handlePreviousPage}
          disabled={!hasPrevious}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={!hasNext}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
        >
          Next
        </button>
      </div> */}
    </div>
  );
}