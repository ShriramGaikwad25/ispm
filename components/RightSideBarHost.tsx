"use client";

import React from "react";
import RightSidebar from "./RightSideBar";
import { useRightSidebar } from "@/contexts/RightSidebarContext";

const RightSideBarHost = () => {
	const { isOpen, widthPx, closeSidebar, content, title } = useRightSidebar();
	return (
		<RightSidebar isOpen={isOpen} widthPx={widthPx} onClose={closeSidebar} topOffsetPx={60} title={title}>
			{content}
		</RightSidebar>
	);
};

export default RightSideBarHost;


