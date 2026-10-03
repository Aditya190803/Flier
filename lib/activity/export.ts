/**
 * Analytics library for data export and reporting
 * Handles CSV and PDF export functionality
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import type {
  AnalyticsExportData,
  CampaignAnalytics,
  AnalyticsSummary,
  CSVExportOptions,
  PDFExportOptions,
  DateRange,
} from "@/types/activity";

/**
 * Format date for display in exports
 */
function formatDate(date: Date | string, format?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "iso") {
    return d.toISOString();
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Generate CSV content from analytics data
 */
export function generateCSV(data: AnalyticsExportData, options: CSVExportOptions = {}): string {
  const {
    includeSummary = true,
    includeHeaders = true,
    delimiter = ",",
    dateFormat = "short",
  } = options;

  const lines: string[] = [];

  // Add headers
  if (includeHeaders) {
    const headers = [
      "Campaign ID",
      "Subject",
      "Status",
      "Recipients",
      "Sent",
      "Failed",
      "Success Rate",
      "Opens",
      "Clicks",
      "Recorded Open Rate (estimate)",
      "Recorded Click Rate (estimate)",
      "Type",
      "Date",
    ];
    lines.push(headers.join(delimiter));
  }

  // Add campaign rows
  data.campaigns.forEach((campaign) => {
    const row = [
      campaign.id,
      escapeCSVField(campaign.subject, delimiter),
      campaign.status,
      campaign.recipients.toString(),
      campaign.sent.toString(),
      campaign.failed.toString(),
      `${campaign.successRate.toFixed(1)}%`,
      campaign.opens === undefined ? "N/A" : campaign.opens.toString(),
      campaign.clicks === undefined ? "N/A" : campaign.clicks.toString(),
      campaign.openRate !== undefined ? `${campaign.openRate.toFixed(1)}%` : "N/A",
      campaign.clickRate !== undefined ? `${campaign.clickRate.toFixed(1)}%` : "N/A",
      campaign.campaignType,
      formatDate(campaign.createdAt, dateFormat === "iso" ? "iso" : undefined),
    ];
    lines.push(row.join(delimiter));
  });

  // Add summary section
  if (includeSummary && data.summary) {
    lines.push(""); // Empty line
    lines.push("SUMMARY");
    lines.push(`Total Campaigns${delimiter}${data.summary.totalCampaigns}`);
    lines.push(`Total Recipients${delimiter}${data.summary.totalRecipients}`);
    lines.push(`Total Sent${delimiter}${data.summary.totalSent}`);
    lines.push(`Total Failed${delimiter}${data.summary.totalFailed}`);
    lines.push(`Overall Success Rate${delimiter}${data.summary.overallSuccessRate.toFixed(1)}%`);
    lines.push(
      `Average Recipients/Campaign${delimiter}${data.summary.averageRecipientsPerCampaign.toFixed(1)}`,
    );
    if (data.summary.totalOpens !== undefined) {
      lines.push(`Total Opens${delimiter}${data.summary.totalOpens}`);
    }
    if (data.summary.totalClicks !== undefined) {
      lines.push(`Total Clicks${delimiter}${data.summary.totalClicks}`);
    }
    lines.push("");
    lines.push(
      `Date Range${delimiter}${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)}`,
    );
    lines.push(`Export Date${delimiter}${formatDate(new Date())}`);
  }

  return lines.join("\n");
}

/**
 * Escape CSV field to handle special characters
 */
function escapeCSVField(field: string, delimiter: string): string {
  if (field.includes(delimiter) || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Generate PDF report from analytics data
 */
export async function generatePDF(
  data: AnalyticsExportData,
  options: PDFExportOptions = {},
): Promise<Uint8Array> {
  const {
    title = "Flier Analytics Report",
    includeSummary = true,
    includeDetailedList = true,
    branding = {},
  } = options;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = branding.primaryColor ? hexToRgb(branding.primaryColor) : rgb(0.2, 0.4, 0.8);

  // Page settings
  const pageWidth = 612; // Letter width in points
  const pageHeight = 792; // Letter height in points
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Title
  page.drawText(title, {
    x: margin,
    y,
    size: 24,
    font: helveticaBold,
    color: primaryColor,
  });
  y -= 30;

  // Company name if provided
  if (branding.companyName) {
    page.drawText(branding.companyName, {
      x: margin,
      y,
      size: 14,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 20;
  }

  // Date range
  page.drawText(
    `Report Period: ${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)}`,
    {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    },
  );
  y -= 10;

  page.drawText(`Generated: ${formatDate(new Date())}`, {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 40;

  // Summary section
  if (includeSummary && data.summary) {
    page.drawText("Summary", {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 25;

    const summaryItems = [
      ["Total Campaigns", data.summary.totalCampaigns.toString()],
      ["Total Recipients", data.summary.totalRecipients.toLocaleString()],
      ["Total Sent", data.summary.totalSent.toLocaleString()],
      ["Total Failed", data.summary.totalFailed.toLocaleString()],
      ["Success Rate", `${data.summary.overallSuccessRate.toFixed(1)}%`],
      ["Avg Recipients/Campaign", data.summary.averageRecipientsPerCampaign.toFixed(1)],
    ];

    if (data.summary.totalOpens !== undefined) {
      summaryItems.push(["Total Opens", data.summary.totalOpens.toLocaleString()]);
    }
    if (data.summary.totalClicks !== undefined) {
      summaryItems.push(["Total Clicks", data.summary.totalClicks.toLocaleString()]);
    }
    if (data.summary.averageOpenRate !== undefined) {
      summaryItems.push(["Avg Open Rate", `${data.summary.averageOpenRate.toFixed(1)}%`]);
    }
    if (data.summary.averageClickRate !== undefined) {
      summaryItems.push(["Avg Click Rate", `${data.summary.averageClickRate.toFixed(1)}%`]);
    }

    // Draw summary in two columns
    const colWidth = contentWidth / 2;
    summaryItems.forEach((item, index) => {
      const col = index % 2;
      const x = margin + col * colWidth;

      if (col === 0 && index > 0) {
        y -= 18;
      }

      if (y < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      page.drawText(`${item[0]}:`, {
        x,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(item[1], {
        x: x + 130,
        y,
        size: 10,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    y -= 40;
  }

  // Detailed campaign list
  if (includeDetailedList && data.campaigns.length > 0) {
    if (y < margin + 150) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    page.drawText("Campaign Details", {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 25;

    // Table headers
    const headers = ["Subject", "Status", "Sent", "Failed", "Rate", "Date"];
    const colWidths = [200, 70, 60, 60, 60, 70];
    let x = margin;

    headers.forEach((header, i) => {
      page.drawText(header, {
        x,
        y,
        size: 9,
        font: helveticaBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      x += colWidths[i];
    });
    y -= 15;

    // Draw line under headers
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 10;

    // Table rows
    data.campaigns.forEach((campaign) => {
      if (y < margin + 30) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      x = margin;
      const values = [
        truncateText(campaign.subject, 35),
        campaign.status,
        campaign.sent.toString(),
        campaign.failed.toString(),
        `${campaign.successRate.toFixed(0)}%`,
        formatDate(campaign.createdAt),
      ];

      values.forEach((value, i) => {
        page.drawText(value, {
          x,
          y,
          size: 8,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });
        x += colWidths[i];
      });

      y -= 14;
    });
  }

  // Footer on last page
  page.drawText("Generated by Flier", {
    x: margin,
    y: margin - 20,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}

/**
 * Convert hex color to PDF rgb
 */
function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    );
  }
  return rgb(0.2, 0.4, 0.8); // Default blue
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Calculate analytics summary from campaigns
 */
export function calculateSummary(campaigns: CampaignAnalytics[]): AnalyticsSummary {
  const totalCampaigns = campaigns.length;
  const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipients, 0);
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failed, 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + (c.opens ?? 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0);

  const overallSuccessRate = totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 0;
  const averageRecipientsPerCampaign = totalCampaigns > 0 ? totalRecipients / totalCampaigns : 0;

  const campaignsWithOpens = campaigns.filter((c) => c.opens !== undefined);
  const campaignsWithClicks = campaigns.filter((c) => c.clicks !== undefined);

  const averageOpenRate =
    campaignsWithOpens.length > 0
      ? campaignsWithOpens.reduce((sum, c) => sum + (c.openRate ?? 0), 0) /
        campaignsWithOpens.length
      : undefined;

  const averageClickRate =
    campaignsWithClicks.length > 0
      ? campaignsWithClicks.reduce((sum, c) => sum + (c.clickRate ?? 0), 0) /
        campaignsWithClicks.length
      : undefined;

  return {
    totalCampaigns,
    totalRecipients,
    totalSent,
    totalFailed,
    overallSuccessRate,
    averageRecipientsPerCampaign,
    totalOpens: campaignsWithOpens.length ? totalOpens : undefined,
    totalClicks: campaignsWithClicks.length ? totalClicks : undefined,
    averageOpenRate,
    averageClickRate,
  };
}

/**
 * Transform campaign documents to analytics format
 */
export function transformCampaignToAnalytics(
  campaign: {
    $id: string;
    subject: string;
    status: string;
    recipients: string | string[];
    sent: number;
    failed: number;
    campaign_type?: string;
    created_at?: string;
    $createdAt?: string;
  },
  trackingData?: { opens: number; clicks: number },
): CampaignAnalytics {
  const recipientCount =
    typeof campaign.recipients === "string"
      ? JSON.parse(campaign.recipients).length
      : campaign.recipients.length;

  const successRate = recipientCount > 0 ? (campaign.sent / recipientCount) * 100 : 0;

  const openRate =
    trackingData && campaign.sent > 0 ? (trackingData.opens / campaign.sent) * 100 : undefined;

  const clickRate =
    trackingData && campaign.sent > 0 ? (trackingData.clicks / campaign.sent) * 100 : undefined;

  return {
    id: campaign.$id,
    subject: campaign.subject,
    status: campaign.status as "completed" | "sending" | "failed",
    recipients: recipientCount,
    sent: campaign.sent,
    failed: campaign.failed,
    successRate,
    campaignType: campaign.campaign_type || "bulk",
    createdAt: campaign.created_at || campaign.$createdAt || new Date().toISOString(),
    opens: trackingData?.opens,
    clicks: trackingData?.clicks,
    openRate,
    clickRate,
  };
}

/**
 * Download file in browser
 */
export function downloadFile(
  content: string | Uint8Array,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content as any], { type: mimeType });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Get date range from preset
 */
export function getDateRange(preset: "week" | "month" | "quarter" | "year"): DateRange {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
}
