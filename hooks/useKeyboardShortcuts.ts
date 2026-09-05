"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

/**
 * Hook for handling keyboard shortcuts throughout the application.
 *
 * Default shortcuts:
 * - Ctrl+N: New campaign (navigate to compose)
 * - Ctrl+Enter: Send email (when in compose)
 * - Ctrl+S: Save draft (when in compose)
 * - Ctrl+/: Show shortcuts help
 * - Escape: Close modal/dialog
 * - Ctrl+K: Quick search/command palette
 */
export function useKeyboardShortcuts(customShortcuts?: KeyboardShortcut[]) {
  const router = useRouter();
  const _activeElementRef = useRef<Element | null>(null);

  const defaultShortcuts: KeyboardShortcut[] = [
    {
      key: "n",
      ctrl: true,
      shift: true, // Use Ctrl+Shift+N to avoid browser's new window
      description: "New Campaign",
      action: () => {
        router.push("/compose");
        toast.info("Opening composer...");
      },
    },
    {
      key: "h",
      ctrl: true,
      shift: true, // Use Ctrl+Shift+H to avoid browser's history
      description: "Dashboard",
      action: () => {
        router.push("/dashboard");
      },
    },
    {
      key: "c",
      ctrl: true,
      shift: true,
      description: "Contacts",
      action: () => {
        router.push("/contacts");
      },
    },
    {
      key: "a",
      ctrl: true,
      shift: true,
      description: "Analytics",
      action: () => {
        router.push("/analytics");
      },
    },
    {
      key: "/",
      ctrl: true,
      description: "Show Keyboard Shortcuts",
      action: () => {
        showShortcutsHelp();
      },
    },
    {
      key: "?",
      shift: true,
      description: "Show Keyboard Shortcuts",
      action: () => {
        showShortcutsHelp();
      },
    },
  ];

  const allShortcuts = useMemo(
    () => [...defaultShortcuts, ...(customShortcuts || [])],
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [customShortcuts],
  );

  const showShortcutsHelp = useCallback(() => {
    const shortcutsText = allShortcuts
      .map((s) => {
        const keys = [];
        if (s.ctrl) {
          keys.push("Ctrl");
        }
        if (s.shift) {
          keys.push("Shift");
        }
        if (s.alt) {
          keys.push("Alt");
        }
        if (s.meta) {
          keys.push("⌘");
        }
        keys.push(s.key.toUpperCase());
        return `${keys.join("+")} → ${s.description}`;
      })
      .join("\n");

    toast.info("Keyboard Shortcuts", {
      description: shortcutsText,
      duration: 10000,
    });
  }, [allShortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        // Only allow Ctrl+S (save) and Escape in input fields
        if (!(event.ctrlKey && event.key === "s") && event.key !== "Escape") {
          return;
        }
      }

      // Find matching shortcut
      const matchingShortcut = allShortcuts.find((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === event.ctrlKey;
        const shiftMatch = !!shortcut.shift === event.shiftKey;
        const altMatch = !!shortcut.alt === event.altKey;
        const metaMatch = !!shortcut.meta === event.metaKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [allShortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: allShortcuts,
    showShortcutsHelp,
  };
}

/**
 * Hook specifically for compose page shortcuts
 */
export function useComposeShortcuts(options: {
  onSend?: () => void;
  onSave?: () => void;
  onPreview?: () => void;
  canSend?: boolean;
}) {
  const composeShortcuts: KeyboardShortcut[] = [
    {
      key: "Enter",
      ctrl: true,
      description: "Send Email",
      action: () => {
        if (options.canSend && options.onSend) {
          options.onSend();
        } else {
          toast.warning("Cannot send: Please complete the email first");
        }
      },
    },
    {
      key: "s",
      ctrl: true,
      description: "Save Draft",
      action: () => {
        if (options.onSave) {
          options.onSave();
          toast.success("Draft saved");
        }
      },
    },
    {
      key: "p",
      ctrl: true,
      shift: true,
      description: "Preview Email",
      action: () => {
        if (options.onPreview) {
          options.onPreview();
        }
      },
    },
  ];

  return useKeyboardShortcuts(composeShortcuts);
}

/**
 * Provider component that enables keyboard shortcuts globally
 */
export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeyboardShortcuts();
  return children;
}
