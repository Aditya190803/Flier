import { Mail, FileSpreadsheet, Tag, Trash2, Users, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { LazyCSVUpload } from "@/components/lazy-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CSVRow } from "@/types/email";

import { SavedAudiences } from "./saved-audiences";
import type { Contact, ContactGroup } from "./compose-types";

interface ManualEntry {
  email: string;
  name: string;
}

interface RecipientsStepProps {
  manualEmail: string;
  manualName: string;
  manualEntries: ManualEntry[];
  csvData: CSVRow[];
  groups: ContactGroup[];
  selectedGroups: Set<string>;
  contacts: Contact[];
  selectedContacts: Set<string>;
  recipients: string[];
  setManualEmail: (value: string) => void;
  setManualName: (value: string) => void;
  addManualEntry: () => void;
  handleCsvData: (data: CSVRow[]) => void;
  toggleGroup: (groupId: string) => void;
  toggleContact: (contactId: string, email: string) => void;
  removeRecipient: (email: string) => void;
  clearAllRecipients: () => void;
}

function getGroupColorClass(color?: string): string {
  switch (color) {
    case "blue":
      return "bg-blue-500";
    case "green":
      return "bg-green-500";
    case "purple":
      return "bg-purple-500";
    case "orange":
      return "bg-orange-500";
    case "pink":
      return "bg-pink-500";
    case "red":
      return "bg-red-500";
    case "yellow":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
}

export function RecipientsStep({
  manualEmail,
  manualName,
  manualEntries,
  csvData,
  groups,
  selectedGroups,
  contacts,
  selectedContacts,
  recipients,
  setManualEmail,
  setManualName,
  addManualEntry,
  handleCsvData,
  toggleGroup,
  toggleContact,
  removeRecipient,
  clearAllRecipients,
}: RecipientsStepProps) {
  return (
    <div className="divide-y divide-border/70 -mx-4 md:-mx-6 lg:-mx-8">
      <SavedAudiences groups={groups} onApply={handleCsvData} />
      <section className="px-4 md:px-6 lg:px-8 py-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl border bg-muted/20 flex items-center justify-center text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Add recipients manually</h3>
            <p className="text-sm text-muted-foreground">
              Add recipients one by one. Names can be used for personalisation.
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="manual-email" className="text-xs">
              Email *
            </Label>
            <Input
              id="manual-email"
              type="email"
              placeholder="john@example.com"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManualEntry();
                }
              }}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="manual-name" className="text-xs">
              Name (optional)
            </Label>
            <Input
              id="manual-name"
              type="text"
              placeholder="John Doe"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManualEntry();
                }
              }}
            />
          </div>
          <Button type="button" onClick={addManualEntry} disabled={!manualEmail.trim()}>
            Add
          </Button>
        </div>

        {manualEntries.length > 0 && (
          <div className="space-y-2 mt-4">
            <Label className="text-xs text-muted-foreground">Added manually:</Label>
            <div className="flex flex-wrap gap-2">
              {manualEntries.map((entry, index) => (
                <Badge
                  key={`${entry.email}-${index}`}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {entry.name ? `${entry.name} <${entry.email}>` : entry.email}
                  <button
                    onClick={() => removeRecipient(entry.email)}
                    className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                    type="button"
                    aria-label={`Remove ${entry.email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="px-4 md:px-6 lg:px-8 py-6 bg-primary/[0.035]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl border bg-background/60 flex items-center justify-center text-primary">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">Import from CSV</h3>
                <Badge variant="secondary">Best for bulk</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Use a CSV to unlock full personalisation with fields like{" "}
                <span className="font-mono text-[13px]">{"{name}"}</span>,{" "}
                <span className="font-mono text-[13px]">{"{company}"}</span>, and more.
              </p>
            </div>
          </div>
        </div>
        <LazyCSVUpload onDataLoad={handleCsvData} csvData={csvData} />
        {csvData.length > 0 && (
          <div className="mt-4 space-y-3">
            <Badge variant="success">{csvData.length} rows loaded</Badge>
          </div>
        )}
      </section>

      {groups.length > 0 && (
        <section className="px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl border bg-muted/20 flex items-center justify-center text-muted-foreground">
              <Tag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Contact groups</h3>
              <p className="text-sm text-muted-foreground">
                Add everyone from a group in one click.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => {
              const groupId = group.$id;
              if (!groupId) {
                return null;
              }
              return (
                <button
                  key={groupId}
                  onClick={() => toggleGroup(groupId)}
                  aria-pressed={selectedGroups.has(groupId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    selectedGroups.has(groupId) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                  }`}
                  type="button"
                >
                  <span className={`w-2 h-2 rounded-full ${getGroupColorClass(group.color)}`} />
                  <span className="font-medium">{group.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {group.contact_ids?.length ?? 0}
                  </Badge>
                  {selectedGroups.has(groupId) && <CheckCircle className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="px-4 md:px-6 lg:px-8 py-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl border bg-muted/20 flex items-center justify-center text-muted-foreground">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Contacts</h3>
            <p className="text-sm text-muted-foreground">
              Pick recipients from your saved contacts.
            </p>
          </div>
        </div>
        {contacts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No contacts found. Add contacts from the Contacts page.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {contacts.map((contact) => (
              <label
                key={contact.$id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedContacts.has(contact.$id)
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedContacts.has(contact.$id)}
                  onChange={() => toggleContact(contact.$id, contact.email)}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  {contact.name && <p className="font-medium truncate">{contact.name}</p>}
                  <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                </div>
                {selectedContacts.has(contact.$id) && (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </label>
            ))}
          </div>
        )}
      </section>

      {recipients.length > 0 && (
        <section className="px-4 md:px-6 lg:px-8 py-6 bg-muted/10">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {recipients.length} selected
              </h3>
              <p className="text-sm text-muted-foreground">
                Review and remove recipients before moving on.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearAllRecipients();
                toast.success("All recipients cleared");
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {recipients.map((email, index) => (
              <Badge
                key={`${email}-${index}`}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                {email}
                <button
                  onClick={() => removeRecipient(email)}
                  className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                  type="button"
                  aria-label={`Remove ${email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
