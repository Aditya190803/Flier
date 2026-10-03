import { extractAttachmentFileName } from "./attachments/metadata";
import { detectAttachmentColumn, getDirectDownloadUrl, isAttachmentUrl } from "./attachments/url";
import { logger } from "./logger";

export interface FetchedAttachment {
  fileName: string;
  buffer: Buffer;
  base64: string;
  mimeType: string;
  originalUrl: string;
}

/**
 * Fetch a file from a URL (Google Drive, OneDrive, or direct link)
 * Supports any file type
 */
async function fetchWithRetry(
  directUrl: string,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(directUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Flier/1.0)",
        },
      });

      if (response.ok) {
        return response;
      }

      // For non-ok responses, throw to trigger retry
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        logger.debug(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to fetch file after retries");
}

export async function fetchFileFromUrl(
  url: string,
  recipientName?: string,
  customFileName?: string,
): Promise<FetchedAttachment> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL provided");
  }

  const directUrl = getDirectDownloadUrl(url);

  logger.debug(`Fetching file`, { url, directUrl });

  const response = await fetchWithRetry(directUrl);

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const contentDisposition = response.headers.get("content-disposition");

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  // Determine filename
  const fileName =
    customFileName ||
    extractAttachmentFileName(url, contentDisposition, recipientName, contentType);

  logger.debug(`Fetched file`, {
    fileName,
    sizeKB: (buffer.length / 1024).toFixed(1),
    contentType,
  });

  return {
    fileName,
    buffer,
    base64,
    mimeType: contentType,
    originalUrl: url,
  };
}

/**
 * Check if a URL is likely an attachment link
 */
/**
 * Validate that a URL is accessible (optional pre-check)
 */
export async function validateAttachmentUrl(
  url: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const directUrl = getDirectDownloadUrl(url);

    const response = await fetch(directUrl, {
      method: "HEAD",
      redirect: "follow",
    });

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export aliases for backward compatibility
export const fetchPdfFromUrl = fetchFileFromUrl;
export const isPdfUrl = isAttachmentUrl;
export const detectPdfColumn = detectAttachmentColumn;
export const validatePdfUrl = validateAttachmentUrl;
