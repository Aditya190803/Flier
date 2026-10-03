import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { PlanLimitError, assertFeature, planLimitResponse } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";
import type { ABTestDocument } from "@/types/appwrite";

// GET /api/appwrite/ab-tests - List A/B tests for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("id");

    // Get single test by ID
    if (testId) {
      const doc = (await databases.getDocument(
        config.databaseId,
        config.abTestsCollectionId,
        testId,
      )) as ABTestDocument;

      if (doc.user_email !== auth.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      return NextResponse.json({
        $id: doc.$id,
        name: doc.name || "",
        status: doc.status || "draft",
        test_type: doc.test_type || "subject",
        variant_a_subject: doc.variant_a_subject,
        variant_a_content: doc.variant_a_content,
        variant_b_subject: doc.variant_b_subject,
        variant_b_content: doc.variant_b_content,
        variant_a_recipients:
          typeof doc.variant_a_recipients === "string"
            ? JSON.parse(doc.variant_a_recipients)
            : doc.variant_a_recipients || [],
        variant_b_recipients:
          typeof doc.variant_b_recipients === "string"
            ? JSON.parse(doc.variant_b_recipients)
            : doc.variant_b_recipients || [],
        variant_a_sent: doc.variant_a_sent || 0,
        variant_b_sent: doc.variant_b_sent || 0,
        variant_a_opens: doc.variant_a_opens || 0,
        variant_b_opens: doc.variant_b_opens || 0,
        variant_a_clicks: doc.variant_a_clicks || 0,
        variant_b_clicks: doc.variant_b_clicks || 0,
        winner: doc.winner,
        user_email: doc.user_email || "",
        created_at: doc.created_at || doc.$createdAt,
        completed_at: doc.completed_at,
      });
    }

    // List all tests
    const response = await databases.listDocuments(config.databaseId, config.abTestsCollectionId, [
      Query.equal("user_email", auth.email),
      Query.orderDesc("created_at"),
      Query.limit(100),
    ]);

    const documents = (response.documents as unknown as ABTestDocument[]).map((doc) => ({
      $id: doc.$id,
      name: doc.name || "",
      status: doc.status || "draft",
      test_type: doc.test_type || "subject",
      variant_a_subject: doc.variant_a_subject,
      variant_a_content: doc.variant_a_content,
      variant_b_subject: doc.variant_b_subject,
      variant_b_content: doc.variant_b_content,
      variant_a_recipients:
        typeof doc.variant_a_recipients === "string"
          ? JSON.parse(doc.variant_a_recipients)
          : doc.variant_a_recipients || [],
      variant_b_recipients:
        typeof doc.variant_b_recipients === "string"
          ? JSON.parse(doc.variant_b_recipients)
          : doc.variant_b_recipients || [],
      variant_a_sent: doc.variant_a_sent || 0,
      variant_b_sent: doc.variant_b_sent || 0,
      variant_a_opens: doc.variant_a_opens || 0,
      variant_b_opens: doc.variant_b_opens || 0,
      variant_a_clicks: doc.variant_a_clicks || 0,
      variant_b_clicks: doc.variant_b_clicks || 0,
      winner: doc.winner,
      user_email: doc.user_email || "",
      created_at: doc.created_at || doc.$createdAt,
      completed_at: doc.completed_at,
    }));

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error("Error fetching A/B tests", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch A/B tests",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/ab-tests - Create a new A/B test
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    try {
      await assertFeature(auth.email, "abTesting", "A/B testing");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return planLimitResponse(error);
      }
      throw error;
    }

    const body = await request.json();
    const {
      name,
      status,
      test_type,
      variant_a_subject,
      variant_a_content,
      variant_b_subject,
      variant_b_content,
      variant_a_recipients,
      variant_b_recipients,
    } = body;

    const result = await databases.createDocument(
      config.databaseId,
      config.abTestsCollectionId,
      ID.unique(),
      {
        name,
        status: status || "draft",
        test_type: test_type || "subject",
        variant_a_subject,
        variant_a_content,
        variant_b_subject,
        variant_b_content,
        variant_a_recipients: JSON.stringify(variant_a_recipients || []),
        variant_b_recipients: JSON.stringify(variant_b_recipients || []),
        variant_a_sent: 0,
        variant_b_sent: 0,
        variant_a_opens: 0,
        variant_b_opens: 0,
        variant_a_clicks: 0,
        variant_b_clicks: 0,
        user_email: auth.email,
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error("Error creating A/B test", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create A/B test",
      },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/ab-tests - Update an A/B test
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    try {
      await assertFeature(auth.email, "abTesting", "A/B testing");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return planLimitResponse(error);
      }
      throw error;
    }

    const body = await request.json();
    const { id, complete, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Test ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.abTestsCollectionId,
      id,
    )) as ABTestDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If completing the test, determine winner
    if (complete) {
      const aRate = doc.variant_a_sent > 0 ? doc.variant_a_opens / doc.variant_a_sent : 0;
      const bRate = doc.variant_b_sent > 0 ? doc.variant_b_opens / doc.variant_b_sent : 0;

      let winner: "A" | "B" | "tie" = "tie";
      if (Math.abs(aRate - bRate) > 0.05) {
        winner = aRate > bRate ? "A" : "B";
      }

      const result = await databases.updateDocument(
        config.databaseId,
        config.abTestsCollectionId,
        id,
        {
          status: "completed",
          winner,
          completed_at: new Date().toISOString(),
        },
      );

      return NextResponse.json(result);
    }

    // Regular update
    const updateData: Record<string, string | number | null> = {};

    if (updates.variant_a_recipients) {
      updateData.variant_a_recipients = JSON.stringify(updates.variant_a_recipients);
    }
    if (updates.variant_b_recipients) {
      updateData.variant_b_recipients = JSON.stringify(updates.variant_b_recipients);
    }

    // Copy other simple fields
    const simpleFields = [
      "name",
      "status",
      "test_type",
      "variant_a_subject",
      "variant_a_content",
      "variant_b_subject",
      "variant_b_content",
      "variant_a_sent",
      "variant_b_sent",
      "variant_a_opens",
      "variant_b_opens",
      "variant_a_clicks",
      "variant_b_clicks",
      "winner",
    ];

    for (const field of simpleFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.abTestsCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error("Error updating A/B test", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update A/B test",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/ab-tests - Delete an A/B test
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("id");

    if (!testId) {
      return NextResponse.json({ error: "Test ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.abTestsCollectionId,
      testId,
    )) as ABTestDocument;

    if (doc.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(config.databaseId, config.abTestsCollectionId, testId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error("Error deleting A/B test", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete A/B test",
      },
      { status: 500 },
    );
  }
}
