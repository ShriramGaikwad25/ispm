"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type RightPanelState = {
  isOpen: boolean;
  widthPx: number;
};

type UiStoreContextValue = {
  rightPanel: RightPanelState;
  openRightPanel: (widthPx: number) => void;
  closeRightPanel: () => void;
  setRightPanelWidth: (widthPx: number) => void;
};

const UiStoreContext = createContext<UiStoreContextValue | null>(null);

export function UiStoreProvider({ children }: { children: React.ReactNode }) {
  const [rightPanel, setRightPanel] = useState<RightPanelState>({ isOpen: false, widthPx: 0 });

  const openRightPanel = useCallback((widthPx: number) => {
    setRightPanel({ isOpen: true, widthPx: Math.max(0, Math.floor(widthPx || 0)) });
  }, []);

  const closeRightPanel = useCallback(() => {
    setRightPanel((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setRightPanelWidth = useCallback((widthPx: number) => {
    setRightPanel((prev) => ({ ...prev, widthPx: Math.max(0, Math.floor(widthPx || 0)) }));
  }, []);

  const value = useMemo<UiStoreContextValue>(
    () => ({ rightPanel, openRightPanel, closeRightPanel, setRightPanelWidth }),
    [rightPanel, openRightPanel, closeRightPanel, setRightPanelWidth]
  );

  return <UiStoreContext.Provider value={value}>{children}</UiStoreContext.Provider>;
}

export function useUiStore(): UiStoreContextValue {
  const ctx = useContext(UiStoreContext);
  if (!ctx) {
    throw new Error("useUiStore must be used within UiStoreProvider");
  }
  return ctx;
}


