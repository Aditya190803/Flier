import { generateLinkId, generateRecipientId } from "../analytics";
import { emailLogger } from "../logger";
import { signTrackingToken } from "../tracking-token";

export function injectTracking(
  html: string,
  params: {
    campaignId: string;
    recipientEmail: string;
    userEmail: string;
    isTransactional?: boolean;
    trackingEnabled?: boolean;
  },
  baseUrl: string,
): string {
  if (!html) {
    return "";
  }

  const { campaignId, recipientEmail, userEmail, isTransactional, trackingEnabled = true } = params;

  const recipientId = generateRecipientId(recipientEmail);

  emailLogger.debug("Injecting tracking into email", {
    campaignId,
    trackingEnabled,
    baseUrl,
  });

  let result = html;

  if (trackingEnabled) {
    const openToken = signTrackingToken({
      campaignId,
      recipientEmail,
      userEmail,
      recipientId,
      purpose: "open",
    });
    const openTrackUrl = `${baseUrl}/api/track/open?t=${encodeURIComponent(openToken)}`;
    const pixelTag = `<img src="${openTrackUrl}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;

    if (result.includes("</body>")) {
      result = result.replace("</body>", `${pixelTag}</body>`);
    } else {
      result = `${result}${pixelTag}`;
    }
  }

  if (trackingEnabled) {
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]+)"([^>]*?)>/gi;

    result = result.replace(linkRegex, (match, url, rest) => {
      if (!url.startsWith("http")) {
        return match;
      }

      if (url.includes("/api/track/click") || url.includes("/api/unsubscribe")) {
        return match;
      }

      const linkIdMatch = rest.match(/data-link-id="([^"]+)"/);
      const linkId = linkIdMatch ? linkIdMatch[1] : generateLinkId();

      const clickToken = signTrackingToken({
        campaignId,
        recipientEmail,
        userEmail,
        recipientId,
        linkId,
        targetUrl: url,
        purpose: "click",
      });
      const clickTrackUrl = `${baseUrl}/api/track/click?t=${encodeURIComponent(clickToken)}`;

      const cleanedRest = rest.replace(/data-link-id="[^"]*"/, "");

      return `<a href="${clickTrackUrl}"${cleanedRest}>`;
    });
  }

  if (!isTransactional && !result.toLowerCase().includes("unsubscribe")) {
    const unsubToken = signTrackingToken({
      campaignId,
      recipientEmail,
      userEmail,
      recipientId,
      purpose: "unsubscribe",
    });
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?t=${encodeURIComponent(unsubToken)}`;
    const unsubscribeTag = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; text-align: center; font-size: 12px; color: #999999;">
        <p>You are receiving this email because you are on our mailing list.</p>
        <p><a href="${unsubscribeUrl}" style="color: #999999; text-decoration: underline;">Unsubscribe</a> from this list.</p>
      </div>
    `;

    if (result.includes("</body>")) {
      result = result.replace("</body>", `${unsubscribeTag}</body>`);
    } else {
      result = `${result}${unsubscribeTag}`;
    }
  }

  return result;
}
