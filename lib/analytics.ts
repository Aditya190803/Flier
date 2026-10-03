/**
 * Analytics Utilities
 *
 * Handles unique ID generation for tracking campaigns, recipients, and links.
 */

/**
 * Generates a unique campaign ID
 * Format: camp_<uuid> - compatible with Appwrite document IDs
 * Appwrite IDs must be alphanumeric with underscores, max 36 chars
 */
export function generateCampaignId(): string {
  // Use underscore instead of hyphen for Appwrite compatibility
  return `camp_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/**
 * Generates a unique recipient ID
 * In a real app, this might be a hash of the email or a database ID
 */
export function generateRecipientId(email: string): string {
  // Simple hash-like ID for demonstration, or just use UUID
  return `r-${Buffer.from(email).toString("hex").slice(0, 8)}`;
}

/**
 * Generates a unique link ID
 */
export function generateLinkId(): string {
  return `l-${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * Tracking disclosure text
 */
export const TRACKING_DISCLOSURE = "This email includes tracking to help us improve our content.";
