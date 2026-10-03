import { CheckCircle, CloudDownload, Mail, RefreshCw, UserPlus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GmailContact {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface GmailImportDialogProps {
  open: boolean;
  gmailContacts: GmailContact[];
  selectedGmailContacts: Set<string>;
  isLoadingGmail: boolean;
  isImporting: boolean;
  gmailImportError: string | null;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onToggleAll: () => void;
  onToggleContact: (email: string) => void;
  onImport: () => void;
}

export function GmailImportDialog({
  open,
  gmailContacts,
  selectedGmailContacts,
  isLoadingGmail,
  isImporting,
  gmailImportError,
  onOpenChange,
  onRetry,
  onToggleAll,
  onToggleContact,
  onImport,
}: GmailImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownload className="h-5 w-5" />
            Import from Google Contacts
          </DialogTitle>
          <DialogDescription>Select contacts from your Google account to import</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoadingGmail ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Fetching your Google contacts...</p>
            </div>
          ) : gmailImportError ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-destructive mb-4">{gmailImportError}</p>
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : gmailContacts.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No new contacts to import</p>
              <p className="text-sm text-muted-foreground mt-1">
                All your Google contacts are already imported
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedGmailContacts.size === gmailContacts.length}
                    onChange={onToggleAll}
                    className="rounded border-input"
                  />
                  <span className="text-sm font-medium">
                    Select All ({gmailContacts.length} contacts)
                  </span>
                </div>
                <Badge variant="secondary">{selectedGmailContacts.size} selected</Badge>
              </div>

              <div className="max-h-[40vh] overflow-y-auto space-y-2">
                {gmailContacts.map((contact) => (
                  <div
                    key={contact.email}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedGmailContacts.has(contact.email)
                        ? "bg-primary/5 border-primary/30"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => onToggleContact(contact.email)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGmailContacts.has(contact.email)}
                      onChange={() => onToggleContact(contact.email)}
                      className="rounded border-input"
                      onClick={(event) => event.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name || contact.email}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.email}
                        {contact.company && ` • ${contact.company}`}
                      </p>
                    </div>
                    {selectedGmailContacts.has(contact.email) && (
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={onImport}
                  disabled={isImporting || selectedGmailContacts.size === 0}
                  className="flex-1"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Import {selectedGmailContacts.size} Contact
                      {selectedGmailContacts.size !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
