// components/RightSidebar.jsx
"use client";

import { useEffect, useRef } from "react";

interface RightSidebarProps {
  isOpen: boolean;
  widthPx?: number; // default will be 600
  onClose: () => void;
  children?: React.ReactNode;
  topOffsetPx?: number; // space below fixed header; default 60
}

const DEFAULT_WIDTH = 500;
const DEFAULT_TOP_OFFSET = 60;

const RightSidebar = ({ isOpen, widthPx = DEFAULT_WIDTH, onClose, children, topOffsetPx = DEFAULT_TOP_OFFSET }: RightSidebarProps) => {
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

  if (!isOpen) return null;

  return (
    <div
      ref={sidebarRef}
      className="fixed right-0 bg-white shadow-lg z-50 border-l border-gray-200"
      style={{ width: widthPx, top: topOffsetPx, height: `calc(100vh - ${topOffsetPx}px)` }}
    >
      <div className="flex justify-end p-4 border-b">
        <button onClick={onClose} className="text-gray-600 hover:text-black">
          ✕
        </button>
      </div>
      <div className="p-4 overflow-auto" style={{ height: `calc(100% - 80px)` }}>{children}</div>
    </div>
  );
};

export default RightSidebar;

