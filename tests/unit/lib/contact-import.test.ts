import { describe, expect, it } from "vite-plus/test";
import { parseContactCsv, planContactImport } from "@/lib/contacts/import";
import { selectAudience } from "@/lib/contacts/audiences";

describe("CSV contact import", () => {
  it("parses quoted commas, quotes, multiline values and custom column mappings", () => {
    const parsed = parseContactCsv(
      'Work Email,Full Name,Org\nADA@example.com,"Ada, ""A""","Line one\nLine two"',
    );
    const plan = planContactImport(
      parsed.headers,
      parsed.rows,
      { email: "Work Email", name: "Full Name", company: "Org", phone: "" },
      [],
      "skip",
    );
    expect(plan.accepted[0].contact).toEqual({
      email: "ada@example.com",
      name: 'Ada, "A"',
      company: "Line one\nLine two",
      phone: "",
    });
  });
  it("separates existing addresses, duplicates, malformed rows and invalid addresses", () => {
    const { headers, rows, mapping } = parseContactCsv(
      "email,name\nknown@example.com,New name\nnew@example.com,New\nNEW@example.com,Duplicate\nbad,Bad\nextra@example.com,Extra,Cell",
    );
    const existing = [{ $id: "known", email: "KNOWN@example.com" }];
    const skipped = planContactImport(headers, rows, mapping, existing, "skip");
    expect(skipped).toMatchObject({ creates: 1, updates: 0, skipped: 1 });
    expect(skipped.rejected.map((row) => row.row)).toEqual([4, 5, 6]);
    const updated = planContactImport(headers, rows, mapping, existing, "update");
    expect(updated).toMatchObject({ creates: 1, updates: 1, skipped: 0 });
    expect(updated.accepted[0]).toMatchObject({ id: "known", contact: { name: "New name" } });
  });
  it("rejects ambiguous headers and malformed quoted CSV", () => {
    expect(() => parseContactCsv("email,email\na@b.com,a@b.com")).toThrow("unique");
    expect(() => parseContactCsv('email,name\na@b.com,"unclosed')).toThrow("parsed");
  });
});
describe("saved audiences", () => {
  it("requires all selected filters and deduplicates case-insensitively", () => {
    const people = [
      { $id: "a", email: "ADA@example.com", company: "Acme", tags: '["VIP"]', name: "Ada" },
      { $id: "b", email: "ada@example.com", company: "Acme", tags: ["VIP"] },
      { $id: "c", email: "other@example.com", company: "Other", tags: ["VIP"] },
    ];
    expect(
      selectAudience(people, { tag: "vip", company: "acme", group_id: "group" }, ["a", "b", "c"]),
    ).toEqual([{ email: "ada@example.com", name: "Ada", company: "Acme", phone: "" }]);
    expect(selectAudience(people, { group_id: "missing" })).toEqual([]);
  });
});
