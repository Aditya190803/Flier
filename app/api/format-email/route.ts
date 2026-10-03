import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { formatForEmail, convertEmojisToUnicode } from "@/lib/email-formatting";
import { apiLogger } from "@/lib/logger";

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

    const contentWithTextEmojis = convertEmojisToUnicode(htmlContent);
    const formattedHTML = formatForEmail(htmlContent);

    return NextResponse.json({
      success: true,
      original: htmlContent,
      emojiConverted: contentWithTextEmojis,
      formatted: formattedHTML,
      analysis: {
        originalLength: htmlContent.length,
        emojiConvertedLength: contentWithTextEmojis.length,
        formattedLength: formattedHTML.length,
        hasEmojiImages: htmlContent.includes("<img") && htmlContent.includes("emoji"),
        emojiImagesRemoved:
          !contentWithTextEmojis.includes("<img") || !contentWithTextEmojis.includes("emoji"),
      },
    });
  } catch (error) {
    apiLogger.error("Email formatting error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to format email" }, { status: 500 });
  }
}
