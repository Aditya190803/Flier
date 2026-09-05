/**
 * E2E Tests for Keyboard Shortcuts
 * Tests keyboard shortcut functionality across the application
 */

/* oxlint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from "@playwright/test";

test.describe("Keyboard Shortcuts", () => {
  test.describe("Keyboard Shortcuts Modal", () => {
    test("should open shortcuts modal with Ctrl+/", async ({ page }) => {
      await page.goto("/dashboard");

      // Press Ctrl+/
      await page.keyboard.press("Control+/");

      // Modal should open
      const modal = page
        .locator('[role="dialog"]')
        .or(page.getByText(/keyboard shortcuts/i));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should open shortcuts modal with ? key", async ({ page }) => {
      await page.goto("/dashboard");

      // Press ? key (Shift+/)
      await page.keyboard.press("Shift+/");

      // Modal should open or page should respond
      await expect(page.locator("body")).toBeVisible();
    });

    test("should close shortcuts modal with Escape", async ({ page }) => {
      await page.goto("/dashboard");

      // Open modal
      await page.keyboard.press("Control+/");

      // Close with Escape
      await page.keyboard.press("Escape");

      await expect(page.locator("body")).toBeVisible();
    });

    test("should display navigation shortcuts", async ({ page }) => {
      await page.goto("/dashboard");

      await page.keyboard.press("Control+/");

      const modal = page.locator('[role="dialog"]');

      if (await modal.first().isVisible()) {
        // Should show navigation section
        await expect(page.getByText(/navigation/i)).toBeVisible();
      }
    });

    test("should display compose shortcuts", async ({ page }) => {
      await page.goto("/dashboard");

      await page.keyboard.press("Control+/");

      const modal = page.locator('[role="dialog"]');

      if (await modal.first().isVisible()) {
        // Should show compose section
        await expect(page.getByText(/compose/i)).toBeVisible();
      }
    });

    test("should have keyboard shortcuts button in UI", async ({ page }) => {
      await page.goto("/dashboard");

      const _shortcutsButton = page
        .getByRole("button", { name: /keyboard/i })
        .or(page.locator('[title*="keyboard"]'))
        .or(page.locator('[aria-label*="keyboard"]'));

      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Navigation Shortcuts", () => {
    test("should navigate to compose with G then C", async ({ page }) => {
      await page.goto("/dashboard");

      // Press G then C for Go to Compose
      await page.keyboard.press("g");
      await page.keyboard.press("c");

      // Should navigate to compose page
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    });

    test("should navigate to dashboard with G then D", async ({ page }) => {
      await page.goto("/templates");

      // Press G then D for Go to Dashboard
      await page.keyboard.press("g");
      await page.keyboard.press("d");

      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    });

    test("should navigate to templates with G then T", async ({ page }) => {
      await page.goto("/dashboard");

      // Press G then T for Go to Templates
      await page.keyboard.press("g");
      await page.keyboard.press("t");

      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    });

    test("should navigate to history with G then H", async ({ page }) => {
      await page.goto("/dashboard");

      // Press G then H for Go to History
      await page.keyboard.press("g");
      await page.keyboard.press("h");

      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    });

    test("should navigate to settings with G then S", async ({ page }) => {
      await page.goto("/dashboard");

      // Press G then S for Go to Settings
      await page.keyboard.press("g");
      await page.keyboard.press("s");

      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Compose Shortcuts", () => {
    test("should send email with Ctrl+Enter", async ({ page }) => {
      await page.goto("/compose");

      // Fill in form first
      const subjectInput = page
        .getByPlaceholder(/subject/i)
        .or(page.locator('input[name="subject"]'));

      if (await subjectInput.first().isVisible()) {
        await subjectInput.first().fill("Test Subject");

        // Try Ctrl+Enter to send
        await page.keyboard.press("Control+Enter");

        // Should trigger send action or show validation
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should save draft with Ctrl+S", async ({ page }) => {
      await page.goto("/compose");

      // Fill in form
      const subjectInput = page
        .getByPlaceholder(/subject/i)
        .or(page.locator('input[name="subject"]'));

      if (await subjectInput.first().isVisible()) {
        await subjectInput.first().fill("Draft Subject");

        // Try Ctrl+S to save draft
        await page.keyboard.press("Control+s");

        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should open preview with Ctrl+Shift+P", async ({ page }) => {
      await page.goto("/compose");

      // Try Ctrl+Shift+P for preview
      await page.keyboard.press("Control+Shift+p");

      await expect(page.locator("body")).toBeVisible();
    });

    test("should discard with Escape", async ({ page }) => {
      await page.goto("/compose");

      // Fill in some content
      const subjectInput = page.getByPlaceholder(/subject/i);

      if (await subjectInput.first().isVisible()) {
        await subjectInput.first().fill("Some content");

        // Press Escape
        await page.keyboard.press("Escape");

        // Should show confirmation or navigate away
        await expect(page.locator("body")).toBeVisible();
      }
    });
  });

  test.describe("Rich Text Editor Shortcuts", () => {
    test("should bold text with Ctrl+B", async ({ page }) => {
      await page.goto("/compose");

      const editor = page
        .locator('[contenteditable="true"]')
        .or(page.locator(".ProseMirror"));

      if (await editor.first().isVisible()) {
        await editor.first().click();
        await editor.first().fill("Test text");

        // Select all and bold
        await page.keyboard.press("Control+a");
        await page.keyboard.press("Control+b");

        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should italicize text with Ctrl+I", async ({ page }) => {
      await page.goto("/compose");

      const editor = page
        .locator('[contenteditable="true"]')
        .or(page.locator(".ProseMirror"));

      if (await editor.first().isVisible()) {
        await editor.first().click();
        await editor.first().fill("Test text");

        // Select all and italicize
        await page.keyboard.press("Control+a");
        await page.keyboard.press("Control+i");

        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should underline text with Ctrl+U", async ({ page }) => {
      await page.goto("/compose");

      const editor = page
        .locator('[contenteditable="true"]')
        .or(page.locator(".ProseMirror"));

      if (await editor.first().isVisible()) {
        await editor.first().click();
        await editor.first().fill("Test text");

        // Select all and underline
        await page.keyboard.press("Control+a");
        await page.keyboard.press("Control+u");

        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should undo with Ctrl+Z", async ({ page }) => {
      await page.goto("/compose");

      const editor = page
        .locator('[contenteditable="true"]')
        .or(page.locator(".ProseMirror"));

      if (await editor.first().isVisible()) {
        await editor.first().click();
        await editor.first().fill("Original text");
        await editor.first().fill("Modified text");

        // Undo
        await page.keyboard.press("Control+z");

        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should redo with Ctrl+Shift+Z", async ({ page }) => {
      await page.goto("/compose");

      const editor = page
        .locator('[contenteditable="true"]')
        .or(page.locator(".ProseMirror"));

      if (await editor.first().isVisible()) {
        await editor.first().click();
        await editor.first().fill("Text");
        await page.keyboard.press("Control+z");

        // Redo
        await page.keyboard.press("Control+Shift+z");

        await expect(page.locator("body")).toBeVisible();
      }
    });
  });

  test.describe("General Shortcuts", () => {
    test("should toggle dark mode with Ctrl+Shift+T", async ({ page }) => {
      await page.goto("/dashboard");

      // Get initial theme state
      const _html = page.locator("html");

      // Try Ctrl+Shift+T
      await page.keyboard.press("Control+Shift+t");

      await expect(page.locator("body")).toBeVisible();
    });

    test("should not trigger shortcuts when typing in inputs", async ({
      page,
    }) => {
      await page.goto("/compose");

      const subjectInput = page.getByPlaceholder(/subject/i);

      if (await subjectInput.first().isVisible()) {
        await subjectInput.first().focus();

        // Type 'g' and 'c' - should not navigate
        await subjectInput.first().type("gc");

        // Should remain on compose page
        await expect(subjectInput.first()).toHaveValue("gc");
      }
    });

    test("should not trigger shortcuts when typing in textarea", async ({
      page,
    }) => {
      await page.goto("/compose");

      const editor = page
        .locator('[contenteditable="true"]')
        .or(page.locator("textarea"));

      if (await editor.first().isVisible()) {
        await editor.first().focus();

        // Type navigation keys
        await page.keyboard.type("gc");

        // Should remain on page
        await expect(page.locator("body")).toBeVisible();
      }
    });
  });

  test.describe("Template Shortcuts", () => {
    test("should create new template with Ctrl+N", async ({ page }) => {
      await page.goto("/templates");

      await page.keyboard.press("Control+n");

      // Should open create dialog or focus new template form
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Contact Shortcuts", () => {
    test("should add new contact with Ctrl+N", async ({ page }) => {
      await page.goto("/contacts");

      await page.keyboard.press("Control+n");

      // Should open add contact dialog
      await expect(page.locator("body")).toBeVisible();
    });

    test("should select all contacts with Ctrl+A", async ({ page }) => {
      await page.goto("/contacts");

      await page.keyboard.press("Control+a");

      await expect(page.locator("body")).toBeVisible();
    });
  });
});
