import { serverStorageService } from "../appwrite-server";
import { emailLogger } from "../logger";

export interface AttachmentData {
  name: string;
  type: string;
  data: string;
  appwriteFileId?: string;
  appwriteUrl?: string;
}

interface CacheEntry {
  value: string;
  byteSize: number;
  lastAccessedAt: number;
  createdAt: number;
}

const attachmentCache = new Map<string, CacheEntry>();
let totalCachedBytes = 0;
const MAX_CACHE_ENTRIES = 25;
const CACHE_TTL_MS = 30 * 60 * 1000;
// Guardrails for base64 attachment caching to avoid runaway memory use.
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_CACHE_BYTES = 20 * 1024 * 1024;

function estimateBase64DecodedBytes(value: string): number {
  const paddingMatch = value.match(/=+$/);
  const paddingLength = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.floor((value.length * 3) / 4) - paddingLength);
}

function deleteCacheEntry(fileId: string): void {
  const entry = attachmentCache.get(fileId);
  if (!entry) {
    return;
  }
  totalCachedBytes = Math.max(0, totalCachedBytes - entry.byteSize);
  attachmentCache.delete(fileId);
}

function pruneExpiredEntries(now: number): void {
  for (const [key, entry] of attachmentCache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      deleteCacheEntry(key);
    }
  }
}

function evictUntilFits(requiredBytes: number): void {
  while (
    attachmentCache.size >= MAX_CACHE_ENTRIES ||
    totalCachedBytes + requiredBytes > MAX_TOTAL_CACHE_BYTES
  ) {
    const oldestKey = attachmentCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    deleteCacheEntry(oldestKey);
  }
}

function getCacheEntry(fileId: string): string | null {
  const entry = attachmentCache.get(fileId);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.createdAt > CACHE_TTL_MS) {
    deleteCacheEntry(fileId);
    return null;
  }

  attachmentCache.delete(fileId);
  attachmentCache.set(fileId, {
    ...entry,
    lastAccessedAt: now,
  });

  return entry.value;
}

function setCacheEntry(fileId: string, value: string): void {
  const now = Date.now();
  const byteSize = estimateBase64DecodedBytes(value);

  if (byteSize > MAX_ATTACHMENT_BYTES) {
    emailLogger.debug("Skipping attachment cache due to entry size limit", {
      fileId,
      byteSize,
      maxBytes: MAX_ATTACHMENT_BYTES,
    });
    return;
  }

  pruneExpiredEntries(now);

  if (attachmentCache.has(fileId)) {
    deleteCacheEntry(fileId);
  }

  evictUntilFits(byteSize);

  if (totalCachedBytes + byteSize > MAX_TOTAL_CACHE_BYTES) {
    emailLogger.debug("Skipping attachment cache due to total cache budget", {
      fileId,
      byteSize,
      totalCachedBytes,
      maxTotalBytes: MAX_TOTAL_CACHE_BYTES,
    });
    return;
  }

  attachmentCache.set(fileId, {
    value,
    byteSize,
    createdAt: now,
    lastAccessedAt: now,
  });
  totalCachedBytes += byteSize;
}

export async function preResolveAttachments(
  attachments: AttachmentData[],
): Promise<AttachmentData[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const resolvedAttachments: AttachmentData[] = [];

  for (const attachment of attachments) {
    if (attachment.data && attachment.data !== "appwrite" && !attachment.data.startsWith("http")) {
      resolvedAttachments.push(attachment);
      continue;
    }

    let fileId: string | null = null;

    if (attachment.appwriteFileId) {
      fileId = attachment.appwriteFileId;
    } else if (attachment.appwriteUrl) {
      const match = attachment.appwriteUrl.match(/files\/([^/]+)\//);
      if (match && match[1]) {
        fileId = match[1];
      }
    }

    if (!fileId) {
      emailLogger.error(`No valid source for attachment: ${attachment.name}`);
      throw new Error(
        `No valid attachment source for ${attachment.name}. Please re-upload the file.`,
      );
    }

    const cachedAttachment = getCacheEntry(fileId);
    if (cachedAttachment) {
      emailLogger.debug(`Using cached attachment: ${attachment.name}`);
      resolvedAttachments.push({
        ...attachment,
        data: cachedAttachment,
      });
      continue;
    }

    emailLogger.debug(`Downloading attachment from Appwrite: ${attachment.name}`, { fileId });
    try {
      const buffer = await serverStorageService.getFileBuffer(fileId);
      const base64Data = buffer.toString("base64");

      setCacheEntry(fileId, base64Data);

      resolvedAttachments.push({
        ...attachment,
        data: base64Data,
      });
      emailLogger.debug(`Cached attachment: ${attachment.name}`);
    } catch (error) {
      emailLogger.error(
        `Failed to download attachment ${attachment.name}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
      throw new Error(
        `Failed to download attachment ${attachment.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return resolvedAttachments;
}

export function clearAttachmentCache(): void {
  attachmentCache.clear();
  totalCachedBytes = 0;
}
