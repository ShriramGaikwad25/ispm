import React from "react";
import DonutChart from "./DonutChart";
import HorizontalBarChart from "./HorizontalBarChart";
import ProgressDonutChart from "./ProgressDonutChart";

const ChartComponent = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">  
    <div className="">
        <div className="flex justify-between p-4">
            <h2 className="text-lg text-gray-700">Risk Summary</h2> 
        </div>
            <DonutChart />
        </div>
        
        <div className="">
        <div className="flex justify-between p-4">
            <h2 className="text-lg text-gray-700">Entitlement Summary</h2> 
        </div>
            <HorizontalBarChart/>
        </div>

        <div className="">
        <div className="flex justify-between p-4">
            <h2 className="text-lg text-gray-700">Progress Summary</h2>
        </div> 
        <ProgressDonutChart/>
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

export default ChartComponent;