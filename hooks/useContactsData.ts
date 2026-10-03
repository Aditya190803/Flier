"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { contactsService, contactGroupsService, type ContactGroup } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export interface Contact {
  $id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  created_at: string;
  user_email: string;
}

export function useContactsData(userEmail: string | undefined) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!userEmail) {
      return;
    }
    try {
      const response = await contactsService.listByUser(userEmail);
      const contactsData = response.documents.map((doc) => {
        let tags: string[] = [];
        try {
          const rawTags = (doc as unknown as { tags?: string | string[] }).tags;
          if (typeof rawTags === "string") {
            tags = JSON.parse(rawTags);
          } else if (Array.isArray(rawTags)) {
            tags = rawTags;
          }
        } catch {
          tags = [];
        }
        return {
          $id: doc.$id ?? "",
          email: doc.email,
          name: doc.name,
          company: doc.company,
          phone: doc.phone,
          tags,
          created_at: doc.created_at || new Date().toISOString(),
          user_email: doc.user_email || userEmail || "",
        } satisfies Contact;
      });
      setContacts(contactsData);
    } catch (error) {
      componentLogger.error("Error fetching contacts", error instanceof Error ? error : undefined);
      toast.error("Failed to load contacts");
    }
  }, [userEmail]);

  const fetchGroups = useCallback(async () => {
    if (!userEmail) {
      return;
    }
    try {
      const response = await contactGroupsService.listByUser(userEmail);
      setGroups(response.documents);
    } catch (error) {
      componentLogger.error("Error fetching groups", error instanceof Error ? error : undefined);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }
    const loadData = async () => {
      await Promise.all([fetchContacts(), fetchGroups()]);
      setIsLoadingData(false);
    };
    loadData();

    const unsubscribe = contactsService.subscribeToUserContacts(userEmail, () => {
      fetchContacts();
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userEmail, fetchContacts, fetchGroups]);

  return {
    contacts,
    setContacts,
    groups,
    setGroups,
    isLoadingData,
    fetchContacts,
    fetchGroups,
  };
}
