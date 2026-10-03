import { FolderPlus, MoreVertical, Tag, Trash2, Users, Edit } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabsContent } from "@/components/ui/tabs";
import type { ContactGroup } from "@/lib/appwrite";

interface ContactGroupsTabProps {
  groups: ContactGroup[];
  getGroupColor: (color?: string) => string;
  onSetSelectedGroup: (groupId: string) => void;
  onSetActiveTab: (tab: string) => void;
  onEditGroup: (group: ContactGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
}

export function ContactGroupsTab({
  groups,
  getGroupColor,
  onSetSelectedGroup,
  onSetActiveTab,
  onEditGroup,
  onDeleteGroup,
  onOpenCreateGroup,
}: ContactGroupsTabProps) {
  return (
    <TabsContent value="groups" className="space-y-6">
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.$id} className="group hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${getGroupColor(group.color)} flex items-center justify-center`}
                    >
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.contact_ids.length} contact
                        {group.contact_ids.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditGroup(group)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!group.$id}
                        onClick={() => {
                          if (group.$id) {
                            onSetSelectedGroup(group.$id);
                            onSetActiveTab("contacts");
                          }
                        }}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        View Contacts
                      </DropdownMenuItem>
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
                            <AlertDialogTitle>Delete Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{group.name}"? Contacts will not be
                              deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={!group.$id}
                              onClick={() => group.$id && onDeleteGroup(group.$id)}
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
                {group.description && (
                  <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!group.$id}
                  onClick={() => {
                    if (group.$id) {
                      onSetSelectedGroup(group.$id);
                      onSetActiveTab("contacts");
                    }
                  }}
                >
                  View Contacts
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create groups to organize your contacts and send targeted campaigns
              </p>
              <Button onClick={onOpenCreateGroup}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
