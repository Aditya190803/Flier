import { beforeEach, expect, it, vi } from "vite-plus/test";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ query: vi.fn(), document: vi.fn(), contacts: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({
  requireSession: () => Promise.resolve({ email: "owner@example.com" }),
  isAuthed: () => true,
}));
vi.mock("@/lib/db", () => ({ dbQuery: mocks.query, isDatabaseConfigured: () => true }));
vi.mock("@/lib/appwrite-server", () => ({
  databases: { getDocument: mocks.document },
  config: { databaseId: "db", contactGroupsCollectionId: "groups" },
}));
vi.mock("@/lib/services/contact-directory", () => ({ listOwnedContacts: mocks.contacts }));
import { DELETE, GET, POST } from "@/app/api/audiences/route";
beforeEach(() => vi.clearAllMocks());
it("scopes saved recipes to the session rather than a caller-supplied owner", async () => {
  mocks.query.mockResolvedValueOnce({ rows: [] });
  const response = await GET(
    new NextRequest("http://localhost/api/audiences?user_email=other@example.com"),
  );
  expect(response.status).toBe(200);
  expect(mocks.query.mock.calls[0][1]).toEqual(["owner@example.com", null]);
});
it("refuses to save an audience backed by somebody else's group", async () => {
  mocks.document.mockResolvedValueOnce({ user_email: "other@example.com" });
  expect(
    (
      await POST(
        new NextRequest("http://localhost/api/audiences", {
          method: "POST",
          body: JSON.stringify({ name: "Foreign", filters: { group_id: "other" } }),
        }),
      )
    ).status,
  ).toBe(404);
  expect(mocks.query).not.toHaveBeenCalled();
});
it("resolves current contacts only after owner-scoped recipe lookup", async () => {
  mocks.query.mockResolvedValueOnce({
    rows: [{ id: "audience", name: "Acme", filters: { company: "Acme" } }],
  });
  mocks.contacts.mockResolvedValueOnce([
    { $id: "one", email: "ONE@example.com", company: "Acme" },
    { $id: "two", email: "two@example.com", company: "Other" },
  ]);
  const response = await GET(
    new NextRequest("http://localhost/api/audiences?id=878f5034-e464-4df0-b38e-cecebc572e80"),
  );
  expect((await response.json()).rows).toEqual([
    { email: "one@example.com", name: "", company: "Acme", phone: "" },
  ]);
  expect(mocks.contacts).toHaveBeenCalledWith("owner@example.com");
});
it("rejects malformed audience IDs before querying the database", async () => {
  const get = await GET(new NextRequest("http://localhost/api/audiences?id=not-a-uuid"));
  const remove = await DELETE(
    new NextRequest("http://localhost/api/audiences?id=not-a-uuid", { method: "DELETE" }),
  );
  expect(get.status).toBe(400);
  expect(remove.status).toBe(400);
  expect(mocks.query).not.toHaveBeenCalled();
});
