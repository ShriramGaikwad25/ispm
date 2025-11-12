"use client";
import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Info, Calendar, Users, Check, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import HorizontalTabs from "@/components/HorizontalTabs";

interface Role {
  id: string;
  name: string;
  risk: "Low" | "Medium" | "High";
  description: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  department?: string;
  jobTitle?: string;
}

interface SelectAccessTabProps {
  onApply?: () => void;
}

const SelectAccessTab: React.FC<SelectAccessTabProps> = ({ onApply }) => {
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
  
  // Mirror Access state - moved to parent to persist across tab switches
  const [mirrorAccessState, setMirrorAccessState] = useState<{
    selectedUser: User | null;
    userAccess: Role[];
    selectedAccessIds: Set<string>;
  }>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mirrorAccessState');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            selectedUser: parsed.selectedUser,
            userAccess: parsed.userAccess || [],
            selectedAccessIds: new Set(parsed.selectedAccessIds || []),
          };
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return {
      selectedUser: null,
      userAccess: [],
      selectedAccessIds: new Set(),
    };
  });
  
  // Initialize activeTab - default to Mirror Access (2) if user is selected, otherwise 0
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectAccessActiveTab');
        if (saved !== null) {
          return parseInt(saved, 10);
        }
        // Check if Mirror Access has a selected user
        const mirrorState = localStorage.getItem('mirrorAccessState');
        if (mirrorState) {
          const parsed = JSON.parse(mirrorState);
          if (parsed.selectedUser) {
            return 2; // Mirror Access tab
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return 0; // Default to All tab
  });
  
  // Save activeTab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectAccessActiveTab', activeTab.toString());
    }
  }, [activeTab]);
  
  // Save mirrorAccessState to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mirrorAccessState', JSON.stringify({
          selectedUser: mirrorAccessState.selectedUser,
          userAccess: mirrorAccessState.userAccess,
          selectedAccessIds: Array.from(mirrorAccessState.selectedAccessIds),
        }));
      } catch (e) {
        // Ignore save errors
      }
    }
  }, [mirrorAccessState]);
  
  // Sample roles data with risk and description
  const roles: Role[] = [
    {
      id: "1",
      name: "ApprvoalRole",
      risk: "Medium",
      description: "Role for managing approval workflows and processes",
    },
    {
      id: "2",
      name: "Customer Database Role",
      risk: "High",
      description: "Access to customer database with read and write permissions",
    },
    {
      id: "3",
      name: "Developer Role",
      risk: "Low",
      description: "Standard developer access to development environments",
    },
    {
      id: "4",
      name: "Finance and Administration_HCM_Approver",
      risk: "High",
      description: "Human Capital Management approver role for finance and administration",
    },
    {
      id: "5",
      name: "IT Security Group",
      risk: "High",
      description: "IT security group with elevated permissions for security management",
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High":
        return "text-red-600 bg-red-50 border-red-200";
      case "Medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "Low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // All Tab Component
  const AllTab: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState<string>("");

    const filteredRoles = roles.filter((role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddToCart = (role: Role) => {
      if (isInCart(role.id)) {
        removeFromCart(role.id);
      } else {
        addToCart({ id: role.id, name: role.name, risk: role.risk });
      }
    };

    const handleReview = () => {
      console.log("Reviewing cart items:", cartCount);
    };

    return (
      <div className="w-full">
        {/* Search and Filter Section */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search Catalog"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
              >
                <option value="">Role</option>
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <button 
            onClick={handleReview}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium transition-colors relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Roles List */}
        <div className="space-y-3">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-800 font-medium">{role.name}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                        role.risk
                      )}`}
                    >
                      {role.risk} Risk
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                  <Info className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => handleAddToCart(role)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                    isInCart(role.id)
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isInCart(role.id) ? "Remove" : "Add To Cart"}
                </button>
                <button className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No roles found matching your search.
          </div>
        )}
      </div>
    );
  };

  // Recommended Tab Component
  const RecommendedTab: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    
    // Filter recommended roles (for demo, showing first 3 as recommended)
    const recommendedRoles = roles.slice(0, 3);
    const filteredRoles = recommendedRoles.filter((role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddToCart = (role: Role) => {
      if (isInCart(role.id)) {
        removeFromCart(role.id);
      } else {
        addToCart({ id: role.id, name: role.name, risk: role.risk });
      }
    };

    return (
      <div className="w-full">
        {/* Search Section */}
        <div className="mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search Recommended Roles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Recommended Roles List */}
        <div className="space-y-3">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-800 font-medium">{role.name}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                        role.risk
                      )}`}
                    >
                      {role.risk} Risk
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                  <Info className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => handleAddToCart(role)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                    isInCart(role.id)
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isInCart(role.id) ? "Remove" : "Add To Cart"}
                </button>
                <button className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No recommended roles found matching your search.
          </div>
        )}
      </div>
    );
  };

  // Mirror Access Tab Component
  const MirrorAccessTab: React.FC = () => {
    const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isRetrieving, setIsRetrieving] = useState(false);
    
    // Use state from parent component
    const { selectedUser, userAccess, selectedAccessIds } = mirrorAccessState;
    
    const setSelectedUser = (user: User | null) => {
      setMirrorAccessState(prev => ({ ...prev, selectedUser: user }));
    };
    
    const setUserAccess = (access: Role[]) => {
      setMirrorAccessState(prev => ({ ...prev, userAccess: access }));
    };
    
    const setSelectedAccessIds = (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setMirrorAccessState(prev => ({
        ...prev,
        selectedAccessIds: typeof ids === 'function' ? ids(prev.selectedAccessIds) : ids
      }));
    };

    // Mock user search function
    const mockUserSearch = (value: string): User[] => {
      const mockUsers: User[] = [
        {
          id: "1",
          name: "John Smith",
          email: "john.smith@example.com",
          username: "jsmith",
          department: "IT",
          jobTitle: "Software Engineer",
        },
        {
          id: "2",
          name: "Jane Doe",
          email: "jane.doe@example.com",
          username: "jdoe",
          department: "HR",
          jobTitle: "HR Manager",
        },
        {
          id: "3",
          name: "Bob Johnson",
          email: "bob.johnson@example.com",
          username: "bjohnson",
          department: "Finance",
          jobTitle: "Financial Analyst",
        },
      ];

      return mockUsers.filter((user) =>
        user.name.toLowerCase().includes(value.toLowerCase()) ||
        user.email.toLowerCase().includes(value.toLowerCase()) ||
        user.username.toLowerCase().includes(value.toLowerCase())
      );
    };

    // Mock function to retrieve user access
    const mockRetrieveAccess = (userId: string): Role[] => {
      // Return some roles as user's access (for demo purposes)
      return roles.slice(0, 3);
    };

    const handleSearch = () => {
      if (searchValue.trim()) {
        setIsSearching(true);
        setTimeout(() => {
          const results = mockUserSearch(searchValue);
          setSearchResults(results);
          setIsSearching(false);
        }, 500);
      }
    };

    const handleUserSelect = (user: User) => {
      setSelectedUser(user);
      setUserAccess([]);
      setSelectedAccessIds(new Set());
    };

    const handleRetrieveAccess = () => {
      if (selectedUser) {
        setIsRetrieving(true);
        setTimeout(() => {
          const access = mockRetrieveAccess(selectedUser.id);
          setUserAccess(access);
          setIsRetrieving(false);
        }, 500);
      }
    };

    const handleAccessToggle = (accessId: string) => {
      setSelectedAccessIds((prev) => {
        const newSelected = new Set(prev);
        if (newSelected.has(accessId)) {
          newSelected.delete(accessId);
        } else {
          newSelected.add(accessId);
        }
        return newSelected;
      });
    };

    const handleSelectAllAccess = () => {
      setSelectedAccessIds((prev) => {
        if (prev.size === userAccess.length) {
          return new Set();
        } else {
          return new Set(userAccess.map((a) => a.id));
        }
      });
    };

    const handleApply = () => {
      // Add selected access to cart
      const selectedIds = Array.from(selectedAccessIds);
      selectedIds.forEach((accessId) => {
        const access = userAccess.find((a) => a.id === accessId);
        if (access && !isInCart(access.id)) {
          addToCart({ id: access.id, name: access.name, risk: access.risk });
        }
      });
      
      // Navigate to next step (Details)
      if (onApply) {
        onApply();
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    };

    return (
      <div className="w-full">
        {/* Cart Display */}
        <div className="mb-6 flex justify-end">
          <button 
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium transition-colors relative"
            title="View cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* User Search Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search User
          </label>
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by name, email, or username..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchValue.trim()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                searchValue.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="mb-6 p-4 text-center text-gray-500">
            Searching users...
          </div>
        )}

        {!isSearching && searchResults.length > 0 && !selectedUser && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Search Results ({searchResults.length})
            </h3>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="flex items-center gap-3 p-4 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <span className="text-xs text-gray-500">({user.username})</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                      {user.department && (
                        <p className="text-xs text-gray-500 mt-1">
                          {user.department} {user.jobTitle && `• ${user.jobTitle}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected User Display */}
        {selectedUser && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedUser.name}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                {selectedUser.department && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedUser.department} {selectedUser.jobTitle && `• ${selectedUser.jobTitle}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserAccess([]);
                  setSelectedAccessIds(new Set());
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Change User
              </button>
            </div>
          </div>
        )}

        {/* Retrieve Access Button */}
        {selectedUser && userAccess.length === 0 && (
          <div className="mb-6">
            <button
              onClick={handleRetrieveAccess}
              disabled={isRetrieving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isRetrieving
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isRetrieving ? "Retrieving..." : "Retrieve Access"}
            </button>
          </div>
        )}

        {/* User Access List */}
        {isRetrieving && (
          <div className="mb-6 p-4 text-center text-gray-500">
            Retrieving user access...
          </div>
        )}

        {userAccess.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                User Access ({userAccess.length})
              </h3>
              <button
                onClick={handleSelectAllAccess}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedAccessIds.size === userAccess.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="space-y-3">
              {userAccess.map((access) => {
                const isSelected = selectedAccessIds.has(access.id);
                const inCart = isInCart(access.id);
                return (
                  <div
                    key={access.id}
                    className={`flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded-lg p-4 transition-colors ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccessToggle(access.id);
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded">
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-800 font-medium">{access.name}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                              access.risk
                            )}`}
                          >
                            {access.risk} Risk
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{access.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (inCart) {
                            removeFromCart(access.id);
                          } else {
                            addToCart({ id: access.id, name: access.name, risk: access.risk });
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                          inCart
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {inCart ? "Remove" : "Add To Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Apply Button */}
        {userAccess.length > 0 && selectedAccessIds.size > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    {
      label: "All",
      component: AllTab,
    },
    {
      label: "Recommended",
      component: RecommendedTab,
    },
    {
      label: "Mirror Access",
      component: MirrorAccessTab,
    },
  ];

  return (
    <div className="w-full">
      <HorizontalTabs
        tabs={tabs}
        activeIndex={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
};

export default SelectAccessTab;
