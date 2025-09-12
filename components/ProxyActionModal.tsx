import React, { useEffect, useState } from "react";
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
}) => {
  const [ownerType, setOwnerType] = useState<"User" | "Group">("User");
  const [selectedAttribute, setSelectedAttribute] = useState(
    userAttributes[0].value
  );
  const [searchValue, setSearchValue] = useState("");

  const sourceData = ownerType === "User" ? users : groups;
  const currentAttributes =
    ownerType === "User" ? userAttributes : groupAttributes;

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
    setOwnerType("User");
    setSelectedAttribute(userAttributes[0]?.value || "");
    setSearchValue("");
  };

  useEffect(() => {
    if (!isModalOpen) resetState();
  }, [isModalOpen]);
  return (
    <>
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-[550px] shadow-lg relative">
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

              <h2 className="text-xl font-semibold mb-6 pr-8">{heading}</h2>

              {/* Tabs */}
              <div className="flex mb-6 bg-gray-100 p-1 rounded-md">
                {["User", "Group"].map((type) => (
                  <button
                    key={type}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      ownerType === type
                        ? "bg-white text-[#15274E] border border-gray-300 shadow-sm relative z-10"
                        : "bg-transparent text-gray-500 hover:text-gray-700"
                    } rounded-md`}
                    onClick={() => {
                      setOwnerType(type as "User" | "Group");
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
              <div className="mb-4">
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
              <div className="mb-4">
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
                <div className="max-h-40 overflow-auto border rounded p-2 mb-4 text-sm bg-gray-50">
                  {filteredData.length === 0 ? (
                    <p className="text-gray-500 italic">No results found.</p>
                  ) : (
                    <ul className="space-y-1">
                      {filteredData.map((item, index) => (
                        <li
                          key={index}
                          className="p-2 border rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            onSelectOwner(item);
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

            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ProxyActionModal;
