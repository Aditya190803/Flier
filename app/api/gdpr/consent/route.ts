import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// GET /api/gdpr/consent - Get all consent records for the user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!config.consentsCollectionId) {
      // Return default consents if collection not configured
      return NextResponse.json({
        total: 0,
        documents: [],
        defaults: {
          marketing: { given: false },
          analytics: { given: true },
          data_processing: { given: true },
          third_party: { given: false },
        },
      });
    }

    const response = await databases.listDocuments(config.databaseId, config.consentsCollectionId, [
      Query.equal("user_email", auth.email),
      Query.orderDesc("$createdAt"),
    ]);

    return NextResponse.json({
      total: response.total,
      documents: response.documents,
    });
  } catch (error: any) {
    apiLogger.error("Error fetching consent records", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: error.message || "Failed to fetch consent records" },
      { status: 500 },
    );
  }
}

// POST /api/gdpr/consent - Create or update a consent record
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { consent_type, given } = body;

    const validConsentTypes = ["marketing", "analytics", "data_processing", "third_party"];
    if (!validConsentTypes.includes(consent_type)) {
      return NextResponse.json(
        {
          error: `Invalid consent_type. Must be one of: ${validConsentTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (typeof given !== "boolean") {
      return NextResponse.json({ error: "given must be a boolean" }, { status: 400 });
    }

    if (!config.consentsCollectionId) {
      return NextResponse.json(
        { error: "Consent records collection not configured" },
        { status: 503 },
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Check if consent record exists
    const existingConsent = await databases.listDocuments(
      config.databaseId,
      config.consentsCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.equal("consent_type", consent_type),
        Query.limit(1),
      ],
    );

    let result;
    if (existingConsent.documents.length > 0) {
      // Update existing consent
      const existingDoc = existingConsent.documents[0];
      const updateData: any = {
        granted: given,
        ip_address: ipAddress,
        source: "settings",
      };

      if (given) {
        updateData.granted_at = new Date().toISOString();
      } else {
        updateData.revoked_at = new Date().toISOString();
      }

      result = await databases.updateDocument(
        config.databaseId,
        config.consentsCollectionId,
        existingDoc.$id,
        updateData,
      );
    } else {
      // Create new consent record
      result = await databases.createDocument(
        config.databaseId,
        config.consentsCollectionId,
        ID.unique(),
        {
          user_email: auth.email,
          consent_type,
          granted: given,
          granted_at: given ? new Date().toISOString() : null,
          revoked_at: given ? null : new Date().toISOString(),
          ip_address: ipAddress,
          source: "settings",
        },
      );
    }

    // Log the consent action
    if (config.auditLogsCollectionId) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: auth.email,
            action: given ? "gdpr.consent_given" : "gdpr.consent_revoked",
            resource_type: "settings",
            details: JSON.stringify({ consent_type }),
            ip_address: ipAddress,
            user_agent: userAgent,
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        apiLogger.warn("Failed to log consent audit event", { error: e });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error("Error updating consent", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: error.message || "Failed to update consent" },
      { status: 500 },
    );
  }
}
