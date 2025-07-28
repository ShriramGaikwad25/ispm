"use client";
import { GridApi } from "ag-grid-enterprise";
import { createPortal } from "react-dom";
import { Edit2Icon, UserPlus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Select from "react-select";
import ProxyActionModal from "../ProxyActionModal";
import Buttons from "react-multi-date-picker/components/button";

interface EditReassignButtonsProps<T> {
  api: GridApi;
  selectedRows: T[];
}

interface User {
  username: string;
  email: string;
  role: string;
}

interface Group {
  name: string;
  email: string;
  role: string;
}

const EditReassignButtons = <T,>({ api, selectedRows }: EditReassignButtonsProps<T>) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<User | Group | null>(null);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || selectedRows.length === 0) return;
    // Example: Update selected rows to mark as "Editing"
    api.applyTransaction({
      update: selectedRows.map((row) => ({ ...row, status: "Editing" })),
    });
    alert(`Editing ${selectedRows.length} selected rows`);
  };

  const handleReassign = () => {
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);

    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom,
        left: rect.left - 128,
      });
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      menuButtonRef.current &&
      !menuButtonRef.current.contains(event.target as Node)
    ) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div className="flex space-x-6 h-full items-center">
      <button onClick={handleEdit} title="Edit">
        <Edit2Icon
          className="cursor-pointer hover:opacity-80"
          color="#2f8b57ff"
          strokeWidth="1"
          size="24"
          
        />
      </button>

      <button
        ref={menuButtonRef}
        onClick={toggleMenu}
        title="Reassign"
        className={`cursor-pointer rounded-sm hover:opacity-80 ${
          isMenuOpen ? "bg-[#6D6E73]/20" : ""
        }`}
      >
        <UserPlus
          color="#e32929ff"
          size="34"
          className="transform scale-[0.6]"
        />
      </button>

      <div className="relative flex items-center">
        {isMenuOpen &&
          createPortal(
            <div
              ref={menuRef}
              className="absolute bg-white border border-gray-300 shadow-lg rounded-md z-50"
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                minWidth: "160px",
                padding: "8px",
              }}
            >
              <ul className="py-2 text-sm text-gray-700">
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={handleReassign}
                >
                  Reassign Task
                </li>
              </ul>
            </div>,
            document.body
          )}
      </div>

      <ProxyActionModal
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        heading="Reassign Task"
        users={[
          { username: "john", email: "john@example.com", role: "admin" },
          { username: "jane", email: "jane@example.com", role: "user" },
        ]}
        groups={[
          { name: "admins", email: "admins@corp.com", role: "admin" },
          { name: "devs", email: "devs@corp.com", role: "developer" },
        ]}
        userAttributes={[
          { value: "username", label: "Username" },
          { value: "email", label: "Email" },
        ]}
        groupAttributes={[
          { value: "name", label: "Group Name" },
          { value: "role", label: "Role" },
        ]}
        onSelectOwner={(assignee) => {
          setSelectedAssignee(assignee);
          setIsModalOpen(false);
          if (assignee && selectedRows.length > 0) {
            api.applyTransaction({
              update: selectedRows.map((row) => ({
                ...row,
                assignee: assignee.username || assignee.name,
                status: "Reassigned",
              })),
            });
            alert(`Task reassigned to ${assignee.username || assignee.name}`);
          }
        }}
      />

      {selectedAssignee && (
        <div className="text-sm text-gray-700 mt-2">
          <strong>Assigned To:</strong>{" "}
          {Object.values(selectedAssignee).join(" | ")}
        </div>
      )}
    </div>
  );
};

export default EditReassignButtons;