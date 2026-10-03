import { expect, it, vi } from "vite-plus/test";
const list = vi.hoisted(() => vi.fn());
vi.mock("@/lib/appwrite-server", () => ({
  databases: { listDocuments: list },
  config: { databaseId: "db", contactsCollectionId: "contacts" },
  Query: {
    equal: (key: string, value: string) => `equal:${key}:${value}`,
    orderDesc: (key: string) => `order:${key}`,
    limit: (limit: number) => `limit:${limit}`,
    cursorAfter: (id: string) => `after:${id}`,
  },
}));
import { listOwnedContacts } from "@/lib/services/contact-directory";
it("paginates beyond the first page without crossing ownership scopes", async () => {
  list
    .mockResolvedValueOnce({
      documents: Array.from({ length: 250 }, (_, index) => ({ $id: String(index) })),
    })
    .mockResolvedValueOnce({ documents: [{ $id: "last" }] });
  expect(await listOwnedContacts("owner@example.com")).toHaveLength(251);
  expect(list.mock.calls[1][2]).toContain("after:249");
  for (const call of list.mock.calls) {
    expect(call[2]).toContain("equal:user_email:owner@example.com");
  }
});
