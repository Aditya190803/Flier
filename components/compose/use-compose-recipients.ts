"use client";

import { useState } from "react";

import { toast } from "sonner";

import { type ContactGroup } from "@/lib/appwrite";
import { detectPdfColumn, isPdfUrl } from "@/lib/attachment-fetcher";
import type { CSVRow } from "@/types/email";

import type { Contact } from "./compose-types";

interface UseComposeRecipientsArgs {
  contacts: Contact[];
  selectedContacts: Set<string>;
  setSelectedContacts: (value: Set<string>) => void;
  groups: ContactGroup[];
  selectedGroups: Set<string>;
  setSelectedGroups: (value: Set<string>) => void;
}

/**
 * Owns the recipient list plus every input source that can populate it:
 * manual entry, CSV import, contact selection, and group selection.
 */
export function useComposeRecipients({
  contacts,
  selectedContacts,
  setSelectedContacts,
  groups,
  selectedGroups,
  setSelectedGroups,
}: UseComposeRecipientsArgs) {
  const [recipients, setRecipients] = useState<string[]>([]);

  // Manual email entry state
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEntries, setManualEntries] = useState<{ email: string; name: string }[]>([]);

  // CSV data
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  // PDF attachment column (for personalized certificates)
  const [pdfColumn, setPdfColumn] = useState<string | null>(null);
  const [showPersonalizedAttachments, setShowPersonalizedAttachments] = useState(false);

  // Handle CSV data
  const handleCsvData = (data: CSVRow[]) => {
    setCsvData(data);

    // Extract headers from first row
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      setCsvHeaders(headers);

      // Auto-detect PDF/certificate column
      const detectedPdfCol = detectPdfColumn(headers);
      if (detectedPdfCol) {
        setPdfColumn(detectedPdfCol);
        setShowPersonalizedAttachments(true);
        // Verify at least one row has a valid URL
        const hasValidUrls = data.some((row) => isPdfUrl(row[detectedPdfCol]));
        if (hasValidUrls) {
          toast.success(`Detected certificate column: "${detectedPdfCol}"`, {
            description: "Each recipient will receive their personalized PDF attachment",
          });
        }
      } else {
        setPdfColumn(null);
      }
    }

    // Extract emails from CSV
    const emails = data.map((row) => row.email).filter((email) => email && email.includes("@"));

    if (emails.length > 0) {
      setRecipients(emails);
      toast.success(`Found ${emails.length} recipients`);
    } else {
      toast.error("No valid emails found in CSV");
    }
  };

  // Toggle contact selection
  const toggleContact = (contactId: string, email: string) => {
    const newSelected = new Set(selectedContacts);

    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
      setRecipients(recipients.filter((r) => r !== email));
    } else {
      newSelected.add(contactId);
      if (!recipients.includes(email)) {
        setRecipients([...recipients, email]);
      }
    }

    setSelectedContacts(newSelected);
  };

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    const group = groups.find((g) => g.$id === groupId);
    if (!group) {
      return;
    }

    const newSelectedGroups = new Set(selectedGroups);
    const newSelectedContacts = new Set(selectedContacts);
    let newRecipients = [...recipients];

    if (newSelectedGroups.has(groupId)) {
      // Deselect group
      newSelectedGroups.delete(groupId);
      // Remove contacts that are only in this group
      group.contact_ids.forEach((contactId) => {
        const contact = contacts.find((c) => c.$id === contactId);
        if (contact) {
          const isInOtherSelectedGroup = groups.some(
            (g) =>
              g.$id !== groupId &&
              newSelectedGroups.has(g.$id!) &&
              g.contact_ids.includes(contactId),
          );
          if (!isInOtherSelectedGroup) {
            newSelectedContacts.delete(contactId);
            newRecipients = newRecipients.filter((r) => r !== contact.email);
          }
        }
      });
    } else {
      // Select group
      newSelectedGroups.add(groupId);
      // Add all contacts from this group
      group.contact_ids.forEach((contactId) => {
        const contact = contacts.find((c) => c.$id === contactId);
        if (contact) {
          newSelectedContacts.add(contactId);
          if (!newRecipients.includes(contact.email)) {
            newRecipients.push(contact.email);
          }
        }
      });
    }

    setSelectedGroups(newSelectedGroups);
    setSelectedContacts(newSelectedContacts);
    setRecipients(newRecipients);
  };

  // Add manual email entry (email + name)
  const addManualEntry = () => {
    const email = manualEmail.trim().toLowerCase();
    const name = manualName.trim();

    if (!email || !email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (recipients.includes(email)) {
      toast.error("This email is already added");
      return;
    }

    // Add to recipients
    setRecipients([...recipients, email]);

    // Add to manual entries for display
    setManualEntries([...manualEntries, { email, name }]);

    // Add to CSV data for personalization
    const data: Record<string, string> = { email };
    if (name) {
      data.name = name;
    }
    setCsvData((prev) => [...prev, data]);
    if (csvHeaders.length === 0) {
      setCsvHeaders(["email", "name"]);
    }

    // Clear inputs
    setManualEmail("");
    setManualName("");
    toast.success("Recipient added");
  };

  // Remove a recipient
  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
    // Also remove from manual entries
    setManualEntries((prev) => prev.filter((e) => e.email !== email));
    // Also remove from CSV data
    setCsvData((prev) => prev.filter((row) => row.email !== email));
    // Also update selected contacts if it was from contacts
    const contact = contacts.find((c) => c.email === email);
    if (contact) {
      const newSelected = new Set(selectedContacts);
      newSelected.delete(contact.$id);
      setSelectedContacts(newSelected);
    }
  };

  const clearAllRecipients = () => {
    setRecipients([]);
    setSelectedContacts(new Set());
    setSelectedGroups(new Set());
    setManualEntries([]);
    setCsvData([]);
    setCsvHeaders([]);
    setPdfColumn(null);
    setShowPersonalizedAttachments(false);
    toast.success("All recipients cleared");
  };

  return {
    recipients,
    setRecipients,
    manualEmail,
    setManualEmail,
    manualName,
    setManualName,
    manualEntries,
    setManualEntries,
    csvData,
    setCsvData,
    csvHeaders,
    setCsvHeaders,
    pdfColumn,
    setPdfColumn,
    showPersonalizedAttachments,
    setShowPersonalizedAttachments,
    handleCsvData,
    toggleContact,
    toggleGroup,
    addManualEntry,
    removeRecipient,
    clearAllRecipients,
  };
}
