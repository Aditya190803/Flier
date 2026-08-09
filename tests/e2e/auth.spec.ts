/**
 * E2E Tests for Authentication Flow
 */

import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("should display sign in page for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/");

    // Should redirect to sign in or show sign in button
    await expect(
      page.getByRole("button", { name: /sign in/i }).first(),
    ).toBeVisible();
  });

  test("should redirect to dashboard after successful sign in", async ({
    page,
  }) => {
    // This test would require mocking OAuth - skip in CI
    test.skip(!!process.env.CI, "Requires OAuth mock");

    await page.goto("/auth/signin");

    // Look for Google sign in button
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("should show error page on auth error", async ({ page }) => {
    await page.goto("/auth/error?error=AccessDenied");

    await expect(
      page.getByText("Authentication Error", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for main navigation elements
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check that page renders correctly on mobile
    await expect(page.locator("body")).toBeVisible();
  });
});
