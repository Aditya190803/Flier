import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { formatForEmail } from "@/lib/email-formatting";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { htmlContent } = await request.json();

    if (!htmlContent || typeof htmlContent !== "string") {
      return NextResponse.json({ error: "HTML content is required" }, { status: 400 });
    }

    if (htmlContent.length > 1_000_000) {
      return NextResponse.json({ error: "HTML content too large" }, { status: 413 });
    }

    const formattedHTML = formatForEmail(htmlContent);

    return NextResponse.json({
      success: true,
      formattedHTML,
      originalLength: htmlContent.length,
      formattedLength: formattedHTML.length,
    });
  } catch (error) {
    apiLogger.error("Email formatting error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to format email" }, { status: 500 });
  }
}
