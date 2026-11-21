import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression tests for the UI components, run against a static Storybook build (#1201).
 *
 *   npx storybook build            # produces storybook-static/
 *   npm run test:visual            # compares against tests/visual/__screenshots__
 *   npm run test:visual:update     # rewrites the baselines (after a deliberate styling change)
 *
 * Baselines are rendered on Linux in CI. Generate and update them with the "Visual regression" workflow
 * (workflow_dispatch, update=true), not on a laptop, or font rendering differences will fail every comparison.
 */
export default defineConfig({
  testDir: "./tests/visual",
  testMatch: /.*\.visual\.spec\.ts/,
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled", caret: "hide" },
  },
  use: {
    baseURL: "http://localhost:6006",
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "python3 -m http.server 6006 --directory storybook-static",
    url: "http://localhost:6006/index.json",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
