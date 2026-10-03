import { STORAGE_KEY_COMPOSE_DRAFT } from "@/lib/constants";

import type { ComposeAttachment, EmailDraft } from "./compose-types";

export const DRAFT_STORAGE_KEY = STORAGE_KEY_COMPOSE_DRAFT;
export const AUTO_SAVE_DELAY_MS = 2000;

export type DraftSyncStatus = "idle" | "saving" | "saved" | "error";

export function contentHash(input: {
  subject: string;
  content: string;
  recipients: string[];
  attachments: { name: string }[];
}): string {
  return JSON.stringify({
    subject: input.subject,
    content: input.content,
    recipients: input.recipients,
    attachments: input.attachments.map((a) => a.name),
  });
}

export function loadLocalDraft(): EmailDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as EmailDraft;
  } catch {
    return null;
  }
}

export function saveLocalDraft(draft: EmailDraft): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearLocalDraft(): void {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function buildLocalDraft(input: {
  subject: string;
  content: string;
  recipients: string[];
  attachments: ComposeAttachment[];
}): EmailDraft {
  return {
    subject: input.subject,
    content: input.content,
    recipients: input.recipients,
    attachments: input.attachments,
    savedAt: new Date().toISOString(),
  };
}

export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minutes ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hours ago`;
  }
  return `${Math.floor(seconds / 86400)} days ago`;
}
