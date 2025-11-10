"use client";
import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Info, X, Trash2, Edit, MessageSquare, Send, Users } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface UserInfo {
  name: string;
  userName: string;
  email: string;
}

interface Role {
  id: string;
  name: string;
  applications: Application[];
}

interface Application {
  name: string;
  entitlements: Entitlement[];
}

interface Entitlement {
  name: string;
  type: string;
}

const AccessAdvisorTab: React.FC = () => {
  const { items: cartItems, removeFromCart, clearCart } = useCart();
  const [userInfoExpanded, setUserInfoExpanded] = useState(true);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // Listen for tab switch events
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#request-for-self') {
        // Tab switch handled by parent component
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const userInfo: UserInfo = {
    name: "John Smith",
    userName: "XELSYSADM",
    email: "",
  };

  // Use cart items to display roles, or default role if cart is empty
  const roles: Role[] = cartItems.length > 0 
    ? cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        applications: getRoleApplications(item.name),
      }))
    : [{
        id: "1",
        name: "Customer Database Role",
        applications: [
          {
            name: "OIMDBUM",
            entitlements: [
              { name: "5-APEX_ADMINISTRATOR_ROLE", type: "Entitlement" },
              { name: "5-ADM_PARALLEL_EXECUTE_TASK", type: "Entitlement" },
            ],
          },
          {
            name: "ACMECustomerService",
            entitlements: [
              { name: "26-ACME Administrator", type: "Entitlement" },
            ],
          },
        ],
      }];

  function getRoleApplications(roleName: string): Application[] {
    // This is a placeholder - in a real app, you'd fetch this from an API
    if (roleName === "Customer Database Role") {
      return [
        {
          name: "OIMDBUM",
          entitlements: [
            { name: "5-APEX_ADMINISTRATOR_ROLE", type: "Entitlement" },
            { name: "5-ADM_PARALLEL_EXECUTE_TASK", type: "Entitlement" },
          ],
        },
        {
          name: "ACMECustomerService",
          entitlements: [
            { name: "26-ACME Administrator", type: "Entitlement" },
          ],
        },
      ];
    }
    // Default applications for other roles
    return [
      {
        name: "DefaultApp",
        entitlements: [
          { name: "Default Entitlement", type: "Entitlement" },
        ],
      },
    ];
  }

  const handleSubmit = () => {
    // Handle submit logic here
    console.log('Submitting access request for:', cartItems);
    // After successful submit, clear cart
    // clearCart();
  };

  const handleCancel = () => {
    clearCart();
  };

  return (
    <div className="w-full">
      {/* Header with Action Buttons */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-md">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Users className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                <span className="text-xs text-blue-600">?</span>
              </div>
            </div>
            <h2 className="text-lg font-semibold">Request For Self</h2>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            Submit
          </button>
          <button 
            onClick={handleCancel}
            className="inline-flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>

      {/* User Information Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200 p-4 transition-colors"
        >
          <div 
            onClick={() => setUserInfoExpanded(!userInfoExpanded)}
            className="flex items-center gap-3 cursor-pointer flex-1"
          >
            {userInfoExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Name:</span>
                <span className="font-semibold text-gray-800">{userInfo.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">UserName:</span>
                <span className="font-semibold text-gray-800">{userInfo.userName}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Email:</span>
              <input
                type="email"
                placeholder="Enter email"
                className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Roles Section - Display all cart items */}
      {roles.map((role) => {
        const isExpanded = expandedRoles.has(role.id);
        return (
        <div key={role.id} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200 p-4 transition-colors">
            <div 
              onClick={() => {
                setExpandedRoles(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(role.id)) {
                    newSet.delete(role.id);
                  } else {
                    newSet.add(role.id);
                  }
                  return newSet;
                });
              }}
              className="flex items-center gap-3 cursor-pointer flex-1"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              )}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{role.name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="p-1 hover:bg-gray-300 rounded-full transition-colors"
                >
                  <Info className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCart(role.id);
                }}
                className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="text-gray-600 hover:text-gray-700 p-2 hover:bg-gray-200 rounded transition-colors"
              >
                <Edit className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="bg-white border-t border-gray-200">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
                <div>Application Name</div>
                <div>Entitlement</div>
                <div className="flex items-center gap-2">
                  <span>Type</span>
                </div>
              </div>

              {/* Table Content */}
              <div className="divide-y divide-gray-200">
                {role.applications.map((app, appIndex) => (
                  <React.Fragment key={appIndex}>
                    {/* Application Row */}
                    <div className="grid grid-cols-3 gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="font-medium text-gray-800">{app.name}</div>
                      <div className="text-gray-600"></div>
                      <div className="text-gray-600">Application</div>
                    </div>
                    {/* Entitlement Rows */}
                    {app.entitlements.map((entitlement, entIndex) => (
                      <div
                        key={entIndex}
                        className="grid grid-cols-3 gap-4 p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-gray-700">{app.name}</div>
                        <div className="text-gray-600">{entitlement.name}</div>
                        <div className="text-gray-600">{entitlement.type}</div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                  &lt; 1 &gt;
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                  &lt; 1 &gt;
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                  &lt; 1 &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      );
      })}

      {cartItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No items in cart. Add roles from the "Request Access" tab.
        </div>
      )}
    </div>
  );
};

export default AccessAdvisorTab;

