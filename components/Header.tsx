'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import {Navigation} from './Navigation';
import HeaderContent from './HeaderContent';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return (
    <header className="top-0 z-50 w-full border-b border-gray-300  bg-[#F4F5FA]">
      <div className="flex h-[45px] px-6 items-center">
        {/* Mobile Menu Button */}
          <button onClick={() => setIsOpen(true)} className="md:hidden p-2 rounded-md hover:bg-gray-200 focus:outline-none">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </button>
        {/* Mobile Sidebar */}
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 bg-opacity-50" onClick={() => setIsOpen(false)}>
            <div className="fixed left-0 top-0 h-full w-64 shadow-md transform transition-transform duration-300">
              <Navigation isOpen={setIsOpen}/>
            </div>
          </div>
        )}

        {/* Main Header Content */}
        <HeaderContent />
      </div>
    </header>
  );
}
