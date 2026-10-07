"use client";

import * as React from "react";

import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Save, Send } from "lucide-react";
import { createPortal } from "react-dom";

import { APP_FOOTER_SLOT_ID } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DeliveryMode } from "./delivery-options";

export type ComposeSectionId = "recipients" | "compose" | "preview";

/** The primary button says what will actually happen, per delivery mode. */
const dispatchLabels: Record<DeliveryMode, { idle: string; busy: string; icon: React.ReactNode }> =
  {
    now: {
      idle: "Send now",
      busy: "Sending…",
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
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setSlot(document.getElementById(APP_FOOTER_SLOT_ID));
  }, []);

  if (!slot) {
    return null;
  }

  // Rendered into the app layout's footer slot, which sits below the scrolling
  // content pane and beside (not over) the sidebar.
  return createPortal(
    <section
      className={cn(
        "border-t bg-background shadow-[0_-12px_30px_-20px_color-mix(in_oklch,var(--foreground)_25%,transparent)]",
        className,
      )}
      aria-label="Campaign actions"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground truncate">
            {recipientsCount} {recipientsCount === 1 ? "recipient" : "recipients"}
          </span>

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
              <Button onClick={onNext} disabled={!canGoNext} className="shadow-sm">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>,
    slot,
  );
}
