import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEBHOOK_EVENT_TYPES as EVENT_TYPES } from "@/components/webhooks/event-types";
import { type Webhook as WebhookType } from "@/lib/appwrite";

interface EditWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWebhook: WebhookType | null;
  setEditingWebhook: (value: WebhookType | null) => void;
  isLoading: boolean;
  onUpdateWebhook: () => void;
  onCancel: () => void;
}

export function EditWebhookDialog({
  open,
  onOpenChange,
  editingWebhook,
  setEditingWebhook,
  isLoading,
  onUpdateWebhook,
  onCancel,
}: EditWebhookDialogProps) {
  const toggleEditEvent = (event: WebhookType["events"][number]) => {
    if (!editingWebhook) {
      return;
    }
    setEditingWebhook({
      ...editingWebhook,
      events: editingWebhook.events.includes(event)
        ? editingWebhook.events.filter((e) => e !== event)
        : [...editingWebhook.events, event],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
          <DialogDescription>Update your webhook configuration</DialogDescription>
        </DialogHeader>
        {editingWebhook && (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editingWebhook.name}
                onChange={(e) =>
                  setEditingWebhook({
                    ...editingWebhook,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL *</Label>
              <Input
                type="url"
                value={editingWebhook.url}
                onChange={(e) =>
                  setEditingWebhook({
                    ...editingWebhook,
                    url: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Events *</Label>
              <div className="space-y-2">
                {EVENT_TYPES.map((event) => (
                  <label
                    key={event.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      editingWebhook.events.includes(event.value as any)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editingWebhook.events.includes(event.value as any)}
                      onChange={() => toggleEditEvent(event.value as any)}
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
              <Label>Secret</Label>
              <Input
                value={editingWebhook.secret || ""}
                onChange={(e) =>
                  setEditingWebhook({
                    ...editingWebhook,
                    secret: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={onUpdateWebhook}
                disabled={
                  isLoading ||
                  !editingWebhook.name.trim() ||
                  !editingWebhook.url.trim() ||
                  editingWebhook.events.length === 0
                }
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
