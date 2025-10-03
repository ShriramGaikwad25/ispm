import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    ctaText: string;
    onConfirm: () => void;
  }

  const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, ctaText, onConfirm, children }) => {

  // Handle ESC key to close modal
  const handleKeyDown = useCallback((e: { key: string; }) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900/50 px-3 z-[99]">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

        {/* Body */}
        <div className="text-gray-600 mt-2">{children}</div>

        {/* Actions */}
        <div className="mt-3 flex justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {ctaText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Dialog;
