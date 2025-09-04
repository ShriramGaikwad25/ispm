'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { HamburgerMenu } from './HamburgerMenu';
import HeaderContent from './HeaderContent';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="top-0 z-50 w-full">
      <div className="flex h-[45px] px-6 items-center">
        {/* Hamburger Menu Button */}
        <button 
          onClick={() => setIsMenuOpen(true)} 
          className="p-2 rounded-md hover:bg-gray-200 focus:outline-none transition-colors"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </button>

        {/* Main Header Content */}
        <HeaderContent />
      </div>

      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </header>
  );
}
