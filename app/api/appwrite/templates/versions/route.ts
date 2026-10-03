import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { TemplateDocument } from "@/types/appwrite";

// Extended type for template with version
interface ExtendedTemplateDocument extends TemplateDocument {
  version?: number;
}

// Type for template version document
interface TemplateVersionDocument {
  $id: string;
  template_id: string;
  version: number;
  name: string;
  subject: string;
  content: string;
  category?: string;
  user_email: string;
  created_at: string;
  change_note?: string;
}

// GET /api/appwrite/templates/versions - List versions for a template
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    // First verify the template belongs to this user
    const template = (await databases.getDocument(
      config.databaseId,
      config.templatesCollectionId,
      templateId,
    )) as ExtendedTemplateDocument;

    if (template.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all versions for this template
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.templateVersionsCollectionId,
        [
          Query.equal("template_id", templateId),
          Query.equal("user_email", auth.email),
          Query.orderDesc("version"),
          Query.limit(50),
        ],
      );

      const documents = (response.documents as unknown as unknown as TemplateVersionDocument[]).map(
        (doc) => ({
          $id: doc.$id,
          template_id: doc.template_id,
          version: doc.version,
          name: doc.name,
          subject: doc.subject,
          content: doc.content,
          category: doc.category,
          user_email: doc.user_email,
          created_at: doc.created_at,
          change_note: doc.change_note,
        }),
      );

      return NextResponse.json({ total: response.total, documents });
    } catch (error: unknown) {
      // If collection doesn't exist yet, return empty
      const appwriteError = error as { code?: number; message?: string };
      if (appwriteError.code === 404 || appwriteError.message?.includes("Collection")) {
        return NextResponse.json({ total: 0, documents: [] });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch template versions";
    apiLogger.error("Error fetching template versions", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/appwrite/templates/versions - Create a version or restore from version
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { templateId, versionId, action, changeNote } = body;

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    // Verify the template belongs to this user
    const template = (await databases.getDocument(
      config.databaseId,
      config.templatesCollectionId,
      templateId,
    )) as ExtendedTemplateDocument;

    if (template.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Handle restore action
    if (action === "restore" && versionId) {
      // Get the version to restore
      const version = (await databases.getDocument(
        config.databaseId,
        config.templateVersionsCollectionId,
        versionId,
      )) as unknown as TemplateVersionDocument;

      if (version.template_id !== templateId) {
        return NextResponse.json(
          { error: "Version does not belong to this template" },
          { status: 400 },
        );
      }

      // Save current state as a new version before restoring
      const currentVersion = template.version || 1;
      await databases.createDocument(
        config.databaseId,
        config.templateVersionsCollectionId,
        ID.unique(),
        {
          template_id: templateId,
          version: currentVersion,
          name: template.name,
          subject: template.subject,
          content: template.content,
          category: template.category,
          user_email: auth.email,
          created_at: new Date().toISOString(),
          change_note: `Auto-saved before restoring to version ${version.version}`,
        },
      );

      // Update template with restored version data
      const result = await databases.updateDocument(
        config.databaseId,
        config.templatesCollectionId,
        templateId,
        {
          name: version.name,
          subject: version.subject,
          content: version.content,
          category: version.category,
          version: currentVersion + 1,
          updated_at: new Date().toISOString(),
        },
      );

      return NextResponse.json(result);
    }

    // Handle creating a new version (saving current state)
    const currentVersion = template.version || 0;
    const newVersion = currentVersion + 1;

    // Create version record
    await databases.createDocument(
      config.databaseId,
      config.templateVersionsCollectionId,
      ID.unique(),
      {
        template_id: templateId,
        version: currentVersion,
        name: template.name,
        subject: template.subject,
        content: template.content,
        category: template.category,
        user_email: auth.email,
        created_at: new Date().toISOString(),
        change_note: changeNote || null,
      },
    );

    // Update template version number
    await databases.updateDocument(config.databaseId, config.templatesCollectionId, templateId, {
      version: newVersion,
    });

    return NextResponse.json({ success: true, version: newVersion });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to manage template version";
    apiLogger.error("Error managing template version", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
