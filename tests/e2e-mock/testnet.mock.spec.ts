import { fundWithFriendbot } from "./fixtures/mock-wallet";
import { expect, test } from "./fixtures/test";

// Main example flows against the real testnet, run on a schedule (see .github/workflows/e2e-testnet.yml).
// They use a mocked wallet with a fresh key funded by Friendbot, so no extension or shared account is needed.
test.describe("example app on testnet", () => {
  test.beforeEach(async ({ wallet }) => {
    await fundWithFriendbot(wallet.publicKey);
  });

  test("connect, then load the funded account from Horizon", async ({ page, wallet }) => {
    await page.goto("/");
    await page.locator("[data-testid='connect-button']").click();
    await expect(page.locator("[data-testid='freighter-public-key']")).toHaveText(wallet.publicKey);

    const balance = page.locator("[data-testid='xlm-balance']");
    await expect(balance).toBeVisible({ timeout: 30_000 });
    expect(Number(await balance.innerText())).toBeGreaterThan(0);
  });

  test("sign a message after connecting", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-testid='connect-button']").click();
    await expect(page.locator("[data-testid='freighter-is-connected']")).toHaveText("true");
    await page.locator("[data-testid='message-input']").fill("testnet e2e");
    await page.locator("[data-testid='sign-message-button']").click();
    await expect(page.locator("[data-testid='signature-result']")).not.toBeEmpty({ timeout: 15_000 });
  });
});
