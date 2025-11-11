"use client";
import React, { useState, useEffect } from "react";
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
    useGlobalSettings: boolean;
  };
}

const DetailsTab: React.FC = () => {
  const { items } = useCart();
  const { 
    setItemDetail, 
    getItemDetail, 
    globalSettings, 
    setGlobalSettings, 
  } = useItemDetails();
  const [itemDates, setItemDates] = useState<ItemDates>({});
  const initializedItemsRef = React.useRef<Set<string>>(new Set());
  const prevGlobalSettingsRef = React.useRef(globalSettings);

  // Initialize dates for new items only
  React.useEffect(() => {
    const itemIds = new Set(items.map(item => item.id));
    const newItems = items.filter(item => !initializedItemsRef.current.has(item.id));
    
    if (newItems.length === 0) return;

    setItemDates((prev) => {
      const newDates: ItemDates = { ...prev };
      newItems.forEach((item) => {
        const existingDetail = getItemDetail(item.id);
        const useGlobal = existingDetail?.useGlobalSettings ?? true;
        
        newDates[item.id] = {
          startDate: existingDetail?.startDate || globalSettings.startDate,
          endDate: existingDetail?.endDate || globalSettings.endDate,
          isIndefinite: existingDetail?.isIndefinite ?? globalSettings.isIndefinite,
          comment: existingDetail?.comment || globalSettings.comment,
          isEditing: false,
          useGlobalSettings: useGlobal,
        };
        
        initializedItemsRef.current.add(item.id);
      });
      return newDates;
    });

    // Sync new items to context
    newItems.forEach((item) => {
      const existingDetail = getItemDetail(item.id);
      const useGlobal = existingDetail?.useGlobalSettings ?? true;
      setItemDetail(item.id, {
        startDate: existingDetail?.startDate || globalSettings.startDate,
        endDate: existingDetail?.endDate || globalSettings.endDate,
        isIndefinite: existingDetail?.isIndefinite ?? globalSettings.isIndefinite,
        comment: existingDetail?.comment || globalSettings.comment,
        useGlobalSettings: useGlobal,
      });
    });
  }, [items.map(item => item.id).join(','), getItemDetail, setItemDetail, globalSettings.startDate, globalSettings.endDate, globalSettings.isIndefinite, globalSettings.comment]);

  // Clean up removed items
  React.useEffect(() => {
    const currentItemIds = new Set(items.map(item => item.id));
    initializedItemsRef.current.forEach(itemId => {
      if (!currentItemIds.has(itemId)) {
        initializedItemsRef.current.delete(itemId);
      }
    });
  }, [items.map(item => item.id).join(',')]);

  // Update items when global settings change (only if they use global settings)
  useEffect(() => {
    const globalChanged = 
      prevGlobalSettingsRef.current.startDate !== globalSettings.startDate ||
      prevGlobalSettingsRef.current.endDate !== globalSettings.endDate ||
      prevGlobalSettingsRef.current.isIndefinite !== globalSettings.isIndefinite ||
      prevGlobalSettingsRef.current.comment !== globalSettings.comment;

    if (!globalChanged) {
      prevGlobalSettingsRef.current = globalSettings;
      return;
    }

    prevGlobalSettingsRef.current = globalSettings;

    items.forEach((item) => {
      const detail = getItemDetail(item.id);
      if (detail?.useGlobalSettings) {
        setItemDates((prev) => {
          const current = prev[item.id];
          // Only update if values actually changed
          if (current && 
              current.startDate === globalSettings.startDate &&
              current.endDate === globalSettings.endDate &&
              current.isIndefinite === globalSettings.isIndefinite &&
              current.comment === globalSettings.comment) {
            return prev;
          }
          
          return {
            ...prev,
            [item.id]: {
              ...prev[item.id],
              startDate: globalSettings.startDate,
              endDate: globalSettings.endDate,
              isIndefinite: globalSettings.isIndefinite,
              comment: globalSettings.comment,
            },
          };
        });
        
        setItemDetail(item.id, {
          startDate: globalSettings.startDate,
          endDate: globalSettings.endDate,
          isIndefinite: globalSettings.isIndefinite,
          comment: globalSettings.comment,
          useGlobalSettings: true,
        });
      }
    });
  }, [globalSettings.startDate, globalSettings.endDate, globalSettings.isIndefinite, globalSettings.comment, items.map(item => item.id).join(','), getItemDetail, setItemDetail]);

  const handleGlobalDateChange = (field: "startDate" | "endDate", value: string) => {
    setGlobalSettings({
      [field]: value,
    });
  };

  const handleGlobalAccessTypeChange = (type: "indefinite" | "duration") => {
    setGlobalSettings({
      accessType: type,
      isIndefinite: type === "indefinite",
    });
  };

  const handleGlobalCommentChange = (value: string) => {
    setGlobalSettings({
      comment: value,
    });
  };

  const handleDateChange = (itemId: string, field: "startDate" | "endDate", value: string) => {
    setItemDates((prev) => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: value,
          useGlobalSettings: false, // Mark as custom when user changes
        },
      };
      
      return updated;
    });
    
    // Sync with context after state update
    setTimeout(() => {
      setItemDetail(itemId, {
        [field]: value,
        useGlobalSettings: false,
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
          useGlobalSettings: false, // Mark as custom when user changes
        },
      };
      
      return updated;
    });
    
    // Sync with context after state update
    setTimeout(() => {
      setItemDetail(itemId, {
        isIndefinite: type === "indefinite",
        useGlobalSettings: false,
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

  const globalIsIndefinite = globalSettings.isIndefinite;

  return (
    <div className="w-full">
      {/* Global Access Duration and Comments Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Access Duration & Comments</h3>
        
        <div className="space-y-4">
          {/* Access Type Toggle */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Type
            </label>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <span 
                  className={`text-sm font-medium cursor-pointer ${
                    globalIsIndefinite ? "text-blue-600 font-semibold" : "text-gray-600"
                  }`}
                  onClick={() => handleGlobalAccessTypeChange("indefinite")}
                >
                  Indefinite
                </span>
                
                <label className="relative inline-block w-12 h-6 cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!globalIsIndefinite}
                    onChange={(e) => handleGlobalAccessTypeChange(e.target.checked ? "duration" : "indefinite")}
                  />
                  <div className="absolute w-full h-full bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-6"></div>
                </label>
                
                <span 
                  className={`text-sm font-medium cursor-pointer ${
                    !globalIsIndefinite ? "text-blue-600 font-semibold" : "text-gray-600"
                  }`}
                  onClick={() => handleGlobalAccessTypeChange("duration")}
                >
                  Duration
                </span>
              </div>
            </div>
          </div>

          {/* Start Date and End Date - Only show when Duration */}
          {!globalIsIndefinite && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="date"
                    value={globalSettings.startDate}
                    onChange={(e) => handleGlobalDateChange("startDate", e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="date"
                    value={globalSettings.endDate}
                    onChange={(e) => handleGlobalDateChange("endDate", e.target.value)}
                    min={globalSettings.startDate}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Global Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments
            </label>
            <textarea
              value={globalSettings.comment}
              onChange={(e) => handleGlobalCommentChange(e.target.value)}
              placeholder="Enter comments that will apply to all access items..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Items with Date Fields */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Access Items</h3>
        {items.map((item) => {
          const dates = itemDates[item.id] || {
            startDate: globalSettings.startDate,
            endDate: globalSettings.endDate,
            isIndefinite: globalSettings.isIndefinite,
            comment: globalSettings.comment,
            isEditing: false,
            useGlobalSettings: true,
          };
          
          const isIndefinite = dates.isIndefinite;
          const useGlobal = dates.useGlobalSettings;
          
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
            setItemDates((prev) => {
              const existing = getItemDetail(item.id);
              return {
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  isEditing: false,
                  comment: existing?.comment || globalSettings.comment,
                },
              };
            });
          };
          
          const handleCommentChange = (value: string) => {
            setItemDates((prev) => {
              const updated = {
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  comment: value,
                  useGlobalSettings: false, // Mark as custom when user changes
                },
              };
              
              return updated;
            });
            
            // Sync with context after state update
            setTimeout(() => {
              setItemDetail(item.id, {
                comment: value,
                useGlobalSettings: false,
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
              className={`p-4 border rounded-lg transition-colors ${
                useGlobal 
                  ? "border-blue-200 bg-blue-50/30" 
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
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
