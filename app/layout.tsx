import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import QueryProvider from "./QueryProvider";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { PageTransitionLoader } from "@/components/PageTransitionLoader";
import { ActionPanelProvider } from "@/contexts/ActionPanelContext";
import ActionPanel from "@/components/ActionPanel";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthWrapper } from "@/components/AuthWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KeyForge",
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
        <AuthProvider>
          <QueryProvider>
            <LoadingProvider>
              <ActionPanelProvider>
                <AuthWrapper>
                  {children}
                </AuthWrapper>
                <PageTransitionLoader />
                <ActionPanel />
              </ActionPanelProvider>
            </LoadingProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
