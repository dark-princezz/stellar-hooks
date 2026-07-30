import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for e2e testing with real Freighter extension.
 * 
 * Setup:
 * 1. Install Playwright: npm install --save-dev @playwright/test
 * 2. Install browsers: npx playwright install chromium
 * 3. Download Freighter extension for testing:
 *    - Get the CRX file from https://github.com/freighter-wallet/freighter-extension/releases
 *    - Or build from source: https://github.com/freighter-wallet/freighter-extension
 * 4. Place the CRX file in tests/e2e/fixtures/freighter.crx
 * 5. Configure testnet account in Freighter before running tests
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Run serially to avoid wallet state conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid extension conflicts
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-with-freighter",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome", // Use Chrome for extension support
        launchOptions: {
          args: [
            `--disable-extensions-except=${process.cwd()}/tests/e2e/fixtures/freighter.crx`,
            `--load-extension=${process.cwd()}/tests/e2e/fixtures/freighter.crx`,
          ],
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev --prefix examples/e2e-test-app",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
