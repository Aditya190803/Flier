import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEBHOOK_EVENT_TYPES as EVENT_TYPES } from "@/components/webhooks/event-types";
import { type Webhook as WebhookType } from "@/lib/appwrite";

export interface NewWebhookState {
  name: string;
  url: string;
  events: WebhookType["events"];
  secret: string;
}

interface CreateWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newWebhook: NewWebhookState;
  setNewWebhook: (value: NewWebhookState) => void;
  isLoading: boolean;
  onCreateWebhook: () => void;
  onGenerateSecret: () => string;
}

export function CreateWebhookDialog({
  open,
  onOpenChange,
  newWebhook,
  setNewWebhook,
  isLoading,
  onCreateWebhook,
  onGenerateSecret,
}: CreateWebhookDialogProps) {
  const toggleEvent = (event: WebhookType["events"][number]) => {
    setNewWebhook({
      ...newWebhook,
      events: newWebhook.events.includes(event)
        ? newWebhook.events.filter((e) => e !== event)
        : [...newWebhook.events, event],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>Send HTTP POST requests when events occur</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Slack Notification"
              value={newWebhook.name}
              onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Webhook URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://your-service.com/webhook"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Events *</Label>
            <div className="space-y-2">
              {EVENT_TYPES.map((event) => (
                <label
                  key={event.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    newWebhook.events.includes(event.value as any)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newWebhook.events.includes(event.value as any)}
                    onChange={() => toggleEvent(event.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{event.label}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="secret">Secret (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setNewWebhook({
                    ...newWebhook,
                    secret: onGenerateSecret(),
                  })
                }
              >
                Generate
              </Button>
            </div>
            <Input
              id="secret"
              placeholder="Used to sign webhook payloads"
              value={newWebhook.secret}
              onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              If set, payloads will be signed with HMAC-SHA256 in the X-Flier-Signature header
            </p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onCreateWebhook}
              disabled={
                isLoading ||
                !newWebhook.name.trim() ||
                !newWebhook.url.trim() ||
                newWebhook.events.length === 0
              }
              className="flex-1"
            >
              Create Webhook
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
