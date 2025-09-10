'use client';
import { useState } from "react";

interface Tab {
  label: string;
  icon?: React.ElementType;
  iconOff?: React.ElementType;
  component: React.ComponentType;
}

interface TabsProps {
  tabs: Tab[];
  className?:string;
  buttonClass?:string;
  activeClass?:string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, className, buttonClass, activeClass}) => {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = tabs[activeTab].component; // Get active tab's component

  return (
    <>
      {/* Tab Headers */}
      <div className={`mb-4 flex gap-2 ${className}`}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`flex items-center px-2 gap-2 py-2 cursor-pointer ${buttonClass ? buttonClass : 'hover:text-blue-500'}
              ${activeTab === index ? activeClass ? activeClass : 'border-b-4 -mb-0.5 border-blue-500 text-blue-600' : "text-gray-500"}
              `}
          >
            <small className="flex gap-2">
           {tab.icon && activeTab === index ? <tab.icon size={16} /> : tab.iconOff && <tab.iconOff size={16} />}
            {tab.label}</small>
          </button>
        ))}
      </div>

      {/* Render Dynamic Component */}
     
        <ActiveComponent />
  
    </>
  );
};

export default Tabs;
