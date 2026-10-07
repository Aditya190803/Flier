"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

import { AppSidebar, getNavTitle } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

/** Pages portal sticky footers (e.g. the compose action bar) into this element. */
export const APP_FOOTER_SLOT_ID = "app-footer-slot";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

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
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger className="h-8 w-8" />
          <Separator orientation="vertical" className="h-4" />
          <span className="truncate text-sm font-medium text-muted-foreground">
            {getNavTitle(pathname)}
          </span>
        </header>
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">{children}</div>
        <div id={APP_FOOTER_SLOT_ID} className="shrink-0" />
      </SidebarInset>
    </SidebarProvider>
  );
}
