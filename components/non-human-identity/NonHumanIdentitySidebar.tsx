"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Bot,
  Users,
  KeyRound,
  Phone,
  FileSearch,
  Shield,
  History,
  ClipboardCheck,
  SlidersHorizontal,
  Siren,
  GitBranch,
  Table2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NHI_NAV_ITEMS } from "@/lib/nhi-shell";
import { useLeftSidebar } from "@/contexts/LeftSidebarContext";

const NHI_ICONS = [
  LayoutDashboard,
  Bot,
  Users,
  KeyRound,
  Phone,
  FileSearch,
  Shield,
  History,
  ClipboardCheck,
  SlidersHorizontal,
  Siren,
  GitBranch,
  Table2,
] as const;

export function NonHumanIdentitySidebar() {
  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const {
    isVisible: mainAppSidebarOpen,
    sidebarWidthPx: mainSidebarWidthPx,
    setNhiNavWidthPx,
  } = useLeftSidebar();

  const nhiWidth = isSidebarExpanded ? 280 : 64;

  useEffect(() => {
    setNhiNavWidthPx(nhiWidth);
  }, [nhiWidth, setNhiNavWidthPx]);

  useEffect(() => {
    return () => setNhiNavWidthPx(0);
  }, [setNhiNavWidthPx]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    const withIcons = NHI_NAV_ITEMS.map((item, i) => ({
      ...item,
      Icon: NHI_ICONS[i]!,
    }));
    if (!normalizedSearch) return withIcons;
    return withIcons.filter((it) =>
      it.label.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  const linkIsActive = (href: string) =>
    href === "/non-human-identity"
      ? pathname === "/non-human-identity" || pathname === "/non-human-identity/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className="fixed top-[60px] z-40 flex flex-col border-r border-gray-200 bg-white"
      style={{
        left: mainAppSidebarOpen ? mainSidebarWidthPx : 0,
        height: "calc(100vh - 60px)",
        width: isSidebarExpanded ? "280px" : "64px",
        transition: "left 300ms ease-in-out, width 300ms ease-in-out",
      }}
      aria-label="Non-Human Identity navigation"
    >
      <nav
        className="flex w-full flex-1 flex-col items-start space-y-1 px-3 py-4"
        style={{ gap: "6px" }}
        role="navigation"
      >
        <div className="mb-3 w-full">
          {isSidebarExpanded ? (
            <div className="relative">
              <span className="absolute inset-y-0 left-2 flex items-center">
                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search menu..."
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search Non-Human Identity menu"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarExpanded(true)}
              className="flex h-8 w-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100"
              aria-label="Expand sidebar to search menu"
            >
              <Search className="h-4 w-4 text-gray-500" aria-hidden="true" />
            </button>
          )}
        </div>

        {filteredItems.map((item) => {
          const Icon = item.Icon;
          const active = linkIsActive(item.href);
          return (
            <div key={item.href} className="w-full">
              <div className="flex items-center">
                <Link
                  href={item.href}
                  className={`flex flex-1 items-center gap-2 rounded-md px-2 py-2 transition-colors ${
                    active
                      ? "border-l-4 border-blue-600 bg-blue-50 text-blue-600"
                      : "hover:bg-gray-50"
                  } ${!isSidebarExpanded ? "justify-center" : "justify-start"}`}
                  style={{
                    color: active ? "#2563eb" : "var(--text-icons-base-second, #68727D)",
                    fontFamily: "Inter",
                    fontSize: "13px",
                    fontStyle: "normal",
                    fontWeight: 600,
                    lineHeight: "18px",
                  }}
                  title={!isSidebarExpanded ? item.label : undefined}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{
                      color: active ? "#2563eb" : "var(--text-icons-base-second, #68727D)",
                    }}
                    aria-hidden="true"
                  />
                  {isSidebarExpanded && (
                    <span className="whitespace-normal">{item.label}</span>
                  )}
                </Link>
              </div>
            </div>
          );
        })}

        <div
          className={`mt-2 flex w-full items-center ${isSidebarExpanded ? "px-2" : "justify-start pl-2"}`}
        >
          <button
            type="button"
            onClick={() => setIsSidebarExpanded((v) => !v)}
            aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isSidebarExpanded}
            className={`group flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 transition-all duration-200 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md active:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSidebarExpanded ? "w-full" : "w-10"
            }`}
            style={{ color: "#2563eb" }}
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarExpanded ? (
              <ChevronLeft
                className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[-2px]"
                aria-hidden="true"
              />
            ) : (
              <ChevronRight
                className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[2px]"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
}
