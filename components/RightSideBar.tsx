// components/RightSidebar.jsx
"use client";

interface RightSidebarProps {
  isOpen: boolean;
  widthPx?: number; // default will be 600
  onClose: () => void;
  children?: React.ReactNode;
}

const DEFAULT_WIDTH = 600;

const RightSidebar = ({ isOpen, widthPx = DEFAULT_WIDTH, onClose, children }: RightSidebarProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 right-0 h-full bg-white shadow-lg z-50"
      style={{ width: widthPx }}
    >
      <div className="flex justify-end p-4 border-b">
        <button onClick={onClose} className="text-gray-600 hover:text-black">
          ✕
        </button>
      </div>
      <div className="p-4 overflow-auto">{children}</div>
    </div>
  );
};

export default RightSidebar;

