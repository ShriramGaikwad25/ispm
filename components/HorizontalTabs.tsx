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
      <div className="flex">
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
      <div className="mt-4">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default HorizontalTabs;
