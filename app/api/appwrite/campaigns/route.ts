import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { CampaignDocument } from "@/types/appwrite";

/** Appwrite stores arrays as JSON strings; normalize both shapes to an array. */
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

function mapCampaignDocument(doc: CampaignDocument) {
  return {
    $id: doc.$id,
    subject: doc.subject || "",
    content: doc.content || "",
    recipients: parseJsonArray(doc.recipients),
    sent: doc.sent || 0,
    failed: doc.failed || 0,
    status: doc.status || "completed",
    user_email: doc.user_email || "",
    created_at: doc.created_at || doc.$createdAt,
    campaign_type: doc.campaign_type,
    attachments: parseJsonArray(doc.attachments),
    send_results: parseJsonArray(doc.send_results),
    open_rate: doc.open_rate ?? 0,
    click_rate: doc.click_rate ?? 0,
  };
}

// GET /api/appwrite/campaigns[?id=] - List campaigns, or fetch one by id
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const doc = (await databases.getDocument(
        config.databaseId,
        config.campaignsCollectionId,
        id,
      )) as unknown as CampaignDocument;

      if (doc.user_email !== auth.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      return NextResponse.json(mapCampaignDocument(doc));
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.campaignsCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.orderDesc("created_at"),
        Query.limit(1000),
      ],
    );

    const documents = (response.documents as unknown as CampaignDocument[]).map(
      mapCampaignDocument,
    );

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching campaigns",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch campaigns",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const {
      id,
      subject,
      content,
      recipients,
      sent,
      failed,
      status,
      campaign_type,
      attachments,
      send_results,
    } = body;

    const result = await databases.createDocument(
      config.databaseId,
      config.campaignsCollectionId,
      id || ID.unique(),
      {
        subject,
        content,
        recipients: JSON.stringify(recipients || []),
        sent: sent || 0,
        failed: failed || 0,
        status: status || "completed",
        user_email: auth.email,
        campaign_type,
        attachments: attachments ? JSON.stringify(attachments) : null,
        send_results: send_results ? JSON.stringify(send_results) : null,
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating campaign",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 },
    );
  }
}
