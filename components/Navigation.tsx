'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {navLinks as navigation} from './Navi';

export function Navigation() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Reset hover state when pathname changes (navigation occurs)
  useEffect(() => {
    setIsHovered(false);
  }, [pathname]);

  const handleLinkClick = () => {
    // Reset hover state immediately when a link is clicked
    setIsHovered(false);
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
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors ${
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
          );
        })}
      </nav>
    </div>
  );
}