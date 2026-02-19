'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import {navLinks as navigation, NavItem} from './Navi';
import { useLeftSidebar } from '@/contexts/LeftSidebarContext';

export function Navigation() {
  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { isVisible, setSidebarWidthPx } = useLeftSidebar();

  useEffect(() => {
    setSidebarWidthPx(isSidebarExpanded ? 280 : 64);
  }, [isSidebarExpanded, setSidebarWidthPx]);

  const handleLinkClick = () => {
    // No-op - removed hover reset logic
  };

  const toggleExpand = () => {
    setIsSidebarExpanded(prev => !prev);
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const isItemActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => pathname === subItem.href);
    }
    return false;
  };

  const isSubItemActive = (subItem: NavItem): boolean => {
    return pathname === subItem.href;
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredNavigation = normalizedSearch
    ? navigation.filter((item) => {
        const matchesHeader = item.name.toLowerCase().includes(normalizedSearch);
        const matchesSubItem = item.subItems?.some((subItem) =>
          subItem.name.toLowerCase().includes(normalizedSearch)
        );
        return matchesHeader || matchesSubItem;
      })
    : navigation;

  // Don't render if sidebar is hidden
  if (!isVisible) {
    return null;
  }

  return (
    <aside 
      className="fixed left-0 top-[60px] z-40 bg-white border-r border-gray-200 flex flex-col"
      style={{
        height: 'calc(100vh - 60px)',
        width: isSidebarExpanded ? '280px' : '64px',
        transition: 'width 300ms ease-in-out'
      }}
      aria-label="Main navigation"
    >
      {/* Navigation Links */}
      <nav 
        className="flex flex-col px-3 py-6 space-y-1 flex-1 w-full items-start" 
        style={{ gap: '8px' }}
        role="navigation"
        aria-label="Primary navigation"
      >
        <div className="w-full mb-3">
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
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-md border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Search main menu"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarExpanded(true)}
              className="flex items-center justify-center w-10 h-8 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100"
              aria-label="Expand sidebar to search menu"
            >
              <Search className="h-4 w-4 text-gray-500" aria-hidden="true" />
            </button>
          )}
        </div>

        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const visibleSubItems = hasSubItems
            ? (normalizedSearch
                ? item.subItems!.filter((subItem) =>
                    subItem.name.toLowerCase().includes(normalizedSearch)
                  )
                : item.subItems)
            : undefined;
          const hasVisibleSubItems = !!visibleSubItems && visibleSubItems.length > 0;
          const isExpandedBySearch = normalizedSearch && hasVisibleSubItems;
          const isExpanded = expandedItems.has(item.name) || !!isExpandedBySearch;

          return (
            <div key={item.name} className="w-full">
              {/* Main Item */}
              <div className="flex items-center">
                {hasSubItems ? (
                  // For items with sub-items, make the entire area clickable to toggle
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      // If sidebar is collapsed, expand it first
                      if (!isSidebarExpanded) {
                        setIsSidebarExpanded(true);
                        // Also expand the sub-items for this item
                        setExpandedItems(prev => {
                          const newSet = new Set(prev);
                          newSet.add(item.name);
                          return newSet;
                        });
                      } else {
                        toggleExpanded(item.name);
                      }
                    }}
                    aria-expanded={isExpanded}
                    aria-controls={`submenu-${item.name}`}
                    aria-label={!isSidebarExpanded ? item.name : `${item.name}, ${isExpanded ? 'expanded' : 'collapsed'}`}
                    className={`flex items-center gap-2 px-2 py-2.5 rounded-md transition-colors flex-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'hover:bg-gray-50'
                    } ${!isSidebarExpanded ? 'justify-center' : 'justify-start'}`}
                    style={{
                      color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)',
                      fontFamily: 'Inter',
                      fontSize: '13px',
                      fontStyle: 'normal',
                      fontWeight: '600',
                      lineHeight: '18px'
                    }}
                    title={!isSidebarExpanded ? item.name : undefined}
                  >
                    <Icon 
                      className="h-4 w-4 flex-shrink-0" 
                      style={{
                        color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)'
                      }}
                      aria-hidden="true"
                    />
                    {isSidebarExpanded && <span className="whitespace-normal">{item.name}</span>}
                    {isSidebarExpanded && (
                      <div className="ml-auto" aria-hidden="true">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </button>
                ) : (
                  // For items without sub-items, use regular Link
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2 px-2 py-2.5 rounded-md transition-colors flex-1 ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'hover:bg-gray-50'
                    } ${!isSidebarExpanded ? 'justify-center' : 'justify-start'}`}
                    style={{
                      color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)',
                      fontFamily: 'Inter',
                      fontSize: '13px',
                      fontStyle: 'normal',
                      fontWeight: '600',
                      lineHeight: '18px'
                    }}
                    title={!isSidebarExpanded ? item.name : undefined}
                  >
                    <Icon 
                      className="h-4 w-4 flex-shrink-0" 
                      style={{
                        color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)'
                      }}
                    />
                    {isSidebarExpanded && <span className="whitespace-normal">{item.name}</span>}
                  </Link>
                )}
              </div>

              {/* Sub Items */}
              {hasVisibleSubItems && isExpanded && isSidebarExpanded && (
                <ul 
                  id={`submenu-${item.name}`}
                  className="ml-4 mt-1 space-y-1"
                  role="menu"
                >
                  {visibleSubItems!.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = isSubItemActive(subItem);
                    
                    return (
                      <li key={subItem.name} role="none">
                        <Link
                          href={subItem.href}
                          onClick={handleLinkClick}
                          role="menuitem"
                          aria-current={isSubActive ? 'page' : undefined}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isSubActive 
                              ? 'bg-green-50 text-green-700 border-l-2 border-green-600' 
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                          style={{
                            color: isSubActive ? '#15803d' : '#475569',
                            fontFamily: 'Inter',
                            fontSize: '12px',
                            fontStyle: 'normal',
                            fontWeight: '500',
                            lineHeight: '16px'
                          }}
                        >
                          <SubIcon 
                            className="h-3.5 w-3.5 flex-shrink-0" 
                            style={{
                              color: isSubActive ? '#15803d' : '#475569'
                            }}
                            aria-hidden="true"
                          />
                          <span className="whitespace-normal">{subItem.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        
        {/* Expand/Collapse Arrow Button - Just below last item */}
        <div className={`flex items-center w-full mt-2 ${isSidebarExpanded ? 'px-2' : 'pl-2 justify-start'}`}>
          <button
            onClick={toggleExpand}
            aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isSidebarExpanded}
            className={`flex items-center justify-center h-10 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-all duration-200 border border-blue-200 hover:border-blue-300 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSidebarExpanded ? 'w-full' : 'w-10'
            }`}
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            style={{
              color: '#2563eb'
            }}
          >
            {isSidebarExpanded ? (
              <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[-2px]" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[2px]" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
}