"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Contact } from "@/hooks/useContactsData";
import { contactsService } from "@/lib/appwrite";
import {
  downloadCsv,
  parseContactCsv,
  planContactImport,
  type ImportMapping,
  type RejectedRow,
} from "@/lib/contacts/import";

export function useContactImportExport({
  userEmail,
  contacts,
  fetchContacts,
}: {
  userEmail: string | null | undefined;
  contacts: Contact[];
  fetchContacts: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({
    email: "",
    name: "",
    company: "",
    phone: "",
  });
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<RejectedRow[]>([]);
  const [completed, setCompleted] = useState(false);
  const plan = planContactImport(headers, rows, mapping, contacts, mode);
  const exportContacts = () => {
    if (!contacts.length) {
      toast.error("No contacts to export");
      return;
    }
    downloadCsv(
      contacts.map(({ email, name, company, phone }) => ({
        email,
        name: name || "",
        company: company || "",
        phone: phone || "",
      })),
      `contacts_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userEmail) {
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("CSV must be smaller than 8 MB");
      return;
    }
    try {
      const data = parseContactCsv(await file.text());
      setHeaders(data.headers);
      setRows(data.rows);
      setMapping(data.mapping);
      setFailures([]);
      setCompleted(false);
      setProgress(0);
      setOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read CSV");
    }
  };
  const confirm = async () => {
    if (!userEmail || !mapping.email || busy || completed) {
      return;
    }
    setBusy(true);
    setFailures([]);
    setProgress(0);
    try {
      // Refresh existing addresses before making the skip/update decision.
      const existing = await contactsService.listByUser(userEmail);
      const freshPlan = planContactImport(
        headers,
        rows,
        mapping,
        existing.documents.map((contact) => ({ $id: contact.$id || "", email: contact.email })),
        mode,
      );
      const rejected = [...freshPlan.rejected];
      let saved = 0;
      for (const [index, item] of freshPlan.accepted.entries()) {
        try {
          if (item.id) {
            // Empty optional cells retain existing values instead of erasing them.
            const fields = Object.fromEntries(
              Object.entries(item.contact).filter(([, value]) => value),
            );
            await contactsService.update(item.id, fields);
          } else {
            await contactsService.create({ ...item.contact, user_email: userEmail });
          }
          saved++;
        } catch (error) {
          rejected.push({
            row: item.row,
            ...item.contact,
            reason: error instanceof Error ? error.message : "Save failed",
          });
        }
        setProgress(index + 1);
      }
      setFailures(rejected);
      setCompleted(true);
      await fetchContacts();
      toast.success(
        `${saved} contacts saved · ${freshPlan.skipped} existing skipped · ${rejected.length} rejected`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed before saving contacts");
    } finally {
      setBusy(false);
    }
  };
  return {
    exportContacts,
    handleFileImport,
    importer: {
      open,
      setOpen,
      headers,
      mapping,
      setMapping,
      mode,
      setMode,
      busy,
      progress,
      completed,
      plan,
      confirm,
      downloadRejected: () =>
        downloadCsv(completed ? failures : plan.rejected, "contacts_rejected.csv"),
      rejected: completed ? failures : plan.rejected,
    },
  };
}
