"use client";

import { useEffect, type ReactNode } from "react";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";
import { initGA4 } from "@/lib/activity/ga4";
import { QueryProvider } from "@/lib/query-client";
import { migrateLegacyStorageKeys } from "@/lib/storage-migration";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    migrateLegacyStorageKeys();
    // Initialize GA4 with the measurement ID from env
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (measurementId) {
      initGA4({
        measurementId,
        enabled: process.env.NODE_ENV === "production",
      });
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryProvider>
        <SessionProvider
          refetchInterval={5 * 60} // Refetch session every 5 minutes
          refetchOnWindowFocus={true} // Refetch when window gains focus
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              className: "border border-border bg-card text-card-foreground shadow-lg",
              duration: 4000,
            }}
            richColors
            closeButton
          />
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
