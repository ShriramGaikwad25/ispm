import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Dropdown from "./Dropdown";
import { UserRowData } from "@/types/certification";
import { UserPopup } from "@/app/access-review/[reviewerId]/[certId]/TreeClient";

const HeaderContent = () => {
  const [headerInfo, setHeaderInfo] = useState<{
    campaignName: string;
    dueDate: string;
    daysLeft: number;
  }>({
    campaignName: "",
    dueDate: "",
    daysLeft: 0,
  });

  // State for UserPopup
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [userDetails, setUserDetails] = useState<{
    username: string;
    userId: string;
    userStatus: string;
    manager: string;
    department: string;
    jobTitle: string;
    userType: "Internal" | "External";
  } | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    const dataStr = localStorage.getItem("sharedRowData");
    if (dataStr) {
      try {
        const data: UserRowData[] = JSON.parse(dataStr);
        if (data.length > 0) {
          const firstItem = data[0];
          setHeaderInfo({
            campaignName: firstItem.certificationName || "",
            dueDate: firstItem.certificationExpiration || "",
            daysLeft: calculateDaysLeft(firstItem.certificationExpiration),
          });
          // Set user details for the popup
          setUserDetails({
            username: firstItem.fullName || "Unknown User",
            userId: firstItem.id || "N/A",
            userStatus: firstItem.status || "Active", // Adjust based on actual field
            manager: firstItem.manager || "N/A", // Adjust based on actual field
            department: firstItem.department || "N/A",
            jobTitle: firstItem.jobtitle || "N/A",
            userType: firstItem.userType || "Internal", // Adjust based on actual field
          });
        }
      } catch (err) {
        console.error("Error parsing sharedRowData:", err);
      }
    }
  }, []);

  function calculateDaysLeft(expirationDateStr: string): number {
    if (!expirationDateStr) return 0;
    const expiration = new Date(expirationDateStr);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
  }

  // Check if pathname contains "access-review" followed by additional segments
  const hasAccessReviewWithSegments =
    pathname && /^\/access-review(\/.+)+$/.test(pathname);

  // Handler for Profile click in dropdown
  const handleProfileClick = () => {
    if (userDetails) {
      setShowUserPopup(true);
    }
  };

  return (
    <div className="flex h-[45px] w-full items-center justify-between text-sm bg-[#f8f9fa] px-4">
      {/* Left Section */}
      <div className="flex items-center h-full">
        {hasAccessReviewWithSegments && (
          <div className="flex h-full divide-x divide-[#C3C4C8]">
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-blue-500">
                {headerInfo.campaignName}
              </p>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-blue-500">
                Generated On {headerInfo.dueDate}
              </p>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-blue-500">
                Due on {headerInfo.dueDate}
                <span className="font-bold">
                  ({headerInfo.daysLeft} days left)
                </span>
              </p>
            </div>
            <div className="flex items-center px-4">
              <p className="text-sm font-medium text-blue-500">
                Cert Objective ?
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center h-full w-32 justify-end border-l border-l-white gap-4">
        <Dropdown
          Icon={() => (
            <Image
              src="https://avatar.iran.liara.run/public/1"
              alt="User Avatar"
              width={28}
              height={28}
              className="object-cover cursor-pointer"
            />
          )}
          className="!rounded-full border border-gray-500"
          title="User profile"
        >
          <button
            onClick={handleProfileClick}
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
          >
            Profile
          </button>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Settings
          </a>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Logout
          </a>
        </Dropdown>
      </div>

      {/* User Popup */}
      {showUserPopup && userDetails && (
        <UserPopup
          username={userDetails.username}
          userId={userDetails.userId}
          userStatus={userDetails.userStatus}
          manager={userDetails.manager}
          department={userDetails.department}
          jobTitle={userDetails.jobTitle}
          userType={userDetails.userType}
          onClose={() => setShowUserPopup(false)}
        />
      )}
    </div>
  );
};

export default HeaderContent;