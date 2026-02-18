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
  const { getItemDetail, globalAccessType, globalSettings, requestType, attachmentEmailByItem, attachmentFileByItem } = useItemDetails();
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-2">
        <span className="text-sm font-semibold text-blue-900">Request Type:</span>
        <span className="text-sm text-blue-700">
          {selectedUsers.length > 0 ? "Request for Others" : "Request for Self"}
        </span>
      </div>

      {/* Global request details, styled similar to Selected Access Roles cards */}
      <div className="w-full bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Request Details</h3>
        </div>
        <div className="w-full p-3 border border-gray-200 rounded-md bg-gray-50">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:text-sm">
            {/* Row 1: Access Type / Request Type */}
            <div>
              <span className="font-medium text-gray-700">Access Type: </span>
              <span className="text-gray-600">
                {globalAccessType === "indefinite" ? "Indefinite" : "Duration"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Request Type: </span>
              <span className="text-gray-600">{requestType}</span>
            </div>

            {/* Row 2: Start / End dates */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-700">
                Start: {globalSettings.startDate ? formatDate(globalSettings.startDate) : "Not set"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-700">
                End:{" "}
                {globalAccessType === "indefinite"
                  ? "Indefinite"
                  : globalSettings.endDate
                  ? formatDate(globalSettings.endDate)
                  : "Not set"}
              </span>
            </div>

            {/* Row 3: Global comment */}
            <div className="col-span-2">
              <span className="font-medium text-gray-700">Global Comment: </span>
              <span className="text-gray-600 whitespace-pre-wrap break-words">
                {globalSettings.comment && globalSettings.comment.trim() !== ""
                  ? globalSettings.comment
                  : "No global comment"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Users Section - Only show if "Request for Others" */}
      {selectedUsers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Selected Users ({selectedUsers.length})</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="p-3 border-2 border-green-400 rounded-md bg-white hover:bg-green-50 transition-colors"
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
      <div className="w-full bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Selected Access Roles ({items.length})</h3>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No access roles selected</p>
        ) : (
          <div className="w-full space-y-4">
            {items.map((item) => {
              const detail = getItemDetail(item.id);
              const isIndefinite = detail?.isIndefinite ?? (globalAccessType === "indefinite");

              const norm = (x: unknown) => String(x ?? "").trim();
              const fullRole = catalogRoles.find((r) => norm(r.id) === norm(item.id)) ?? ({
                id: item.id,
                name: item.name,
                risk: (item.risk ?? "Low") as "Low" | "Medium" | "High",
                description: "",
                catalogRow: undefined,
              } as Role);

              return (
                <div
                  key={item.id}
                  className="w-full p-4 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 w-full grid grid-cols-2 gap-x-8 gap-y-3 py-0.5">
                    {/* Row 1 */}
                    <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                    <div className="text-left">
                      <span className="text-xs text-gray-600">
                        Access Type: {isIndefinite ? "Indefinite Access" : "Duration"}
                      </span>
                    </div>

                    {/* Row 2 */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700">
                        Start: {detail?.startDate ? formatDate(detail.startDate) : "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700">
                        End: {isIndefinite ? "Indefinite" : (detail?.endDate ? formatDate(detail.endDate) : "Not set")}
                      </span>
                    </div>

                    {/* Row 3 */}
                    <div className="text-xs min-w-0">
                      {detail?.comment ? (
                        <>
                          <span className="font-medium text-gray-700">Comment: </span>
                          <span className="text-gray-600 whitespace-pre-wrap break-words" title={detail.comment}>{detail.comment}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No comment</span>
                      )}
                    </div>
                    <div className="text-xs text-left flex flex-wrap items-center gap-2 min-w-0">
                      {(attachmentEmailByItem[item.id] || attachmentFileByItem[item.id]) ? (
                        <>
                          <span className="font-medium text-gray-700">Attachment: </span>
                          {attachmentEmailByItem[item.id] && (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded">
                              Email: {attachmentEmailByItem[item.id]}
                            </span>
                          )}
                          {attachmentFileByItem[item.id] && (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                              File: {attachmentFileByItem[item.id]}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No attachment</span>
                      )}
                    </div>
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
                        { widthPx: 500, title: "View Details" }
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

    </div>
  );
};

export default ReviewTab;



