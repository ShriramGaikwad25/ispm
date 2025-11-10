"use client";
import React, { useState } from "react";
import { Search, ShoppingCart, Info, Calendar, Users } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface Role {
  id: string;
  name: string;
}

const CatalogTab: React.FC = () => {
  const { addToCart, isInCart, cartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Sample roles data based on the image
  const roles: Role[] = [
    { id: "1", name: "ApprvoalRole" },
    { id: "2", name: "Customer Database Role" },
    { id: "3", name: "Developer Role" },
    { id: "4", name: "Finance and Administration_HCM_Approver" },
    { id: "5", name: "IT Security Group" },
  ];

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (role: Role) => {
    addToCart({ id: role.id, name: role.name });
  };

  const handleReview = () => {
    // Navigate to Request for Self tab (index 1)
    // We'll use a custom event or URL hash to switch tabs
    window.location.hash = 'request-for-self';
    // Trigger a custom event that the parent page can listen to
    window.dispatchEvent(new CustomEvent('switchToTab', { detail: { tabIndex: 1 } }));
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
              className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors relative"
        >
          <ShoppingCart className="w-4 h-4" />
          Review
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
              <span className="text-gray-800 font-medium">{role.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                <Info className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={() => handleAddToCart(role)}
                disabled={isInCart(role.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  isInCart(role.id)
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                {isInCart(role.id) ? 'In Cart' : 'Add To Cart'}
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

export default CatalogTab;

