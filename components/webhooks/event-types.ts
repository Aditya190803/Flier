import { CheckCircle, ExternalLink, PowerOff, Send, type LucideIcon } from "lucide-react";

import type { Webhook as WebhookType } from "@/lib/appwrite";

export type WebhookEventValue = WebhookType["events"][number];

export const WEBHOOK_EVENT_TYPES: {
  value: WebhookEventValue;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "campaign.sent",
    label: "Campaign Sent",
    description: "Triggered when all emails in a campaign are successfully sent",
    icon: Send,
  },
  {
    value: "campaign.failed",
    label: "Campaign Failed",
    description: "Triggered when a campaign fails to send completely",
    icon: PowerOff,
  },
  {
    value: "email.opened",
    label: "Email Opened",
    description: "Triggered when a recipient opens your email (via tracking pixel)",
    icon: CheckCircle,
  },
  {
    value: "email.clicked",
    label: "Link Clicked",
    description: "Triggered when a recipient clicks any tracked link in your email",
    icon: ExternalLink,
  },
  {
    value: "email.bounced",
    label: "Email Bounced",
    description: "Triggered when an email bounces back (hard or soft bounce)",
    icon: PowerOff,
  },
];

export function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
