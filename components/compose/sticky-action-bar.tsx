"use client";

import * as React from "react";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DeliveryMode } from "./delivery-options";

export type ComposeSectionId = "recipients" | "compose" | "preview";

const sectionLabels: Record<ComposeSectionId, string> = {
  recipients: "Recipients",
  compose: "Editor",
  preview: "Preview",
};

/** The primary button says what will actually happen, per delivery mode. */
const dispatchLabels: Record<
  DeliveryMode,
  { idle: string; busy: string; icon: React.ReactNode }
> = {
  now: {
    idle: "Dispatch",
    busy: "Dispatching…",
    icon: <Send className="h-4 w-4 mr-2" />,
  },
  schedule: {
    idle: "Schedule",
    busy: "Scheduling…",
    icon: <CalendarClock className="h-4 w-4 mr-2" />,
  },
  draft: {
    idle: "Save draft",
    busy: "Saving…",
    icon: <Save className="h-4 w-4 mr-2" />,
  },
};

export function StickyActionBar({
  activeSection,
  recipientsCount,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onDispatch,
  isDispatching,
  dispatchDisabled,
  deliveryMode = "now",
  className,
}: {
  activeSection: ComposeSectionId;
  recipientsCount: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onDispatch: () => void;
  isDispatching: boolean;
  dispatchDisabled: boolean;
  deliveryMode?: DeliveryMode;
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Portal to body so position:fixed is viewport-relative.
  // App layout scrolls an inner pane; fixed inside that can stick to the pane
  // and let page content paint under/below the bar.
  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t bg-background shadow-[0_-12px_30px_-20px_hsl(var(--foreground)/0.25)]",
        className,
      )}
      role="region"
      aria-label="Campaign actions"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="bg-background/60">
              {sectionLabels[activeSection]}
            </Badge>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {recipientsCount}{" "}
              {recipientsCount === 1 ? "recipient" : "recipients"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={!canGoBack}
              className="bg-background"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {activeSection === "preview" ? (
              <Button
                onClick={onDispatch}
                disabled={dispatchDisabled || isDispatching}
                className="shadow-sm"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {dispatchLabels[deliveryMode].busy}
                  </>
                ) : (
                  <>
                    {dispatchLabels[deliveryMode].icon}
                    {dispatchLabels[deliveryMode].idle}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={onNext}
                disabled={!canGoNext}
                className="shadow-sm"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
