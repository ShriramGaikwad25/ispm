import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, ChartOptions } from "chart.js";

// Register required Chart.js elements
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const HorizontalBarChart = () => {
  const data = {
    labels: ["Total Entitlements", "New", "Direct Assignment", "Group Assignment", "Low Risk", "Risk"],
    
    datasets: [
      {
        data: [600, 400, 350, 250, 110, 40], // Values
        backgroundColor: ["#1F485B", "#50BFA5", "#6EC6FF", "#5E99CC", "#E6A23C", "#E74C3C"], // Colors
        borderRadius: 4,
        barThickness: 32, // Adjust bar height
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: "y" as const, // Horizontal bar chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Hide default legend
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        display: false, // Hide x-axis
      },
      y: {
        grid: { display: false },
        ticks: {
          align: "center", // Align labels to the right
          font: { size: 14 },
          color: "#6B7280",
        },
      },    
    },
  };

  return (
    <div className="w-full h-70 p-4">
      <Bar data={data} options={options} />
    </div>
  );
};

export default HorizontalBarChart;