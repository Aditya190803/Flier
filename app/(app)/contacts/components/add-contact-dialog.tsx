import { UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addTagToContact, removeTagFromContact } from "@/lib/contacts/tags";

export interface NewContactState {
  email: string;
  name: string;
  company: string;
  phone: string;
  tags: string[];
}

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newContact: NewContactState;
  setNewContact: (value: NewContactState) => void;
  newTag: string;
  setNewTag: (value: string) => void;
  isLoading: boolean;
  onAddContact: () => void;
}

export function AddContactDialog({
  open,
  onOpenChange,
  newContact,
  setNewContact,
  newTag,
  setNewTag,
  isLoading,
  onAddContact,
}: AddContactDialogProps) {
  const addTag = () => {
    if (newTag.trim()) {
      setNewContact({
        ...newContact,
        tags: addTagToContact(newContact.tags, newTag),
      });
      setNewTag("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>Add a new contact to your list</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              placeholder="John Doe"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email *</label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Company</label>
            <Input
              placeholder="Acme Corp"
              value={newContact.company}
              onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              placeholder="+1 (555) 123-4567"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
            {newContact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {newContact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setNewContact({
                          ...newContact,
                          tags: removeTagFromContact(newContact.tags, tag),
                        })
                      }
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Press Enter or click Add to add a tag</p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onAddContact}
              disabled={isLoading || !newContact.name.trim() || !newContact.email.trim()}
              className="flex-1"
            >
              Add Contact
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
