import React, { useState } from "react";
import ProgressDonutChart from "./ProgressDonutChart";
import VennChart from "./VennChart";
import FilterPanel from "./FilterPannel";

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

const ChartAppOwnerComponent = () => {
  const data: Record<string, DataItem[]> = {
    InteractiveFilters: [
      { label: "Elevated Accounts", value: 0 },
      { label: "Orphan Accounts", value: 0 },
      { label: "Terminated user accounts", value: 0 },
      { label: "Dormant Accounts", value: 0 },
      { label: "New Access", value: 0 },
      { label: "Over Privileged users", value: 0 },
      { label: "Compliance Violations", value: 0 },
    ],
  };
  const [selected, setSelected] = useState<{ [key: string]: number | null }>(
    {}
  );
  const handleSelect = (category: string, index: number) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* <div className="">
        <div className="flex justify-between p-4">
            <h2 className="text-lg text-gray-700">Risk Summary</h2> 
        </div>
            <DonutChart />
        </div> */}

      <div className="">
        <div className="flex justify-between p-4">
          <h2 className="text-lg text-gray-700">Risk Heat Map</h2>
        </div>
        <VennChart />
      </div>

      {/* <div className="">
        <div className="flex justify-between p-4">
          <h2 className="text-lg text-gray-700">Entitlement Summary</h2>
        </div>
        <HorizontalBarChart />
      </div> */}
      <div className="">
        <FilterPanel
          data={data}
          selected={selected}
          onSelect={handleSelect}
          onClear={(category) =>
            setSelected((prev) => ({ ...prev, [category]: null }))
          }
        />
      </div>

      <div className="">
        <div className="flex justify-between p-4">
          <h2 className="text-lg text-gray-700">Progress Summary</h2>
        </div>
        <ProgressDonutChart />
      </div>
    </div>
  );
};

/*
const ChartComponent = () => {
    return (
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className=" border border-gray-300 rounded-md">
              <div className="flex justify-between p-4 border-b border-gray-300">
                 <h2 className="text-lg text-gray-700">Risk Summary</h2> 
                 <ChevronUp className="text-gray-700" />
              </div>
            
                  <DonutChart />
       
            </div>
      
            <div className=" border border-gray-300 rounded-md">
              <div className="flex justify-between p-4 border-b border-gray-300">
                  <h2 className="text-lg text-gray-700">Entitlement Summary</h2> <ChevronUp className="text-gray-700" />
              </div>
            
                  <HorizontalBarChart/>
            
            </div>
           
            <div className=" border border-gray-300 rounded-md">
              <div className="flex justify-between p-4 border-b border-gray-300">
                  <h2 className="text-lg text-gray-700">Progress Summary</h2> <ChevronUp className="text-gray-700" />
              </div>
            
             <ProgressDonutChart/>
                   
            </div>   
    </div>

);
};
*/

export default ChartAppOwnerComponent;
