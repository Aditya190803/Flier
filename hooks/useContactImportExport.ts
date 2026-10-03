"use client";

import { toast } from "sonner";

import type { Contact } from "@/hooks/useContactsData";
import { contactsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

interface UseContactImportExportArgs {
  userEmail: string | undefined | null;
  contacts: Contact[];
  fetchContacts: () => void | Promise<void>;
}

/**
 * CSV export/import for the Contacts page.
 */
export function useContactImportExport({
  userEmail,
  contacts,
  fetchContacts,
}: UseContactImportExportArgs) {
  const exportContacts = () => {
    if (contacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }

    const csvContent = [
      ["Email", "Name", "Company", "Phone"],
      ...contacts.map((contact) => [
        contact.email,
        contact.name || "",
        contact.company || "",
        contact.phone || "",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Contacts exported!");
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userEmail) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const dataLines = lines.slice(1);

        const contactsToImport = dataLines
          .map((line) => {
            const [email, name, company, phone] = line
              .split(",")
              .map((field) => field.replace(/"/g, "").trim());
            return { email, name, company, phone };
          })
          .filter((contact) => contact.email && contact.email.includes("@"));

        if (contactsToImport.length > 0) {
          const toastId = toast.loading(`Importing ${contactsToImport.length} contacts...`);
          let successCount = 0;

          for (const contact of contactsToImport) {
            try {
              await contactsService.create({
                email: contact.email,
                name: contact.name || undefined,
                company: contact.company || undefined,
                phone: contact.phone || undefined,
                user_email: userEmail,
              });
              successCount++;
              // Update progress toast every 5 contacts
              if (successCount % 5 === 0) {
                toast.loading(
                  `Importing contacts... (${successCount}/${contactsToImport.length})`,
                  { id: toastId },
                );
              }
            } catch (error) {
              componentLogger.error(
                "Error importing contact",
                error instanceof Error ? error : undefined,
              );
            }
          }

          toast.success(`Successfully imported ${successCount} contacts`, {
            id: toastId,
          });
          fetchContacts();
        } else {
          toast.error("No valid email addresses found");
        }
      } catch (error) {
        componentLogger.error("File processing error", error instanceof Error ? error : undefined);
        toast.error("Error processing file");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  return { exportContacts, handleFileImport };
}
