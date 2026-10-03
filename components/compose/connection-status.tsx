"use client";

import { signIn, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import type { QuotaInfo } from "@/types/campaign";

export function ConnectionStatus({ quota }: { quota: QuotaInfo }) {
  const { data: session, status } = useSession();
  const needsReconnect =
    status === "unauthenticated" ||
    !!session?.error ||
    (status === "authenticated" && !session.accessToken);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
      aria-live="polite"
    >
      <div>
        <p>
          {status === "loading"
            ? "Checking Google connection…"
            : needsReconnect
              ? "Reconnect Google before sending"
              : `Connected as ${session?.user?.email || "your Google account"}`}
        </p>
        <p className="text-xs text-muted-foreground">
          Estimated usage in this browser: {quota.estimatedUsed} sends today. Sends from other
          devices and apps aren't counted.
        </p>
      </div>
      {needsReconnect && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => signIn("google", { callbackUrl: "/compose" })}
        >
          Reconnect Google
        </Button>
      )}
    </div>
  );
}
