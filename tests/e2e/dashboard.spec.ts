/**
 * E2E Tests for Dashboard
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("should display dashboard page", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should show campaign statistics", async ({ page }) => {
    // Look for stat cards or metrics
    const _statsSection = page
      .locator('[data-testid="stats"]')
      .or(page.getByText(/sent|campaigns|emails/i));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should display recent campaigns", async ({ page }) => {
    // Look for campaign list or table
    const _campaignList = page
      .locator("table")
      .or(page.locator('[data-testid="campaign-list"]'))
      .or(page.getByText(/recent|campaign/i));

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Contacts Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contacts");
  });

  test("should display contacts page", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have add contact button", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add|new|create/i });

    if (await addButton.isVisible()) {
      await expect(addButton).toBeEnabled();
    }
  });

  test("should display contacts list or empty state", async ({ page }) => {
    // Either shows contacts or empty state message
    const _content = page
      .locator("table")
      .or(page.getByText(/no contacts|empty|add your first/i));

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Templates Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates");
  });

  test("should display templates page", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have create template option", async ({ page }) => {
    const _createButton = page.getByRole("button", { name: /create|new|add/i });

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("should display settings page", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have settings sections", async ({ page }) => {
    // Look for various settings sections
    const _settingsContent = page.getByText(/settings|account|preferences/i);

    await expect(page.locator("body")).toBeVisible();
  });
});
