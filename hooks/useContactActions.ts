"use client";

import { useState } from "react";

import { toast } from "sonner";

import type { Contact } from "@/hooks/useContactsData";
import { contactsService, contactGroupsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

interface UseContactActionsArgs {
  userEmail: string | undefined | null;
  contacts: Contact[];
  setContacts: (updater: (prev: Contact[]) => Contact[]) => void;
  fetchContacts: () => void | Promise<void>;
  fetchGroups: () => void | Promise<void>;
  selectedGroup: string | null;
  setSelectedGroup: (groupId: string | null) => void;
}

/**
 * Contact and group CRUD mutations (optimistic where the original page
 * behavior was optimistic) used by the Contacts page.
 */
export function useContactActions({
  userEmail,
  contacts,
  setContacts,
  fetchContacts,
  fetchGroups,
  selectedGroup,
  setSelectedGroup,
}: UseContactActionsArgs) {
  const [isLoading, setIsLoading] = useState(false);

  const addContact = async (newContact: {
    email: string;
    name: string;
    company: string;
    phone: string;
    tags: string[];
  }) => {
    if (!userEmail || !newContact.email.trim()) {
      return;
    }

    // Create an optimistic contact with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticContact = {
      $id: tempId,
      email: newContact.email.trim(),
      name: newContact.name.trim() || undefined,
      company: newContact.company.trim() || undefined,
      phone: newContact.phone.trim() || undefined,
      tags: newContact.tags.length > 0 ? newContact.tags : undefined,
      user_email: userEmail,
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    setContacts((prev) => [optimisticContact as Contact, ...prev]);
    toast.success("Contact added successfully!");

    try {
      // Perform the actual API call in background
      await contactsService.create({
        email: optimisticContact.email,
        name: optimisticContact.name,
        company: optimisticContact.company,
        phone: optimisticContact.phone,
        tags: optimisticContact.tags,
        user_email: userEmail,
      });

      // Refetch to get the actual ID
      fetchContacts();
    } catch (error) {
      // Revert on error
      setContacts((prev) => prev.filter((c) => c.$id !== tempId));
      componentLogger.error("Error adding contact", error instanceof Error ? error : undefined);
      toast.error("Failed to add contact - changes reverted");
    }
  };

  const updateContact = async (editingContact: Contact) => {
    if (!editingContact?.$id) {
      return;
    }

    // Store the previous state for rollback
    const previousContacts = [...contacts];
    const updatedContact = {
      ...editingContact,
      email: editingContact.email.trim(),
      name: editingContact.name?.trim() || undefined,
      company: editingContact.company?.trim() || undefined,
      phone: editingContact.phone?.trim() || undefined,
      tags: editingContact.tags?.length ? editingContact.tags : undefined,
    };

    // Optimistically update UI
    setContacts((prev) => prev.map((c) => (c.$id === editingContact.$id ? updatedContact : c)));
    toast.success("Contact updated!");

    try {
      await contactsService.update(editingContact.$id, {
        email: updatedContact.email,
        name: updatedContact.name,
        company: updatedContact.company,
        phone: updatedContact.phone,
        tags: updatedContact.tags,
      });

      // Refetch to ensure sync
      fetchContacts();
    } catch (error) {
      // Revert on error
      setContacts(() => previousContacts);
      componentLogger.error("Error updating contact", error instanceof Error ? error : undefined);
      toast.error("Failed to update contact - changes reverted");
    }
  };

  const deleteContact = async (contactId: string) => {
    // Store the contact for potential rollback
    const contactToDelete = contacts.find((c) => c.$id === contactId);
    if (!contactToDelete) {
      return;
    }

    // Optimistically remove from UI
    setContacts((prev) => prev.filter((c) => c.$id !== contactId));
    toast.success("Contact deleted");

    try {
      await contactsService.delete(contactId);
      // No need to refetch, real-time subscription will update
    } catch (error) {
      // Revert on error
      setContacts((prev) => [...prev, contactToDelete]);
      componentLogger.error("Error deleting contact", error instanceof Error ? error : undefined);
      toast.error("Failed to delete contact - restored");
    }
  };

  // Group functions
  const createGroup = async (newGroup: { name: string; description: string; color: string }) => {
    if (!userEmail || !newGroup.name.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await contactGroupsService.create({
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || undefined,
        color: newGroup.color,
        contact_ids: [],
        user_email: userEmail,
      });

      toast.success("Group created!");
      fetchGroups();
    } catch (error) {
      componentLogger.error("Error creating group", error instanceof Error ? error : undefined);
      toast.error("Failed to create group");
    }
    setIsLoading(false);
  };

  const updateGroup = async (editingGroup: {
    $id?: string;
    name: string;
    description?: string;
    color?: string;
  }) => {
    if (!editingGroup?.$id) {
      return;
    }

    setIsLoading(true);
    try {
      await contactGroupsService.update(editingGroup.$id, {
        name: editingGroup.name,
        description: editingGroup.description,
        color: editingGroup.color,
      });

      toast.success("Group updated!");
      fetchGroups();
    } catch (error) {
      componentLogger.error("Error updating group", error instanceof Error ? error : undefined);
      toast.error("Failed to update group");
    }
    setIsLoading(false);
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await contactGroupsService.delete(groupId);
      toast.success("Group deleted");
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
      fetchGroups();
    } catch (error) {
      componentLogger.error("Error deleting group", error instanceof Error ? error : undefined);
      toast.error("Failed to delete group");
    }
  };

  const addContactToGroup = async (contactId: string, groupId: string) => {
    try {
      await contactGroupsService.addContacts(groupId, [contactId]);
      toast.success("Contact added to group!");
      fetchGroups();
    } catch (error) {
      componentLogger.error(
        "Error adding contact to group",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add contact to group");
    }
  };

  const removeContactFromGroup = async (contactId: string, groupId: string) => {
    try {
      await contactGroupsService.removeContacts(groupId, [contactId]);
      toast.success("Contact removed from group");
      fetchGroups();
    } catch (error) {
      componentLogger.error(
        "Error removing contact from group",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to remove contact from group");
    }
  };

  return {
    isLoading,
    addContact,
    updateContact,
    deleteContact,
    createGroup,
    updateGroup,
    deleteGroup,
    addContactToGroup,
    removeContactFromGroup,
  };
}
