import { expect, test } from "./fixtures/test";

// Exercises the mocked wallet against the e2e example app, with no browser extension.
test.describe("mocked wallet", () => {
  test.beforeEach(async ({ page, wallet }) => {
    void wallet; // installed by the fixture before navigation
    await page.goto("/");
    await expect(page.locator("[data-testid='app-loaded']")).toBeVisible();
  });

  test("the app detects the wallet", async ({ page }) => {
    await expect(page.locator("[data-testid='freighter-is-installed']")).toHaveText("true");
  });

  test("connects and shows the wallet's public key", async ({ page, wallet }) => {
    await page.locator("[data-testid='connect-button']").click();
    await expect(page.locator("[data-testid='freighter-is-connected']")).toHaveText("true");
    await expect(page.locator("[data-testid='freighter-public-key']")).toHaveText(wallet.publicKey);
    expect(wallet.calls.map((c) => c.type)).toContain("REQUEST_ACCESS");
  });

  test("signs a message with the wallet key", async ({ page }) => {
    await page.locator("[data-testid='connect-button']").click();
    await expect(page.locator("[data-testid='freighter-is-connected']")).toHaveText("true");
    await page.locator("[data-testid='message-input']").fill("hello from e2e");
    await page.locator("[data-testid='sign-message-button']").click();
    await expect(page.locator("[data-testid='signature-result']")).not.toBeEmpty();
  });

  test("a rejected connection leaves the app disconnected", async ({ page, wallet }) => {
    wallet.rejectNext("requestAccess");
    await page.locator("[data-testid='connect-button']").click();
    await expect(page.locator("[data-testid='freighter-is-connected']")).toHaveText("false");
  });
});
