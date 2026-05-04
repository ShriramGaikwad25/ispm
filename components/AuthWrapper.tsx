'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { useLeftSidebar } from '@/contexts/LeftSidebarContext';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { isVisible: isSidebarVisible, sidebarWidthPx } = useLeftSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle redirects with proper state management
  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      setIsRedirecting(true);
      router.push('/login');
    } else if (isAuthenticated && pathname === '/login') {
      setIsRedirecting(true);
      router.push('/');
    } else {
      setIsRedirecting(false);
    }
  }, [isAuthenticated, pathname, router]);

  // Show loading state during redirects
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // AI Agent Inventory: wide layout with a modest edge gutter (px-4 vs default p-6 elsewhere).
  const mainPadClass =
    typeof pathname === "string" &&
    (pathname.startsWith("/non-human-identity/ai-agent-inventory") ||
      pathname.startsWith("/non-human-identity-1/agents"))
      ? "py-6 px-4"
      : "p-6";

  // Show main app layout for authenticated users. Sidebar is fixed so main needs margin-left.
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {isSidebarVisible && <Navigation />}
      <div
        className="flex flex-1 pt-[60px] min-h-0"
        style={{
          marginLeft: isSidebarVisible ? sidebarWidthPx : 0,
        }}
      >
        <main className={`min-h-0 min-w-0 flex-1 overflow-auto bg-gray-50 ${mainPadClass}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
