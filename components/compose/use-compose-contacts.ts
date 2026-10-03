"use client";

import { useEffect, useState } from "react";

import {
  contactsService,
  contactGroupsService,
  signaturesService,
  type ContactGroup,
  type EmailSignature,
} from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

import type { Contact } from "./compose-types";

/**
 * Loads contacts, groups, and signatures for the signed-in user and manages
 * the group/contact selection state used by the Recipients step.
 */
export function useComposeContacts(userEmail: string | undefined | null) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);

  useEffect(() => {
    const loadContactsGroupsAndSignatures = async () => {
      if (!userEmail) {
        return;
      }

      try {
        const [contactsResponse, groupsResponse, signaturesResponse] = await Promise.all([
          contactsService.listByUser(userEmail),
          contactGroupsService.listByUser(userEmail),
          signaturesService.listByUser(userEmail),
        ]);
        setContacts(contactsResponse.documents as any[]);
        setGroups(groupsResponse.documents);
        setSignatures(signaturesResponse.documents);

        // Set default signature if available
        const defaultSig = signaturesResponse.documents.find((s) => s.is_default);
        if (defaultSig) {
          setSelectedSignature(defaultSig.$id!);
        }
      } catch (error) {
        componentLogger.error(
          "Error loading contacts/groups/signatures",
          error instanceof Error ? error : undefined,
        );
      }
    };

    loadContactsGroupsAndSignatures();
  }, [userEmail]);

  return {
    contacts,
    setContacts,
    selectedContacts,
    setSelectedContacts,
    groups,
    setGroups,
    selectedGroups,
    setSelectedGroups,
    signatures,
    selectedSignature,
    setSelectedSignature,
  };
}
