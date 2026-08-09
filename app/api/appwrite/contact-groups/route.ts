import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { respondWithOwnedDocument } from "@/lib/appwrite/single-document";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { ContactGroupDocument } from "@/types/appwrite";

// Extended type for fields not in base ContactGroupDocument
interface ExtendedContactGroupDocument extends ContactGroupDocument {
  color?: string;
  contact_ids?: string | string[];
}

/** Shared by the list and single-document paths so both return one shape. */
function mapContactGroup(doc: ExtendedContactGroupDocument) {
  return {
    $id: doc.$id,
    name: doc.name || "",
    description: doc.description,
    color: doc.color,
    contact_ids:
      typeof doc.contact_ids === "string"
        ? JSON.parse(doc.contact_ids)
        : doc.contact_ids || [],
    user_email: doc.user_email || "",
    created_at: doc.created_at || doc.$createdAt,
    updated_at: doc.updated_at || doc.$updatedAt,
  };
}

// GET /api/appwrite/contact-groups[?id=] - List groups, or fetch one by id
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const single = await respondWithOwnedDocument(
      request,
      config.contactGroupsCollectionId,
      auth.email,
      (doc) => mapContactGroup(doc as ExtendedContactGroupDocument),
    );
    if (single) {
      return single;
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.contactGroupsCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.orderDesc("$updatedAt"),
        Query.limit(100),
      ],
    );

    const documents = (
      response.documents as unknown as ExtendedContactGroupDocument[]
    ).map(mapContactGroup);

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching contact groups",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch contact groups",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/contact-groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { name, description, color, contact_ids } = body;
    const now = new Date().toISOString();

    const result = await databases.createDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      ID.unique(),
      {
        name,
        description,
        color,
        contact_ids: JSON.stringify(contact_ids || []),
        user_email: auth.email,
        created_at: now,
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating contact group",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create contact group",
      },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/contact-groups - Update a group
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { id, name, description, color, contact_ids } = body;

    if (!id) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      id,
    )) as ContactGroupDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, string | boolean | number | null> = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (color !== undefined) {
      updateData.color = color;
    }
    if (contact_ids !== undefined) {
      updateData.contact_ids = JSON.stringify(contact_ids);
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error updating contact group",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update contact group",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/contact-groups - Delete a group
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("id");

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      groupId,
    )) as ContactGroupDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      groupId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting contact group",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete contact group",
      },
      { status: 500 },
    );
  }
}
