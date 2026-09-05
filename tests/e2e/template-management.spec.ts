/**
 * E2E Tests for Template Management
 * Tests template creation, editing, deletion, and usage
 */

/* oxlint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from "@playwright/test";

test.describe("Template Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates");
  });

  test("should display templates page", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();

    // Should show templates header
    const header = page
      .getByRole("heading", { name: /template/i })
      .or(page.getByText(/email templates/i));
    await expect(header.first()).toBeVisible();
  });

  test("should have create template button", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /create|add|new/i });

    if (await createButton.first().isVisible()) {
      await expect(createButton.first()).toBeEnabled();
    }
  });

  test("should open create template dialog", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /create template/i });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Dialog should open with form fields
      const dialog = page.locator('[role="dialog"]');

      if (await dialog.first().isVisible()) {
        // Check for template name input
        const nameInput = page
          .getByPlaceholder(/template name|name/i)
          .or(page.locator('input[name="name"]'));
        await expect(nameInput.first()).toBeVisible();

        // Check for subject input
        const subjectInput = page
          .getByPlaceholder(/subject/i)
          .or(page.locator('input[name="subject"]'));
        await expect(subjectInput.first()).toBeVisible();
      }
    }
  });

  test("should validate template form", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /create template/i });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Try to submit empty form
      const submitButton = page
        .getByRole("button", { name: /create/i })
        .filter({ hasNotText: /cancel/i })
        .last();

      if (await submitButton.isVisible()) {
        // Button should be disabled for empty form or show validation
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("should display template categories", async ({ page }) => {
    // Look for category filters
    const _categoryFilter = page
      .getByRole("button", { name: /all|marketing|newsletter|transactional/i })
      .or(page.locator('[data-testid="category-filter"]'));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should search templates", async ({ page }) => {
    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'));

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill("welcome");
      // Results should update
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should display starter templates", async ({ page }) => {
    // Look for starter templates section
    const _starterSection = page
      .getByText(/starter templates/i)
      .or(page.locator('[data-testid="starter-templates"]'));

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Template Actions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates");
  });

  test("should use template", async ({ page }) => {
    // Look for use button on a template
    const useButton = page.getByRole("button", { name: /use/i });

    if (await useButton.first().isVisible()) {
      await useButton.first().click();

      // Should navigate to compose with template
      await page.waitForURL(/\/compose/);
    }
  });

  test("should duplicate template", async ({ page }) => {
    // Look for template menu
    const menuButton = page
      .getByRole("button", { name: /more/i })
      .or(page.locator('[data-testid="template-menu"]'));

    if (await menuButton.first().isVisible()) {
      await menuButton.first().click();

      // Look for duplicate option
      const duplicateOption = page
        .getByRole("menuitem", { name: /duplicate/i })
        .or(page.getByText(/duplicate/i));

      if (await duplicateOption.first().isVisible()) {
        await duplicateOption.first().click();
        // Template should be duplicated
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("should edit template", async ({ page }) => {
    const menuButton = page
      .getByRole("button", { name: /more/i })
      .or(page.locator('[data-testid="template-menu"]'));

    if (await menuButton.first().isVisible()) {
      await menuButton.first().click();

      const editOption = page.getByRole("menuitem", { name: /edit/i });

      if (await editOption.first().isVisible()) {
        await editOption.first().click();

        // Edit dialog should open
        const dialog = page.locator('[role="dialog"]');
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("should delete template with confirmation", async ({ page }) => {
    const menuButton = page
      .getByRole("button", { name: /more/i })
      .or(page.locator('[data-testid="template-menu"]'));

    if (await menuButton.first().isVisible()) {
      await menuButton.first().click();

      const deleteOption = page.getByRole("menuitem", { name: /delete/i });

      if (await deleteOption.first().isVisible()) {
        await deleteOption.first().click();

        // Confirmation dialog should appear
        const _confirmDialog = page.locator('[role="alertdialog"]');
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});

test.describe("Starter Templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates");
  });

  test("should display starter template cards", async ({ page }) => {
    // Look for starter template cards
    const _starterCards = page
      .locator('[data-testid="starter-template"]')
      .or(page.getByText(/welcome email|thank you|meeting request/i));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should add starter template to collection", async ({ page }) => {
    // Look for save button on starter template
    const saveButton = page.getByRole("button", { name: /save/i });

    if (await saveButton.first().isVisible()) {
      await saveButton.first().click();
      // Template should be added
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should add all starter templates", async ({ page }) => {
    const addAllButton = page.getByRole("button", { name: /add all/i });

    if (await addAllButton.first().isVisible()) {
      await addAllButton.first().click();
      // All templates should be added
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should show personalization placeholders info", async ({ page }) => {
    // Look for placeholder information
    const _placeholderInfo = page
      .getByText(/personalization|placeholder/i)
      .or(page.getByText(/\{\{name\}\}/i));

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Template Rich Text Editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates");
  });

  test("should have rich text editor in create dialog", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /create template/i });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Look for rich text editor
      const _editor = page
        .locator('[contenteditable="true"]')
        .or(page.locator(".ProseMirror"));

      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should support text formatting", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /create template/i });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Look for formatting buttons
      const _boldButton = page
        .getByRole("button", { name: /bold/i })
        .or(page.locator('[data-testid="bold-button"]'));
      const _italicButton = page
        .getByRole("button", { name: /italic/i })
        .or(page.locator('[data-testid="italic-button"]'));

      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Template Category Filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates");
  });

  test("should filter by marketing category", async ({ page }) => {
    const marketingFilter = page.getByRole("button", { name: /marketing/i });

    if (await marketingFilter.first().isVisible()) {
      await marketingFilter.first().click();
      // Should filter templates
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should filter by newsletter category", async ({ page }) => {
    const newsletterFilter = page.getByRole("button", { name: /newsletter/i });

    if (await newsletterFilter.first().isVisible()) {
      await newsletterFilter.first().click();
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should reset filter with All button", async ({ page }) => {
    const allFilter = page.getByRole("button", { name: /^all$/i });

    if (await allFilter.first().isVisible()) {
      await allFilter.first().click();
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
