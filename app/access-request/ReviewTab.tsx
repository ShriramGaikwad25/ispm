"use client";
import React from "react";
import { useCart } from "@/contexts/CartContext";
import { useSelectedUsers } from "@/contexts/SelectedUsersContext";
import { useItemDetails } from "@/contexts/ItemDetailsContext";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { Calendar, Users, User, FileText, ChevronRight } from "lucide-react";
import AddDetailsSidebarContent, { getRiskColor, type Role } from "./AddDetailsSidebarContent";

interface ReviewTabProps {
  catalogRoles?: Role[];
}

const ReviewTab: React.FC<ReviewTabProps> = ({ catalogRoles = [] }) => {
  const { items } = useCart();
  const { selectedUsers } = useSelectedUsers();
  const { getItemDetail, globalAccessType } = useItemDetails();
  const { openSidebar, closeSidebar } = useRightSidebar();

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Request Type Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Request Type</h3>
        <p className="text-sm text-blue-700">
          {selectedUsers.length > 0 ? "Request for Others" : "Request for Self"}
        </p>
      </div>

      {/* Selected Users Section - Only show if "Request for Others" */}
      {selectedUsers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Selected Users ({selectedUsers.length})</h3>
          </div>
          <div className="space-y-2">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="p-3 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <span className="text-xs text-gray-500">({user.username})</span>
                </div>
                <p className="text-xs text-gray-600 ml-6">{user.email}</p>
                <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-gray-500">
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
            ))}
          </div>
        </div>
      )}

      {/* Selected Access Roles Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Selected Access Roles ({items.length})</h3>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No access roles selected</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const detail = getItemDetail(item.id);
              const isIndefinite = detail?.isIndefinite ?? (globalAccessType === "indefinite");

              const fullRole = catalogRoles.find((r) => r.id === item.id) ?? ({
                id: item.id,
                name: item.name,
                risk: (item.risk ?? "Low") as "Low" | "Medium" | "High",
                description: "",
                catalogRow: undefined,
              } as Role);

              return (
                <div
                  key={item.id}
                  className="p-3 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{item.name}</h4>
                    
                    {/* Access Type */}
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-700">Access Type: </span>
                      <span className="text-xs text-gray-600">
                        {isIndefinite ? "Indefinite Access" : "Duration"}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <span className="text-xs font-medium text-gray-700">Start Date: </span>
                          <span className="text-xs text-gray-600">
                            {detail?.startDate ? formatDate(detail.startDate) : "Not set"}
                          </span>
                        </div>
                      </div>
                      {!isIndefinite && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-xs font-medium text-gray-700">End Date: </span>
                            <span className="text-xs text-gray-600">
                              {detail?.endDate ? formatDate(detail.endDate) : "Not set"}
                            </span>
                          </div>
                        </div>
                      )}
                      {isIndefinite && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-xs font-medium text-gray-700">End Date: </span>
                            <span className="text-xs text-gray-600">Indefinite Access</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Comment */}
                    {detail?.comment && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-xs font-medium text-gray-700">Comment: </span>
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{detail.comment}</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      openSidebar(
                        <AddDetailsSidebarContent
                          role={fullRole}
                          riskClass={getRiskColor(fullRole.risk)}
                          onAddToCart={closeSidebar}
                          onValidate={closeSidebar}
                          showActions={false}
                        />,
                        { widthPx: 500, title: "Add Details" }
                      );
                    }}
                    className="shrink-0 p-2 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                    title="View details"
                    aria-label="View entitlement details"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <p>• Request Type: {selectedUsers.length > 0 ? "Request for Others" : "Request for Self"}</p>
          {selectedUsers.length > 0 && <p>• Number of Users: {selectedUsers.length}</p>}
          <p>• Number of Access Roles: {items.length}</p>
          <p>• Access Type: {globalAccessType === "indefinite" ? "Indefinite Access" : "Duration"}</p>
        </div>
      </div>
    </div>
  );
};

export default ReviewTab;



