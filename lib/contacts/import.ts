import Papa from "papaparse";
import { isValidEmail } from "@/lib/validation";

export const IMPORT_FIELDS = ["email", "name", "company", "phone"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ImportMapping = Record<ImportField, string>;
export type ImportContact = { email: string; name: string; company: string; phone: string };
export type RejectedRow = {
  row: number;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  reason: string;
};

export function parseContactCsv(text: string) {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (parsed.errors.length) {
    throw new Error(`CSV could not be parsed: ${parsed.errors[0].message}`);
  }
  const [rawHeaders, ...rows] = parsed.data;
  const headers = (rawHeaders || []).map((header) => header.trim());
  if (!headers.length || !rows.length) {
    throw new Error("CSV needs a header row and at least one contact.");
  }
  if (new Set(headers).size !== headers.length || headers.some((header) => !header)) {
    throw new Error("CSV column names must be unique and nonempty.");
  }
  if (rows.length > 5000) {
    throw new Error("Import up to 5,000 contacts at a time.");
  }
  const mapping = Object.fromEntries(
    IMPORT_FIELDS.map((field) => [
      field,
      headers.find((header) => header.toLowerCase() === field) || "",
    ]),
  ) as ImportMapping;
  return { headers, rows, mapping };
}

export function planContactImport(
  headers: string[],
  rows: string[][],
  mapping: ImportMapping,
  existing: { $id: string; email: string }[],
  mode: "skip" | "update",
) {
  const known = new Map(
    existing.map((contact) => [contact.email.trim().toLowerCase(), contact.$id]),
  );
  const seen = new Set<string>();
  const accepted: { contact: ImportContact; id?: string; row: number }[] = [];
  const rejected: RejectedRow[] = [];
  let skipped = 0;
  rows.forEach((values, index) => {
    const contact = Object.fromEntries(
      IMPORT_FIELDS.map((field) => [field, (values[headers.indexOf(mapping[field])] || "").trim()]),
    ) as ImportContact;
    contact.email = contact.email.toLowerCase();
    const row = index + 2;
    const reason =
      values.length !== headers.length
        ? "Column count does not match headers"
        : !isValidEmail(contact.email)
          ? "Invalid or missing email"
          : seen.has(contact.email)
            ? "Duplicate email in CSV"
            : "";
    if (reason) {
      rejected.push({ row, ...contact, reason });
      return;
    }
    seen.add(contact.email);
    const id = known.get(contact.email);
    if (id && mode === "skip") {
      skipped++;
      return;
    }
    accepted.push({ contact, id, row });
  });
  return {
    accepted,
    rejected,
    skipped,
    creates: accepted.filter((item) => !item.id).length,
    updates: accepted.filter((item) => item.id).length,
  };
}

export function downloadCsv(data: object[], fileName: string): void {
  const blob = new Blob([Papa.unparse(data, { escapeFormulae: true })], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
