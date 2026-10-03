"use client";

import { useState, useEffect } from "react";

import { Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShortcutCategory {
  name: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const KEYBOARD_SHORTCUTS: ShortcutCategory[] = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["Ctrl/⌘", "Shift", "N"], description: "New Campaign" },
      { keys: ["Ctrl/⌘", "Shift", "H"], description: "Go to Dashboard" },
      { keys: ["Ctrl/⌘", "Shift", "C"], description: "Go to Contacts" },
      { keys: ["Ctrl/⌘", "Shift", "A"], description: "Go to Analytics" },
      { keys: ["Ctrl/⌘", "/"], description: "Show keyboard shortcuts" },
      { keys: ["Shift", "?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    name: "Compose",
    shortcuts: [
      { keys: ["Ctrl/⌘", "Enter"], description: "Send email" },
      { keys: ["Ctrl/⌘", "S"], description: "Save as draft" },
      { keys: ["Ctrl/⌘", "Shift", "P"], description: "Preview email" },
      { keys: ["Esc"], description: "Discard and go back" },
    ],
  },
  {
    name: "Rich Text Editor",
    shortcuts: [
      { keys: ["Ctrl/⌘", "B"], description: "Bold" },
      { keys: ["Ctrl/⌘", "I"], description: "Italic" },
      { keys: ["Ctrl/⌘", "U"], description: "Underline" },
      { keys: ["Ctrl/⌘", "K"], description: "Insert link" },
      { keys: ["Ctrl/⌘", "Z"], description: "Undo" },
      { keys: ["Ctrl/⌘", "Shift", "Z"], description: "Redo" },
      { keys: ["Ctrl/⌘", "Shift", "L"], description: "Bullet list" },
      { keys: ["Ctrl/⌘", "Shift", "O"], description: "Numbered list" },
    ],
  },
  {
    name: "Templates",
    shortcuts: [
      { keys: ["Ctrl/⌘", "N"], description: "New template" },
      { keys: ["Ctrl/⌘", "E"], description: "Edit selected template" },
      { keys: ["Del", "Backspace"], description: "Delete selected template" },
    ],
  },
  {
    name: "Contacts",
    shortcuts: [
      { keys: ["Ctrl/⌘", "N"], description: "Add new contact" },
      { keys: ["Ctrl/⌘", "I"], description: "Import contacts" },
      { keys: ["Ctrl/⌘", "E"], description: "Export contacts" },
      { keys: ["Ctrl/⌘", "A"], description: "Select all contacts" },
    ],
  },
  {
    name: "General",
    shortcuts: [
      { keys: ["Ctrl/⌘", "Shift", "T"], description: "Toggle dark mode" },
      { keys: ["?"], description: "Show help" },
      { keys: ["Esc"], description: "Close modal/dialog" },
    ],
  },
];

function KeyboardKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 min-w-[24px]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  // Listen for keyboard shortcut to open the modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + / to open shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // ? key to open shortcuts (when not in an input)
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Keyboard Shortcuts (Ctrl+/)">
          <Keyboard className="h-4 w-4" />
          <span className="sr-only">Keyboard Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>Quick reference for all keyboard shortcuts in Flier</DialogDescription>
        </DialogHeader>
        <div className="h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-6">
            {KEYBOARD_SHORTCUTS.map((category) => (
              <div key={category.name}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <KeyboardKey>{key}</KeyboardKey>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <KeyboardKey>Esc</KeyboardKey> to close • <KeyboardKey>Ctrl/⌘</KeyboardKey> +{" "}
          <KeyboardKey>/</KeyboardKey> to toggle
        </div>
      </DialogContent>
    </Dialog>
  );
}
