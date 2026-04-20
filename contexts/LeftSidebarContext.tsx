'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface LeftSidebarContextValue {
  isVisible: boolean;
  toggleSidebar: () => void;
  hideSidebar: () => void;
  showSidebar: () => void;
  /** Main app navigation sidebar width in px (64 collapsed, 280 expanded). */
  sidebarWidthPx: number;
  setSidebarWidthPx: (w: number) => void;
  /** Non-Human Identity secondary sidebar width (0 when not on that shell). */
  nhiNavWidthPx: number;
  setNhiNavWidthPx: (w: number) => void;
}

const LeftSidebarContext = createContext<LeftSidebarContextValue | undefined>(undefined);

export const LeftSidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [sidebarWidthPx, setSidebarWidthPx] = useState(64);
  const [nhiNavWidthPx, setNhiNavWidthPx] = useState(0);

  const toggleSidebar = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const hideSidebar = useCallback(() => {
    setIsVisible(false);
  }, []);

  const showSidebar = useCallback(() => {
    setIsVisible(true);
  }, []);

  const value = useMemo<LeftSidebarContextValue>(() => ({
    isVisible,
    toggleSidebar,
    hideSidebar,
    showSidebar,
    sidebarWidthPx,
    setSidebarWidthPx,
    nhiNavWidthPx,
    setNhiNavWidthPx,
  }), [isVisible, toggleSidebar, hideSidebar, showSidebar, sidebarWidthPx, nhiNavWidthPx]);

  return (
    <LeftSidebarContext.Provider value={value}>
      {children}
    </LeftSidebarContext.Provider>
  );
};

export const useLeftSidebar = (): LeftSidebarContextValue => {
  const context = useContext(LeftSidebarContext);
  if (context === undefined) {
    throw new Error('useLeftSidebar must be used within a LeftSidebarProvider');
  }
  return context;
};
