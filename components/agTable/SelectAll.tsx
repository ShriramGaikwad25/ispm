"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { GridApi, RowNode } from "ag-grid-community";
import { createPortal } from "react-dom";
import ActionButtons from "./ActionButtons";
import ExpandCollapse from "./ExpandCollapse";
import { useActionPanel } from "@/contexts/ActionPanelContext";

interface SelectAllProps {
  gridApi: GridApi | null;
  detailGridApis: Map<string, GridApi>;
  clearDetailGridApis: () => void;
  showExpandCollapse?: boolean; // <-- Optional prop
  context?: "user" | "account" | "entitlement";
  reviewerId?: string;
  certId?: string;
  selectedFilters?: string[]; // Selected filters to pass to ActionButtons
  allFilteredData?: any[]; // All filtered data for selecting across all pages
  getRowId?: (data: any) => string; // Function to get row ID from data
  onRowDataChange?: (data: any[]) => void; // Callback to update rowData when selecting all
  currentRowData?: any[]; // Current paginated rowData to restore after selection
}

const SelectAll: React.FC<SelectAllProps> = ({
  gridApi,
  detailGridApis,
  clearDetailGridApis,
  showExpandCollapse = true, // default to true
  context,
  reviewerId,
  certId,
  selectedFilters = [],
  allFilteredData,
  getRowId,
  onRowDataChange,
  currentRowData,
}) => {
  const { isVisible: isActionPanelVisible, registerGridApi } = useActionPanel();
  
  // Register grid API with ActionPanelContext so it can clear selections
  useEffect(() => {
    if (gridApi) {
      registerGridApi(gridApi, detailGridApis);
    }
  }, [gridApi, detailGridApis, registerGridApi]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const selectAllLabelRef = useRef<HTMLLabelElement>(null);
  // Track selected row IDs across all pages
  const selectedRowIdsRef = useRef<Set<string>>(new Set());

  const updateSelectedCount = useCallback(() => {
    if (!gridApi) return;

    let totalVisible = 0;
    let totalSelected = 0;

    // Sync grid selections with our tracked selection state
    if (selectedRowIdsRef.current.size > 0 && getRowId) {
      gridApi.forEachNodeAfterFilter((node) => {
        if (node && node.data && !node.data.__isDescRow) {
          const rowId = getRowId(node.data);
          if (selectedRowIdsRef.current.has(rowId)) {
            if (!node.isSelected()) {
              node.setSelected(true);
            }
          }
        }
      });
    }

    const visibleMasterNodes: RowNode[] = [];
    gridApi.forEachNodeAfterFilter((node) => {
      visibleMasterNodes.push(node as RowNode);
    });

    totalVisible += visibleMasterNodes.length;
    
    // Count selected nodes, and also sync our selection state
    visibleMasterNodes.forEach((node) => {
      if (node.isSelected()) {
        totalSelected++;
        if (getRowId && node.data && !node.data.__isDescRow) {
          const rowId = getRowId(node.data);
          selectedRowIdsRef.current.add(rowId);
        }
      } else if (getRowId && node.data && !node.data.__isDescRow) {
        // If node is not selected, remove from our tracking (unless it was selected via "All")
        // We'll keep it if it's in our selectedRowIdsRef to maintain cross-page selections
      }
    });

    detailGridApis.forEach((detailApi) => {
      const visibleRows: RowNode[] = [];
      detailApi.forEachNodeAfterFilter((node) =>
        visibleRows.push(node as RowNode)
      );
      totalVisible += visibleRows.length;

      const selectedNodes = detailApi.getSelectedNodes?.();
      totalSelected += Array.isArray(selectedNodes) ? selectedNodes.length : 0;
    });

    // If we have allFilteredData, calculate total from that, otherwise use visible count
    const totalRows = allFilteredData && allFilteredData.length > 0 
      ? allFilteredData.length 
      : totalVisible;
    
    // Count how many are in our selection set
    const totalSelectedFromSet = selectedRowIdsRef.current.size;
    const actualSelectedCount = Math.max(totalSelected, totalSelectedFromSet);

    setVisibleCount(totalVisible);
    setSelectedCount(actualSelectedCount);

    setIsAllSelected(actualSelectedCount === totalRows && totalRows > 0);
    setIsIndeterminate(actualSelectedCount > 0 && actualSelectedCount < totalRows);
  }, [gridApi, detailGridApis, allFilteredData, getRowId]);

  const selectOnCurrentPage = () => {
    if (!gridApi) return;

    // Get displayed row count (current page)
    const displayedRowCount = gridApi.getDisplayedRowCount();
    
    // Select all displayed rows on current page and add to selection set
    for (let i = 0; i < displayedRowCount; i++) {
      const rowNode = gridApi.getDisplayedRowAtIndex(i);
      if (rowNode && !rowNode.group && rowNode.data && !rowNode.data.__isDescRow) {
        rowNode.setSelected(true);
        // Add to selection set if we have getRowId
        if (getRowId) {
          const rowId = getRowId(rowNode.data);
          selectedRowIdsRef.current.add(rowId);
        }
      }
    }

    // Handle detail grids
    detailGridApis.forEach((detailApi) => {
      const detailDisplayedRowCount = detailApi.getDisplayedRowCount();
      for (let i = 0; i < detailDisplayedRowCount; i++) {
        const rowNode = detailApi.getDisplayedRowAtIndex(i);
        if (rowNode && !rowNode.group) {
          rowNode.setSelected(true);
        }
      }
    });

    updateSelectedCount();
    setShowPopup(false);
  };

  const selectAllPages = () => {
    if (!gridApi) return;

    // If we have all filtered data, select all rows by storing their IDs
    if (allFilteredData && allFilteredData.length > 0 && getRowId) {
      // Clear existing selections and add all row IDs to our selection set
      selectedRowIdsRef.current.clear();
      
      // Add all row IDs from filtered data to our selection set
      allFilteredData.forEach((item) => {
        if (!item.__isDescRow) {
          const rowId = getRowId(item);
          selectedRowIdsRef.current.add(rowId);
        }
      });

      // Now select all currently visible rows that match our selection set
      gridApi.forEachNodeAfterFilter((node) => {
        if (node && node.data && !node.data.__isDescRow) {
          const rowId = getRowId(node.data);
          if (selectedRowIdsRef.current.has(rowId)) {
            node.setSelected(true);
          }
        }
      });

      // Also handle detail grids
      detailGridApis.forEach((detailApi) => {
        detailApi.forEachNodeAfterFilter((node) => {
          if (node && !node.group) {
            node.setSelected(true);
          }
        });
      });

      updateSelectedCount();
      setShowPopup(false);
    } else {
      // Fallback: Select all filtered rows currently in the grid
      gridApi.forEachNodeAfterFilter((node) => {
        if (!node.group && node.data && getRowId) {
          const rowId = getRowId(node.data);
          selectedRowIdsRef.current.add(rowId);
          node.setSelected(true);
        } else if (!node.group) {
          node.setSelected(true);
        }
      });

      // Select/Deselect detail rows
      detailGridApis.forEach((detailApi) => {
        detailApi.forEachNodeAfterFilter((node) => {
          if (!node.group) {
            node.setSelected(true);
          }
        });
      });

      updateSelectedCount();
      setShowPopup(false);
    }
  };

  const handleSelectAllClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopup(true);
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        selectAllLabelRef.current &&
        !selectAllLabelRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopup]);

  // Listen for reset events to clear selection tracking
  useEffect(() => {
    const handleReset = () => {
      // Clear the selection tracking when reset is called
      selectedRowIdsRef.current.clear();
      updateSelectedCount();
    };

    window.addEventListener('actionPanelReset', handleReset);

    return () => {
      window.removeEventListener('actionPanelReset', handleReset);
    };
  }, [updateSelectedCount]);

  useEffect(() => {
    if (!gridApi) return;

    updateSelectedCount();

    const listener = () => {
      // Sync selections when data is updated (e.g., page change)
      if (selectedRowIdsRef.current.size > 0 && getRowId) {
        gridApi.forEachNodeAfterFilter((node) => {
          if (node && node.data && !node.data.__isDescRow) {
            const rowId = getRowId(node.data);
            if (selectedRowIdsRef.current.has(rowId)) {
              if (!node.isSelected()) {
                node.setSelected(true);
              }
            }
          }
        });
      }
      updateSelectedCount();
    };

    const selectionChangedListener = () => {
      // Track individual selections/deselections
      if (getRowId) {
        gridApi.forEachNodeAfterFilter((node) => {
          if (node && node.data && !node.data.__isDescRow) {
            const rowId = getRowId(node.data);
            if (node.isSelected()) {
              selectedRowIdsRef.current.add(rowId);
            } else {
              // Remove from selection set when manually deselected
              selectedRowIdsRef.current.delete(rowId);
            }
          }
        });
      }
      updateSelectedCount();
    };

    gridApi.addEventListener("selectionChanged", selectionChangedListener);
    gridApi.addEventListener("paginationChanged", listener);
    gridApi.addEventListener("rowDataUpdated", listener);
    gridApi.addEventListener("rowGroupOpened", listener);
    gridApi.addEventListener("filterChanged", listener);

    return () => {
      gridApi.removeEventListener("selectionChanged", selectionChangedListener);
      gridApi.removeEventListener("paginationChanged", listener);
      gridApi.removeEventListener("rowDataUpdated", listener);
      gridApi.removeEventListener("rowGroupOpened", listener);
      gridApi.removeEventListener("filterChanged", listener);
    };
  }, [gridApi, updateSelectedCount, getRowId]);

  return (
    <>
      <div className="flex items-center text-sm relative">
        <div className="divide-x-1 divide-gray-300 h-9 flex items-center">
          {showExpandCollapse && <ExpandCollapse gridApi={gridApi} />}

          <label 
            ref={selectAllLabelRef}
            className="font-medium cursor-pointer pr-4 items-center h-9 flex"
            onClick={handleSelectAllClick}
          >
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectAllClick(e);
              }}
              className="mr-2 w-4 h-4 cursor-pointer"
            />
            Select All
          </label>

          {}
        </div>

        {/* Popup for Select All options */}
        {showPopup && (
          <div
            ref={popupRef}
            className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[150px]"
            style={{
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div className="py-1">
              <button
                onClick={selectOnCurrentPage}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                On this page
              </button>
              <button
                onClick={selectAllPages}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating ActionButtons when any items are selected (individual or all) */}
      {selectedCount > 0 && gridApi &&
        createPortal(
          <div
            className={`fixed left-1/2 transform -translate-x-1/2 z-50 rounded-lg shadow-2xl px-4 py-3 flex items-center gap-2 transition-all duration-300 ${
              isActionPanelVisible ? "bottom-24" : "bottom-6"
            }`}
            style={{
              backgroundColor: "#d3d3d3",
              border: "1px solid #b0b0b0",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
            }}
          >
            <ActionButtons
              api={gridApi}
              selectedRows={
                // If we have allFilteredData and selectedRowIdsRef, get all selected rows across all pages
                allFilteredData && allFilteredData.length > 0 && getRowId && selectedRowIdsRef.current.size > 0
                  ? allFilteredData.filter((item) => {
                      if (item.__isDescRow) return false;
                      const rowId = getRowId(item);
                      return selectedRowIdsRef.current.has(rowId);
                    })
                  : gridApi.getSelectedRows()
              }
              viewChangeEnable
              context={context as any}
              reviewerId={reviewerId as any}
              certId={certId as any}
              selectedFilters={selectedFilters}
              hideTeamsIcon={true}
            />
          </div>,
          document.body
        )}
    </>
  );
};

export default SelectAll;
