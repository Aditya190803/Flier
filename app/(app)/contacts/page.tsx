"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Users,
  Mail,
  Download,
  Upload,
  Tag,
  CloudDownload,
} from "lucide-react";

import { ContactGroupsTab } from "@/components/contacts/contact-groups-tab";
import { ContactListTab } from "@/components/contacts/contact-list-tab";
import { ContactManagementDialogs } from "@/components/contacts/contact-management-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useContactActions } from "@/hooks/useContactActions";
import { useContactImportExport } from "@/hooks/useContactImportExport";
import { useContactsData, type Contact } from "@/hooks/useContactsData";
import { useGmailContactsImport } from "@/hooks/useGmailContactsImport";
import { usePagination } from "@/hooks/usePagination";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
import type { ContactGroup } from "@/lib/appwrite";
import {
  getAllTags,
  getContactGroups,
  getGroupColor,
  GROUP_COLORS,
} from "@/lib/contacts/groups";
import { addTagToContact, removeTagFromContact } from "@/lib/contacts/tags";

import {
  AddContactDialog,
  type NewContactState,
} from "./components/add-contact-dialog";
import { ContactCard } from "./components/contact-card";
import { ContactsPageSkeleton } from "./components/contacts-page-skeleton";
import {
  CreateGroupDialog,
  type NewGroupState,
} from "./components/create-group-dialog";

