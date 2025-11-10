"use client";
import React, { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useItemDetails } from "@/contexts/ItemDetailsContext";
import { Calendar, Edit, Save, X } from "lucide-react";

interface ItemDates {
  [itemId: string]: {
    startDate: string;
    endDate: string;
    isIndefinite: boolean;
    comment: string;
    isEditing: boolean;
  };
}

const DetailsTab: React.FC = () => {
  const { items } = useCart();
  const { setItemDetail, getItemDetail } = useItemDetails();
  const [itemDates, setItemDates] = useState<ItemDates>({});

  // Initialize dates for new items
  React.useEffect(() => {
    setItemDates((prev) => {
      const newDates: ItemDates = { ...prev };
      items.forEach((item) => {
        if (!newDates[item.id]) {
          const existingDetail = getItemDetail(item.id);
          const today = new Date().toISOString().split("T")[0];
          const oneYearLater = new Date();
          oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
          const endDate = oneYearLater.toISOString().split("T")[0];
          
          const detail = {
            startDate: existingDetail?.startDate || today,
            endDate: existingDetail?.endDate || endDate,
            isIndefinite: existingDetail?.isIndefinite ?? false,
            comment: existingDetail?.comment || "",
            isEditing: false,
          };
          
          newDates[item.id] = detail;
        }
      });
      return newDates;
    });
  }, [items, getItemDetail]);

  // Sync with context after state update - only for new items
  React.useEffect(() => {
    const newItems = items.filter((item) => {
      const existing = getItemDetail(item.id);
      return !existing || !itemDates[item.id];
    });
    
    newItems.forEach((item) => {
      const dates = itemDates[item.id];
      if (dates) {
        setItemDetail(item.id, {
          startDate: dates.startDate,
          endDate: dates.endDate,
          isIndefinite: dates.isIndefinite,
          comment: dates.comment,
        });
      }
    });
  }, [items.length, getItemDetail, setItemDetail]);

  const handleDateChange = (itemId: string, field: "startDate" | "endDate", value: string) => {
    setItemDates((prev) => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: value,
        },
      };
      
      return updated;
    });
    
    // Sync with context after state update
    setTimeout(() => {
      setItemDetail(itemId, {
        [field]: value,
      });
    }, 0);
  };

  const handleItemAccessTypeChange = (itemId: string, type: "indefinite" | "duration") => {
    setItemDates((prev) => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          isIndefinite: type === "indefinite",
        },
      };
      
      return updated;
    });
    
    // Sync with context after state update
    setTimeout(() => {
      setItemDetail(itemId, {
        isIndefinite: type === "indefinite",
      });
    }, 0);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No items selected. Please go back to step 2 to select access roles.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Items with Date Fields */}
      <div className="space-y-4">
        {items.map((item) => {
          const dates = itemDates[item.id] || {
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
            isIndefinite: false,
            comment: "",
            isEditing: false,
          };
          
          const isIndefinite = dates.isIndefinite;
          
          const handleEdit = () => {
            setItemDates((prev) => ({
              ...prev,
              [item.id]: {
                ...prev[item.id],
                isEditing: true,
              },
            }));
          };
          
          const handleSave = () => {
            setItemDates((prev) => {
              const updated = {
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  isEditing: false,
                },
              };
              
              return updated;
            });
            
            // Sync with context after state update
            setTimeout(() => {
              const current = itemDates[item.id];
              if (current) {
                setItemDetail(item.id, {
                  comment: current.comment,
                });
              }
            }, 0);
          };
          
          const handleCancel = () => {
            setItemDates((prev) => ({
              ...prev,
              [item.id]: {
                ...prev[item.id],
                isEditing: false,
              },
            }));
          };
          
          const handleCommentChange = (value: string) => {
            setItemDates((prev) => {
              const updated = {
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  comment: value,
                },
              };
              
              return updated;
            });
            
            // Sync with context after state update
            setTimeout(() => {
              setItemDetail(item.id, {
                comment: value,
              });
            }, 0);
          };

          const getRiskColor = (risk?: "High" | "Medium" | "Low") => {
            switch (risk) {
              case "High":
                return "bg-red-100 text-red-700 border-red-200";
              case "Medium":
                return "bg-orange-100 text-orange-700 border-orange-200";
              case "Low":
                return "bg-green-100 text-green-700 border-green-200";
              default:
                return "bg-gray-100 text-gray-700 border-gray-200";
            }
          };

          return (
            <div
              key={item.id}
              className="p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                  {item.risk && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRiskColor(item.risk)}`}>
                      {item.risk} Risk
                    </span>
                  )}
                </div>
                
                {/* Access Type Toggle, Start Date, and End Date in same row */}
                <div className={`grid gap-3 items-end ${!isIndefinite ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
                  {/* Access Type Toggle */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Access Type
                    </label>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <span 
                          className={`text-xs font-medium cursor-pointer ${
                            isIndefinite ? "text-blue-600 font-semibold" : "text-gray-600"
                          }`}
                          onClick={() => handleItemAccessTypeChange(item.id, "indefinite")}
                        >
                          Indefinite
                        </span>
                        
                        <label className="relative inline-block w-10 h-5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!isIndefinite}
                            onChange={(e) => handleItemAccessTypeChange(item.id, e.target.checked ? "duration" : "indefinite")}
                          />
                          <div className="absolute w-full h-full bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-5"></div>
                        </label>
                        
                        <span 
                          className={`text-xs font-medium cursor-pointer ${
                            !isIndefinite ? "text-blue-600 font-semibold" : "text-gray-600"
                          }`}
                          onClick={() => handleItemAccessTypeChange(item.id, "duration")}
                        >
                          Duration
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Start Date - Only show when Duration */}
                  {!isIndefinite && (
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <input
                          type="date"
                          value={dates.startDate}
                          onChange={(e) => handleDateChange(item.id, "startDate", e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* End Date - Only show when Duration */}
                  {!isIndefinite && (
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <input
                          type="date"
                          value={dates.endDate}
                          onChange={(e) => handleDateChange(item.id, "endDate", e.target.value)}
                          min={dates.startDate}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comment Box */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Comment
                </label>
                {dates.isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={dates.comment}
                      onChange={(e) => handleCommentChange(e.target.value)}
                      placeholder="Enter comment..."
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors text-xs"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium transition-colors text-xs"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-h-[40px] px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50">
                      {dates.comment ? (
                        <p className="text-xs text-gray-700 whitespace-pre-wrap">{dates.comment}</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No comment added</p>
                      )}
                    </div>
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors text-xs"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DetailsTab;

