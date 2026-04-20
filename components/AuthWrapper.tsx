'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { useLeftSidebar } from '@/contexts/LeftSidebarContext';
import { isNhiShellPath } from '@/lib/nhi-shell';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const {
    isVisible: isSidebarVisible,
    sidebarWidthPx,
    nhiNavWidthPx,
    setNhiNavWidthPx,
    hideSidebar,
    showSidebar,
  } = useLeftSidebar();
  const pathname = usePathname();
  const nhiShell = isNhiShellPath(pathname);
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const prevNhiShellRef = useRef(false);

  // NHI shell: hide main nav by default; restoring main nav when leaving the shell.
  useEffect(() => {
    const prev = prevNhiShellRef.current;
    if (nhiShell && !prev) {
      hideSidebar();
    }
    if (!nhiShell && prev) {
      showSidebar();
      setNhiNavWidthPx(0);
    }
    prevNhiShellRef.current = nhiShell;
  }, [nhiShell, hideSidebar, showSidebar, setNhiNavWidthPx]);

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

  // Show main app layout for authenticated users. Sidebar is fixed so main needs margin-left.
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {(!nhiShell || isSidebarVisible) && <Navigation />}
      <div
        className="flex flex-1 pt-[60px] min-h-0"
        style={{
          marginLeft: nhiShell
            ? (isSidebarVisible ? sidebarWidthPx : 0) + nhiNavWidthPx
            : isSidebarVisible
              ? sidebarWidthPx
              : 0,
        }}
      >
        {nhiShell ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
        ) : (
          <main className="min-h-0 flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
        )}
      </div>
    </div>
  );
}
