import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// Register required Chart.js elements
ChartJS.register(ArcElement, Tooltip, Legend);

const DonutChart = () => {
  const data = {
    labels: ["Access", "Low Risk", "Roles", "User", "SOD Violations", "Inactive Accounts"],
    datasets: [
      {
        data: [25, 15, 15, 15, 15, 15], // Values
        backgroundColor: ["#4C81F1", "#50BFA5", "#6C63FF", "#E54C86", "#E6A23C", "#F6C342"], // Colors
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    cutout: "72%", // Controls the thickness of the donut
    plugins: {
      legend: { display: false }, // Hide default legend
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="flex gap-6 p-4">
   
      {/* Donut Chart */}   
      <div className="w-52 relative">
        <Doughnut data={data} options={options}  />

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-gray-500 text-sm">Total Progress</span>
        <span className="text-black font-bold text-2xl">62%</span>
      </div>
      </div>

      {/* Custom Legend */}
      <div className="mt-4 w-48 space-y-2">
        {data.labels.map((label, index) => (
          <div key={index} className="flex items-center gap-2 text-gray-600 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.datasets[0].backgroundColor[index] }}></div>
            <span>{label}</span>
            <span className="ml-auto font-bold">{data.datasets[0].data[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
