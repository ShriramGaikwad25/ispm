'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {navLinks as navigation, NavItem} from './Navi';

export function Navigation() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Reset hover state when pathname changes (navigation occurs)
  useEffect(() => {
    setIsHovered(false);
  }, [pathname]);

  const handleLinkClick = () => {
    // Reset hover state immediately when a link is clicked
    setIsHovered(false);
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

  return (
    <div 
      className={`bg-white border-r border-gray-200 flex flex-col items-center transition-all duration-300 ease-in-out ${
        isHovered ? 'w-[280px]' : 'w-20'
      }`}
      style={{
        minHeight: '100vh',
        padding: '16px 0 24px 0',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Section */}
      {/* <div className="flex items-center px-5 py-4 border-b border-gray-200 bg-[#27B973]">
        <div className="flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="28" 
            height="23" 
            viewBox="0 0 28 23" 
            fill="none"
          >
            <path d="M14.5404 22.6392C20.7986 21.0898 24.5947 14.8443 23.0193 8.68939C21.4438 2.5345 15.0934 -1.199 8.8352 0.350432C2.577 1.89986 -1.21912 8.14548 0.356317 14.3004C1.93175 20.4552 8.28216 24.1887 14.5404 22.6392Z" fill="#F5CB39"/>
            <path d="M23.322 0.00923857V23H28V0.00923857H23.322Z" fill="#FCA311"/>
          </svg>
          {isHovered && <span className="text-black font-bold text-xl">KeyForge</span>}
        </div>
      </div> */}

      {/* Navigation Links */}
      <nav className="flex flex-col px-4 py-6 space-y-1">
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
                      toggleExpanded(item.name);
                    }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors flex-1 w-full ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'hover:bg-gray-50'
                    } ${!isHovered ? 'justify-center' : ''}`}
                    style={{
                      color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)',
                      fontFamily: 'Inter',
                      fontSize: '15px',
                      fontStyle: 'normal',
                      fontWeight: '600',
                      lineHeight: '22px'
                    }}
                    title={!isHovered ? item.name : undefined}
                  >
                    <Icon 
                      className="h-5 w-5 flex-shrink-0" 
                      style={{
                        color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)'
                      }}
                    />
                    {isHovered && <span>{item.name}</span>}
                    {isHovered && (
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
                    } ${!isHovered ? 'justify-center' : ''}`}
                    style={{
                      color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)',
                      fontFamily: 'Inter',
                      fontSize: '15px',
                      fontStyle: 'normal',
                      fontWeight: '600',
                      lineHeight: '22px'
                    }}
                    title={!isHovered ? item.name : undefined}
                  >
                    <Icon 
                      className="h-5 w-5 flex-shrink-0" 
                      style={{
                        color: isActive ? '#2563eb' : 'var(--text-icons-base-second, #68727D)'
                      }}
                    />
                    {isHovered && <span>{item.name}</span>}
                  </Link>
                )}
              </div>

              {/* Sub Items */}
              {hasSubItems && isExpanded && isHovered && (
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
      </nav>
    </div>
  );
}