// components/RightSidebar.jsx
"use client";

import { useEffect, useRef } from "react";

interface RightSidebarProps {
  isOpen: boolean;
  widthPx?: number; // default will be 600
  onClose: () => void;
  children?: React.ReactNode;
  topOffsetPx?: number; // space below fixed header; default 60
  title?: string; // optional title for the sidebar header
}

const DEFAULT_WIDTH = 500;
const DEFAULT_TOP_OFFSET = 60;

const RightSidebar = ({ isOpen, widthPx = DEFAULT_WIDTH, onClose, children, topOffsetPx = DEFAULT_TOP_OFFSET, title }: RightSidebarProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 bg-white shadow-lg z-50 border-l border-gray-200 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: widthPx, top: topOffsetPx, height: `calc(100vh - ${topOffsetPx}px)` }}
      >
        <div className="flex justify-between items-center p-4 border-b">
          {title && <h2 className="text-xl font-semibold text-gray-800">{title}</h2>}
          <button 
            onClick={onClose} 
            className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
            title="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div 
          className="p-4 overflow-auto hide-scrollbar" 
          style={{ 
            height: `calc(100% - 80px)`,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default RightSidebar;

