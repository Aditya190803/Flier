"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Custom hook to prevent hydration mismatches by ensuring
 * components only render on the client side after hydration
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Component wrapper to prevent hydration mismatches
 * Only renders children after client-side hydration is complete
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const isClient = useIsClient();

  if (!isClient) {
    return null;
  }

  return children;
}
