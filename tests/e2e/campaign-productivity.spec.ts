import { test, expect } from "@playwright/test";

test("shows an actionable first-campaign checklist with actual contact and template progress", async ({
  page,
}) => {
  await page.route("**/api/appwrite/contacts**", (route) =>
    route.fulfill({ json: { documents: [{ $id: "one", email: "one@example.com" }] } }),
  );
  await page.route("**/api/appwrite/templates**", (route) =>
    route.fulfill({ json: { documents: [] } }),
  );
  await page.route("**/api/appwrite/campaigns**", (route) =>
    route.fulfill({ json: { documents: [] } }),
  );
  await page.goto("/dashboard");
  const checklist = page.getByRole("region", { name: "First campaign checklist" });
  await expect(
    checklist.getByRole("link", { name: "✓ Add or import your contacts", exact: true }),
  ).toBeVisible();
  await expect(
    checklist.getByRole("link", { name: /Compose, check and send yourself a test/ }),
  ).toHaveAttribute("href", "/compose");
});

test("maps custom CSV headers, previews updates and exports rejected rows", async ({ page }) => {
  const existing = {
    $id: "known",
    email: "known@example.com",
    name: "Old",
    user_email: "e2e@example.com",
    created_at: new Date().toISOString(),
  };
  const writes: { method: string; data: Record<string, unknown> }[] = [];
  await page.route("**/api/appwrite/contacts**", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { documents: [existing], total: 1 } });
    }
    const data = route.request().postDataJSON();
    writes.push({ method: route.request().method(), data });
    return route.fulfill({ json: { $id: data.id || "new", ...data } });
  });
  await page.goto("/contacts");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "people.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        'Work Email,Full Name,Org\nknown@example.com,Updated,Acme\nnew@example.com,"New, Person",Acme\nbad,Bad,Acme',
      ),
    });
  const dialog = page.getByRole("dialog", { name: "Review contact import" });
  const choose = async (label: string, option: string) => {
    await dialog.getByLabel(label, { exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  await choose("Email column (required)", "Work Email");
  await choose("name column", "Full Name");
  await choose("company column", "Org");
  await choose("Existing contacts", "Update existing email addresses");
  await expect(dialog.getByText("1 new · 1 updates · 0 skipped · 1 rejected")).toBeVisible();
  await expect(dialog.getByRole("cell", { name: "New, Person", exact: true })).toBeVisible();
  expect(writes).toHaveLength(0);
  await dialog.getByRole("button", { name: "Confirm import" }).click();
  await expect(dialog.getByRole("button", { name: "Import complete" })).toBeVisible();
  expect(writes).toEqual([
    {
      method: "PUT",
      data: { id: "known", email: "known@example.com", name: "Updated", company: "Acme" },
    },
    {
      method: "POST",
      data: {
        email: "new@example.com",
        name: "New, Person",
        company: "Acme",
        phone: "",
        user_email: "e2e@example.com",
      },
    },
  ]);
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download rejected rows" }).click();
  expect((await download).suggestedFilename()).toBe("contacts_rejected.csv");
});

test("saved audience replaces recipients with a current snapshot", async ({ page }) => {
  await page.route("**/api/audiences**", (route) =>
    route.fulfill({
      json: route.request().url().includes("?id=")
        ? { rows: [{ email: "vip@example.com", name: "VIP", company: "Acme" }] }
        : { documents: [{ id: "audience", name: "Acme VIP", filters: { tag: "VIP" } }] },
    }),
  );
  await page.goto("/compose");
  await page.getByRole("button", { name: "Saved audiences", exact: true }).click();
  await page.getByRole("button", { name: "Use current matches" }).click();
  await expect(page.getByText("1 current matches added")).toBeVisible();
  await expect(page.getByText("vip@example.com", { exact: true }).first()).toBeVisible();
});

test("campaign search combines sources and duplicates an editable draft with personalization", async ({
  page,
}) => {
  const date = new Date().toISOString();
  let copied: Record<string, unknown> | undefined;
  const queued = {
    $id: "job",
    campaign_id: "job",
    subject: "Queue subject",
    content: "Hello {{name}}",
    recipients: ["ada@example.com"],
    status: "sent",
    created_at: date,
    scheduled_at: date,
    csv_data: [{ email: "ada@example.com", name: "Ada" }],
    attachments: [],
    cc: [],
    bcc: [],
  };
  await page.route("**/api/scheduled-campaigns", (route) =>
    route.fulfill({ json: { documents: [queued] } }),
  );
  await page.route("**/api/appwrite/campaigns**", (route) =>
    route.fulfill({ json: { documents: [{ ...queued, status: "completed" }] } }),
  );
  await page.route("**/api/appwrite/draft-emails**", (route) => {
    if (route.request().method() === "POST") {
      copied = route.request().postDataJSON();
      return route.fulfill({ json: { $id: "copy", ...copied } });
    }
    return route.fulfill({
      json: {
        documents: [
          {
            $id: "draft",
            subject: "Draft subject",
            content: "Draft",
            recipients: [],
            saved_at: date,
          },
        ],
      },
    });
  });
  await page.goto("/campaigns");
  await expect(page.getByText("2 matching campaigns")).toBeVisible();
  await page.getByLabel("Search campaigns").fill("ADA");
  await expect(page.getByText("1 matching campaign", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Duplicate and edit" }).click();
  await expect(page).toHaveURL(/\/compose\?edit=draft/);
  await page.getByRole("button", { name: "2 Compose", exact: true }).click();
  await expect(page.locator("#subject")).toHaveValue("Queue subject");
  expect(copied?.csv_data).toEqual(queued.csv_data);
});
