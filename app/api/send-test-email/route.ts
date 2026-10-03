import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { formatEmailSendErrorForUser } from "@/lib/gmail-user-message";
import { apiLogger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { EmailService } from "@/lib/services/email-service";
import { sendSingleEmailSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const limited = await rateLimitAsync(request, RATE_LIMITS.sendEmail);
  if (limited) {
    return limited;
  }
  const auth = await requireSession(request, { accessToken: true });
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const body = await request.json();
    const parsed = sendSingleEmailSchema.safeParse({ ...body, to: auth.email, cc: [], bcc: [] });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid test email" }, { status: 400 });
    }
    const data = parsed.data;
    const service = new EmailService(auth.accessToken, auth.email);
    const result = await service.sendSingle(
      {
        email: auth.email,
        customFields: data.originalRowData,
        personalizedAttachment: data.personalizedAttachment,
      },
      { subject: data.subject, body: data.message },
      data.attachments,
      undefined,
      true,
    );
    if (result.status !== "success") {
      return NextResponse.json(
        { error: formatEmailSendErrorForUser(result.error || "Test send failed") },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: true, recipient: auth.email });
  } catch (error) {
    apiLogger.error("Test email failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Unable to send test email" }, { status: 500 });
  }
}
