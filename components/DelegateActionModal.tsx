import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

type Attribute = {
  value: string;
  label: string;
};

type User = Record<string, string>;
type Group = Record<string, string>;

interface DelegateActionModalProps {
  isModalOpen: boolean;
  closeModal: () => void;
  heading?: string;
  users: User[];
  groups: Group[];
  userAttributes: Attribute[];
  groupAttributes: Attribute[];
  onSelectDelegate: (delegate: User | Group) => void;
}

const DelegateActionModal: React.FC<DelegateActionModalProps> = ({
  isModalOpen,
  closeModal,
  heading = "Delegate Action",
  users,
  groups,
  userAttributes,
  groupAttributes,
  onSelectDelegate,
}) => {
  const [delegateType, setDelegateType] = useState<"User" | "Group">("User");
  const [selectedAttribute, setSelectedAttribute] = useState(
    userAttributes[0].value
  );
  const [searchValue, setSearchValue] = useState("");
  const [apiGroups, setApiGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isWaitingForApi, setIsWaitingForApi] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedGroupsRef = useRef<boolean>(false);
  const isApiCallInProgressRef = useRef<boolean>(false);

  // Fetch groups from API when Group type is selected and user searches
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Only fetch if Group type is selected, search has value, and we haven't successfully fetched yet
    if (delegateType === "Group" && searchValue.trim() !== "" && !hasFetchedGroupsRef.current && !isApiCallInProgressRef.current) {
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

          console.log("Calling API to fetch groups for delegate...");
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
    } else if (searchValue.trim() === "" && delegateType === "Group") {
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
  }, [searchValue, delegateType]); // Depend on both, but flag prevents multiple calls

  const sourceData = delegateType === "User" 
    ? users 
    : (apiGroups.length > 0 ? apiGroups : groups);
  const currentAttributes =
    delegateType === "User" ? userAttributes : groupAttributes;

  const filteredData =
    searchValue.trim() === ""
      ? []
      : sourceData.filter((item) => {
          const value = item[selectedAttribute];
          return value?.toLowerCase().includes(searchValue.toLowerCase());
        });

  const handleClose = () => {
    resetState();
    closeModal(); // call the parent's close function
  };

  const resetState = () => {
    setDelegateType("User");
    setSelectedAttribute(userAttributes[0]?.value || "");
    setSearchValue("");
    setApiGroups([]);
    setApiError(null);
    setIsLoadingGroups(false);
    setIsWaitingForApi(false);
    hasFetchedGroupsRef.current = false;
    isApiCallInProgressRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

    const handleCancel = () => {
    resetState();
    closeModal();
  };

  const handleSubmit = () => {
    if (searchValue) {
      onSelectDelegate(delegateType);
      resetState();
      closeModal();
    }
  };

  // Reset API groups when switching between User and Group
  useEffect(() => {
    setApiGroups([]);
    setApiError(null);
    setIsLoadingGroups(false);
    setIsWaitingForApi(false);
    hasFetchedGroupsRef.current = false;
    isApiCallInProgressRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [delegateType]);

  useEffect(() => {
    if (!isModalOpen) resetState();
  }, [isModalOpen]);
  return (
    <>
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3">
            <div className="bg-white rounded-lg p-4 w-[420px] shadow-lg relative">
              {/* Close button */}
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

              {/* Tabs */}
              <div className="flex mb-4 bg-gray-100 p-1 rounded-md">
                {["User", "Group"].map((type) => (
                  <button
                    key={type}
                    className={`flex-1 py-2.5 px-3 text-sm font-medium transition-colors ${
                      delegateType === type
                        ? "bg-white text-[#15274E] border border-gray-300 shadow-sm relative z-10"
                        : "bg-transparent text-gray-500 hover:text-gray-700"
                    } rounded-md`}
                    onClick={() => {
                      setDelegateType(type as "User" | "Group");
                      const initialAttr =
                        type === "User"
                          ? userAttributes[0]
                          : groupAttributes[0];
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Attribute</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Value</label>
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
                  {(isLoadingGroups || isWaitingForApi) && delegateType === "Group" ? (
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
                        <span>Loading groups...</span>
                      </div>
                    </div>
                  ) : apiError && delegateType === "Group" ? (
                    <p className="text-red-500 italic text-xs py-2">
                      Error: {apiError}
                    </p>
                  ) : filteredData.length === 0 && delegateType === "Group" && apiGroups.length > 0 ? (
                    <p className="text-gray-500 italic">
                      No results found matching "{searchValue}" in {selectedAttribute}.
                      <br />
                      <span className="text-xs">
                        (Found {apiGroups.length} total groups)
                      </span>
                    </p>
                  ) : filteredData.length === 0 ? (
                    <p className="text-gray-500 italic">No results found.</p>
                  ) : (
                    <ul className="space-y-1">
                      {filteredData.map((item, index) => (
                        <li
                          key={index}
                          className="p-2 border rounded hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                            onSelectDelegate(item);
                            resetState(); // reset internal state
                          }}
                        >
                          {Object.values(item).join(" | ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!searchValue}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Submit
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default DelegateActionModal;
