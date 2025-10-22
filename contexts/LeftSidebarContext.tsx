'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface LeftSidebarContextValue {
  isVisible: boolean;
  toggleSidebar: () => void;
  hideSidebar: () => void;
  showSidebar: () => void;
}

const LeftSidebarContext = createContext<LeftSidebarContextValue | undefined>(undefined);

export const LeftSidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(true);

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
  }), [isVisible, toggleSidebar, hideSidebar, showSidebar]);

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
