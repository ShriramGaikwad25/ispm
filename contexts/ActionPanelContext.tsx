'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { updateAction } from '@/lib/api';

type PendingActionPayload = {
  reviewerId: string;
  certId: string;
  payload: any;
  count: number;
};

interface ActionPanelContextValue {
  actionCount: number;
  isVisible: boolean;
  queueAction: (params: PendingActionPayload) => void;
  submitAll: () => Promise<void>;
  reset: () => void;
}

const ActionPanelContext = createContext<ActionPanelContextValue | undefined>(undefined);

export const ActionPanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [actionCount, setActionCount] = useState(0);
  const [pendingActions, setPendingActions] = useState<PendingActionPayload[]>([]);

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
      
      // Recalculate count based on actual queued actions (only count filled buttons)
      // Filled = Approve/Reject/Remediate/Delegate actions
      // Unfilled = Pending actions (don't count)
      // Use a Set to track unique items to avoid double-counting
      const uniqueFilledItems = new Set<string>();
      
      updatedActions.forEach((action) => {
        // Check if this action represents filled buttons (not Pending)
        const actionType = action.payload.useraction?.[0]?.actionType ||
                          action.payload.accountAction?.[0]?.actionType ||
                          action.payload.entitlementAction?.[0]?.actionType;
        
        // Only count if action type is not 'Pending'
        if (actionType && actionType !== 'Pending') {
          // Add unique items to the set
          if (action.payload.useraction) {
            action.payload.useraction.forEach((ua: any) => {
              if (ua.userId) uniqueFilledItems.add(`user-${ua.userId}`);
            });
          }
          if (action.payload.accountAction) {
            action.payload.accountAction.forEach((aa: any) => {
              if (aa.lineItemId) uniqueFilledItems.add(`account-${aa.lineItemId}`);
            });
          }
          if (action.payload.entitlementAction) {
            action.payload.entitlementAction.forEach((ea: any) => {
              if (ea.lineItemIds && Array.isArray(ea.lineItemIds)) {
                ea.lineItemIds.forEach((id: string) => {
                  if (id) uniqueFilledItems.add(`entitlement-${id}`);
                });
              }
            });
          }
        }
      });
      
      const actualCount = uniqueFilledItems.size;
      
      // Update count to match actual queued items with filled buttons
      setActionCount(actualCount);
      
      return updatedActions;
    });
  }, []);

  const reset = useCallback(() => {
    setActionCount(0);
    setPendingActions([]);
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
  }), [actionCount, queueAction, submitAll, reset]);

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