export default function ContactsPage() {
  const { session, status } = useAuthGuard();
  const {
    contacts,
    setContacts,
    groups,
    isLoadingData,
    fetchContacts,
    fetchGroups,
  } = useContactsData(session?.user?.email ?? undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [selectedContactForGroup, setSelectedContactForGroup] =
    useState<Contact | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts");
  const [viewMode, setViewMode] = useState<"grid" | "virtual">("grid");
  const [newContact, setNewContact] = useState<NewContactState>({
    email: "",
    name: "",
    company: "",
    phone: "",
    tags: [],
  });
  const [newTag, setNewTag] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showEditContact, setShowEditContact] = useState(false);
  const [newGroup, setNewGroup] = useState<NewGroupState>({
    name: "",
    description: "",
    color: "blue",
  });

  const {
    isLoading,
    addContact,
    updateContact,
    deleteContact,
    createGroup,
    updateGroup,
    deleteGroup,
    addContactToGroup,
    removeContactFromGroup,
  } = useContactActions({
    userEmail: session?.user?.email,
    contacts,
    setContacts,
    fetchContacts,
    fetchGroups,
    selectedGroup,
    setSelectedGroup,
  });

  const { exportContacts, handleFileImport } = useContactImportExport({
    userEmail: session?.user?.email,
    contacts,
    fetchContacts,
  });

  // Filtered contacts - moved before conditional returns to ensure hook order is consistent
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesGroup =
      !selectedGroup ||
      groups
        .find((g) => g.$id === selectedGroup)
        ?.contact_ids.includes(contact.$id);

    const matchesTag = !selectedTag || contact.tags?.includes(selectedTag);

    return matchesSearch && matchesGroup && matchesTag;
  });

  // Pagination hook for contacts - must be called before any conditional returns
  const contactsPagination = usePagination(filteredContacts, { pageSize: 12 });

  // Virtual scroll hook for large lists
  const virtualScroll = useVirtualScroll(filteredContacts, {
    itemHeight: 80,
    containerHeight: 600,
    overscan: 5,
  });

  // Reset pagination when filters change
  useEffect(() => {
    contactsPagination.reset();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedGroup, selectedTag, contactsPagination.reset]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (dateValue: string) => {
    if (!isMounted) {
      return "";
    }
    try {
      return new Date(dateValue).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const renderContactCard = (contact: Contact) => (
    <ContactCard
      key={contact.$id}
      contact={contact}
      contactGroups={getContactGroups(groups, contact.$id)}
      formatDate={formatDate}
      getGroupColor={getGroupColor}
      onEdit={(c) => {
        setEditingContact(c);
        setShowEditContact(true);
      }}
      onAddToGroup={(c) => {
        setSelectedContactForGroup(c);
        setShowAddToGroup(true);
      }}
      onRemoveFromGroup={removeContactFromGroup}
      onDelete={deleteContact}
    />
  );

  const {
    showGmailImport,
    gmailContacts,
    selectedGmailContacts,
    isLoadingGmail,
    gmailImportError,
    isImporting,
    openGmailImportDialog,
    closeGmailImportDialog,
    importSelectedGmailContacts,
    toggleGmailContactSelection,
    toggleAllGmailContacts,
    fetchGmailContacts,
  } = useGmailContactsImport({
    userEmail: session?.user?.email ?? undefined,
    existingContacts: contacts,
    onImportComplete: fetchContacts,
  });

  const handleAddContact = () => {
    addContact(newContact);
    setNewContact({ email: "", name: "", company: "", phone: "", tags: [] });
    setNewTag("");
    setShowAddForm(false);
  };

  const handleCreateGroup = () => {
    createGroup(newGroup);
    setNewGroup({ name: "", description: "", color: "blue" });
    setShowGroupForm(false);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) {
      return;
    }
    updateGroup(editingGroup);
    setShowEditGroup(false);
    setEditingGroup(null);
  };

  const handleUpdateContact = async () => {
    if (!editingContact) {
      return;
    }
    updateContact(editingContact);
    setShowEditContact(false);
    setEditingContact(null);
  };

  const handleAddContactToGroup = async (
    contactId: string,
    groupId: string,
  ) => {
    addContactToGroup(contactId, groupId);
    setShowAddToGroup(false);
    setSelectedContactForGroup(null);
  };

  if (status === "loading" || !isMounted || isLoadingData) {
    return <ContactsPageSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Contacts</h1>
            <p className="text-muted-foreground">
              Manage your email contacts and groups
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddContactDialog
              open={showAddForm}
              onOpenChange={setShowAddForm}
              newContact={newContact}
              setNewContact={setNewContact}
              newTag={newTag}
              setNewTag={setNewTag}
              isLoading={isLoading}
              onAddContact={handleAddContact}
            />

            <CreateGroupDialog
              open={showGroupForm}
              onOpenChange={setShowGroupForm}
              newGroup={newGroup}
              setNewGroup={setNewGroup}
              isLoading={isLoading}
              onCreateGroup={handleCreateGroup}
            />

            <Button
              variant="outline"
              onClick={exportContacts}
              disabled={contacts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <div className="relative">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <Button variant="outline" onClick={openGmailImportDialog}>
              <CloudDownload className="h-4 w-4 mr-2" />
              Import from Gmail
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts
              <Badge variant="secondary" className="ml-1">
                {contacts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Groups
              <Badge variant="secondary" className="ml-1">
                {groups.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <ContactListTab
            searchTerm={searchTerm}
            selectedGroup={selectedGroup}
            selectedTag={selectedTag}
            viewMode={viewMode}
            groups={groups}
            filteredContacts={filteredContacts}
            contactsPagination={contactsPagination}
            virtualScroll={virtualScroll}
            renderContactCard={renderContactCard}
            getAllTags={() => getAllTags(contacts)}
            getGroupColor={getGroupColor}
            onSearchTermChange={setSearchTerm}
            onSetViewMode={setViewMode}
            onResetFilters={() => {
              setSelectedGroup(null);
              setSelectedTag(null);
            }}
            onSelectGroup={(groupId) => {
              setSelectedGroup(groupId);
              setSelectedTag(null);
            }}
            onSetSelectedTag={setSelectedTag}
            onSetEditingContact={setEditingContact}
            onSetShowEditContact={setShowEditContact}
            onSetSelectedContactForGroup={setSelectedContactForGroup}
            onSetShowAddToGroup={setShowAddToGroup}
            onDeleteContact={deleteContact}
            onOpenAddContact={() => setShowAddForm(true)}
            onHandleFileImport={handleFileImport}
          />

          <ContactGroupsTab
            groups={groups}
            getGroupColor={getGroupColor}
            onSetSelectedGroup={(groupId) => setSelectedGroup(groupId)}
            onSetActiveTab={setActiveTab}
            onEditGroup={(group) => {
              setEditingGroup(group);
              setShowEditGroup(true);
            }}
            onDeleteGroup={deleteGroup}
            onOpenCreateGroup={() => setShowGroupForm(true)}
          />
        </Tabs>

        {/* Quick Action */}
        {contacts.length > 0 && (
          <Card className="mt-8 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Ready to send?</h3>
                  <p className="text-muted-foreground">
                    Use your contacts in an email campaign
                  </p>
                </div>
                <Button asChild>
                  <Link href="/compose">
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Email
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <ContactManagementDialogs
        groups={groups}
        groupColors={GROUP_COLORS}
        getGroupColor={getGroupColor}
        showAddToGroup={showAddToGroup}
        selectedContactForGroup={selectedContactForGroup}
        showEditGroup={showEditGroup}
        editingGroup={editingGroup}
        showEditContact={showEditContact}
        editingContact={editingContact}
        newTag={newTag}
        showGmailImport={showGmailImport}
        gmailContacts={gmailContacts}
        selectedGmailContacts={selectedGmailContacts}
        isLoadingGmail={isLoadingGmail}
        isImporting={isImporting}
        gmailImportError={gmailImportError}
        onSetShowAddToGroup={setShowAddToGroup}
        onSetShowGroupForm={setShowGroupForm}
        onAddContactToGroup={handleAddContactToGroup}
        onSetShowEditGroup={setShowEditGroup}
        onSetEditingGroup={setEditingGroup}
        onUpdateGroup={handleUpdateGroup}
        onSetShowEditContact={setShowEditContact}
        onSetEditingContact={setEditingContact}
        onSetNewTag={setNewTag}
        onAddTagToContact={addTagToContact}
        onRemoveTagFromContact={removeTagFromContact}
        onUpdateContact={handleUpdateContact}
        onGmailOpenChange={(open) => {
          if (open) {
            fetchGmailContacts();
          } else {
            closeGmailImportDialog();
          }
        }}
        onGmailRetry={fetchGmailContacts}
        onGmailToggleAll={toggleAllGmailContacts}
        onGmailToggleContact={toggleGmailContactSelection}
        onGmailImport={importSelectedGmailContacts}
      />
    </div>
  );
}
