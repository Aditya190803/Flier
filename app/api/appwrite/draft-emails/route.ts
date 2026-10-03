import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { DraftDocument } from "@/types/appwrite";

// Extended type for draft email fields
interface DraftEmailDocument extends DraftDocument {
  saved_at?: string;
  status?: string;
  csv_data?: string | unknown[];
  sent_at?: string;
  error?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

function parseJsonArray(value: unknown): unknown[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

/** Appwrite attribute budget: store both lists in one `cc` string field. */
function parseCcBcc(value: unknown): { cc: string[]; bcc: string[] } {
  if (!value) {
    return { cc: [], bcc: [] };
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return { cc: parseStringArray(parsed), bcc: [] };
      }
      if (parsed && typeof parsed === "object") {
        return {
          cc: parseStringArray((parsed as { cc?: unknown }).cc),
          bcc: parseStringArray((parsed as { bcc?: unknown }).bcc),
        };
      }
    } catch {
      return { cc: [], bcc: [] };
    }
  }
  if (Array.isArray(value)) {
    return { cc: parseStringArray(value), bcc: [] };
  }
  return { cc: [], bcc: [] };
}

function serializeCcBcc(cc?: string[], bcc?: string[]): string | null {
  const ccList = parseStringArray(cc);
  const bccList = parseStringArray(bcc);
  if (!ccList.length && !bccList.length) {
    return null;
  }
  return JSON.stringify({ cc: ccList, bcc: bccList });
}

function mapDraftDocument(doc: DraftEmailDocument) {
  const { cc, bcc } = parseCcBcc(doc.cc);
  return {
    $id: doc.$id,
    subject: doc.subject || "",
    content: doc.content || "",
    recipients: parseJsonArray(doc.recipients),
    saved_at: doc.saved_at,
    status: doc.status || "pending",
    user_email: doc.user_email || "",
    attachments: parseJsonArray(doc.attachments),
    csv_data: parseJsonArray(doc.csv_data),
    cc,
    bcc,
    created_at: doc.created_at || doc.$createdAt,
    sent_at: doc.sent_at,
    error: doc.error,
  };
}

// GET /api/appwrite/draft-emails - List draft emails for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Fetch single draft
      const doc = (await databases.getDocument(
        config.databaseId,
        config.draftEmailsCollectionId,
        id,
      )) as DraftEmailDocument;

      if (doc.user_email !== auth.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      return NextResponse.json(mapDraftDocument(doc));
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.draftEmailsCollectionId,
      [Query.equal("user_email", auth.email), Query.orderDesc("saved_at"), Query.limit(100)],
    );

    const documents = (response.documents as unknown as DraftEmailDocument[]).map((doc) =>
      mapDraftDocument(doc),
    );

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch draft emails";
    apiLogger.error(
      "Error fetching draft emails",
      error instanceof Error ? { message: error.message, stack: error.stack } : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/appwrite/draft-emails - Create a draft email
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { subject, content, recipients, saved_at, attachments, csv_data, cc, bcc } = body;

    const result = await databases.createDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      ID.unique(),
      {
        subject,
        content,
        recipients: JSON.stringify(recipients || []),
        saved_at,
        status: "pending",
        user_email: auth.email,
        attachments: attachments ? JSON.stringify(attachments) : null,
        csv_data: csv_data ? JSON.stringify(csv_data) : null,
        // attribute budget: both lists live in `cc` as JSON
        cc: serializeCcBcc(cc, bcc),
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create draft email";
    apiLogger.error(
      "Error creating draft email",
      error instanceof Error ? { message: error.message, stack: error.stack } : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT /api/appwrite/draft-emails - Update draft email
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const {
      id,
      status,
      error: errorMsg,
      subject,
      content,
      recipients,
      saved_at,
      attachments,
      csv_data,
      cc,
      bcc,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      id,
    )) as DraftEmailDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, string | null> = {};

    // Status updates
    if (status) {
      updateData.status = status;
      if (status === "sent") {
        updateData.sent_at = new Date().toISOString();
      }
    }
    if (errorMsg) {
      updateData.error = errorMsg;
    }

    // Full content updates (for editing draft emails)
    if (subject !== undefined) {
      updateData.subject = subject;
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (recipients !== undefined) {
      updateData.recipients = JSON.stringify(recipients);
    }
    if (saved_at !== undefined) {
      updateData.saved_at = saved_at;
    }
    if (attachments !== undefined) {
      updateData.attachments = attachments ? JSON.stringify(attachments) : null;
    }
    if (csv_data !== undefined) {
      updateData.csv_data = csv_data ? JSON.stringify(csv_data) : null;
    }
    if (cc !== undefined || bcc !== undefined) {
      updateData.cc = serializeCcBcc(cc, bcc);
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update draft email";
    apiLogger.error(
      "Error updating draft email",
      error instanceof Error ? { message: error.message, stack: error.stack } : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/appwrite/draft-emails - Delete a draft email
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get("id");

    if (!emailId) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      emailId,
    )) as DraftEmailDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(config.databaseId, config.draftEmailsCollectionId, emailId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete draft email";
    apiLogger.error(
      "Error deleting draft email",
      error instanceof Error ? { message: error.message, stack: error.stack } : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
