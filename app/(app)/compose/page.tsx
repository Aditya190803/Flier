"use client";

import { useSession } from "next-auth/react";

import { ComposeForm } from "@/components/compose-form";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/useIsClient";

export default function ComposePage() {
  const { status } = useSession();
  const isClient = useIsClient();

  if (!isClient || status === "loading") {
    return (
      <PageShell>
        <PageHeader title="New Campaign" description="Write and send a personalised campaign" />
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 min-h-[600px]">
          <div className="w-full md:w-64 shrink-0 space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="p-4 md:p-6 lg:p-8 space-y-6">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ComposeForm />
    </PageShell>
  );
}
