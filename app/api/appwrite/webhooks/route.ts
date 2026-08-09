import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { respondWithOwnedDocument } from "@/lib/appwrite/single-document";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { WebhookDocument } from "@/types/appwrite";

// Extended type for additional fields
interface ExtendedWebhookDocument extends WebhookDocument {
  last_triggered_at?: string;
}

/** Shared by the list and single-document paths so both return one shape. */
function mapWebhook(doc: ExtendedWebhookDocument) {
  return {
    $id: doc.$id,
    name: doc.name || "",
    url: doc.url || "",
    events:
      typeof doc.events === "string"
        ? JSON.parse(doc.events as unknown as string)
        : doc.events || [],
    is_active: doc.is_active ?? true,
    secret: doc.secret,
    user_email: doc.user_email || "",
    created_at: doc.created_at || doc.$createdAt,
    updated_at: doc.updated_at || doc.$updatedAt,
    last_triggered_at: doc.last_triggered_at,
  };
}

// GET /api/appwrite/webhooks[?id=] - List webhooks, or fetch one by id
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const single = await respondWithOwnedDocument(
      request,
      config.webhooksCollectionId,
      auth.email,
      (doc) => mapWebhook(doc as ExtendedWebhookDocument),
    );
    if (single) {
      return single;
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.webhooksCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.orderDesc("$updatedAt"),
        Query.limit(50),
      ],
    );

    const documents = (
      response.documents as unknown as ExtendedWebhookDocument[]
    ).map(mapWebhook);

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching webhooks",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch webhooks",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { name, url, events, is_active, secret } = body;
    const now = new Date().toISOString();

    const result = await databases.createDocument(
      config.databaseId,
      config.webhooksCollectionId,
      ID.unique(),
      {
        name,
        url,
        events: JSON.stringify(events || []),
        is_active: is_active ?? true,
        secret,
        user_email: auth.email,
        created_at: now,
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating webhook",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create webhook",
      },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/webhooks - Update a webhook
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { id, name, url, events, is_active, secret, updateLastTriggered } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.webhooksCollectionId,
      id,
    )) as WebhookDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, string | boolean> = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (url !== undefined) {
      updateData.url = url;
    }
    if (events !== undefined) {
      updateData.events = JSON.stringify(events);
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }
    if (secret !== undefined) {
      updateData.secret = secret;
    }
    if (updateLastTriggered) {
      updateData.last_triggered_at = new Date().toISOString();
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.webhooksCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error updating webhook",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update webhook",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/webhooks - Delete a webhook
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.webhooksCollectionId,
      webhookId,
    )) as WebhookDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.webhooksCollectionId,
      webhookId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting webhook",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete webhook",
      },
      { status: 500 },
    );
  }
}
