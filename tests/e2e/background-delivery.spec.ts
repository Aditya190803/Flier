import { test, expect } from "@playwright/test";

test("Send now queues a frozen snapshot and navigates away without browser delivery", async ({
  page,
}) => {
  let job: Record<string, unknown> | undefined;
  await page.route("**/api/campaign-preflight", (route) =>
    route.fulfill({
      json: { recipients: ["reader@example.com"], duplicates: 0, suppressed: [], issues: [] },
    }),
  );
  await page.route("**/api/scheduled-campaigns", (route) => {
    if (route.request().method() === "POST") {
      job = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { $id: "job", ...job } });
    }
    return route.fulfill({ json: { documents: [], total: 0 } });
  });
  await page.route("**/api/campaign-recovery", (route) =>
    route.fulfill({
      json: {
        configured: true,
        offlineReady: true,
        last_tick: new Date().toISOString(),
        overdue: 0,
        failed: 0,
      },
    }),
  );
  let browserSends = 0;
  await page.route(/\/api\/send-(email|single-email)$/, (route) => {
    browserSends++;
    return route.abort();
  });
  await page.goto("/compose");
  await page.getByLabel("Email *", { exact: true }).fill("reader@example.com");
  await page.getByLabel("Name (optional)").fill("Ada");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "2 Compose", exact: true }).click();
  await page.locator("#subject").fill("Hello {{name}}");
  await page.locator('[contenteditable="true"]').fill("Update {{name}}");
  await page.getByRole("button", { name: "3 Preview", exact: true }).click();
  await page.getByRole("button", { name: /Dispatch/i }).click();
  await expect(page).toHaveURL(/\/scheduled/);
  await expect(page.getByText("Worker is responding.")).toBeVisible();
  expect(job).toMatchObject({
    send_now: true,
    recipients: ["reader@example.com"],
    csv_data: [{ name: "Ada", email: "reader@example.com" }],
  });
  expect(job?.request_id).toMatch(/^[\da-f-]{36}$/);
  expect(browserSends).toBe(0);
});

test("recovery holds uncertain recipients until the sender confirms Gmail Sent", async ({
  page,
}) => {
  const campaign = {
    $id: "failed-job",
    user_email: "e2e@example.com",
    subject: "Update",
    recipients: ["reader@example.com"],
    scheduled_at: new Date().toISOString(),
    status: "partial",
    sent: 0,
    failed: 1,
    attachments: [],
  };
  let action: Record<string, unknown> | undefined;
  await page.route("**/api/scheduled-campaigns", (route) =>
    route.fulfill({ json: { documents: [campaign], total: 1 } }),
  );
  await page.route("**/api/campaign-recovery**", (route) => {
    if (route.request().method() === "POST") {
      action = route.request().postDataJSON();
      return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({
      json: route.request().url().includes("?id=")
        ? { results: [{ email: "reader@example.com", status: "unknown", error: "Timeout" }] }
        : { configured: true, offlineReady: true, last_tick: new Date().toISOString() },
    });
  });
  await page.goto("/scheduled");
  await page.getByRole("button", { name: "Review delivery results" }).click();
  await page.getByText("Resolve uncertain outcome").click();
  await expect(page.getByText(/may create a duplicate/)).toBeVisible();
  await page.getByRole("button", { name: "I checked Gmail: sent", exact: true }).click();
  await expect(page.getByText("Recovery action saved")).toBeVisible();
  expect(action).toMatchObject({
    action: "resolve",
    email: "reader@example.com",
    sent: true,
    confirmed: true,
  });
});
