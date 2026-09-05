import { isPdfUrl } from "@/lib/attachment-fetcher";
import type { CSVRow } from "@/types/email";

import type { ComposeAttachment, Contact } from "./compose-types";

export function findCsvRow(
  csvData: CSVRow[],
  email: string,
): Record<string, string> {
  return (
    csvData.find((row) => {
      const rowEmail = row.email || row.Email || row.EMAIL || "";
      return rowEmail.toLowerCase() === email.toLowerCase();
    }) || {}
  );
}

export function buildRecipientFields(input: {
  email: string;
  csvData: CSVRow[];
  manualEntries: { email: string; name: string }[];
  contacts: Contact[];
}): Record<string, string> & { email: string } {
  const { email, csvData, manualEntries, contacts } = input;
  const csvRow = findCsvRow(csvData, email);
  const manualEntry = manualEntries.find(
    (e) => e.email.toLowerCase() === email.toLowerCase(),
  );
  const contact = contacts.find(
    (c) => c.email.toLowerCase() === email.toLowerCase(),
  );

  return {
    email,
    ...(contact?.name ? { name: contact.name } : {}),
    ...(contact?.company ? { company: contact.company } : {}),
    ...(contact?.phone ? { phone: contact.phone } : {}),
    ...(contact?.tags?.length ? { tags: contact.tags.join(", ") } : {}),
    ...contact?.customFields,
    ...(manualEntry?.name ? { name: manualEntry.name } : {}),
    ...csvRow,
  };
}

export function buildPersonalizedEmails(input: {
  recipients: string[];
  subject: string;
  content: string;
  csvData: CSVRow[];
  manualEntries: { email: string; name: string }[];
  contacts: Contact[];
  attachments: ComposeAttachment[];
  pdfColumn: string | null;
}): Array<{
  to: string;
  subject: string;
  message: string;
  originalRowData: Record<string, string> & { email: string };
  attachments: ComposeAttachment[];
  personalizedAttachment?: { url: string; fileName?: string };
}> {
  const {
    recipients,
    subject,
    content,
    csvData,
    manualEntries,
    contacts,
    attachments,
    pdfColumn,
  } = input;

  return recipients.map((email) => {
    const csvRow = findCsvRow(csvData, email);
    const recipientData = buildRecipientFields({
      email,
      csvData,
      manualEntries,
      contacts,
    });

    let personalizedAttachment: { url: string; fileName?: string } | undefined;
    if (pdfColumn && csvRow[pdfColumn] && isPdfUrl(csvRow[pdfColumn])) {
      personalizedAttachment = { url: csvRow[pdfColumn] };
    }

    return {
      to: email,
      subject,
      message: content,
      originalRowData: recipientData,
      attachments,
      personalizedAttachment,
    };
  });
}
