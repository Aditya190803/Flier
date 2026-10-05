import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] }, javaScriptEnabled: false });

for (const path of ["/", "/guides/gmail-mail-merge", "/api-docs", "/privacy", "/tos"]) {
  test(`public content is readable without JavaScript: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).pathname).toBe(path);
    if (path === "/") {
      await expect(page.getByRole("heading", { name: "CSV Personalization" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Gmail mail merge questions" })).toBeVisible();
    }
    if (path === "/api-docs") {
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByText("/api/send-email", { exact: true })).toBeVisible();
    }
  });
}

test("account pages are excluded from indexing", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.goto("/auth/signin");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});
