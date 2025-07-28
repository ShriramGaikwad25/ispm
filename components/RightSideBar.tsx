// components/RightSidebar.jsx
interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const RightSidebar = ({ isOpen, onClose, children }: RightSidebarProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-150 bg-white shadow-lg z-50">
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

