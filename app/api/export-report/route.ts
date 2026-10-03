import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { PlanLimitError, assertFeature, planLimitResponse } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";
import { exportReportQuerySchema, validate } from "@/lib/validation";

import type { Models } from "appwrite";

/**
 * Export campaign reports as CSV
 */

interface ExportCampaignDoc extends Models.Document {
  subject?: string;
  status?: string;
  sent?: number;
  failed?: number;
  recipients?: string | unknown[];
  campaign_type?: string;
  created_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    try {
      await assertFeature(auth.email, "exportReports", "Report export");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return planLimitResponse(error);
      }
      throw error;
    }

    const { searchParams } = new URL(request.url);
    const parsed = validate(exportReportQuerySchema, {
      format: searchParams.get("format") || undefined,
      campaign: searchParams.get("campaign") || undefined,
    });
    if (!parsed.success || !parsed.data) {
      return NextResponse.json({ error: parsed.message || "Invalid request" }, { status: 400 });
    }
    const { format, campaign: campaignId } = parsed.data;

    // Fetch campaigns
    let campaigns: ExportCampaignDoc[];
    if (campaignId) {
      // Single campaign
      const doc = (await databases.getDocument(
        config.databaseId,
        config.campaignsCollectionId,
        campaignId,
      )) as ExportCampaignDoc;
      campaigns = [doc];
    } else {
      // All campaigns
      const response = await databases.listDocuments(
        config.databaseId,
        config.campaignsCollectionId,
        [Query.equal("user_email", auth.email), Query.orderDesc("created_at"), Query.limit(1000)],
      );
      campaigns = response.documents as ExportCampaignDoc[];
    }

    // Parse campaign data
    const parsedCampaigns = campaigns.map((doc) => ({
      id: doc.$id,
      subject: doc.subject || "",
      status: doc.status || "",
      sent: doc.sent || 0,
      failed: doc.failed || 0,
      recipients:
        typeof doc.recipients === "string"
          ? JSON.parse(doc.recipients).length
          : doc.recipients?.length || 0,
      campaign_type: doc.campaign_type || "bulk",
      created_at: doc.created_at || doc.$createdAt,
    }));

    if (format === "json") {
      return NextResponse.json({ campaigns: parsedCampaigns });
    }

    // Generate CSV
    const csvHeaders = [
      "Campaign ID",
      "Subject",
      "Status",
      "Recipients",
      "Sent",
      "Failed",
      "Success Rate",
      "Type",
      "Date",
    ];
    const csvRows = parsedCampaigns.map((c) => [
      c.id,
      `"${c.subject.replace(/"/g, '""')}"`,
      c.status,
      c.recipients,
      c.sent,
      c.failed,
      c.recipients > 0 ? `${((c.sent / c.recipients) * 100).toFixed(1)}%` : "0%",
      c.campaign_type,
      new Date(c.created_at).toISOString(),
    ]);

    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    // Add summary at the end
    const totalSent = parsedCampaigns.reduce((sum, c) => sum + c.sent, 0);
    const totalFailed = parsedCampaigns.reduce((sum, c) => sum + c.failed, 0);
    const totalRecipients = parsedCampaigns.reduce((sum, c) => sum + c.recipients, 0);

    const summary = `\n\nSUMMARY\nTotal Campaigns,${parsedCampaigns.length}\nTotal Recipients,${totalRecipients}\nTotal Sent,${totalSent}\nTotal Failed,${totalFailed}\nOverall Success Rate,${totalRecipients > 0 ? ((totalSent / totalRecipients) * 100).toFixed(1) : 0}%\nExport Date,${new Date().toISOString()}`;

    const fullCsv = csvContent + summary;

    return new NextResponse(fullCsv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="flier-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    apiLogger.error("Export error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 });
  }
}
