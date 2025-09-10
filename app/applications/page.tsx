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

const reviewerID = "430ea9e6-3cff-449c-a24e-59c057f81e3d";

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
        const response = await fetch(`https://preview.keyforge.ai/entities/api/v1/CERTTEST/getApplications/430ea9e6-3cff-449c-a24e-59c057f81e3d`);
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
        cellRenderer: (params: any) => {
          const name = params.data.applicationinstancename;
          const riskStatus = params.data.risk || "Unknown";
          const riskInitial =
            riskStatus === "High" ? "H" : riskStatus === "Medium" ? "M" : "L";
          const riskColor =
            riskStatus === "High" ? "red" : riskStatus === "Medium" ? "orange" : "green";
          return (
            <div className="flex items-center">
              <a
                // href={`#${params.data.applicationInstanceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {name}
              </a>
              <span
                className="ml-2 px-2 py-1 text-xs rounded"
                style={{ backgroundColor: riskColor, color: "white" }}
              >
                {riskInitial}
              </span>
            </div>
          );
        },
      },
      { headerName: "Department", field: "businessUnit" },
      { headerName: "Owner", field: "ownername" },
      {
        headerName: "#Accounts",
        field: "numofaccounts",
        valueFormatter: (params: any) =>
          params.value?.toLocaleString("en-US") || "0",
      },
      {
        headerName: "Last Access Review",
        field: "lastAccessReview",
        valueFormatter: (params) => formatDateMMDDYY(params.value),
       
      },
      {
        headerName: "Last Sync",
        field: "lastSync",
      valueFormatter: (params) => formatDateMMDDYY(params.value),
      },
      { headerName: "Sync Type", field: "syncType" },
      { headerName: "App Risk", field: "risk", hide: true },
      { headerName: "App Type", field: "applicationtype", hide: true },
      { headerName: "App Description", field: "applicationcategory", hide: true },
    ],
    []
  );

  const handleRowClick = (event: any) => {
    const appId = event.data.applicationInstanceId;
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