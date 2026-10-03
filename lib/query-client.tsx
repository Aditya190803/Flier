/**
 * React Query (TanStack Query) configuration and custom hooks
 * Provides caching, refetching, and optimistic updates for data fetching
 */

"use client";

import { useState, type ReactNode } from "react";

import { QueryClient, QueryClientProvider as Provider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

/**
 * Default query client configuration
 */
const defaultQueryClientConfig = {
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Cache time: How long data stays in cache after becoming stale
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      // Retry failed queries
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for keeping data fresh)
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: "always" as const,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
};

/**
 * React Query Provider component
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Create QueryClient in useState to ensure it's created once per client
  const [queryClient] = useState(() => new QueryClient(defaultQueryClientConfig));

  return (
    <Provider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </Provider>
  );
}

// Alias for backwards compatibility
export { QueryProvider as QueryClientProvider };

/**
 * Query keys factory for consistent cache key management
 */
export const queryKeys = {
  // Contacts
  contacts: {
    all: ["contacts"] as const,
    list: (userEmail: string, filters?: Record<string, unknown>) =>
      ["contacts", "list", userEmail, filters] as const,
    detail: (id: string) => ["contacts", "detail", id] as const,
    duplicates: (userEmail: string) => ["contacts", "duplicates", userEmail] as const,
  },

  // Campaigns
  campaigns: {
    all: ["campaigns"] as const,
    list: (userEmail: string, filters?: Record<string, unknown>) =>
      ["campaigns", "list", userEmail, filters] as const,
    detail: (id: string) => ["campaigns", "detail", id] as const,
    analytics: (id: string) => ["campaigns", "analytics", id] as const,
  },

  // Templates
  templates: {
    all: ["templates"] as const,
    list: (userEmail: string) => ["templates", "list", userEmail] as const,
    detail: (id: string) => ["templates", "detail", id] as const,
  },

  // Signatures
  signatures: {
    all: ["signatures"] as const,
    list: (userEmail: string) => ["signatures", "list", userEmail] as const,
    detail: (id: string) => ["signatures", "detail", id] as const,
  },

  // Unsubscribes
  unsubscribes: {
    all: ["unsubscribes"] as const,
    list: (userEmail: string) => ["unsubscribes", "list", userEmail] as const,
  },

  // Webhooks
  webhooks: {
    all: ["webhooks"] as const,
    list: (userEmail: string) => ["webhooks", "list", userEmail] as const,
  },

  // Teams
  teams: {
    all: ["teams"] as const,
    list: (userEmail: string) => ["teams", "list", userEmail] as const,
    detail: (id: string) => ["teams", "detail", id] as const,
    members: (teamId: string) => ["teams", "members", teamId] as const,
  },

  // Audit logs
  auditLogs: {
    all: ["auditLogs"] as const,
    list: (userEmail: string, filters?: Record<string, unknown>) =>
      ["auditLogs", "list", userEmail, filters] as const,
  },

  // User
  user: {
    session: ["user", "session"] as const,
    profile: ["user", "profile"] as const,
    quota: ["user", "quota"] as const,
  },
};

/**
 * Get query client (for use outside of React components)
 */
let globalQueryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!globalQueryClient) {
    globalQueryClient = new QueryClient(defaultQueryClientConfig);
  }
  return globalQueryClient;
}

/**
 * Invalidate queries helper
 */
export function invalidateQueries(queryKey: readonly unknown[]): Promise<void> {
  return getQueryClient().invalidateQueries({ queryKey });
}

/**
 * Prefetch queries helper
 */
export function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
): Promise<void> {
  return getQueryClient().prefetchQuery({
    queryKey,
    queryFn,
  });
}
