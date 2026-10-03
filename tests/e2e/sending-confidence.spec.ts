import { expect, test, type Page } from "@playwright/test";

async function compose(page: Page) {
  await page.goto("/compose");
  await page.getByLabel("Email *", { exact: true }).fill("reader@example.com");
  await page.getByLabel("Name (optional)").fill("Ada");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: /2 Compose/i }).click();
  await page.locator("#subject").fill("Hello {{name}}");
  await page.locator('[contenteditable="true"]').fill("Your update, {{name}}");
  await page.getByRole("button", { name: /3 Preview/i }).click();
}

test("reviews recipient data and invalidates the result when content changes", async ({ page }) => {
  await page.route("**/api/campaign-preflight", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.recipientFields["reader@example.com"].name).toBe("Ada");
    await route.fulfill({
      json: { recipients: ["reader@example.com"], duplicates: 0, suppressed: [], issues: [] },
    });
  });
  await compose(page);
  await page.getByRole("button", { name: "Check campaign", exact: true }).click();
  await expect(page.getByText("Ready to send.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /2 Compose/i }).click();
  await page.locator("#subject").fill("Changed subject");
  await page.getByRole("button", { name: /3 Preview/i }).click();
  await expect(page.getByText("Campaign changed. Check it again.")).toBeVisible();
});

test("sends a sample using the selected recipient data through the dedicated test endpoint", async ({
  page,
}) => {
  let testRequests = 0;
  await page.route("**/api/send-test-email", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.originalRowData).toMatchObject({ name: "Ada", email: "reader@example.com" });
    expect(input.subject).toBe("Hello {{name}}");
    expect(input.campaignId).toBeUndefined();
    testRequests++;
    await route.fulfill({ json: { success: true, recipient: "e2e@example.com" } });
  });
  await compose(page);
  await page.getByRole("button", { name: "Send test to myself" }).click();
  await expect(page.getByText("Test email sent to e2e@example.com")).toBeVisible();
  expect(testRequests).toBe(1);
});

test("does not dispatch when eligibility cannot be verified", async ({ page }) => {
  let sendRequests = 0;
  await page.route("**/api/campaign-preflight", (route) =>
    route.fulfill({ status: 503, json: { error: "Eligibility unavailable" } }),
  );
  await page.route(/\/api\/send-(email|single-email)$/, async (route) => {
    sendRequests++;
    await route.abort();
  });
  await compose(page);
  await page.getByRole("button", { name: /Dispatch/i }).click();
  await expect(page.getByText("Eligibility unavailable")).toBeVisible();
  expect(sendRequests).toBe(0);
});
