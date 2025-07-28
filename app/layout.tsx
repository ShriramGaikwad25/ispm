import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import QueryProvider from './QueryProvider';

export const metadata: Metadata = {
  title: 'ISPM Tool',
  description: 'Identity and Access Management'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="relative flex min-h-screen">
          <aside className="hidden md:flex flex-col border-r border-[#2684FF]/10">
            <Navigation />
          </aside>
          <div className="flex flex-col flex-1">
            <Header />
            <main className="overflow-auto p-6 h-[calc(100vh-66px)] w-full">
              <QueryProvider>{children}</QueryProvider>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
