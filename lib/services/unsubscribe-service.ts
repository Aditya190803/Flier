import { databases, config, Query } from "@/lib/appwrite-server";

export async function findSuppressedRecipients(
  userEmail: string,
  recipients: string[],
): Promise<string[]> {
  const unique = [...new Set(recipients.map((email) => email.trim().toLowerCase()))];
  const suppressed: string[] = [];
  for (let offset = 0; offset < unique.length; offset += 100) {
    let cursor: string | undefined;
    while (true) {
      const result = await databases.listDocuments(
        config.databaseId,
        config.unsubscribesCollectionId,
        [
          Query.equal("user_email", userEmail),
          Query.equal("email", unique.slice(offset, offset + 100)),
          Query.limit(100),
          ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ],
      );
      suppressed.push(...result.documents.map((document) => String(document.email)));
      if (result.documents.length < 100) {
        break;
      }
      cursor = result.documents[result.documents.length - 1].$id;
    }
  }
  return [...new Set(suppressed.map((email) => email.toLowerCase()))];
}

export async function checkUserUnsubscribed(userEmail: string, email: string): Promise<boolean> {
  const unsubscribeCheck = await databases.listDocuments(
    config.databaseId,
    config.unsubscribesCollectionId,
    [
      Query.equal("user_email", userEmail),
      Query.equal("email", email.toLowerCase()),
      Query.limit(1),
    ],
  );

  return unsubscribeCheck.documents.length > 0;
}
