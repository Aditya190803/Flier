import { test, expect } from "@playwright/test";

// Requires a Gmail sandbox; never send mail from the generic CI account.
test.describe.skip("Full Email Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // In a real scenario, we would handle authentication here
    // For this test, we assume the user is already authenticated or mocked
    await page.goto("/compose");
  });

  test("should complete the full compose to send workflow", async ({
    page,
  }) => {
    // 1. Fill in the subject
    const subjectInput = page.getByPlaceholder(/subject/i);
    await subjectInput.fill("Test Campaign Subject");

    // 2. Fill in the body
    const editor = page.locator('[contenteditable="true"]');
    await editor.fill("Hello {{name}}, this is a test email body.");

    // 3. Add a recipient manually
    const recipientInput = page.getByPlaceholder(/recipient|email|to/i);
    if (await recipientInput.isVisible()) {
      await recipientInput.fill("test@example.com");
      await page.keyboard.press("Enter");
    }

    // 4. Open Preview
    const previewButton = page.getByRole("button", { name: /preview/i });
    if (await previewButton.isVisible()) {
      await previewButton.click();
      await expect(page.getByText("Preview")).toBeVisible();

      // Close preview
      await page.keyboard.press("Escape");
    }

    // 5. Send Email
    const sendButton = page.getByRole("button", { name: /send/i });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // 6. Confirm Send (if dialog appears)
    const confirmButton = page.getByRole("button", {
      name: /confirm|yes|send now/i,
    });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // 7. Verify success message or redirect
    await expect(page.getByText(/success|sent|completed/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
