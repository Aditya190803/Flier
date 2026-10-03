"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { webhooksService, type Webhook as WebhookType } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export function useWebhooks(userEmail: string | undefined) {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    if (!userEmail) {
      return;
    }
    try {
      const response = await webhooksService.listByUser(userEmail);
      setWebhooks(response.documents);
    } catch (error) {
      componentLogger.error("Error fetching webhooks", error instanceof Error ? error : undefined);
      toast.error("Failed to load webhooks");
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }
    fetchWebhooks();
  }, [userEmail, fetchWebhooks]);

  const createWebhook = async (input: {
    name: string;
    url: string;
    events: WebhookType["events"];
    secret?: string;
  }) => {
    if (!userEmail) {
      return false;
    }
    setIsLoading(true);
    try {
      await webhooksService.create({
        name: input.name.trim(),
        url: input.url.trim(),
        events: input.events,
        is_active: true,
        secret: input.secret?.trim() || undefined,
        user_email: userEmail,
      });
      toast.success("Webhook created!");
      await fetchWebhooks();
      return true;
    } catch (error) {
      componentLogger.error("Error creating webhook", error instanceof Error ? error : undefined);
      toast.error("Failed to create webhook");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateWebhook = async (webhook: WebhookType) => {
    if (!webhook.$id) {
      return false;
    }
    setIsLoading(true);
    try {
      await webhooksService.update(webhook.$id, {
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        is_active: webhook.is_active,
        secret: webhook.secret,
      });
      toast.success("Webhook updated!");
      await fetchWebhooks();
      return true;
    } catch (error) {
      componentLogger.error("Error updating webhook", error instanceof Error ? error : undefined);
      toast.error("Failed to update webhook");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWebhookActive = async (webhookId: string, isActive: boolean) => {
    try {
      await webhooksService.update(webhookId, { is_active: !isActive });
      toast.success(isActive ? "Webhook disabled" : "Webhook enabled");
      await fetchWebhooks();
    } catch (error) {
      componentLogger.error("Error toggling webhook", error instanceof Error ? error : undefined);
      toast.error("Failed to update webhook");
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      await webhooksService.delete(webhookId);
      toast.success("Webhook deleted");
      await fetchWebhooks();
    } catch (error) {
      componentLogger.error("Error deleting webhook", error instanceof Error ? error : undefined);
      toast.error("Failed to delete webhook");
    }
  };

  return {
    webhooks,
    isLoading,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    toggleWebhookActive,
    deleteWebhook,
  };
}
