import { CheckCircle, Users } from "lucide-react";

import { GmailImportDialog } from "@/components/contacts/gmail-import-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ContactGroup } from "@/lib/appwrite";

interface ContactRecord {
  $id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  created_at: string;
  user_email: string;
}

interface GroupColor {
  value: string;
  label: string;
  class: string;
}

interface ContactManagementDialogsProps {
  groups: ContactGroup[];
  groupColors: GroupColor[];
  getGroupColor: (color?: string) => string;
  showAddToGroup: boolean;
  selectedContactForGroup: ContactRecord | null;
  showEditGroup: boolean;
  editingGroup: ContactGroup | null;
  showEditContact: boolean;
  editingContact: ContactRecord | null;
  newTag: string;
  showGmailImport: boolean;
  gmailContacts: any[];
  selectedGmailContacts: Set<string>;
  isLoadingGmail: boolean;
  isImporting: boolean;
  gmailImportError: string | null;
  onSetShowAddToGroup: (open: boolean) => void;
  onSetShowGroupForm: (open: boolean) => void;
  onAddContactToGroup: (contactId: string, groupId: string) => Promise<void>;
  onSetShowEditGroup: (open: boolean) => void;
  onSetEditingGroup: (group: ContactGroup | null) => void;
  onUpdateGroup: () => Promise<void>;
  onSetShowEditContact: (open: boolean) => void;
  onSetEditingContact: (contact: ContactRecord | null) => void;
  onSetNewTag: (value: string) => void;
  onAddTagToContact: (tagList: string[], tag: string) => string[];
  onRemoveTagFromContact: (tagList: string[], tag: string) => string[];
  onUpdateContact: () => Promise<void>;
  onGmailOpenChange: (open: boolean) => void;
  onGmailRetry: () => Promise<void>;
  onGmailToggleAll: () => void;
  onGmailToggleContact: (email: string) => void;
  onGmailImport: () => Promise<void>;
}

export function ContactManagementDialogs({
  groups,
  groupColors,
  getGroupColor,
  showAddToGroup,
  selectedContactForGroup,
  showEditGroup,
  editingGroup,
  showEditContact,
  editingContact,
  newTag,
  showGmailImport,
  gmailContacts,
  selectedGmailContacts,
  isLoadingGmail,
  isImporting,
  gmailImportError,
  onSetShowAddToGroup,
  onSetShowGroupForm,
  onAddContactToGroup,
  onSetShowEditGroup,
  onSetEditingGroup,
  onUpdateGroup,
  onSetShowEditContact,
  onSetEditingContact,
  onSetNewTag,
  onAddTagToContact,
  onRemoveTagFromContact,
  onUpdateContact,
  onGmailOpenChange,
  onGmailRetry,
  onGmailToggleAll,
  onGmailToggleContact,
  onGmailImport,
}: ContactManagementDialogsProps) {
  return (
    <>
      <Dialog open={showAddToGroup} onOpenChange={onSetShowAddToGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Group</DialogTitle>
            <DialogDescription>
              Select a group to add{" "}
              {selectedContactForGroup?.name || selectedContactForGroup?.email} to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            {groups.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No groups yet</p>
                <Button
                  onClick={() => {
                    onSetShowAddToGroup(false);
                    onSetShowGroupForm(true);
                  }}
                >
                  Create Group
                </Button>
              </div>
            ) : (
              groups.map((group) => {
                const isInGroup =
                  selectedContactForGroup &&
                  group.contact_ids.includes(selectedContactForGroup.$id);
                return (
                  <button
                    key={group.$id}
                    disabled={!!isInGroup}
                    onClick={() =>
                      selectedContactForGroup?.$id &&
                      group?.$id &&
                      onAddContactToGroup(selectedContactForGroup.$id, group.$id)
                    }
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isInGroup ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${getGroupColor(group.color)} flex items-center justify-center`}
                    >
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.contact_ids.length} contacts
                      </p>
                    </div>
                    {isInGroup && <CheckCircle className="h-5 w-5 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditGroup} onOpenChange={onSetShowEditGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group details</DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="group-name" className="text-sm font-medium">
                  Group Name *
                </label>
                <Input
                  id="group-name"
                  value={editingGroup.name}
                  onChange={(e) => onSetEditingGroup({ ...editingGroup, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="group-description"
                  value={editingGroup.description || ""}
                  onChange={(e) =>
                    onSetEditingGroup({
                      ...editingGroup,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {groupColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() =>
                        onSetEditingGroup({
                          ...editingGroup,
                          color: color.value,
                        })
                      }
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        editingGroup.color === color.value
                          ? "ring-2 ring-offset-2 ring-primary"
                          : ""
                      }`}
                      title={color.label}
                      aria-label={color.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={onUpdateGroup}
                  disabled={!editingGroup.name.trim()}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onSetShowEditGroup(false);
                    onSetEditingGroup(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditContact} onOpenChange={onSetShowEditContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="contact-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="contact-name"
                  value={editingContact.name || ""}
                  onChange={(e) =>
                    onSetEditingContact({
                      ...editingContact,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-email" className="text-sm font-medium">
                  Email *
                </label>
                <Input
                  id="contact-email"
                  type="email"
                  value={editingContact.email}
                  onChange={(e) =>
                    onSetEditingContact({
                      ...editingContact,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-company" className="text-sm font-medium">
                  Company
                </label>
                <Input
                  id="contact-company"
                  value={editingContact.company || ""}
                  onChange={(e) =>
                    onSetEditingContact({
                      ...editingContact,
                      company: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-phone" className="text-sm font-medium">
                  Phone
                </label>
                <Input
                  id="contact-phone"
                  value={editingContact.phone || ""}
                  onChange={(e) =>
                    onSetEditingContact({
                      ...editingContact,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-tags" className="text-sm font-medium">
                  Tags
                </label>
                <div className="flex gap-2">
                  <Input
                    id="contact-tags"
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => onSetNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newTag.trim()) {
                          onSetEditingContact({
                            ...editingContact,
                            tags: onAddTagToContact(editingContact.tags || [], newTag),
                          });
                          onSetNewTag("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newTag.trim()) {
                        onSetEditingContact({
                          ...editingContact,
                          tags: onAddTagToContact(editingContact.tags || [], newTag),
                        });
                        onSetNewTag("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                {editingContact.tags && editingContact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingContact.tags.map((tag, index) => (
                      <Badge
                        key={`${tag}-${index}`}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            onSetEditingContact({
                              ...editingContact,
                              tags: onRemoveTagFromContact(editingContact.tags || [], tag),
                            })
                          }
                          className="ml-1 hover:text-destructive"
                          aria-label={`Remove tag ${tag}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={onUpdateContact}
                  disabled={!editingContact.email.trim()}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onSetShowEditContact(false);
                    onSetEditingContact(null);
                    onSetNewTag("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GmailImportDialog
        open={showGmailImport}
        gmailContacts={gmailContacts}
        selectedGmailContacts={selectedGmailContacts}
        isLoadingGmail={isLoadingGmail}
        isImporting={isImporting}
        gmailImportError={gmailImportError}
        onOpenChange={onGmailOpenChange}
        onRetry={onGmailRetry}
        onToggleAll={onGmailToggleAll}
        onToggleContact={onGmailToggleContact}
        onImport={onGmailImport}
      />
    </>
  );
}
