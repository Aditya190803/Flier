import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { storage, config } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// GET /api/appwrite/attachments/[fileId] - Download/view an attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    // Get file metadata first
    const fileInfo = await storage.getFile(config.attachmentsBucketId, fileId);

    // Get file content
    const fileBuffer = await storage.getFileDownload(config.attachmentsBucketId, fileId);

    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(fileBuffer);

    // Determine content type
    const contentType = fileInfo.mimeType || "application/octet-stream";

    // Check if it should be viewed inline or downloaded
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";

    const disposition = download
      ? `attachment; filename="${fileInfo.name}"`
      : `inline; filename="${fileInfo.name}"`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const appwriteError = error as {
      code?: number;
      type?: string;
      message?: string;
    };
    apiLogger.error("Error fetching attachment", error instanceof Error ? error : undefined);

    if (appwriteError.code === 404 || appwriteError.type === "storage_file_not_found") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to fetch attachment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
