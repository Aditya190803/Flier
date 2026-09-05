import { useState } from "react";

import { toast } from "sonner";

import { contactsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

interface GmailContact {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface ExistingContact {
  email: string;
}

interface UseGmailContactsImportOptions {
  userEmail?: string;
  existingContacts: ExistingContact[];
  onImportComplete: () => void;
}

const IMPORT_BATCH_SIZE = 10;

export function useGmailContactsImport({
  userEmail,
  existingContacts,
  onImportComplete,
}: UseGmailContactsImportOptions) {
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [gmailContacts, setGmailContacts] = useState<GmailContact[]>([]);
  const [selectedGmailContacts, setSelectedGmailContacts] = useState<
    Set<string>
  >(new Set());
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [gmailImportError, setGmailImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const resetImportState = () => {
    setGmailContacts([]);
    setSelectedGmailContacts(new Set());
    setGmailImportError(null);
  };

  const fetchGmailContacts = async () => {
    setIsLoadingGmail(true);
    setGmailImportError(null);

    try {
      const response = await fetch("/api/import-google-contacts");
      if (!response.ok) {
        let errorMessage = "Failed to fetch contacts";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response is not valid JSON, use default message
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const importedContacts = Array.isArray(data?.contacts)
        ? data.contacts
        : [];
      if (!Array.isArray(data?.contacts)) {
        componentLogger.warn("Unexpected Google contacts response shape", data);
      }

      const existingEmails = new Set(
        existingContacts
          .map((contact) =>
            typeof contact.email === "string"
              ? contact.email.toLowerCase().trim()
              : "",
          )
          .filter((email): email is string => Boolean(email)),
      );
      const newContacts = importedContacts.filter((contact: GmailContact) => {
        const email =
          typeof contact.email === "string"
            ? contact.email.toLowerCase().trim()
            : "";
        return Boolean(email) && !existingEmails.has(email);
      });

      setGmailContacts(newContacts);
      setSelectedGmailContacts(
        new Set(newContacts.map((contact: GmailContact) => contact.email)),
      );

      if (newContacts.length === 0 && importedContacts.length > 0) {
        toast.info("All your Google contacts are already imported!");
      }
    } catch (error) {
      componentLogger.error(
        "Error fetching Gmail contacts",
        error instanceof Error ? error : undefined,
      );
      setGmailImportError(
        error instanceof Error
          ? error.message
          : "Failed to fetch Google contacts",
      );
    } finally {
      setIsLoadingGmail(false);
    }
  };

  const openGmailImportDialog = async () => {
    setShowGmailImport(true);
    await fetchGmailContacts();
  };

  const closeGmailImportDialog = () => {
    setShowGmailImport(false);
    resetImportState();
  };

  const importSelectedGmailContacts = async () => {
    if (!userEmail) {
      toast.error("User email not available. Please sign in again.");
      return;
    }

    const contactsToImport = gmailContacts.filter((contact) =>
      selectedGmailContacts.has(contact.email),
    );
    if (contactsToImport.length === 0) {
      toast.error("No contacts selected");
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading(
      `Importing ${contactsToImport.length} contacts from Google...`,
    );
    let successCount = 0;

    try {
      for (
        let index = 0;
        index < contactsToImport.length;
        index += IMPORT_BATCH_SIZE
      ) {
        const batch = contactsToImport.slice(index, index + IMPORT_BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (contact) => {
            try {
              await contactsService.create({
                email: contact.email,
                name: contact.name || undefined,
                company: contact.company || undefined,
                phone: contact.phone || undefined,
                user_email: userEmail,
              });
              return true;
            } catch (error) {
              componentLogger.error(
                "Error importing contact",
                error instanceof Error ? error : undefined,
              );
              return false;
            }
          }),
        );

        successCount += results.filter(Boolean).length;
        toast.loading(
          `Importing contacts... (${Math.min(index + batch.length, contactsToImport.length)}/${contactsToImport.length})`,
          { id: toastId },
        );
      }

      const totalCount = contactsToImport.length;
      const failedCount = totalCount - successCount;

      if (successCount === totalCount) {
        toast.success(
          `Successfully imported ${successCount} contacts from Google`,
          {
            id: toastId,
          },
        );
      } else if (successCount === 0) {
        toast.error(`0 of ${totalCount} contacts imported from Google`, {
          id: toastId,
        });
      } else {
        toast.warning(
          `${successCount} of ${totalCount} contacts imported, ${failedCount} failed`,
          {
            id: toastId,
          },
        );
      }

      closeGmailImportDialog();
      onImportComplete();
    } finally {
      setIsImporting(false);
    }
  };

  const toggleGmailContactSelection = (email: string) => {
    setSelectedGmailContacts((current) => {
      const next = new Set(current);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const toggleAllGmailContacts = () => {
    if (selectedGmailContacts.size === gmailContacts.length) {
      setSelectedGmailContacts(new Set());
      return;
    }

    setSelectedGmailContacts(
      new Set(gmailContacts.map((contact) => contact.email)),
    );
  };

  return {
    showGmailImport,
    gmailContacts,
    selectedGmailContacts,
    isLoadingGmail,
    gmailImportError,
    isImporting,
    setShowGmailImport,
    fetchGmailContacts,
    openGmailImportDialog,
    closeGmailImportDialog,
    importSelectedGmailContacts,
    toggleGmailContactSelection,
    toggleAllGmailContacts,
  };
}
