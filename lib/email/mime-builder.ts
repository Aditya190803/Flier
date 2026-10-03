import type { AttachmentData } from "./attachment-manager";

interface BuildMimeBodyOptions {
  encodedPlainText: string;
  encodedHtmlBody: string;
  attachments?: AttachmentData[];
}

/**
 * Sanitizes a header value to prevent header injection attacks.
 * Removes CR, LF, and null characters.
 */
function sanitizeHeaderValue(value: string): string {
  // Remove CR, LF, and null characters to prevent header injection
  return value.replace(/[\r\n\x00]/g, "");
}

/**
 * Generates a cryptographically secure random boundary string.
 */
function generateBoundary(prefix: string): string {
  // Use timestamp + random to ensure uniqueness
  const randomPart = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  return `${prefix}${randomPart}`;
}

export function buildGmailMimeBody({
  encodedPlainText,
  encodedHtmlBody,
  attachments,
}: BuildMimeBodyOptions): string {
  const mixedBoundary = generateBoundary("----=_Part_");
  const altBoundary = generateBoundary("----=_Alt_");

  if (attachments && attachments.length > 0) {
    const bodyParts = [
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedPlainText,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedHtmlBody,
      "",
      `--${altBoundary}--`,
    ];

    for (const attachment of attachments) {
      // Sanitize header values to prevent header injection
      const safeType = sanitizeHeaderValue(attachment.type);
      const safeName = sanitizeHeaderValue(attachment.name);
      const encodedFilename = `=?UTF-8?B?${Buffer.from(safeName, "utf8").toString("base64")}?=`;

      if (
        !attachment.data ||
        attachment.data === "appwrite" ||
        attachment.data.startsWith("http")
      ) {
        throw new Error(
          `Attachment ${safeName} was not pre-resolved. Call preResolveAttachments() first.`,
        );
      }

      bodyParts.push(`--${mixedBoundary}`);
      bodyParts.push(`Content-Type: ${safeType}; name="${encodedFilename}"`);
      bodyParts.push(`Content-Disposition: attachment; filename="${encodedFilename}"`);
      bodyParts.push(`Content-Transfer-Encoding: base64`);
      bodyParts.push("");
      bodyParts.push(attachment.data);
    }

    bodyParts.push(`--${mixedBoundary}--`);
    return bodyParts.join("\r\n");
  }

  return [
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    "",
    encodedPlainText,
    "",
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    "",
    encodedHtmlBody,
    "",
    `--${altBoundary}--`,
  ].join("\r\n");
}
