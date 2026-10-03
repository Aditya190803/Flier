import type { ChangeEvent, ReactNode, RefObject } from "react";

import Link from "next/link";

import {
  Building,
  Edit,
  FileSpreadsheet,
  Mail,
  MoreVertical,
  Search,
  Send,
  Tag,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Pagination } from "@/components/pagination";
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
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import type { ContactGroup } from "@/lib/appwrite";
import { clientLogger } from "@/lib/client-logger";

interface Contact {
  $id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  created_at: string;
  user_email: string;
}

interface ContactsPagination {
  paginatedItems: Contact[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getPageNumbers: () => number[];
}

interface VirtualItem {
  top: number;
  height: number;
  data: Contact;
}

interface VirtualScrollState {
  containerRef: RefObject<HTMLDivElement | null>;
  totalHeight: number;
  virtualItems: VirtualItem[];
}

interface ContactListTabProps {
  searchTerm: string;
  selectedGroup: string | null;
  selectedTag: string | null;
  viewMode: "grid" | "virtual";
  groups: ContactGroup[];
  filteredContacts: Contact[];
  contactsPagination: ContactsPagination;
  virtualScroll: VirtualScrollState;
  renderContactCard: (contact: Contact) => ReactNode;
  getAllTags: () => string[];
  getGroupColor: (color?: string) => string;
  onSearchTermChange: (value: string) => void;
  onSetViewMode: (mode: "grid" | "virtual") => void;
  onResetFilters: () => void;
  onSelectGroup: (groupId: string) => void;
  onSetSelectedTag: (tag: string | null) => void;
  onSetEditingContact: (contact: Contact) => void;
  onSetShowEditContact: (open: boolean) => void;
  onSetSelectedContactForGroup: (contact: Contact) => void;
  onSetShowAddToGroup: (open: boolean) => void;
  onDeleteContact: (contactId: string) => Promise<void>;
  onOpenAddContact: () => void;
  onHandleFileImport: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function ContactListTab({
  searchTerm,
  selectedGroup,
  selectedTag,
  viewMode,
  groups,
  filteredContacts,
  contactsPagination,
  virtualScroll,
  renderContactCard,
  getAllTags,
  getGroupColor,
  onSearchTermChange,
  onSetViewMode,
  onResetFilters,
  onSelectGroup,
  onSetSelectedTag,
  onSetEditingContact,
  onSetShowEditContact,
  onSetSelectedContactForGroup,
  onSetShowAddToGroup,
  onDeleteContact,
  onOpenAddContact,
  onHandleFileImport,
}: ContactListTabProps) {
  const selectedGroupName = selectedGroup
    ? groups.find((group) => group.$id === selectedGroup)?.name
    : null;

  return (
    <TabsContent value="contacts" className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-2 bg-muted p-1 rounded-md self-start">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetViewMode("grid")}
            className="h-8 px-3"
          >
            Grid
          </Button>
          <Button
            variant={viewMode === "virtual" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetViewMode("virtual")}
            className="h-8 px-3"
          >
            Virtual List
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedGroup === null && selectedTag === null ? "secondary" : "outline"}
            size="sm"
            onClick={onResetFilters}
          >
            All Contacts
          </Button>
          {groups.map((group) => {
            const groupId = group.$id;
            if (!groupId) {
              return null;
            }
            return (
              <Button
                key={groupId}
                variant={selectedGroup === groupId ? "secondary" : "outline"}
                size="sm"
                onClick={() => onSelectGroup(groupId)}
                className="flex items-center gap-2"
              >
                <span className={`w-2 h-2 rounded-full ${getGroupColor(group.color)}`} />
                {group.name}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {group.contact_ids?.length ?? 0}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {getAllTags().length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground mr-2">Filter by tag:</span>
          {getAllTags().map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20"
              onClick={() => onSetSelectedTag(selectedTag === tag ? null : tag)}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
          {selectedTag && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetSelectedTag(null)}
              className="text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {filteredContacts.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {viewMode === "grid" ? (
                <>
                  Showing {contactsPagination.startIndex + 1} to{" "}
                  {Math.min(contactsPagination.endIndex + 1, filteredContacts.length)} of{" "}
                  {filteredContacts.length} contacts
                </>
              ) : (
                <>Showing {filteredContacts.length} contacts (Virtual Scrolling)</>
              )}
              {selectedGroupName && ` in "${selectedGroupName}"`}
            </p>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {contactsPagination.paginatedItems.map((contact) => renderContactCard(contact))}
            </div>
          ) : (
            <div
              ref={virtualScroll.containerRef}
              className="h-[600px] overflow-auto border rounded-lg bg-muted/30 p-4"
            >
              <div
                style={{
                  height: `${virtualScroll.totalHeight}px`,
                  position: "relative",
                }}
              >
                {virtualScroll.virtualItems.map((virtualItem) => (
                  <div
                    key={virtualItem.data.$id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.height}px`,
                      transform: `translateY(${virtualItem.top}px)`,
                      paddingBottom: "8px",
                    }}
                  >
                    <div className="h-full bg-background rounded-lg border shadow-sm p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {(virtualItem.data.name || virtualItem.data.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {virtualItem.data.name || "No Name"}
                          </div>
                          <div className="text-sm text-muted-foreground truncate flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {virtualItem.data.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {virtualItem.data.company && (
                          <Badge variant="outline" className="hidden md:flex">
                            <Building className="h-3 w-3 mr-1" />
                            {virtualItem.data.company}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                          asChild
                        >
                          <Link href={`/compose?to=${encodeURIComponent(virtualItem.data.email)}`}>
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                onSetEditingContact(virtualItem.data);
                                onSetShowEditContact(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                onSetSelectedContactForGroup(virtualItem.data);
                                onSetShowAddToGroup(true);
                              }}
                            >
                              <Tag className="h-4 w-4 mr-2" />
                              Add to Group
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                void onDeleteContact(virtualItem.data.$id).catch((error) => {
                                  clientLogger.error(
                                    "Failed to delete contact",
                                    error instanceof Error ? error : undefined,
                                  );
                                  toast.error("Failed to delete contact. Please try again.");
                                });
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === "grid" && filteredContacts.length > contactsPagination.pageSize && (
            <div className="mt-6">
              <Pagination
                currentPage={contactsPagination.currentPage}
                totalPages={contactsPagination.totalPages}
                pageSize={contactsPagination.pageSize}
                totalItems={contactsPagination.totalItems}
                hasPreviousPage={contactsPagination.hasPreviousPage}
                hasNextPage={contactsPagination.hasNextPage}
                onPageChange={contactsPagination.goToPage}
                onPageSizeChange={contactsPagination.setPageSize}
                getPageNumbers={contactsPagination.getPageNumbers}
                startIndex={contactsPagination.startIndex}
                endIndex={contactsPagination.endIndex}
              />
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || selectedGroup || selectedTag
                  ? "No contacts found"
                  : "No contacts yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchTerm || selectedGroup || selectedTag
                  ? "Try adjusting your search or filter"
                  : "Get started by adding your first contact or importing a CSV file"}
              </p>
              {!searchTerm && !selectedGroup && !selectedTag && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={onOpenAddContact}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                  <div className="relative">
                    <Button variant="outline">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Import CSV
                    </Button>
                    <input
                      type="file"
                      accept=".csv"
                      aria-label="Import contacts CSV"
                      onChange={onHandleFileImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
