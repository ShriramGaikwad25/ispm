'use client';
import { useState, useEffect } from 'react';

interface Tab {
  label: string;
  component: React.ComponentType;
  icon?: React.ElementType;
  iconOff?: React.ElementType;
}

interface TabsProps {
  tabs: Tab[];
  defaultIndex?: number;
  activeIndex?: number;
  onChange?: (index: number) => void;
}

const HorizontalTabs: React.FC<TabsProps> = ({
  tabs,
  defaultIndex = 0,
  activeIndex: controlledIndex,
  onChange,
}) => {
  const isControlled = controlledIndex !== undefined;
  const [internalIndex, setInternalIndex] = useState(defaultIndex);

  const activeIndex = isControlled ? controlledIndex : internalIndex;
  const ActiveComponent = tabs[activeIndex]?.component;
  
  // Force re-render when tabs change by using a key based on tabs reference
  const tabsKey = tabs.length > 0 ? `${activeIndex}-${tabs.map(t => t.label).join('-')}` : activeIndex;

  const handleTabClick = (index: number) => {
    if (isControlled) {
      onChange?.(index);
    } else {
      setInternalIndex(index);
    }
  };

  useEffect(() => {
    if (!isControlled && defaultIndex !== internalIndex) {
      setInternalIndex(defaultIndex);
    }
  }, [defaultIndex]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex flex-shrink-0 w-full">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-2 ${
              index === activeIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => handleTabClick(index)}
          >
            {tab.icon && index === activeIndex ? (
              <tab.icon size={16} className="text-white" />
            ) : tab.iconOff ? (
              <tab.iconOff size={16} className="text-gray-500" />
            ) : null}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="mt-4 flex-1 flex flex-col overflow-visible">
        {ActiveComponent && <ActiveComponent key={tabsKey} />}
      </div>
    </div>
  );
};

export default HorizontalTabs;
