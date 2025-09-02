import React from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface ProgressData {
  totalItems: number;
  approvedCount: number;
  pendingCount: number;
  revokedCount: number;
  delegatedCount: number;
  remediatedCount: number;
}

interface ProgressDonutChartProps {
  data?: ProgressData;
  title?: string; // if omitted, no internal header is rendered
  height?: string;
  showBreakdown?: boolean; // show counts under the chart
}

const ProgressDonutChart: React.FC<ProgressDonutChartProps> = ({ 
  data, 
  title,
  height = "h-72",
  showBreakdown = false 
}) => {
  // Use provided data or fall back to default data
  const progressData = data || {
    totalItems: 110,
    approvedCount: 1,
    pendingCount: 4,
    revokedCount: 0,
    delegatedCount: 0,
    remediatedCount: 0,
  };

  // Calculate percentages
  const pendingPercentage = progressData.totalItems > 0 
    ? (progressData.pendingCount / progressData.totalItems) * 100 
    : 0;
  const approvedPercentage = progressData.totalItems > 0 
    ? (progressData.approvedCount / progressData.totalItems) * 100 
    : 0;
  const revokedPercentage = progressData.totalItems > 0 
    ? (progressData.revokedCount / progressData.totalItems) * 100 
    : 0;
  const delegatedPercentage = progressData.totalItems > 0 
    ? (progressData.delegatedCount / progressData.totalItems) * 100 
    : 0;
  const remediatedPercentage = progressData.totalItems > 0 
    ? (progressData.remediatedCount / progressData.totalItems) * 100 
    : 0;

  // Data for the donut chart
  const chartData = {
    labels: ["Pending", "Approved", "Revoked", "Delegated", "Remediated"],
    datasets: [
      {
        data: [
          pendingPercentage,
          approvedPercentage,
          revokedPercentage,
          delegatedPercentage,
          remediatedPercentage,
        ],
        backgroundColor: [
          "#6EC6FF", // Pending
          "#50BFA5", // Approved
          "#6478B9", // Revoked
          "#E67E5A", // Delegated
          "#4F46E5", // Remediated
        ],
        hoverBackgroundColor: [
          "#5CA9E6",
          "#46A992",
          "#5B6FA3",
          "#D76A50",
          "#4038D1",
        ],
        borderWidth: 2,
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "45%", // Creates the donut effect
    layout: {
      padding: 30, // Adds space around the chart
    },
    plugins: {
      legend: {
        display: true,
        position: "right" as const,
        align: "center" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      datalabels: {
        color: "#fafafa",
        font: { weight: "bold" as const },
        formatter: (value: number) => (value > 0 ? `${value.toFixed(1)}%` : ""), // Show percentage only if value > 0
        offset: 0,
        clip: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || "";
            const value = context.parsed || 0;
            const count = Math.round((value / 100) * progressData.totalItems);
            return `${label}: ${count} items (${value.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  return (
    <div className={`${height} w-full`}>
      {title ? (
        <div className="flex justify-between p-2 mb-2">
          <h2 className="text-lg text-gray-700">{title}</h2>
          <div className="text-sm text-gray-500">Total: {progressData.totalItems}</div>
        </div>
      ) : null}
      <Doughnut data={chartData} options={options} />
      {showBreakdown ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Pending:</span>
            <span className="font-medium">{progressData.pendingCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Approved:</span>
            <span className="font-medium text-green-600">{progressData.approvedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Revoked:</span>
            <span className="font-medium text-purple-600">{progressData.revokedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delegated:</span>
            <span className="font-medium text-orange-600">{progressData.delegatedCount}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProgressDonutChart;