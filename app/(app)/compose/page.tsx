"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

import { ComposeForm } from "@/components/compose-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/useIsClient";

export default function ComposePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isClient = useIsClient();

  useEffect(() => {
    // Redirect if unauthenticated OR if there's a session error (token refresh failed)
    if (
      isClient &&
      (status === "unauthenticated" || (status === "authenticated" && session?.error))
    ) {
      router.push("/");
    }
  }, [status, session?.error, router, isClient]);

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
              <div className="px-4 md:px-6 lg:px-8 py-3 border-b bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>
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

  if (status === "unauthenticated") {
    return (
      <PageShell>
        <PageHeader title="New Campaign" description="Write and send a personalised campaign" />
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-destructive mb-4">Please sign in to access the email composer</p>
                <Button asChild>
                  <Link href="/">Return to Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
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
