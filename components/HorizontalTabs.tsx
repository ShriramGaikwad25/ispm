'use client';
import { useState, useEffect } from 'react';

interface Tab {
  label: string;
  component: React.ComponentType;
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
  const ActiveComponent = tabs[activeIndex].component;

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
    <div className="w-full">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`px-4 py-2 ml-8 text-sm font-medium transition-all duration-200 border-b-2 ${
              index === activeIndex
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-500 hover:border-blue-300'
            }`}
            onClick={() => handleTabClick(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="mt-4">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default HorizontalTabs;
