"use client";

import React, { useCallback, useEffect, useState } from "react";
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
}) => {
  const { isVisible: isActionPanelVisible } = useActionPanel();
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  const updateSelectedCount = useCallback(() => {
    if (!gridApi) return;

    let totalVisible = 0;
    let totalSelected = 0;

    const visibleMasterNodes: RowNode[] = [];
    gridApi.forEachNodeAfterFilter((node) => {
      visibleMasterNodes.push(node as RowNode);
    });

    totalVisible += visibleMasterNodes.length;
    totalSelected += visibleMasterNodes.filter((node) =>
      node.isSelected()
    ).length;

    detailGridApis.forEach((detailApi) => {
      const visibleRows: RowNode[] = [];
      detailApi.forEachNodeAfterFilter((node) =>
        visibleRows.push(node as RowNode)
      );
      totalVisible += visibleRows.length;

      const selectedNodes = detailApi.getSelectedNodes?.();
      totalSelected += Array.isArray(selectedNodes) ? selectedNodes.length : 0;
    });

    setVisibleCount(totalVisible);
    setSelectedCount(totalSelected);

    setIsAllSelected(totalSelected === totalVisible && totalVisible > 0);
    setIsIndeterminate(totalSelected > 0 && totalSelected < totalVisible);
  }, [gridApi, detailGridApis]);

  const toggleSelectAll = () => {
    if (!gridApi) return;

    const shouldSelect = !isAllSelected;

    // Select/Deselect master rows
    gridApi.forEachNodeAfterFilter((node) => {
      node.setSelected(shouldSelect);
    });

    // Select/Deselect detail rows
    detailGridApis.forEach((detailApi) => {
      detailApi.forEachNodeAfterFilter((node) => {
        node.setSelected(shouldSelect);
      });
    });

    updateSelectedCount();
  };

  useEffect(() => {
    if (!gridApi) return;

    updateSelectedCount();

    const listener = () => updateSelectedCount();

    gridApi.addEventListener("selectionChanged", listener);
    gridApi.addEventListener("paginationChanged", listener);
    gridApi.addEventListener("rowDataUpdated", listener);
    gridApi.addEventListener("rowGroupOpened", listener);
    gridApi.addEventListener("filterChanged", listener);

    return () => {
      gridApi.removeEventListener("selectionChanged", listener);
      gridApi.removeEventListener("paginationChanged", listener);
      gridApi.removeEventListener("rowDataUpdated", listener);
      gridApi.removeEventListener("rowGroupOpened", listener);
      gridApi.removeEventListener("filterChanged", listener);
    };
  }, [gridApi, updateSelectedCount]);

  return (
    <>
      <div className="flex items-center text-sm">
        <div className="divide-x-1 divide-gray-300 h-9 flex items-center">
          {showExpandCollapse && <ExpandCollapse gridApi={gridApi} />}

          <label className="font-medium cursor-pointer pr-4 items-center h-9 flex">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={toggleSelectAll}
              className="mr-2 w-4 h-4 cursor-pointer"
            />
            Select All
          </label>

          {}
        </div>
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
              selectedRows={gridApi.getSelectedRows()}
              viewChangeEnable
              context={context as any}
              reviewerId={reviewerId as any}
              certId={certId as any}
              selectedFilters={selectedFilters}
            />
          </div>,
          document.body
        )}
    </>
  );
};

export default SelectAll;
