"use client";

import React from "react";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { componentLogger } from "@/lib/client-logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    componentLogger.error("ErrorBoundary caught an error", error, {
      errorInfo,
    });

    // Check if it's a ChunkLoadError and try to reload
    if (error.name === "ChunkLoadError" || error.message.includes("Loading chunk")) {
      componentLogger.warn("ChunkLoadError detected, attempting to reload...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  const isChunkError = error?.name === "ChunkLoadError" || error?.message.includes("Loading chunk");

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isChunkError ? "Loading Error" : "Something went wrong"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isChunkError ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                A loading error occurred. This usually happens when the application updates while
                you're using it.
              </p>
              <p className="text-sm text-muted-foreground">
                The page will reload automatically in a moment, or you can click the button below.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please try again.
              </p>
              {error && (
                <details className="text-xs text-muted-foreground">
                  <summary>Error details</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {error.toString()}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={retry}
              className="flex-1"
              variant={isChunkError ? "secondary" : "default"}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            {isChunkError && (
              <Button onClick={() => window.location.reload()} className="flex-1">
                Reload Page
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for functional components to handle chunk errors
export function useChunkErrorHandler() {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === "ChunkLoadError" || event.message.includes("Loading chunk")) {
        componentLogger.warn("ChunkLoadError detected in hook, reloading...");
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.name === "ChunkLoadError" ||
        event.reason?.message?.includes("Loading chunk")
      ) {
        componentLogger.warn("ChunkLoadError promise rejection detected, reloading...");
        window.location.reload();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
