"use client";

import { useEffect, useState, useCallback } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

interface UseServiceWorkerOptions {
  onUpdate?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useServiceWorker(options: UseServiceWorkerOptions = {}) {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdating: false,
    hasUpdate: false,
    registration: null,
    error: null,
  });

  const { onUpdate, onSuccess, onError } = options;

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  setState((prev) => ({ ...prev, hasUpdate: true }));
                  onUpdate?.();
                } else {
                  onSuccess?.();
                }
              }
            });
          }
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({ ...prev, error: err }));
        onError?.(err);
      }
    };

    register();
  }, [onUpdate, onSuccess, onError]);

  const update = useCallback(async () => {
    if (!state.registration) {
      return;
    }

    setState((prev) => ({ ...prev, isUpdating: true }));

    try {
      await state.registration.update();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({ ...prev, error: err }));
    } finally {
      setState((prev) => ({ ...prev, isUpdating: false }));
    }
  }, [state.registration]);

  const skipWaiting = useCallback(() => {
    const waiting = state.registration?.waiting;

    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  }, [state.registration]);

  const unregister = useCallback(async () => {
    if (!state.registration) {
      return false;
    }

    try {
      const success = await state.registration.unregister();
      if (success) {
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          registration: null,
        }));
      }
      return success;
    } catch {
      return false;
    }
  }, [state.registration]);

  return {
    ...state,
    update,
    skipWaiting,
    unregister,
  };
}

export function ServiceWorkerUpdateNotification() {
  const [showNotification, setShowNotification] = useState(false);

  const { hasUpdate, skipWaiting } = useServiceWorker({
    onUpdate: () => setShowNotification(true),
  });

  if (!showNotification || !hasUpdate) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-4 rounded-lg bg-primary p-4 text-primary-foreground shadow-lg"
    >
      <div>
        <p className="font-medium">Update available!</p>
        <p className="text-sm opacity-90">A new version of Flier is ready.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setShowNotification(false)}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-primary-foreground/10"
        >
          Later
        </button>
        <button
          onClick={skipWaiting}
          className="rounded-md bg-primary-foreground px-3 py-1.5 text-sm text-primary hover:bg-primary-foreground/90"
        >
          Update now
        </button>
      </div>
    </div>
  );
}
