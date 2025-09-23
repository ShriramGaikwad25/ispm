'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
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
  const [actionCount, setActionCount] = useState(0);
  const [pendingActions, setPendingActions] = useState<PendingActionPayload[]>([]);

  const queueAction = useCallback((params: PendingActionPayload) => {
    setPendingActions((prev) => [...prev, params]);
    setActionCount((prev) => prev + (Number.isFinite(params.count) ? params.count : 0));
  }, []);

  const reset = useCallback(() => {
    setActionCount(0);
    setPendingActions([]);
  }, []);

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


