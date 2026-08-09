import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { respondWithOwnedDocument } from "@/lib/appwrite/single-document";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { cache, CacheKeys, CacheTTL, getOrSet } from "@/lib/cache";
import { apiLogger } from "@/lib/logger";
import type { SignatureDocument } from "@/types/appwrite";

/** Shared by the list and single-document paths so both return one shape. */
function mapSignature(doc: SignatureDocument) {
  return {
    $id: doc.$id,
    name: doc.name || "",
    content: doc.content || "",
    is_default: doc.is_default || false,
    user_email: doc.user_email || "",
    created_at: doc.created_at || doc.$createdAt,
    updated_at: doc.updated_at || doc.$updatedAt,
  };
}

// GET /api/appwrite/signatures[?id=] - List signatures, or fetch one by id
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const single = await respondWithOwnedDocument(
      request,
      config.signaturesCollectionId,
      auth.email,
      (doc) => mapSignature(doc as SignatureDocument),
    );
    if (single) {
      return single;
    }

    const { searchParams } = new URL(request.url);
    const defaultOnly = searchParams.get("default") === "true";
    const userEmail = auth.email;

    // Use cache for non-default-only requests (full list)
    if (!defaultOnly) {
      const cacheKey = CacheKeys.userSignatures(userEmail);
      const result = await getOrSet(
        cacheKey,
        async () => {
          const queries = [
            Query.equal("user_email", userEmail),
            Query.orderDesc("$updatedAt"),
            Query.limit(20),
          ];

          const response = await databases.listDocuments(
            config.databaseId,
            config.signaturesCollectionId,
            queries,
          );

          const documents = (
            response.documents as unknown as SignatureDocument[]
          ).map(mapSignature);

          return { total: response.total, documents };
        },
        CacheTTL.DEFAULT,
      );

      return NextResponse.json(result);
    }

    // For default-only, we still query directly to ensure accuracy
    const queries = [
      Query.equal("user_email", userEmail),
      Query.orderDesc("$updatedAt"),
      Query.equal("is_default", true),
      Query.limit(1),
    ];

    const response = await databases.listDocuments(
      config.databaseId,
      config.signaturesCollectionId,
      queries,
    );

    const documents = (
      response.documents as unknown as SignatureDocument[]
    ).map(mapSignature);

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching signatures",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch signatures",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/signatures - Create a new signature
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { name, content, is_default } = body;
    const now = new Date().toISOString();

    // If this signature is set as default, unset other defaults first
    if (is_default) {
      const existingDefaults = await databases.listDocuments(
        config.databaseId,
        config.signaturesCollectionId,
        [
          Query.equal("user_email", auth.email),
          Query.equal("is_default", true),
        ],
      );

      for (const sig of existingDefaults.documents) {
        await databases.updateDocument(
          config.databaseId,
          config.signaturesCollectionId,
          sig.$id,
          { is_default: false },
        );
      }
    }

    const result = await databases.createDocument(
      config.databaseId,
      config.signaturesCollectionId,
      ID.unique(),
      {
        name,
        content,
        is_default: is_default || false,
        user_email: auth.email,
        created_at: now,
      },
    );

    // Invalidate cache
    await cache.delete(CacheKeys.userSignatures(auth.email));

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating signature",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create signature",
      },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/signatures - Update a signature
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { id, name, content, is_default, setAsDefault } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Signature ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.signaturesCollectionId,
      id,
    )) as SignatureDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      const existingDefaults = await databases.listDocuments(
        config.databaseId,
        config.signaturesCollectionId,
        [
          Query.equal("user_email", auth.email),
          Query.equal("is_default", true),
        ],
      );

      for (const sig of existingDefaults.documents) {
        if (sig.$id !== id) {
          await databases.updateDocument(
            config.databaseId,
            config.signaturesCollectionId,
            sig.$id,
            { is_default: false },
          );
        }
      }
    }

    const updateData: Record<string, string | boolean> = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (is_default !== undefined || setAsDefault) {
      updateData.is_default = is_default ?? true;
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.signaturesCollectionId,
      id,
      updateData,
    );

    // Invalidate cache
    await cache.delete(CacheKeys.userSignatures(auth.email));

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error updating signature",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update signature",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/signatures - Delete a signature
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const signatureId = searchParams.get("id");

    if (!signatureId) {
      return NextResponse.json(
        { error: "Signature ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.signaturesCollectionId,
      signatureId,
    )) as SignatureDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.signaturesCollectionId,
      signatureId,
    );

    // Invalidate cache
    await cache.delete(CacheKeys.userSignatures(auth.email));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting signature",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete signature",
      },
      { status: 500 },
    );
  }
}
