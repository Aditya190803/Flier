import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { reviewCampaign } from "@/lib/email/preflight";
import { apiLogger } from "@/lib/logger";
import { findSuppressedRecipients } from "@/lib/services/unsubscribe-service";

const schema = z.object({
  subject: z.string().max(998),
  content: z.string().max(1000000),
  recipients: z.array(z.string().max(254)).max(1000),
  recipientFields: z.record(z.string(), z.record(z.string(), z.string().max(100000))),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        data: z.string(),
        fileSize: z.number().nonnegative().optional(),
        isProcessing: z.boolean().optional(),
        appwriteFileId: z.string().optional(),
      }),
    )
    .max(25),
  personalizedAttachmentColumn: z.string().optional(),
  isMarketing: z.boolean(),
});

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid campaign review input" }, { status: 400 });
    }
    const input = parsed.data;
    const suppressed = input.isMarketing
      ? await findSuppressedRecipients(auth.email, input.recipients)
      : [];
    return NextResponse.json(reviewCampaign(input, suppressed));
  } catch (error) {
    apiLogger.error("Campaign review failed", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Unable to verify eligible recipients. Try again before sending." },
      { status: 503 },
    );
  }
}
