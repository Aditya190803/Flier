import type {
  Contact,
  ContactGroup,
  Unsubscribe,
} from "@/types/appwrite-client";

import { apiRequest } from "../api-request";
import { pollForUpdates } from "../poll";
import { createCrudService } from "../service-factory";

// ============================================
// Contacts Service (via API)
// ============================================

const contactsCrudService = createCrudService<
  Contact,
  Omit<Contact, "$id" | "created_at">,
  Partial<Omit<Contact, "$id" | "user_email" | "created_at">>
>("contacts");

export const contactsService = {
  ...contactsCrudService,

  // Real-time subscriptions are not available via API routes
  // Components should poll or use a different approach
  /** Refresh contacts periodically. See {@link pollForUpdates} — not realtime. */
  subscribeToUserContacts(
    _userEmail: string,
    callback: (response: unknown) => void,
  ) {
    return pollForUpdates(() => callback(undefined));
  },
};

// ============================================
// Contact Groups Service (via API)
// ============================================

const contactGroupsCrudService = createCrudService<
  ContactGroup,
  Omit<ContactGroup, "$id" | "created_at" | "updated_at">,
  Partial<Omit<ContactGroup, "$id" | "user_email" | "created_at">>
>("contact-groups");

export const contactGroupsService = {
  ...contactGroupsCrudService,

  // Note: This operation is not atomic. Concurrent modifications may result in lost updates.
  // For production use with high concurrency, consider implementing optimistic locking
  // or moving this logic to a server-side transaction.
  async addContacts(groupId: string, contactIds: string[]) {
    const group = await contactGroupsCrudService.get(groupId);
    const currentIds = Array.isArray(group.contact_ids)
      ? group.contact_ids
      : [];
    const existingIds = new Set(currentIds);
    contactIds.forEach((id) => existingIds.add(id));
    return contactGroupsCrudService.update(groupId, {
      contact_ids: Array.from(existingIds),
    });
  },

  // Note: This operation is not atomic. Concurrent modifications may result in lost updates.
  // For production use with high concurrency, consider implementing optimistic locking
  // or moving this logic to a server-side transaction.
  async removeContacts(groupId: string, contactIds: string[]) {
    const group = await contactGroupsCrudService.get(groupId);
    const idsToRemove = new Set(contactIds);
    const currentIds = Array.isArray(group.contact_ids)
      ? group.contact_ids
      : [];
    const updatedIds = currentIds.filter((id) => !idsToRemove.has(id));
    return contactGroupsCrudService.update(groupId, {
      contact_ids: updatedIds,
    });
  },

  /** Refresh groups periodically. See {@link pollForUpdates} — not realtime. */
  subscribeToUserGroups(
    _userEmail: string,
    callback: (response: unknown) => void,
  ) {
    return pollForUpdates(() => callback(undefined));
  },
};

// ============================================
// Unsubscribes Service (via API)
// ============================================

const unsubscribesCrudService = createCrudService<
  Unsubscribe,
  Omit<Unsubscribe, "$id" | "unsubscribed_at">,
  Partial<Omit<Unsubscribe, "$id" | "user_email" | "unsubscribed_at">>
>("unsubscribes");

export const unsubscribesService = {
  ...unsubscribesCrudService,

  async isUnsubscribed(_userEmail: string, email: string): Promise<boolean> {
    const response = await apiRequest<{ isUnsubscribed: boolean }>(
      `/api/appwrite/unsubscribes?check=${encodeURIComponent(email)}`,
    );
    return response.isUnsubscribed;
  },

  async filterUnsubscribed(
    _userEmail: string,
    emails: string[],
  ): Promise<string[]> {
    const response = await apiRequest<{ emails: string[] }>(
      "/api/appwrite/unsubscribes",
      {
        method: "PATCH",
        body: JSON.stringify({ emails }),
      },
    );
    return response.emails;
  },
};
