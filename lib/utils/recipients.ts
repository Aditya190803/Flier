export type RecipientInput = string[] | string | undefined | null;
export type RecipientSource = RecipientInput | { recipients?: RecipientInput };

export function parseRecipients(input: RecipientInput): string[] {
  if (Array.isArray(input)) {
    return input.map((recipient) => recipient.trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((recipient) => recipient.trim())
      .filter(Boolean);
  }

  return [];
}

export function getRecipientsCount(input: RecipientSource): number {
  const recipients =
    typeof input === "object" && input !== null && !Array.isArray(input) ? input.recipients : input;

  return parseRecipients(recipients).length;
}
