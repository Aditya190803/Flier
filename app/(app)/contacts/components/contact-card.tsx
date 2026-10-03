import Link from "next/link";

import {
  Building,
  Clock,
  Edit,
  Mail,
  MoreVertical,
  Phone,
  Send,
  Tag,
  Trash2,
  UserMinus,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Contact } from "@/hooks/useContactsData";
import type { ContactGroup } from "@/lib/appwrite";

interface ContactCardProps {
  contact: Contact;
  contactGroups: ContactGroup[];
  formatDate: (dateValue: string) => string;
  getGroupColor: (color?: string) => string;
  onEdit: (contact: Contact) => void;
  onAddToGroup: (contact: Contact) => void;
  onRemoveFromGroup: (contactId: string, groupId: string) => void;
  onDelete: (contactId: string) => void;
}

export function ContactCard({
  contact,
  contactGroups,
  formatDate,
  getGroupColor,
  onEdit,
  onAddToGroup,
  onRemoveFromGroup,
  onDelete,
}: ContactCardProps) {
  return (
    <Card className="group h-full hover:shadow-md transition-all">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            {contact.name && (
              <h3 className="font-semibold text-foreground truncate mb-1">{contact.name}</h3>
            )}
            <div className="flex items-center gap-2 text-sm text-primary">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(contact)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddToGroup(contact)}>
                <Tag className="h-4 w-4 mr-2" />
                Add to Group
              </DropdownMenuItem>
              {contactGroups.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {contactGroups.map((group) => (
                    <DropdownMenuItem
                      key={group.$id}
                      onClick={() => onRemoveFromGroup(contact.$id, group.$id!)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove from {group.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {contact.name || contact.email}? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(contact.$id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          {contact.company && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{contact.company}</span>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{contact.phone}</span>
            </div>
          )}
        </div>

        {/* Contact Groups */}
        {contactGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {contactGroups.map((group) => (
              <Badge key={group.$id} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${getGroupColor(group.color)}`} />
                {group.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Added {formatDate(contact.created_at)}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
            <Link href={`/compose?to=${encodeURIComponent(contact.email)}`}>
              <Send className="h-3 w-3 mr-1" />
              Send
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
