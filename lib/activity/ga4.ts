/**
 * Google Analytics 4 Integration
 * Provides GA4 event tracking for Flier
 */

import type { GA4Config, GA4Event } from "@/types/activity";

// Declare gtag on window
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Initialize GA4 with measurement ID
 */
export function initGA4(config: GA4Config): void {
  if (typeof window === "undefined" || !config.enabled || !config.measurementId) {
    return;
  }

  // Check if already initialized
  if (window.gtag) {
    return;
  }

  // Add gtag.js script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", config.measurementId, {
    send_page_view: true,
  });
}

/**
 * Track a custom GA4 event
 */
export function trackEvent(event: GA4Event): void {
  if (typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", event.name, event.params);
}

/**
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  trackEvent({
    name: "page_view",
    params: {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    },
  });
}

/**
 * Track email campaign created
 */
export function trackCampaignCreated(data: {
  recipientCount: number;
  hasAttachments: boolean;
  campaignType: string;
}): void {
  trackEvent({
    name: "campaign_created",
    params: {
      recipient_count: data.recipientCount,
      has_attachments: data.hasAttachments,
      campaign_type: data.campaignType,
    },
  });
}

/**
 * Track email campaign sent
 */
export function trackCampaignSent(data: {
  recipientCount: number;
  successCount: number;
  failedCount: number;
  duration: number;
}): void {
  trackEvent({
    name: "campaign_sent",
    params: {
      recipient_count: data.recipientCount,
      success_count: data.successCount,
      failed_count: data.failedCount,
      duration_seconds: Math.round(data.duration / 1000),
      success_rate:
        data.recipientCount > 0 ? Math.round((data.successCount / data.recipientCount) * 100) : 0,
    },
  });
}

/**
 * Track template usage
 */
export function trackTemplateUsed(data: {
  templateId: string;
  templateName: string;
  category?: string;
}): void {
  trackEvent({
    name: "template_used",
    params: {
      template_id: data.templateId,
      template_name: data.templateName,
      template_category: data.category || "uncategorized",
    },
  });
}

/**
 * Track contact import
 */
export function trackContactImport(data: {
  contactCount: number;
  source: "csv" | "google" | "manual";
}): void {
  trackEvent({
    name: "contacts_imported",
    params: {
      contact_count: data.contactCount,
      import_source: data.source,
    },
  });
}

/**
 * Track analytics export
 */
export function trackAnalyticsExport(data: {
  format: "csv" | "pdf";
  campaignCount: number;
  dateRange: string;
}): void {
  trackEvent({
    name: "analytics_exported",
    params: {
      export_format: data.format,
      campaign_count: data.campaignCount,
      date_range: data.dateRange,
    },
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(featureName: string): void {
  trackEvent({
    name: "feature_used",
    params: {
      feature_name: featureName,
    },
  });
}

/**
 * Track error occurrence
 */
export function trackError(data: {
  errorType: string;
  errorMessage: string;
  context?: string;
}): void {
  trackEvent({
    name: "error_occurred",
    params: {
      error_type: data.errorType,
      error_message: data.errorMessage.substring(0, 100), // Limit length
      error_context: data.context || "unknown",
    },
  });
}

/**
 * Track user engagement
 */
export function trackEngagement(data: {
  engagementType: "session_start" | "scroll" | "click" | "form_submit";
  value?: number;
}): void {
  trackEvent({
    name: "user_engagement",
    params: {
      engagement_type: data.engagementType,
      engagement_value: data.value || 1,
    },
  });
}

/**
 * Set user properties for analytics
 */
export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("set", "user_properties", properties);
}

/**
 * Track timing/performance
 */
export function trackTiming(data: { name: string; value: number; category?: string }): void {
  trackEvent({
    name: "timing_complete",
    params: {
      name: data.name,
      value: Math.round(data.value),
      event_category: data.category || "performance",
    },
  });
}

/**
 * Check if GA4 is initialized and enabled
 */
export function isGA4Enabled(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/**
 * Get GA4 configuration from environment
 */
export function getGA4Config(): GA4Config {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "";
  return {
    measurementId,
    enabled: !!measurementId,
  };
}
