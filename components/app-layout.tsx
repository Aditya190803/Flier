"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    // Keep a single scroll container in app pages (the content pane),
    // and prevent the document itself from creating an extra scrollbar.
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.error)) {
      if (typeof window !== "undefined") {
        router.push(
          `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
      } else {
        router.push("/auth/signin");
      }
    }
  }, [status, session?.error, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex h-svh flex-col">
        <SidebarTrigger className="absolute left-3 top-3 z-20 h-9 w-9 rounded-full border border-border/70 bg-background/90 shadow-md backdrop-blur transition-shadow hover:shadow-lg md:top-[55%] md:-translate-y-1/2" />
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
