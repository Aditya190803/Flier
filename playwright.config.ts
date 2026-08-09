import { defineConfig, devices } from "@playwright/test";

const chromiumProject = {
  name: "chromium",
  use: { ...devices["Desktop Chrome"] },
};

const browserProjects = [
  chromiumProject,
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "Mobile Chrome",
    use: { ...devices["Pixel 5"] },
  },
  {
    name: "Mobile Safari",
    use: { ...devices["iPhone 12"] },
  },
];

/**
 * Playwright Configuration for E2E Testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  expect: { timeout: 10_000 },
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    storageState: "test-results/e2e-auth.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // CI installs Chromium only; keep the full browser matrix for local runs.
  projects: process.env.CI ? [chromiumProject] : browserProjects,

  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
