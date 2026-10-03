import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// Helper to log audit events
async function logAuditEvent(
  userEmail: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>,
  request?: NextRequest,
) {
  try {
    // Check if audit logs collection exists
    if (!config.auditLogsCollectionId) {
      apiLogger.warn("Audit logs collection not configured");
      return;
    }

    const ipAddress =
      request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || "unknown";
    const userAgent = request?.headers.get("user-agent") || "unknown";

    await databases.createDocument(config.databaseId, config.auditLogsCollectionId, ID.unique(), {
      user_email: userEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details ? JSON.stringify(details) : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    apiLogger.error("Failed to log audit event", error instanceof Error ? error : undefined);
  }
}

// GET /api/gdpr/audit-logs - Get audit logs for the user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resource_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Check if collection is configured
    if (!config.auditLogsCollectionId) {
      return NextResponse.json({
        total: 0,
        documents: [],
        message: "Audit logs collection not configured. Please set up the collection.",
      });
    }

    const queries = [
      Query.equal("user_email", auth.email),
      Query.orderDesc("created_at"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    if (action) {
      queries.push(Query.equal("action", action));
    }
    if (resourceType) {
      queries.push(Query.equal("resource_type", resourceType));
    }
    if (startDate) {
      queries.push(Query.greaterThanEqual("created_at", startDate));
    }
    if (endDate) {
      queries.push(Query.lessThanEqual("created_at", endDate));
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.auditLogsCollectionId,
      queries,
    );

    // Parse details JSON for each log
    const documents = response.documents.map((doc: any) => ({
      ...doc,
      details: doc.details ? JSON.parse(doc.details) : null,
    }));

    return NextResponse.json({
      total: response.total,
      documents,
    });
  } catch (error: any) {
    apiLogger.error("Error fetching audit logs", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}

// POST /api/gdpr/audit-logs - Create an audit log entry (for client-side logging)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const { action, resource_type, resource_id, details } = body;

    if (!action || !resource_type) {
      return NextResponse.json({ error: "Action and resource_type are required" }, { status: 400 });
    }

    await logAuditEvent(auth.email, action, resource_type, resource_id, details, request);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    apiLogger.error("Error creating audit log", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: error.message || "Failed to create audit log" },
      { status: 500 },
    );
  }
}
