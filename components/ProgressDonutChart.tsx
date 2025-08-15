import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { color } from "chart.js/helpers";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const ProgressSummaryChart = () => {
  // Data for the donut chart
  const data = {
    labels: ["Pending", "Approved", "Revoked", "Delegated", "Remediated"],
    datasets: [
      {
        data: [30, 30, 15, 15, 10], // Percentage values
        backgroundColor: [
          "#6EC6FF",
          "#50BFA5",
          "#6478B9",
          "#E67E5A",
          "#4F46E5",
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
        position: "right", // Shows legend on the right side
        align: "center",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      }, 
      datalabels: {
        color: "#fafafa",
        font: { weight: "bold" as const },

        // anchor: "end" as const,
        // align: "end" as const,
        offset: 0,
        clip: false,
      },
    },
  };

  return (
    <div className="h-72 w-full p-4">
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default ProgressSummaryChart;
