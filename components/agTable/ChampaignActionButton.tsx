import {
  BellIcon,
  MoreVertical,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ProxyActionModal from "../ProxyActionModal";
import { useLoading } from "@/contexts/LoadingContext";
import ActionCompletedToast from "../ActionCompletedToast";
import { useRouter } from "next/navigation";

interface ChampaignActionButtonProps {
  reviewerId?: string;
  certId?: string;
}

const ChampaignActionButton: React.FC<ChampaignActionButtonProps> = ({
  reviewerId,
  certId,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const { showApiLoader, hideApiLoader } = useLoading();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);

    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom,
        left: rect.left - 128,
      });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    setOpen(false); // close dropdown when modal opens
  };

  // Generic action handler for all buttons
  const handleAction = async (actionName: string) => {
    try {
      setIsActionLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // End local loading state quickly (no overlay)
      setTimeout(() => {
        setIsActionLoading(false);
      }, 100);
      
      // Show completion toast immediately
      setShowCompletionToast(true);
      
    } catch (error) {
      console.error(`Error performing ${actionName}:`, error);
      setIsActionLoading(false);
    }
  };

  const handleView = () => {
    if (reviewerId && certId) {
      // Navigate to TreeClient page in read-only mode for this reviewer/certification
      router.push(`/access-review/${reviewerId}/${certId}?readonly=true`);
      return;
    }

    // Fallback to generic handler if identifiers are missing
    handleAction("View");
  };
  const handleSendReminder = () => handleAction('Send Reminder');
  const handleEscalate = () => handleAction('Escalate');
  const handleReassign = () => handleAction('Reassign');
  const handleClaim = () => handleAction('Claim');
  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      {/* Icon buttons */}
      <button
        title="View"
        className="text-blue-400 hover:text-blue-600 p-1 cursor-pointer"
        onClick={handleView}
        disabled={isActionLoading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-eye-icon lucide-eye"
        >
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button
        title="Send Reminder"
        className="text-yellow-400 hover:text-yellow-600 p-1 cursor-pointer"
        onClick={handleSendReminder}
        disabled={isActionLoading}
      >
        <BellIcon />
      </button>
      <button
        title="Escalate"
        className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
        onClick={handleEscalate}
        disabled={isActionLoading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-arrow-up-narrow-wide-icon lucide-arrow-up-narrow-wide"
        >
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
          <path d="M11 12h4" />
          <path d="M11 16h7" />
          <path d="M11 20h10" />
        </svg>
      </button>
      <button
        ref={menuButtonRef}
        onClick={toggleMenu}
        title="More Actions"
        className={`cursor-pointer rounded-sm hover:opacity-80 ${
          open ? "bg-[#6D6E73]/20" : ""
        }`}
      >
        <MoreVertical
          color="#35353A"
          size="32"
          className="transfrom scale-[0.6]"
        />
      </button>
      <div className="relative flex items-center">
        {open &&
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
                  Reassign
                </li>
                <li 
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={handleClaim}
                >
                  Claim
                </li>
              </ul>
            </div>,
            document.body
          )}
      </div>
            <ProxyActionModal
              isModalOpen={isModalOpen}
              closeModal={() => setIsModalOpen(false)}
              heading="Reassign"
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
              onSelectOwner={(owner) => {
                // setSelectedOwner(owner);
                setIsModalOpen(false);
              }}
            />

      {/* Action Completed Toast */}
      <ActionCompletedToast
        isVisible={showCompletionToast}
        messages={['Action success', 'Action completed']}
        onClose={() => setShowCompletionToast(false)}
        messageDuration={1000}
      />

      {}
    </div>
  );
};

export default ChampaignActionButton;
