import { isAttachmentUrl } from "@/lib/attachments/url";
import { replacePlaceholders } from "@/lib/email/placeholders";
import { isValidEmail } from "@/lib/validation";

export interface PreflightInput {
  subject: string;
  content: string;
  recipients: string[];
  recipientFields: Record<string, Record<string, string>>;
  attachments: {
    name: string;
    data: string;
    fileSize?: number;
    isProcessing?: boolean;
    appwriteFileId?: string;
  }[];
  personalizedAttachmentColumn?: string;
}

export interface PreflightIssue {
  message: string;
  recipient?: string;
}

export interface PreflightReport {
  recipients: string[];
  duplicates: number;
  suppressed: string[];
  issues: PreflightIssue[];
}

export function reviewCampaign(input: PreflightInput, suppressed: string[] = []): PreflightReport {
  const issues: PreflightIssue[] = [];
  if (!input.subject.trim()) {
    issues.push({ message: "Add a subject." });
  }
  if (
    !input.content
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim() &&
    !/<img\b/i.test(input.content)
  ) {
    issues.push({ message: "Add email content." });
  }
  const unique = [...new Set(input.recipients.map((email) => email.trim().toLowerCase()))];
  const suppressedSet = new Set(suppressed.map((email) => email.toLowerCase()));
  const recipients = unique.filter((email) => !suppressedSet.has(email));
  if (unique.length > 1000) {
    issues.push({ message: "A campaign supports up to 1,000 recipients." });
  }
  if (!recipients.length) {
    issues.push({ message: "Add at least one eligible recipient." });
  }

  for (const recipient of recipients) {
    if (!isValidEmail(recipient)) {
      issues.push({ recipient, message: "Invalid email address." });
      continue;
    }
    const fields: Record<string, string> = {
      email: recipient,
      ...input.recipientFields[recipient],
    };
    const rendered = replacePlaceholders(`${input.subject}\n${input.content}`, fields);
    const missing = [
      ...new Set(
        [...rendered.matchAll(/\{\{(\w+)\}\}|\{(\w+)\}/g)].map((match) => match[1] || match[2]),
      ),
    ];
    if (missing.length) {
      issues.push({ recipient, message: `Missing values: ${missing.join(", ")}.` });
    }
    const column = input.personalizedAttachmentColumn;
    if (column && (!fields[column] || !isAttachmentUrl(fields[column]))) {
      issues.push({ recipient, message: `Missing or invalid attachment URL in ${column}.` });
    }
  }
  for (const attachment of input.attachments) {
    if (attachment.isProcessing || attachment.data === "processing") {
      issues.push({ message: `${attachment.name}: upload is still processing.` });
    } else if (
      !attachment.data ||
      attachment.data === "error" ||
      (attachment.data === "appwrite" && !attachment.appwriteFileId)
    ) {
      issues.push({ message: `${attachment.name}: attachment is unavailable. Upload it again.` });
    }
  }
  if (
    input.attachments.reduce((total, attachment) => total + (attachment.fileSize || 0), 0) >
    25 * 1024 * 1024
  ) {
    issues.push({ message: "Combined attachment size exceeds 25 MB." });
  }
  return {
    recipients,
    duplicates: input.recipients.length - unique.length,
    suppressed: unique.filter((email) => suppressedSet.has(email)),
    issues,
  };
}
