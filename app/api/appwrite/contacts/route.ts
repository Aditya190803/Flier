import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { respondWithOwnedDocument } from "@/lib/appwrite/single-document";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { ContactDocument } from "@/types/appwrite";

// GET /api/appwrite/contacts[?id=] - List contacts, or fetch one by id
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const single = await respondWithOwnedDocument(
      request,
      config.contactsCollectionId,
      auth.email,
    );
    if (single) {
      return single;
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.contactsCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.orderDesc("created_at"),
        Query.limit(1000),
      ],
    );

    return NextResponse.json({
      total: response.total,
      documents: response.documents,
    });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching contacts",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch contacts",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { email, name, company, phone, tags } = body;

    const result = await databases.createDocument(
      config.databaseId,
      config.contactsCollectionId,
      ID.unique(),
      {
        email,
        name,
        company,
        phone,
        tags: tags ? JSON.stringify(tags) : null,
        user_email: auth.email,
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating contact",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create contact",
      },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/contacts - Update a contact
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { id, email, name, company, phone, tags } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Contact ID required" },
        { status: 400 },
      );
    }

    // Verify the contact belongs to the user before updating
    const doc = (await databases.getDocument(
      config.databaseId,
      config.contactsCollectionId,
      id,
    )) as ContactDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, string | null> = {};
    if (email !== undefined) {
      updateData.email = email;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (company !== undefined) {
      updateData.company = company;
    }
    if (phone !== undefined) {
      updateData.phone = phone;
    }
    if (tags !== undefined) {
      updateData.tags = JSON.stringify(tags);
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.contactsCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error updating contact",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update contact",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/contacts - Delete a contact
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 },
      );
    }

    // Verify the contact belongs to the user before deleting
    const doc = (await databases.getDocument(
      config.databaseId,
      config.contactsCollectionId,
      documentId,
    )) as ContactDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.contactsCollectionId,
      documentId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting contact",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete contact",
      },
      { status: 500 },
    );
  }
}
