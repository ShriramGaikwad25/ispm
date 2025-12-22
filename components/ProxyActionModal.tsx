import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

type Attribute = {
  value: string;
  label: string;
};

type User = Record<string, string>;
type Group = Record<string, string>;

interface ProxyActionModalProps {
  isModalOpen: boolean;
  closeModal: () => void;
  heading?: string;
  users: User[];
  groups: Group[];
  userAttributes: Attribute[];
  groupAttributes: Attribute[];
  onSelectOwner: (owner: User | Group) => void;
  /**
   * When true, renders inline (no portal / full-screen overlay).
   * Default is modal behavior using a portal.
   */
  inline?: boolean;
}

const ProxyActionModal: React.FC<ProxyActionModalProps> = ({
  isModalOpen,
  closeModal,
  heading = "Proxy Action",
  users,
  groups,
  userAttributes,
  groupAttributes,
  onSelectOwner,
  inline = false,
}) => {
  const [ownerType, setOwnerType] = useState<"User" | "Group">("User");
  const [selectedAttribute, setSelectedAttribute] = useState(
    userAttributes[0].value
  );
  const [searchValue, setSearchValue] = useState("");
  const [selectedItem, setSelectedItem] = useState<User | Group | null>(null);
  const [apiUsers, setApiUsers] = useState<User[]>([]);
  const [apiGroups, setApiGroups] = useState<Group[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isWaitingForApi, setIsWaitingForApi] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedUsersRef = useRef<boolean>(false);
  const hasFetchedGroupsRef = useRef<boolean>(false);
  const isApiCallInProgressRef = useRef<boolean>(false);

  // Fetch all users from API once when user starts typing (with debounce)
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Only fetch if User type is selected, search has value, and we haven't successfully fetched yet
    if (ownerType === "User" && searchValue.trim() !== "" && !hasFetchedUsersRef.current && !isApiCallInProgressRef.current) {
      setIsWaitingForApi(true);
      
      // Set flag to indicate API call is in progress (prevents multiple simultaneous calls)
      isApiCallInProgressRef.current = true;
      
      // Debounce the API call - wait 500ms after user stops typing
      debounceTimerRef.current = setTimeout(async () => {
        setIsLoadingUsers(true);
        setIsWaitingForApi(false);
        setApiError(null);
        try {
          // Fetch all users (no filter in query, we'll filter client-side)
          const query = `SELECT username, email FROM usr`;

          console.log("Calling API to fetch users (only once)...");
          const response = await fetch(
            "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: query,
                parameters: [],
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Log the response for debugging
          console.log("API Response:", data);
          
          // Handle the response format - data is in resultSet
          let usersData: User[] = [];
          if (data?.resultSet && Array.isArray(data.resultSet)) {
            // Normalize the email field from different formats
            usersData = data.resultSet.map((user: any) => {
              let emailValue = "";
              
              // Handle email field - can be object, array, or missing
              if (user.email) {
                if (typeof user.email === "string") {
                  emailValue = user.email;
                } else if (user.email.work) {
                  // Format: { "work": "email@example.com" }
                  emailValue = user.email.work;
                } else if (Array.isArray(user.email) && user.email.length > 0) {
                  // Format: [{ "type": "work", "value": "email@example.com", "primary": true }]
                  // Find primary email or first email
                  const primaryEmail = user.email.find((e: any) => e.primary) || user.email[0];
                  emailValue = primaryEmail?.value || "";
                }
              }
              
              return {
                username: user.username || "",
                email: emailValue,
              };
            });
          } else if (Array.isArray(data)) {
            usersData = data;
          } else if (data?.results && Array.isArray(data.results)) {
            usersData = data.results;
          } else if (data?.data && Array.isArray(data.data)) {
            usersData = data.data;
          } else if (data?.items && Array.isArray(data.items)) {
            usersData = data.items;
          } else if (data?.rows && Array.isArray(data.rows)) {
            usersData = data.rows;
          } else if (data?.records && Array.isArray(data.records)) {
            usersData = data.records;
          }

          console.log("Parsed users data:", usersData, "Total users:", usersData.length);
          setApiUsers(usersData);
          // Mark as fetched only on success
          hasFetchedUsersRef.current = true;
        } catch (error) {
          console.error("Error fetching users from API:", error);
          setApiError(error instanceof Error ? error.message : "Failed to fetch users");
          setApiUsers([]);
          // Don't set hasFetchedUsersRef on error so user can retry
        } finally {
          setIsLoadingUsers(false);
          isApiCallInProgressRef.current = false;
        }
      }, 500); // 500ms debounce
    } else if (searchValue.trim() === "" && ownerType === "User") {
      // Reset when search is cleared - allow fetching again
      hasFetchedUsersRef.current = false;
      isApiCallInProgressRef.current = false;
      setApiUsers([]);
      setIsWaitingForApi(false);
    }

    // Cleanup timer on unmount or dependency change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [searchValue, ownerType]); // Depend on both, but flag prevents multiple calls

  // Fetch groups from API when Group type is selected and user searches
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Only fetch if Group type is selected, search has value, and we haven't successfully fetched yet
    if (ownerType === "Group" && searchValue.trim() !== "" && !hasFetchedGroupsRef.current && !isApiCallInProgressRef.current) {
      setIsWaitingForApi(true);
      
      // Set flag to indicate API call is in progress (prevents multiple simultaneous calls)
      isApiCallInProgressRef.current = true;
      
      // Debounce the API call - wait 500ms after user stops typing
      debounceTimerRef.current = setTimeout(async () => {
        setIsLoadingGroups(true);
        setIsWaitingForApi(false);
        setApiError(null);
        try {
          const query = `select * from kf_groups where group_id = ?::uuid`;

          console.log("Calling API to fetch groups...");
          const response = await fetch(
            "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: query,
                parameters: ["126c4e68-6f51-4c10-847e-07505169e234"],
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Log the response for debugging
          console.log("API Response for groups:", data);
          
          // Handle the response format - data is in resultSet
          let groupsData: Group[] = [];
          if (data?.resultSet && Array.isArray(data.resultSet)) {
            groupsData = data.resultSet.map((group: any) => {
              // Map the group data to the expected format
              return {
                ...group,
                id: group.group_id || group.id || "",
                name: group.group_name || group.name || "",
              };
            });
          } else if (Array.isArray(data)) {
            groupsData = data;
          } else if (data?.results && Array.isArray(data.results)) {
            groupsData = data.results;
          } else if (data?.data && Array.isArray(data.data)) {
            groupsData = data.data;
          } else if (data?.items && Array.isArray(data.items)) {
            groupsData = data.items;
          } else if (data?.rows && Array.isArray(data.rows)) {
            groupsData = data.rows;
          } else if (data?.records && Array.isArray(data.records)) {
            groupsData = data.records;
          }

          console.log("Parsed groups data:", groupsData, "Total groups:", groupsData.length);
          setApiGroups(groupsData);
          // Mark as fetched only on success
          hasFetchedGroupsRef.current = true;
        } catch (error) {
          console.error("Error fetching groups from API:", error);
          setApiError(error instanceof Error ? error.message : "Failed to fetch groups");
          setApiGroups([]);
          // Don't set hasFetchedGroupsRef on error so user can retry
        } finally {
          setIsLoadingGroups(false);
          isApiCallInProgressRef.current = false;
        }
      }, 500); // 500ms debounce
    } else if (searchValue.trim() === "" && ownerType === "Group") {
      // Reset when search is cleared - allow fetching again
      hasFetchedGroupsRef.current = false;
      isApiCallInProgressRef.current = false;
      setApiGroups([]);
      setIsWaitingForApi(false);
    }

    // Cleanup timer on unmount or dependency change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [searchValue, ownerType]); // Depend on both, but flag prevents multiple calls

  const sourceData = ownerType === "User" 
    ? apiUsers 
    : (apiGroups.length > 0 ? apiGroups : groups);
  const currentAttributes =
    ownerType === "User" ? userAttributes : groupAttributes;

  // Filter API results client-side based on search value and selected attribute
  const filteredData =
    searchValue.trim() === ""
      ? []
      : sourceData.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          
          // Try multiple possible keys for the attribute
          const possibleKeys = [
            selectedAttribute,
            selectedAttribute.toLowerCase(),
            selectedAttribute.toUpperCase(),
          ];
          
          // Also try common variations based on selected attribute
          if (selectedAttribute.toLowerCase() === "username") {
            possibleKeys.push("username", "user_name", "userName", "USERNAME", "user");
          } else if (selectedAttribute.toLowerCase() === "email") {
            possibleKeys.push("email", "EMAIL", "e_mail", "eMail");
          }
          
          // Find the value using any of the possible keys
          let value = "";
          for (const key of possibleKeys) {
            if (item[key] !== undefined && item[key] !== null) {
              value = String(item[key]);
              break;
            }
          }
          
          // If we found a value in the selected attribute, filter by it
          if (value) {
            return value.toLowerCase().includes(searchValue.toLowerCase());
          }
          
          // Fallback: search in all string values if attribute not found
          const allValues = Object.values(item)
            .filter(v => v !== null && v !== undefined)
            .map(v => String(v))
            .join(" ");
          return allValues.toLowerCase().includes(searchValue.toLowerCase());
        });

  const handleClose = () => {
    resetState();
    closeModal(); // call the parent's close function
  };

  const handleCancel = () => {
    resetState();
    closeModal();
  };

  const handleSubmit = () => {
    if (selectedItem) {
      onSelectOwner(selectedItem);
      resetState();
      closeModal();
    }
  };

  const resetState = () => {
    setOwnerType("User");
    setSelectedAttribute(userAttributes[0]?.value || "");
    setSearchValue("");
    setSelectedItem(null);
    setApiUsers([]);
    setApiGroups([]);
    setApiError(null);
    setIsLoadingUsers(false);
    setIsLoadingGroups(false);
    setIsWaitingForApi(false);
    hasFetchedUsersRef.current = false;
    hasFetchedGroupsRef.current = false;
    isApiCallInProgressRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isModalOpen) resetState();
  }, [isModalOpen]);

  // Reset API users/groups when switching between User and Group
  useEffect(() => {
    setApiUsers([]);
    setApiGroups([]);
    setApiError(null);
    setIsLoadingUsers(false);
    setIsLoadingGroups(false);
    setIsWaitingForApi(false);
    hasFetchedUsersRef.current = false;
    hasFetchedGroupsRef.current = false;
    isApiCallInProgressRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [ownerType]);
  if (!isModalOpen) {
    return null;
  }

  const card = (
    <div className="bg-white rounded-lg p-4 w-full max-w-[420px] shadow-lg relative">
      {/* Header (hidden for inline usage) */}
      {!inline && (
        <>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <h2 className="text-lg font-semibold mb-4 pr-8">{heading}</h2>
        </>
      )}

      {/* Tabs */}
      <div className="flex mb-4 bg-gray-100 p-1 rounded-md">
        {["User", "Group"].map((type) => (
          <button
            key={type}
            className={`flex-1 py-2.5 px-3 text-sm font-medium transition-colors ${
              ownerType === type
                ? "bg-white text-[#15274E] border border-gray-300 shadow-sm relative z-10"
                : "bg-transparent text-gray-500 hover:text-gray-700"
            } rounded-md`}
            onClick={() => {
              setOwnerType(type as "User" | "Group");
              const initialAttr =
                type === "User" ? userAttributes[0] : groupAttributes[0];
              setSelectedAttribute(initialAttr?.value || "");
              setSearchValue("");
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Select Attribute */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Attribute
        </label>
        <div className="relative">
          <select
            value={selectedAttribute}
            onChange={(e) => setSelectedAttribute(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {currentAttributes.map((attr) => (
              <option key={attr.value} value={attr.value}>
                {attr.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Search Value */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Value
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search"
          />
        </div>
      </div>

      {/* Filtered List */}
      {searchValue.trim() !== "" && (
        <div className="max-h-36 overflow-auto border rounded p-2 mb-3 text-sm bg-gray-50">
          {((isLoadingUsers || isWaitingForApi) && ownerType === "User") || ((isLoadingGroups || isWaitingForApi) && ownerType === "Group") ? (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Loading {ownerType === "User" ? "users" : "groups"}...</span>
              </div>
            </div>
          ) : apiError ? (
            <p className="text-red-500 italic text-xs py-2">
              Error: {apiError}
            </p>
          ) : filteredData.length === 0 && ((ownerType === "User" && apiUsers.length > 0) || (ownerType === "Group" && apiGroups.length > 0)) ? (
            <p className="text-gray-500 italic">
              No results found matching "{searchValue}" in {selectedAttribute}.
              <br />
              <span className="text-xs">
                (Found {ownerType === "User" ? apiUsers.length : apiGroups.length} total {ownerType === "User" ? "users" : "groups"})
              </span>
            </p>
          ) : filteredData.length === 0 ? (
            <p className="text-gray-500 italic">No results found.</p>
          ) : (
            <ul className="space-y-1">
              {filteredData.map((item, index) => (
                <li
                  key={index}
                  className={`p-2 border rounded cursor-pointer transition-colors ${
                    selectedItem === item
                      ? "bg-blue-100 border-blue-300"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    if (inline) {
                      onSelectOwner(item);
                      resetState();
                      closeModal();
                    } else {
                      setSelectedItem(item);
                    }
                  }}
                >
                  {/* Display username and email if available */}
                  {item.username && item.email
                    ? `${item.username} | ${item.email}`
                    : item.email
                    ? item.email
                    : item.username
                    ? item.username
                    : Object.values(item).join(" | ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action Buttons (hidden for inline usage) */}
      {!inline && (
        <div className="flex justify-end space-x-3 mt-5 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedItem}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );

  if (inline) {
    // Render inline (no full-screen overlay / portal)
    return <div className="mt-3">{card}</div>;
  }

  // Default: portal-based modal overlay
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3">
      {card}
    </div>,
    document.body
  );
};

export default ProxyActionModal;
