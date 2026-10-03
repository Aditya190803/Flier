import { databases, config, Query } from "@/lib/appwrite-server";
import type { ContactDocument } from "@/types/appwrite";

export async function listOwnedContacts(userEmail: string): Promise<ContactDocument[]> {
  const contacts: ContactDocument[] = [];
  let cursor: string | undefined;
  while (true) {
    const response = await databases.listDocuments<ContactDocument>(
      config.databaseId,
      config.contactsCollectionId,
      [
        Query.equal("user_email", userEmail),
        Query.orderDesc("created_at"),
        Query.limit(250),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    );
    contacts.push(...response.documents);
    if (response.documents.length < 250) {
      return contacts;
    }
    if (contacts.length >= 50_000) {
      throw new Error(
        "Contact directory exceeds 50,000 records. Narrow the directory before loading audiences.",
      );
    }
    cursor = response.documents.at(-1)!.$id;
  }
}
