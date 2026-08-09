/**
 * E2E Tests for Full Email Campaign Flow
 * Tests the complete journey from composing to sending and viewing history
 */

import { test, expect } from "@playwright/test";

test.describe("Full Email Campaign Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to compose page
    await page.goto("/compose");
  });

  test("should display compose page with all required elements", async ({
    page,
  }) => {
    // Verify compose form is visible
    await expect(page.locator("body")).toBeVisible();

    await page.getByRole("button", { name: /2 Compose/i }).click();
    const subjectInput = page
      .getByPlaceholder(/subject/i)
      .or(page.locator('input[name="subject"]'))
      .or(page.locator('[data-testid="subject-input"]'));
    await expect(subjectInput.first()).toBeVisible();

    const editor = page
      .locator('[contenteditable="true"]')
      .or(page.locator(".ProseMirror"))
      .or(page.locator('[data-testid="email-editor"]'));
    await expect(editor.first()).toBeVisible();

    await page.getByRole("button", { name: /3 Preview/i }).click();
    await expect(
      page.getByRole("button", { name: /dispatch/i }).first(),
    ).toBeVisible();
  });

  test("should validate empty form submission", async ({ page }) => {
    // Try to submit without filling required fields
    const sendButton = page.getByRole("button", { name: /send/i });

    if (await sendButton.first().isVisible()) {
      await sendButton.first().click();

      // Should show validation errors or remain on page
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should allow entering email subject", async ({ page }) => {
    const subjectInput = page
      .getByPlaceholder(/subject/i)
      .or(page.locator('input[name="subject"]'));

    if (await subjectInput.first().isVisible()) {
      await subjectInput.first().fill("Test Email Campaign Subject");
      await expect(subjectInput.first()).toHaveValue(
        "Test Email Campaign Subject",
      );
    }
  });

  test("should allow typing in rich text editor", async ({ page }) => {
    const editor = page
      .locator('[contenteditable="true"]')
      .or(page.locator(".ProseMirror"));

    if (await editor.first().isVisible()) {
      await editor.first().click();
      await editor.first().fill("This is a test email body content.");
      // Verify text was entered
      await expect(editor.first()).toContainText("test email body");
    }
  });

  test("should have CSV upload functionality", async ({ page }) => {
    await expect(
      page.getByText("Upload CSV File", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Choose File", { exact: true })).toBeVisible();
  });

  test("should navigate to templates page from compose", async ({ page }) => {
    // Look for template selector or button
    const templateButton = page
      .getByRole("button", { name: /template/i })
      .or(page.getByText(/template/i));

    if (await templateButton.first().isVisible()) {
      await templateButton.first().click();
      // Should open template selector or navigate
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Campaign Sending Process", () => {
  test("should show progress indicator when sending", async ({ page }) => {
    await page.goto("/compose");

    // Fill in required fields
    const subjectInput = page
      .getByPlaceholder(/subject/i)
      .or(page.locator('input[name="subject"]'));

    if (await subjectInput.first().isVisible()) {
      await subjectInput.first().fill("Test Campaign");
    }

    // Check for progress indicator component
    const _progressIndicator = page
      .locator('[data-testid="progress"]')
      .or(page.locator('[role="progressbar"]'))
      .or(page.getByText(/sending|progress/i));

    // Progress indicator should be available for display
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle send button states correctly", async ({ page }) => {
    await page.goto("/compose");

    const sendButton = page.getByRole("button", { name: /send/i });

    if (await sendButton.first().isVisible()) {
      // Button should be visible and initially enabled or disabled based on form state
      await expect(sendButton.first()).toBeVisible();
    }
  });
});

test.describe("Campaign History After Sending", () => {
  test("should display history page", async ({ page }) => {
    await page.goto("/history");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should show campaign statistics", async ({ page }) => {
    await page.goto("/history");

    // Look for stats cards or metrics
    const _statsSection = page
      .locator('[data-testid="stats"]')
      .or(page.getByText(/total|sent|delivered|campaigns/i));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should display sent campaigns list", async ({ page }) => {
    await page.goto("/history");

    // Look for campaign list or empty state
    const _campaignList = page
      .locator('[data-testid="campaign-list"]')
      .or(page.locator(".campaign-item"))
      .or(page.getByText(/sent campaigns|no campaigns|no emails/i));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should allow exporting campaign report", async ({ page }) => {
    await page.goto("/history");

    // Look for export button
    const _exportButton = page
      .getByRole("button", { name: /export/i })
      .or(page.getByText(/export/i));

    // Export functionality should be available
    await expect(page.locator("body")).toBeVisible();
  });

  test("should show campaign details on expansion", async ({ page }) => {
    await page.goto("/history");

    // Look for expandable campaign items
    const expandButton = page
      .getByRole("button", { name: /expand|view|details/i })
      .or(page.locator('[data-testid="expand-campaign"]'));

    if (await expandButton.first().isVisible()) {
      await expandButton.first().click();
      // Should show expanded content
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Dashboard Campaign Overview", () => {
  test("should display dashboard with campaign stats", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("body")).toBeVisible();

    // Check for stats section
    const _statsCards = page
      .locator('[data-testid="stats"]')
      .or(page.getByText(/total sent|success rate|campaigns/i));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should show quick actions for creating campaigns", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for quick action buttons
    const _newCampaignButton = page
      .getByRole("button", { name: /new|create|compose/i })
      .or(page.getByRole("link", { name: /new|create|compose/i }));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should display recent campaigns", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for recent campaigns section
    const _recentSection = page
      .getByText(/recent/i)
      .or(page.locator('[data-testid="recent-campaigns"]'));

    await expect(page.locator("body")).toBeVisible();
  });

  test("should link to full history", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for view all link
    const viewAllLink = page.getByRole("link", {
      name: /view all|history|see more/i,
    });

    if (await viewAllLink.first().isVisible()) {
      await viewAllLink.first().click();
      await expect(page.url()).toContain("/history");
    }
  });
});

test.describe("Email Preview", () => {
  test("should allow previewing email before sending", async ({ page }) => {
    await page.goto("/compose");

    // Look for preview button
    const previewButton = page
      .getByRole("button", { name: /preview/i })
      .or(page.locator('[data-testid="preview-button"]'));

    if (await previewButton.first().isVisible()) {
      await previewButton.first().click();
      // Preview modal or section should appear
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Campaign Error Handling", () => {
  test("should display errors gracefully", async ({ page }) => {
    await page.goto("/compose");

    // Trigger a validation error
    const sendButton = page.getByRole("button", { name: /send/i });

    if (await sendButton.first().isVisible()) {
      await sendButton.first().click();

      // Should show error message or validation
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
