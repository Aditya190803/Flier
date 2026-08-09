import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { respondWithOwnedDocument } from "@/lib/appwrite/single-document";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { UnsubscribeDocument } from "@/types/appwrite";

/** Shared by the list and single-document paths so both return one shape. */
function mapUnsubscribe(doc: UnsubscribeDocument) {
  return {
    $id: doc.$id,
    email: doc.email || "",
    user_email: doc.user_email || "",
    reason: doc.reason,
    unsubscribed_at: doc.unsubscribed_at || doc.$createdAt,
  };
}

// GET /api/appwrite/unsubscribes[?id=] - List unsubscribes, or fetch one by id
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const single = await respondWithOwnedDocument(
      request,
      config.unsubscribesCollectionId,
      auth.email,
      (doc) => mapUnsubscribe(doc as UnsubscribeDocument),
    );
    if (single) {
      return single;
    }

    const { searchParams } = new URL(request.url);
    const checkEmail = searchParams.get("check");

    // If checking a specific email
    if (checkEmail) {
      const response = await databases.listDocuments(
        config.databaseId,
        config.unsubscribesCollectionId,
        [
          Query.equal("user_email", auth.email),
          Query.equal("email", checkEmail.toLowerCase()),
          Query.limit(1),
        ],
      );
      return NextResponse.json({
        isUnsubscribed: response.documents.length > 0,
      });
    }

    // List all unsubscribes
    const response = await databases.listDocuments(
      config.databaseId,
      config.unsubscribesCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.orderDesc("$createdAt"),
        Query.limit(1000),
      ],
    );

    const documents = (
      response.documents as unknown as UnsubscribeDocument[]
    ).map(mapUnsubscribe);

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching unsubscribes",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch unsubscribes",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/unsubscribes - Add an unsubscribe
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { email, reason } = body;

    const result = await databases.createDocument(
      config.databaseId,
      config.unsubscribesCollectionId,
      ID.unique(),
      {
        email: email.toLowerCase(),
        reason,
        user_email: auth.email,
        unsubscribed_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating unsubscribe",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create unsubscribe",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/unsubscribes/filter - Filter out unsubscribed emails
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { emails } = body;

    if (!Array.isArray(emails)) {
      return NextResponse.json(
        { error: "Emails array required" },
        { status: 400 },
      );
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.unsubscribesCollectionId,
      [Query.equal("user_email", auth.email), Query.limit(10000)],
    );

    const unsubscribedSet = new Set(
      (response.documents as unknown as UnsubscribeDocument[]).map((u) =>
        u.email.toLowerCase(),
      ),
    );
    const filteredEmails = emails.filter(
      (email: string) => !unsubscribedSet.has(email.toLowerCase()),
    );

    return NextResponse.json({ emails: filteredEmails });
  } catch (error: unknown) {
    apiLogger.error(
      "Error filtering unsubscribes",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to filter unsubscribes",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/unsubscribes - Delete (resubscribe)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const unsubscribeId = searchParams.get("id");

    if (!unsubscribeId) {
      return NextResponse.json(
        { error: "Unsubscribe ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.unsubscribesCollectionId,
      unsubscribeId,
    )) as UnsubscribeDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.unsubscribesCollectionId,
      unsubscribeId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting unsubscribe",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete unsubscribe",
      },
      { status: 500 },
    );
  }
}
