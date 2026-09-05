"use client";

import { CalendarClock, Save, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getBrowserTimeZone,
  getMaxScheduleValue,
  getMinScheduleValue,
  SCHEDULE_PRESETS,
  toDateTimeLocalValue,
  validateScheduleValue,
} from "@/lib/schedule";

/** When the campaign leaves the composer. */
export type DeliveryMode = "now" | "schedule" | "draft";

const MODES: {
  id: DeliveryMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "now",
    label: "Send now",
    description: "Dispatch as soon as you hit send",
    icon: <Send className="h-5 w-5" />,
  },
  {
    id: "schedule",
    label: "Schedule",
    description: "Queue it for a date and time you choose",
    icon: <CalendarClock className="h-5 w-5" />,
  },
  {
    id: "draft",
    label: "Save as draft",
    description: "Park it and send manually later",
    icon: <Save className="h-5 w-5" />,
  },
];

export function DeliveryOptions({
  deliveryMode,
  setDeliveryMode,
  scheduledAt,
  setScheduledAt,
}: {
  deliveryMode: DeliveryMode;
  setDeliveryMode: (mode: DeliveryMode) => void;
  /** `datetime-local` value (local time, no zone) */
  scheduledAt: string;
  setScheduledAt: (value: string) => void;
}) {
  const timeZone = getBrowserTimeZone();
  const validation = scheduledAt
    ? validateScheduleValue(scheduledAt)
    : { valid: false as const, error: undefined };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Delivery</Label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODES.map((mode) => {
          const isActive = deliveryMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setDeliveryMode(mode.id)}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${isActive ? "bg-primary/10" : "bg-muted"}`}
              >
                {mode.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{mode.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mode.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {deliveryMode === "schedule" && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Send at</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              min={getMinScheduleValue()}
              max={getMaxScheduleValue()}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="max-w-xs"
              aria-invalid={Boolean(scheduledAt) && !validation.valid}
              aria-describedby="scheduled-at-hint"
            />
            <p
              id="scheduled-at-hint"
              className="text-xs text-muted-foreground flex items-center gap-1.5"
            >
              Times are in your local zone
              <Badge variant="outline" className="text-[10px] font-normal">
                {timeZone}
              </Badge>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SCHEDULE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setScheduledAt(toDateTimeLocalValue(preset.getDate()))
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {scheduledAt && !validation.valid && validation.error && (
            <p className="text-xs text-destructive">{validation.error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Scheduled campaigns are sent from our servers — you can close this
            tab once it's queued. Manage or cancel them from the Scheduled page.
          </p>
        </div>
      )}
    </div>
  );
}
