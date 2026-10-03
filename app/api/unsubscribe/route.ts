import { type NextRequest, NextResponse } from "next/server";

import { databases, config, ID, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTrackingToken } from "@/lib/tracking-token";

/**
 * Public unsubscribe endpoint — requires signed tracking token.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitAsync(request, RATE_LIMITS.public);
  if (rateLimitResponse) {
    return htmlResponse("Rate Limited", "Too many requests. Please try again later.", 429);
  }

  const token = new URL(request.url).searchParams.get("t");
  if (!token) {
    return htmlResponse("Invalid Request", "Missing or invalid unsubscribe link.", 400);
  }

  const payload = verifyTrackingToken(token, "unsubscribe");
  if (!payload) {
    return htmlResponse("Invalid Request", "This unsubscribe link is invalid or has expired.", 400);
  }

  try {
    const decodedEmail = payload.recipientEmail.toLowerCase();
    const decodedUserEmail = payload.userEmail;

    if (!config.databaseId || !config.unsubscribesCollectionId) {
      apiLogger.error("Unsubscribe configuration missing");
      throw new Error("Configuration error");
    }

    apiLogger.info("Processing unsubscribe request", {
      campaignId: payload.campaignId,
    });

    const existing = await databases.listDocuments(
      config.databaseId,
      config.unsubscribesCollectionId,
      [
        Query.equal("user_email", decodedUserEmail),
        Query.equal("email", decodedEmail),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      return htmlResponse(
        "Already Unsubscribed",
        "This address is already unsubscribed from this mailing list.",
      );
    }

    const now = new Date().toISOString();
    try {
      await databases.createDocument(
        config.databaseId,
        config.unsubscribesCollectionId,
        ID.unique(),
        {
          email: decodedEmail,
          user_email: decodedUserEmail,
          reason: "Clicked unsubscribe link",
          unsubscribed_at: now,
          created_at: now,
        },
      );
    } catch (createError: unknown) {
      apiLogger.warn("First unsubscribe attempt failed, trying minimal version", {
        error: createError instanceof Error ? createError.message : String(createError),
      });

      await databases.createDocument(
        config.databaseId,
        config.unsubscribesCollectionId,
        ID.unique(),
        {
          email: decodedEmail,
          user_email: decodedUserEmail,
          reason: "Clicked unsubscribe link",
        },
      );
    }

    apiLogger.info("Unsubscribe processed successfully", {
      campaignId: payload.campaignId,
    });

    return htmlResponse(
      "Successfully Unsubscribed",
      "You have been unsubscribed from this mailing list. You will no longer receive emails from this sender.",
    );
  } catch (error) {
    apiLogger.error("Unsubscribe error", error instanceof Error ? error : undefined);
    return htmlResponse(
      "Error",
      "An error occurred while processing your request. Please try again later.",
      500,
    );
  }
}

function htmlResponse(title: string, message: string, status = 200) {
  return new NextResponse(generateHtmlPage(title, message), {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

function generateHtmlPage(title: string, message: string): string {
  const isSuccess = title.includes("Success") || title.includes("Unsubscribed");
  const isError = title.includes("Error") || title.includes("Invalid") || title.includes("Limited");

  const primaryColor = isSuccess ? "#10b981" : isError ? "#ef4444" : "#6366f1";
  const bgColor = isSuccess ? "#f0fdf4" : isError ? "#fef2f2" : "#f5f3ff";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Flier</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;margin:0}
    .card{background:#fff;border-radius:24px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,.1);border:1px solid #f3f4f6;position:relative;overflow:hidden}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:${primaryColor}}
    h1{font-size:26px;font-weight:700;margin:0 0 16px;color:#111827}
    p{font-size:16px;color:#4b5563;line-height:1.6;margin:0 0 36px}
    .icon{width:72px;height:72px;background:${bgColor};color:${primaryColor};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:32px}
    a.btn{display:inline-block;background:#111827;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? "✓" : isError ? "✕" : "i"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="/">Back to Home</a>
  </div>
</body>
</html>`;
}
