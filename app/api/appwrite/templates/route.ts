import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { respondWithOwnedDocument } from "@/lib/appwrite/single-document";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { cache, CacheKeys, CacheTTL, getOrSet } from "@/lib/cache";
import { apiLogger } from "@/lib/logger";
import type { TemplateDocument } from "@/types/appwrite";

// Extended type for version tracking
interface ExtendedTemplateDocument extends TemplateDocument {
  version?: number;
}

// GET /api/appwrite/templates[?id=] - List templates, or fetch one by id
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const single = await respondWithOwnedDocument(
      request,
      config.templatesCollectionId,
      auth.email,
    );
    if (single) {
      return single;
    }

    const userEmail = auth.email;
    const cacheKey = CacheKeys.userTemplates(userEmail);

    const result = await getOrSet(
      cacheKey,
      async () => {
        const response = await databases.listDocuments(
          config.databaseId,
          config.templatesCollectionId,
          [
            Query.equal("user_email", userEmail),
            Query.orderDesc("$updatedAt"),
            Query.limit(100),
          ],
        );
        return {
          total: response.total,
          documents: response.documents,
        };
      },
      CacheTTL.DEFAULT,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching templates",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch templates",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { name, subject, content, category } = body;
    const now = new Date().toISOString();

    const result = await databases.createDocument(
      config.databaseId,
      config.templatesCollectionId,
      ID.unique(),
      {
        name,
        subject,
        content,
        category,
        version: 1, // Start at version 1
        user_email: auth.email,
        created_at: now,
        updated_at: now,
      },
    );

    // Invalidate cache
    await cache.delete(CacheKeys.userTemplates(auth.email));

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating template",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create template",
      },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/templates - Update a template
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { id, name, subject, content, category, saveVersion, changeNote } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.templatesCollectionId,
      id,
    )) as ExtendedTemplateDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const currentVersion = doc.version || 1;

    // Save current state as a version if requested (or if major content change)
    if (saveVersion) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.templateVersionsCollectionId,
          ID.unique(),
          {
            template_id: id,
            version: currentVersion,
            name: doc.name,
            subject: doc.subject,
            content: doc.content,
            category: doc.category,
            user_email: auth.email,
            created_at: new Date().toISOString(),
            change_note: changeNote || null,
          },
        );
      } catch (versionError: unknown) {
        // If template_versions collection doesn't exist, just continue
        const appwriteError = versionError as {
          code?: number;
          message?: string;
        };
        if (
          appwriteError.code !== 404 &&
          !appwriteError.message?.includes("Collection")
        ) {
          apiLogger.warn("Failed to save template version", {
            error: appwriteError.message,
          });
        }
      }
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.templatesCollectionId,
      id,
      {
        name,
        subject,
        content,
        category,
        version: saveVersion ? currentVersion + 1 : currentVersion,
        updated_at: new Date().toISOString(),
      },
    );

    // Invalidate cache
    await cache.delete(CacheKeys.userTemplates(auth.email));

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error updating template",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update template",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/templates - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.templatesCollectionId,
      templateId,
    )) as TemplateDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.templatesCollectionId,
      templateId,
    );

    // Invalidate cache
    await cache.delete(CacheKeys.userTemplates(auth.email));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting template",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete template",
      },
      { status: 500 },
    );
  }
}
