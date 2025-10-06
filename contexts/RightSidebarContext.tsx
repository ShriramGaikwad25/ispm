"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type SidebarContent = React.ReactNode;

interface RightSidebarContextValue {
	isOpen: boolean;
	widthPx: number;
	openSidebar: (content: SidebarContent, options?: { widthPx?: number }) => void;
	closeSidebar: () => void;
	setWidth: (widthPx: number) => void;
	content: SidebarContent;
}

const RightSidebarContext = createContext<RightSidebarContextValue | undefined>(undefined);

export const RightSidebarProvider = ({ children }: { children: React.ReactNode }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [widthPx, setWidthPx] = useState(500);
	const [content, setContent] = useState<SidebarContent>(null);

	const openSidebar = useCallback((newContent: SidebarContent, options?: { widthPx?: number }) => {
		if (options?.widthPx) setWidthPx(options.widthPx);
		setContent(newContent);
		setIsOpen(true);
	}, []);

	const closeSidebar = useCallback(() => {
		setIsOpen(false);
		setContent(null);
	}, []);

	const setWidth = useCallback((newWidth: number) => {
		setWidthPx(newWidth);
	}, []);

	const value = useMemo<RightSidebarContextValue>(() => ({
		isOpen,
		widthPx,
		openSidebar,
		closeSidebar,
		setWidth,
		content,
	}), [isOpen, widthPx, openSidebar, closeSidebar, setWidth, content]);

	return (
		<RightSidebarContext.Provider value={value}>
			{children}
		</RightSidebarContext.Provider>
	);
};

export const useRightSidebar = (): RightSidebarContextValue => {
	const ctx = useContext(RightSidebarContext);
	if (!ctx) {
		throw new Error("useRightSidebar must be used within a RightSidebarProvider");
	}
	return ctx;
};


