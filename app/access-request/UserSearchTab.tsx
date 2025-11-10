"use client";
import React, { useState, useEffect } from "react";
import { Search, Check } from "lucide-react";
import { useSelectedUsers, User } from "@/contexts/SelectedUsersContext";

const UserSearchTab: React.FC = () => {
  const { selectedUsers: contextSelectedUsers, addUser, removeUser } = useSelectedUsers();
  const [searchCriteria, setSearchCriteria] = useState("name");
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  // Sync local selected IDs with context
  useEffect(() => {
    const ids = new Set(contextSelectedUsers.map((u) => u.id));
    setLocalSelectedIds(ids);
  }, [contextSelectedUsers]);

  const searchOptions = [
    { label: "Name", value: "name" },
    { label: "Email", value: "email" },
    { label: "Username", value: "username" },
    { label: "Employee ID", value: "employee_id" },
    { label: "Department", value: "department" },
    { label: "Job Title", value: "job_title" },
  ];

  // Mock search function - replace with actual API call
  const mockSearch = (criteria: string, value: string): User[] => {
    // Mock data for demonstration
    const mockUsers: User[] = [
      {
        id: "1",
        name: "John Smith",
        email: "john.smith@example.com",
        username: "jsmith",
        department: "IT",
        jobTitle: "Software Engineer",
        employeeId: "EMP001",
      },
      {
        id: "2",
        name: "Jane Doe",
        email: "jane.doe@example.com",
        username: "jdoe",
        department: "HR",
        jobTitle: "HR Manager",
        employeeId: "EMP002",
      },
      {
        id: "3",
        name: "Bob Johnson",
        email: "bob.johnson@example.com",
        username: "bjohnson",
        department: "Finance",
        jobTitle: "Financial Analyst",
        employeeId: "EMP003",
      },
    ];

    // Filter based on search criteria
    return mockUsers.filter((user) => {
      let searchField = "";
      if (criteria === "employee_id") {
        searchField = user.employeeId?.toLowerCase() || "";
      } else if (criteria === "job_title") {
        searchField = user.jobTitle?.toLowerCase() || "";
      } else {
        searchField = user[criteria as keyof User]?.toString().toLowerCase() || "";
      }
      return searchField.includes(value.toLowerCase());
    });
  };

  const handleSearch = () => {
    if (searchValue.trim()) {
      setIsSearching(true);
      // Simulate API call delay
      setTimeout(() => {
        const results = mockSearch(searchCriteria, searchValue);
        setSearchResults(results);
        setIsSearching(false);
      }, 500);
    }
  };

  const handleUserSelect = (user: User) => {
    if (localSelectedIds.has(user.id)) {
      removeUser(user.id);
    } else {
      addUser(user);
    }
  };

  const handleSelectAll = () => {
    if (localSelectedIds.size === searchResults.length) {
      searchResults.forEach((user) => removeUser(user.id));
    } else {
      searchResults.forEach((user) => addUser(user));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4">
        {/* Dropdown */}
        <div className="relative w-64">
          <select
            value={searchCriteria}
            onChange={(e) => setSearchCriteria(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-700"
          >
            {searchOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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

        {/* Input Box */}
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Enter ${searchOptions.find((opt) => opt.value === searchCriteria)?.label || "search value"}...`}
          className="w-64 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />

        {/* Search Button */}
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

      {/* Search Results */}
      {isSearching && (
        <div className="mt-6 p-4 text-center text-gray-500">
          Searching...
        </div>
      )}

      {!isSearching && searchResults.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Search Results ({searchResults.length})
            </h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {localSelectedIds.size === searchResults.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {searchResults.map((user) => {
                const isSelected = localSelectedIds.has(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`flex items-center gap-3 p-4 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 border-l-4 border-l-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <span className="text-xs text-gray-500">({user.username})</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{user.department}</span>
                        <span>•</span>
                        <span>{user.jobTitle}</span>
                        {user.employeeId && (
                          <>
                            <span>•</span>
                            <span>ID: {user.employeeId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!isSearching && searchResults.length === 0 && searchValue.trim() !== "" && (
        <div className="mt-6 p-4 text-center text-gray-500 border border-gray-200 rounded-md">
          No results found for "{searchValue}"
        </div>
      )}
    </div>
  );
};

export default UserSearchTab;

