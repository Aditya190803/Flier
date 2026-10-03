import { databases, config, Query } from "@/lib/appwrite-server";

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
