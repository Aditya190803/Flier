import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import {
  extractAttachmentFileName,
  getAttachmentFileType,
  personalizeAttachmentFileName,
} from "@/lib/attachments/metadata";
import { getAttachmentSource, getDirectDownloadUrl } from "@/lib/attachments/url";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { url, recipientName } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const directUrl = getDirectDownloadUrl(url);
    const source = getAttachmentSource(url);

    logger.debug(`Fetching attachment metadata`, {
      url: url.substring(0, 50),
      source,
    });

    // Use HEAD request first to get metadata without downloading the file
    let response: Response;
    try {
      response = await fetch(directUrl, {
        method: "HEAD",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Flier/1.0)",
        },
      });

      // If HEAD fails, try GET with range header
      if (!response.ok) {
        response = await fetch(directUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Flier/1.0)",
            Range: "bytes=0-0", // Only fetch first byte to get headers
          },
        });
      }
    } catch (fetchError) {
      logger.error(
        "Failed to fetch attachment metadata",
        fetchError instanceof Error ? fetchError : undefined,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to access the file. Please check the URL is accessible.",
          metadata: {
            fileName: recipientName ? `${recipientName}_attachment.pdf` : "attachment.pdf",
            fileSize: null,
            fileType: "other" as const,
            source,
            accessible: false,
          },
        },
        { status: 200 },
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");
    const contentLength = response.headers.get("content-length");

    const fileName = extractAttachmentFileName(url, contentDisposition, undefined, contentType);
    const fileType = getAttachmentFileType(url, contentType);
    const fileSize = contentLength ? parseInt(contentLength, 10) : null;
    const personalizedFileName = personalizeAttachmentFileName(fileName, recipientName);

    logger.debug(`Attachment metadata fetched`, {
      fileName: personalizedFileName,
      fileSize,
      fileType,
      source,
    });

    return NextResponse.json({
      success: true,
      metadata: {
        fileName: personalizedFileName,
        fileSize,
        fileType,
        contentType,
        source,
        accessible: response.ok,
        originalUrl: url,
      },
    });
  } catch (error) {
    logger.error("Error in attachment-metadata API", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
