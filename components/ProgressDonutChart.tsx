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

const ProgressSummaryChart = () => {
  // Data from response (current page)
  const totalItems = 110; // From total_items
  const approvedCount = 1; // Item 1 is fully certified
  const pendingCount = 4; // Items 2-5 are not fully certified
  const revokedCount = 0; // No data provided
  const delegatedCount = 0; // No data provided
  const remediatedCount = 0; // No data provided

  // Calculate percentages
  const pendingPercentage = (pendingCount / totalItems) * 100;
  const approvedPercentage = (approvedCount / totalItems) * 100;
  const revokedPercentage = (revokedCount / totalItems) * 100;
  const delegatedPercentage = (delegatedCount / totalItems) * 100;
  const remediatedPercentage = (remediatedCount / totalItems) * 100;

  // Data for the donut chart
  const data = {
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
        position: "right",
        align: "center",
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
    },
  };

  return (
    <div className="h-72 w-full">
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default ProgressSummaryChart;