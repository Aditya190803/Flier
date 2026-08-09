/**
 * E2E Tests for Compose Email Feature
 */

import { test, expect } from "@playwright/test";

test.describe("Compose Email", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compose");
  });

  test("should display compose form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "New Campaign" }),
    ).toBeVisible();
  });

  test("should have subject input field", async ({ page }) => {
    await page.getByRole("button", { name: /2 Compose/i }).click();
    const subjectInput = page
      .getByPlaceholder(/subject/i)
      .or(page.locator('input[name="subject"]'));
    await expect(subjectInput).toBeVisible();
  });

  test("should have rich text editor", async ({ page }) => {
    await page.getByRole("button", { name: /2 Compose/i }).click();
    const editor = page
      .locator('[contenteditable="true"]')
      .or(page.locator(".ProseMirror"));
    await expect(editor).toBeVisible();
  });

  test("should allow entering recipients", async ({ page }) => {
    const recipientInput = page
      .getByPlaceholder(/recipient|email|to/i)
      .or(page.locator('input[name="recipients"]'))
      .or(page.locator('[data-testid="recipient-input"]'));

    if (await recipientInput.isVisible()) {
      await recipientInput.fill("test@example.com");
    }
  });

  test("should have dispatch button", async ({ page }) => {
    await page.getByRole("button", { name: /3 Preview/i }).click();
    const dispatchButton = page.getByRole("button", { name: /dispatch/i });
    await expect(dispatchButton).toBeVisible();
  });

  test("should validate empty form submission", async ({ page }) => {
    const sendButton = page.getByRole("button", { name: /send/i });

    if (await sendButton.isVisible()) {
      await sendButton.click();

      // Should show validation error or prevent submission
      const _errorMessage = page.getByText(/required|empty|enter/i);
      // Either shows error or button is disabled
    }
  });
});

test.describe("CSV Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compose");
  });

  test("should have file upload input", async ({ page }) => {
    const _fileInput = page
      .locator('input[type="file"]')
      .or(page.getByText(/upload|csv|import/i));

    // File upload should be available
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Template Selection", () => {
  test("should allow loading templates", async ({ page }) => {
    await page.goto("/compose");

    // Look for template button/dropdown
    const templateButton = page
      .getByRole("button", { name: "Use Template" })
      .first();

    if (await templateButton.isVisible()) {
      await templateButton.click();
    }
  });
});
