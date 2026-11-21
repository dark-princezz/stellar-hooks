import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests that use the mocked wallet (tests/e2e-mock). They run headless Chromium with no extension, so
 * they work in CI. The wallet-extension tests stay in playwright.config.ts.
 *
 *   npx playwright test -c playwright.mock.config.ts                       # everything
 *   npx playwright test -c playwright.mock.config.ts wallet.mock.spec.ts   # offline wallet tests only
 */
export default defineConfig({
  testDir: "./tests/e2e-mock",
  testMatch: /.*\.mock\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium-mock-wallet", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev --prefix examples/e2e-test-app",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
