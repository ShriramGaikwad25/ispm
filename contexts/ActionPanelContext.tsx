'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { updateAction } from '@/lib/api';
import { clearPendingActionsStorage } from '@/components/agTable/ActionButtons';
import { GridApi } from 'ag-grid-community';

type PendingActionPayload = {
  reviewerId: string;
  certId: string;
  payload: any;
  count: number;
  isCertifyFilter?: boolean; // Flag to indicate if we're in certify filter mode
  isRejectFilter?: boolean; // Flag to indicate if we're in reject filter mode
};

interface ActionPanelContextValue {
  actionCount: number;
  isVisible: boolean;
  queueAction: (params: PendingActionPayload) => void;
  submitAll: () => Promise<void>;
  reset: () => void;
  registerGridApi: (gridApi: GridApi | null, detailGridApis?: Map<string, GridApi>) => void;
}

const ActionPanelContext = createContext<ActionPanelContextValue | undefined>(undefined);

export const ActionPanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [actionCount, setActionCount] = useState(0);
  const [pendingActions, setPendingActions] = useState<PendingActionPayload[]>([]);
  // Store grid API references to clear selections
  const [gridApis, setGridApis] = useState<Array<{ gridApi: GridApi | null; detailGridApis?: Map<string, GridApi> }>>([]);

  const queueAction = useCallback((params: PendingActionPayload) => {
    setPendingActions((prev) => {
      // Extract item IDs from the payload to check for duplicates
      const newItemIds = new Set<string>();
      
      // Collect all item IDs from the new payload
      if (params.payload.useraction) {
        params.payload.useraction.forEach((action: any) => {
          if (action.userId) newItemIds.add(`user-${action.userId}`);
        });
      }
      if (params.payload.accountAction) {
        params.payload.accountAction.forEach((action: any) => {
          if (action.lineItemId) newItemIds.add(`account-${action.lineItemId}`);
        });
      }
      if (params.payload.entitlementAction) {
        params.payload.entitlementAction.forEach((action: any) => {
          if (action.lineItemIds && Array.isArray(action.lineItemIds)) {
            action.lineItemIds.forEach((id: string) => {
              newItemIds.add(`entitlement-${id}`);
            });
          }
        });
      }
      
      // Calculate how many items will be removed (count actual items, not action.count)
      const removedItemCount = prev.reduce((sum, action) => {
        const existingItemIds = new Set<string>();
        
        if (action.payload.useraction) {
          action.payload.useraction.forEach((a: any) => {
            if (a.userId) existingItemIds.add(`user-${a.userId}`);
          });
        }
        if (action.payload.accountAction) {
          action.payload.accountAction.forEach((a: any) => {
            if (a.lineItemId) existingItemIds.add(`account-${a.lineItemId}`);
          });
        }
        if (action.payload.entitlementAction) {
          action.payload.entitlementAction.forEach((a: any) => {
            if (a.lineItemIds && Array.isArray(a.lineItemIds)) {
              a.lineItemIds.forEach((id: string) => {
                existingItemIds.add(`entitlement-${id}`);
              });
            }
          });
        }
        
        // Count overlapping items (items that will be replaced)
        const overlappingItems = Array.from(newItemIds).filter(id => existingItemIds.has(id));
        return sum + overlappingItems.length;
      }, 0);
      
      // Remove existing actions that affect the same items
      const filtered = prev.filter((existingAction) => {
        const existingItemIds = new Set<string>();
        
        if (existingAction.payload.useraction) {
          existingAction.payload.useraction.forEach((action: any) => {
            if (action.userId) existingItemIds.add(`user-${action.userId}`);
          });
        }
        if (existingAction.payload.accountAction) {
          existingAction.payload.accountAction.forEach((action: any) => {
            if (action.lineItemId) existingItemIds.add(`account-${action.lineItemId}`);
          });
        }
        if (existingAction.payload.entitlementAction) {
          existingAction.payload.entitlementAction.forEach((action: any) => {
            if (action.lineItemIds && Array.isArray(action.lineItemIds)) {
              action.lineItemIds.forEach((id: string) => {
                existingItemIds.add(`entitlement-${id}`);
              });
            }
          });
        }
        
        // Keep action if it doesn't overlap with new action's items
        const hasOverlap = Array.from(newItemIds).some(id => existingItemIds.has(id));
        return !hasOverlap;
      });
      
      // Add the new action to the queue
      const updatedActions = [...filtered, params];
      
      // Recalculate count based on actual queued actions
      // Only count actions that are NOT 'Pending' (unchecked actions should not be counted)
      // Use a Set to track unique items to avoid double-counting
      const uniqueItemsWithActions = new Set<string>();
      
      updatedActions.forEach((action) => {
        // Count Pending actions if we're in certify or reject filter mode (they represent undoing approved/rejected actions)
        // Otherwise, skip counting Pending actions (unchecked actions)
        const shouldCountPending = action.isCertifyFilter === true || action.isRejectFilter === true;
        
        if (action.payload.useraction) {
          action.payload.useraction.forEach((ua: any) => {
            if (ua.userId && ua.actionType) {
              if (ua.actionType !== 'Pending' || shouldCountPending) {
                uniqueItemsWithActions.add(`user-${ua.userId}`);
              }
            }
          });
        }
        if (action.payload.accountAction) {
          action.payload.accountAction.forEach((aa: any) => {
            if (aa.lineItemId && aa.actionType) {
              if (aa.actionType !== 'Pending' || shouldCountPending) {
                uniqueItemsWithActions.add(`account-${aa.lineItemId}`);
              }
            }
          });
        }
        if (action.payload.entitlementAction) {
          action.payload.entitlementAction.forEach((ea: any) => {
            if (ea.lineItemIds && Array.isArray(ea.lineItemIds) && ea.actionType) {
              if (ea.actionType !== 'Pending' || shouldCountPending) {
                ea.lineItemIds.forEach((id: string) => {
                  if (id) uniqueItemsWithActions.add(`entitlement-${id}`);
                });
              }
            }
          });
        }
      });
      
      const actualCount = uniqueItemsWithActions.size;
      
      // Update count to match actual queued items with filled buttons
      setActionCount(actualCount);
      
      return updatedActions;
    });
  }, []);

  const registerGridApi = useCallback((gridApi: GridApi | null, detailGridApis?: Map<string, GridApi>) => {
    setGridApis((prev) => {
      // Remove existing entry for this grid API if it exists
      const filtered = prev.filter((entry) => entry.gridApi !== gridApi);
      // Add new entry
      return [...filtered, { gridApi, detailGridApis }];
    });
  }, []);

  const reset = useCallback(() => {
    setActionCount(0);
    setPendingActions([]);
    // Clear module-level storage in ActionButtons
    clearPendingActionsStorage();
    
    // Dispatch custom event to notify ActionButtons to clear their state
    window.dispatchEvent(new CustomEvent('actionPanelReset'));
    
    // Clear all grid selections - read current state
    setGridApis((currentGridApis) => {
      currentGridApis.forEach(({ gridApi, detailGridApis }) => {
        if (gridApi) {
          // Deselect all master rows
          gridApi.forEachNodeAfterFilter((node: any) => {
            node.setSelected(false);
          });
          // Deselect all detail rows
          if (detailGridApis) {
            detailGridApis.forEach((detailApi) => {
              detailApi.forEachNodeAfterFilter((node: any) => {
                node.setSelected(false);
              });
            });
          }
        }
      });
      return currentGridApis; // Don't change the state, just use it for side effects
    });
  }, []);

  // Reset pending actions when navigating to a different page
  useEffect(() => {
    reset();
  }, [pathname, reset]);

  const submitAll = useCallback(async () => {
    // Send all queued actions sequentially; could be optimized by grouping
    for (const item of pendingActions) {
      await updateAction(item.reviewerId, item.certId, item.payload);
    }
    reset();
  }, [pendingActions, reset]);

  const value = useMemo(() => ({
    actionCount,
    isVisible: actionCount > 0,
    queueAction,
    submitAll,
    reset,
    registerGridApi,
  }), [actionCount, queueAction, submitAll, reset, registerGridApi]);

  return (
    <ActionPanelContext.Provider value={value}>
      {children}
    </ActionPanelContext.Provider>
  );
};

export const useActionPanel = (): ActionPanelContextValue => {
  const ctx = useContext(ActionPanelContext);
  if (!ctx) {
    throw new Error('useActionPanel must be used within an ActionPanelProvider');
  }
  return ctx;
};


