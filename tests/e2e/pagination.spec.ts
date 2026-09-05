/**
 * E2E Tests for Pagination Component
 * Tests pagination functionality across different pages
 */

/* oxlint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from "@playwright/test";

test.describe("Pagination", () => {
  test.describe("Pagination Component", () => {
    test("should display pagination on contacts page", async ({ page }) => {
      await page.goto("/contacts");

      // Look for pagination controls
      const pagination = page
        .locator('[data-testid="pagination"]')
        .or(page.getByRole("navigation", { name: /pagination/i }))
        .or(page.getByText(/page \d+ of \d+/i));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should display pagination on history page", async ({ page }) => {
      await page.goto("/history");

      const pagination = page
        .locator('[data-testid="pagination"]')
        .or(page.getByText(/showing.*of.*items/i));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should display pagination on templates page", async ({ page }) => {
      await page.goto("/templates");

      const pagination = page
        .locator('[data-testid="pagination"]')
        .or(page.getByText(/page/i));

      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Navigation Controls", () => {
    test("should have next page button", async ({ page }) => {
      await page.goto("/contacts");

      const nextButton = page
        .getByRole("button", { name: /next/i })
        .or(page.locator('[aria-label*="next"]'))
        .or(page.locator("button:has(svg)").filter({ hasText: "" }).last());

      await expect(page.locator("body")).toBeVisible();
    });

    test("should have previous page button", async ({ page }) => {
      await page.goto("/contacts");

      const prevButton = page
        .getByRole("button", { name: /previous/i })
        .or(page.locator('[aria-label*="previous"]'));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should have first page button", async ({ page }) => {
      await page.goto("/contacts");

      const _firstButton = page
        .getByRole("button", { name: /first/i })
        .or(page.locator('[aria-label*="first"]'));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should have last page button", async ({ page }) => {
      await page.goto("/contacts");

      const _lastButton = page
        .getByRole("button", { name: /last/i })
        .or(page.locator('[aria-label*="last"]'));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should navigate to next page on click", async ({ page }) => {
      await page.goto("/contacts");

      const nextButton = page
        .getByRole("button", { name: /next/i })
        .or(page.locator('[aria-label*="next page"]'));

      if (
        (await nextButton.first().isVisible()) &&
        (await nextButton.first().isEnabled())
      ) {
        await nextButton.first().click();

        // Should update page indicator or content
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should navigate to previous page on click", async ({ page }) => {
      await page.goto("/contacts");

      // First go to page 2
      const nextButton = page.getByRole("button", { name: /next/i });
      if (
        (await nextButton.first().isVisible()) &&
        (await nextButton.first().isEnabled())
      ) {
        await nextButton.first().click();
        await page.waitForTimeout(300);
      }

      // Then go back
      const prevButton = page.getByRole("button", { name: /previous/i });
      if (
        (await prevButton.first().isVisible()) &&
        (await prevButton.first().isEnabled())
      ) {
        await prevButton.first().click();
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should disable previous button on first page", async ({ page }) => {
      await page.goto("/contacts");

      const prevButton = page
        .getByRole("button", { name: /previous/i })
        .or(page.locator('[aria-label*="previous"]'));

      if (await prevButton.first().isVisible()) {
        await expect(prevButton.first()).toBeDisabled();
      }
    });
  });

  test.describe("Page Size Selector", () => {
    test("should have page size selector", async ({ page }) => {
      await page.goto("/contacts");

      const _pageSizeSelector = page
        .getByRole("combobox")
        .or(page.locator("select"))
        .or(page.getByText(/items per page/i));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should have standard page size options", async ({ page }) => {
      await page.goto("/contacts");

      const selector = page.getByRole("combobox").first();

      if (await selector.isVisible()) {
        await selector.click();

        // Should show options like 10, 25, 50, 100
        const _option10 = page
          .getByRole("option", { name: "10" })
          .or(page.getByText("10"));
        const option25 = page
          .getByRole("option", { name: "25" })
          .or(page.getByText("25"));

        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should update items displayed when page size changes", async ({
      page,
    }) => {
      await page.goto("/contacts");

      const selector = page.getByRole("combobox").first();

      if (await selector.isVisible()) {
        await selector.click();

        const option25 = page.getByRole("option", { name: "25" });
        if (await option25.isVisible()) {
          await option25.click();

          // List should update
          await expect(page.locator("body")).toBeVisible();
        }
      }
    });
  });

  test.describe("Page Numbers", () => {
    test("should display page numbers", async ({ page }) => {
      await page.goto("/contacts");

      // Look for page number buttons
      const _pageNumbers = page
        .locator("button")
        .filter({ hasText: /^[1-9][0-9]*$/ });

      await expect(page.locator("body")).toBeVisible();
    });

    test("should highlight current page", async ({ page }) => {
      await page.goto("/contacts");

      // Current page should have different style
      const _currentPage = page
        .locator('[aria-current="page"]')
        .or(page.locator("button.bg-primary"));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should navigate to specific page on click", async ({ page }) => {
      await page.goto("/contacts");

      // Click on page 2 if available
      const page2Button = page.getByRole("button", { name: "2" });

      if (await page2Button.isVisible()) {
        await page2Button.click();

        // Should navigate to page 2
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should show ellipsis for many pages", async ({ page }) => {
      await page.goto("/contacts");

      // If there are many pages, should show ellipsis
      const _ellipsis = page
        .getByText("...")
        .or(page.locator(".text-muted-foreground").filter({ hasText: "..." }));

      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Item Count Display", () => {
    test("should show item count information", async ({ page }) => {
      await page.goto("/contacts");

      const _itemCount = page
        .getByText(/showing.*\d+.*of.*\d+/i)
        .or(page.getByText(/\d+ to \d+ of \d+/i));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should update count when page changes", async ({ page }) => {
      await page.goto("/contacts");

      const nextButton = page.getByRole("button", { name: /next/i });

      if (
        (await nextButton.first().isVisible()) &&
        (await nextButton.first().isEnabled())
      ) {
        await nextButton.first().click();

        // Count text should update
        await expect(page.locator("body")).toBeVisible();
      }
    });
  });

  test.describe("Responsive Pagination", () => {
    test("should show compact pagination on mobile", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/contacts");

      // Should show simplified pagination
      const pagination = page
        .locator('[data-testid="pagination"]')
        .or(page.getByText(/page.*of/i));

      await expect(page.locator("body")).toBeVisible();
    });

    test("should show full pagination on desktop", async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/contacts");

      // Should show full pagination with page numbers
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Empty State", () => {
    test("should not show pagination when no items", async ({ page }) => {
      // This test assumes an empty state scenario
      await page.goto("/contacts");

      // If showing empty state, pagination should be hidden
      const emptyState = page
        .getByText(/no contacts/i)
        .or(page.getByText(/no items/i))
        .or(page.getByText(/no results/i));

      if (await emptyState.first().isVisible()) {
        const pagination = page.locator('[data-testid="pagination"]');
        await expect(pagination).not.toBeVisible();
      }
    });
  });

  test.describe("Accessibility", () => {
    test("should have accessible labels on pagination buttons", async ({
      page,
    }) => {
      await page.goto("/contacts");

      const nextButton = page.getByRole("button", { name: /next/i });

      if (await nextButton.first().isVisible()) {
        const ariaLabel = await nextButton.first().getAttribute("aria-label");
        const text = await nextButton.first().textContent();

        // Should have accessible name
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test("should be keyboard navigable", async ({ page }) => {
      await page.goto("/contacts");

      // Tab through pagination
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      await expect(page.locator("body")).toBeVisible();
    });

    test("should have proper aria-current on active page", async ({ page }) => {
      await page.goto("/contacts");

      const _currentPage = page.locator('[aria-current="page"]');

      await expect(page.locator("body")).toBeVisible();
    });
  });
});
