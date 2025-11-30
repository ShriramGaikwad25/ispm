'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import {navLinks as navigation, NavItem} from './Navi';
import { useLeftSidebar } from '@/contexts/LeftSidebarContext';

export function Navigation() {
  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { isVisible } = useLeftSidebar();

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

  // Don't render if sidebar is hidden
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="bg-white border-r border-gray-200 flex flex-col relative"
      style={{
        height: '100vh',
        width: isSidebarExpanded ? '240px' : '64px',
        transition: 'width 300ms ease-in-out'
      }}
    >
      {/* Navigation Links */}
      <nav className="flex flex-col px-4 py-6 space-y-1 flex-1 w-full items-center" style={{ gap: '8px' }}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item);
          const isExpanded = expandedItems.has(item.name);
          const hasSubItems = item.subItems && item.subItems.length > 0;

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
                    className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors flex-1 w-full ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'hover:bg-gray-50'
                    } ${!isSidebarExpanded ? 'justify-center' : ''}`}
                    style={{
                      color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)',
                      fontFamily: 'Inter',
                      fontSize: '15px',
                      fontStyle: 'normal',
                      fontWeight: '600',
                      lineHeight: '22px'
                    }}
                    title={!isSidebarExpanded ? item.name : undefined}
                  >
                    <Icon 
                      className="h-5 w-5 flex-shrink-0" 
                      style={{
                        color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)'
                      }}
                    />
                    {isSidebarExpanded && <span>{item.name}</span>}
                    {isSidebarExpanded && (
                      <div className="ml-auto">
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
                    className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors flex-1 ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'hover:bg-gray-50'
                    } ${!isSidebarExpanded ? 'justify-center' : ''}`}
                    style={{
                      color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)',
                      fontFamily: 'Inter',
                      fontSize: '15px',
                      fontStyle: 'normal',
                      fontWeight: '600',
                      lineHeight: '22px'
                    }}
                    title={!isSidebarExpanded ? item.name : undefined}
                  >
                    <Icon 
                      className="h-5 w-5 flex-shrink-0" 
                      style={{
                        color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)'
                      }}
                    />
                    {isSidebarExpanded && <span>{item.name}</span>}
                  </Link>
                )}
              </div>

              {/* Sub Items */}
              {hasSubItems && expandedItems.has(item.name) && isSidebarExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subItems!.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = isSubItemActive(subItem);
                    
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                          isSubActive 
                            ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600' 
                            : 'hover:bg-gray-50'
                        }`}
                        style={{
                          color: isSubActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)',
                          fontFamily: 'Inter',
                          fontSize: '14px',
                          fontStyle: 'normal',
                          fontWeight: '500',
                          lineHeight: '20px'
                        }}
                      >
                        <SubIcon 
                          className="h-4 w-4 flex-shrink-0" 
                          style={{
                            color: isSubActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)'
                          }}
                        />
                        <span>{subItem.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Expand/Collapse Arrow Button - Just below last item */}
        <div className="flex justify-center items-center w-full mt-2">
          <button
            onClick={toggleExpand}
            className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-blue-600 transition-colors bg-blue-500 shadow-sm"
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            style={{
              color: '#ffffff'
            }}
          >
            {isSidebarExpanded ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}