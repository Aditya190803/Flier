/** Normalize campaign recipients stored as array or JSON string. */
export function getRecipientsArray(recipients: unknown): string[] {
  if (Array.isArray(recipients)) {
    return recipients.filter((r): r is string => typeof r === "string");
  }
  if (typeof recipients === "string") {
    try {
      const parsed = JSON.parse(recipients);
      if (Array.isArray(parsed)) {
        return parsed.filter((r): r is string => typeof r === "string");
      }
    } catch {
      return recipients
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}
