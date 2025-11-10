"use client";
import React, { useState } from "react";
import { Search, ShoppingCart, Info, Calendar, Users } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface Role {
  id: string;
  name: string;
  risk: "Low" | "Medium" | "High";
  description: string;
}

const SelectAccessTab: React.FC = () => {
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");

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
    // This button's primary function is to show the cart count.
    // Actual navigation to a review step would be handled by the parent component's step navigation.
    console.log("Reviewing cart items:", cartCount);
  };

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

export default SelectAccessTab;

