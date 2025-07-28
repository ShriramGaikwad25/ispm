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
            <div className="bg-white rounded-md p-6 w-[550px] shadow-lg relative">
              <h2 className="text-xl font-semibold mb-4">{heading}</h2>

              {/* Tabs */}
              <div className="flex mb-4">
                {["User", "Group"].map((type) => (
                  <button
                    key={type}
                    className={`px-4 py-2 border text-sm ${
                      ownerType === type
                        ? "bg-[#15274E] text-white"
                        : "bg-white text-black"
                    } ${
                      type === "User"
                        ? "rounded-l-md border-r-0"
                        : "rounded-r-md"
                    }`}
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

              {/* Dropdown + Search input */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-sm mb-1">Select Attribute</label>
                  <select
                    value={selectedAttribute}
                    onChange={(e) => setSelectedAttribute(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    {currentAttributes.map((attr) => (
                      <option key={attr.value} value={attr.value}>
                        {attr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm mb-1">Search Value</label>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder={`Search by ${selectedAttribute}`}
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

              {/* Footer Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 text-sm rounded bg-gray-300 hover:bg-gray-400"
                  onClick={handleClose}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ProxyActionModal;
