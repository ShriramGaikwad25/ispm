import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  ChartOptions,
} from "chart.js";

// Register required Chart.js elements
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const VerticalBarChart = () => {
  const data = {
    labels: ["0-10%", "10-30%", "30-60%", "60-80%", "80+ %"],
    datasets: [
      {
        data: [10, 30, 20, 50, 40],
        backgroundColor: [
          "#1F485B",
          "#50BFA5",
          "#6EC6FF",
          "#E6A23C",
          "#E74C3C",
        ],
        borderRadius: 4,
        barThickness: 40, // Adjust width of bars
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 12 },
          color: "#6B7280",
        },
      },
      y: {
        title: {
          display: true,
          text: "Number of Instances",
          font: { size: 14 },
          color: "#6B7280",
        },
        beginAtZero: true,
        grid: { display: false },
        ticks: {
          font: { size: 14 },
          color: "#6B7280",
        },
      },
    },
  };

  return (
    <div className="w-full h-72 p-4">
      <Bar data={data} options={options} />
    </div>
  );
};

export default VerticalBarChart;
