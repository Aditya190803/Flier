import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  Edit,
  Globe,
  Key,
  MoreVertical,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Webhook,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/page-shell";
import { WEBHOOK_EVENT_TYPES as EVENT_TYPES } from "@/components/webhooks/event-types";
import { type Webhook as WebhookType } from "@/lib/appwrite";

interface WebhookListProps {
  webhooks: WebhookType[];
  onEdit: (webhook: WebhookType) => void;
  onToggleActive: (webhookId: string, isActive: boolean) => void;
  onDelete: (webhookId: string) => void;
  onAddWebhook: () => void;
}

export function WebhookList({
  webhooks,
  onEdit,
  onToggleActive,
  onDelete,
  onAddWebhook,
}: WebhookListProps) {
  if (webhooks.length === 0) {
    return (
      <EmptyState
        icon={<Webhook className="h-12 w-12 text-muted-foreground/50" />}
        title="No webhooks yet"
        description="Create webhooks to send campaign events to external services"
        action={
          <Button onClick={onAddWebhook}>
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {webhooks.map((webhook) => (
        <Card key={webhook.$id} className="group">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{webhook.name}</h3>
                  {webhook.is_active ? (
                    <Badge
                      variant="success"
                      className="flex items-center gap-1"
                    >
                      <Power className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <PowerOff className="h-3 w-3" />
                      Disabled
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Globe className="h-4 w-4" />
                  <span className="truncate">{webhook.url}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="outline" className="text-xs">
                      {EVENT_TYPES.find((e) => e.value === event)?.label ||
                        event}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {webhook.secret && (
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      Signed
                    </span>
                  )}
                  {webhook.last_triggered_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last triggered{" "}
                      {formatDistanceToNow(
                        new Date(webhook.last_triggered_at),
                        {
                          addSuffix: true,
                        },
                      )}
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(webhook)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onToggleActive(webhook.$id!, webhook.is_active)
                    }
                  >
                    {webhook.is_active ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-2" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-2" />
                        Enable
                      </>
                    )}
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{webhook.name}"? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(webhook.$id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
