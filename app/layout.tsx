import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import QueryProvider from "./QueryProvider";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { PageTransitionLoader } from "@/components/PageTransitionLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ISPM",
  description: "Identity Security Posture Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <LoadingProvider>
            <div className="flex flex-col h-screen">
              <Header />
              <main className="flex-1 overflow-auto p-6 bg-gray-50">
                {children}
              </main>
            </div>
            <PageTransitionLoader />
          </LoadingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
