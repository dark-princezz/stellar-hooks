import { test, expect } from "@playwright/test";

/**
 * E2E tests for useFreighter hook with real Freighter extension on testnet.
 * 
 * Prerequisites:
 * 1. Freighter extension must be installed and configured with testnet account
 * 2. Testnet account should have some XLM for transactions
 * 3. Extension should be unlocked before running tests
 */

test.describe("useFreighter hook", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test app
    await page.goto("/");
    
    // Wait for the app to load
    await page.waitForSelector("[data-testid='app-loaded']", { timeout: 10000 });
  });

  test("should detect installed Freighter extension", async ({ page }) => {
    const isInstalled = page.locator("[data-testid='freighter-is-installed']");
    await expect(isInstalled).toHaveText("true");
  });

  test("should connect to Freighter wallet", async ({ page }) => {
    const connectButton = page.locator("[data-testid='connect-button']");
    await connectButton.click();

    // Wait for Freighter popup (user needs to approve)
    // In automated testing, we'd need to handle the popup
    // For now, we'll wait for the connection state to update
    
    const isConnected = page.locator("[data-testid='freighter-is-connected']");
    await expect(isConnected).toHaveText("true", { timeout: 30000 });
  });

  test("should display public key after connection", async ({ page }) => {
    const connectButton = page.locator("[data-testid='connect-button']");
    await connectButton.click();

    const publicKey = page.locator("[data-testid='freighter-public-key']");
    await expect(publicKey).not.toBeEmpty({ timeout: 30000 });
    await expect(publicKey).toMatch(/^[G][A-Z2-7]{55}$/);
  });

  test("should sign a message", async ({ page }) => {
    const connectButton = page.locator("[data-testid='connect-button']");
    await connectButton.click();

    await page.waitForSelector("[data-testid='freighter-is-connected='true']", { timeout: 30000 });

    const signMessageButton = page.locator("[data-testid='sign-message-button']");
    const messageInput = page.locator("[data-testid='message-input']");
    
    await messageInput.fill("Test message for signing");
    await signMessageButton.click();

    const signature = page.locator("[data-testid='signature-result']");
    await expect(signature).not.toBeEmpty({ timeout: 30000 });
  });

  test("should detect network passphrase mismatch", async ({ page }) => {
    // This test would require configuring the app to use a different network
    // than what Freighter is set to
    const networkMismatch = page.locator("[data-testid='network-mismatch']");
    // Implementation depends on app configuration
  });
});

test.describe("useStellarAccount hook", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='app-loaded']", { timeout: 10000 });
  });

  test("should fetch account data for connected wallet", async ({ page }) => {
    const connectButton = page.locator("[data-testid='connect-button']");
    await connectButton.click();

    await page.waitForSelector("[data-testid='freighter-is-connected='true']", { timeout: 30000 });

    const accountData = page.locator("[data-testid='account-data']");
    await expect(accountData).toBeVisible({ timeout: 10000 });
  });

  test("should display account balance", async ({ page }) => {
    const connectButton = page.locator("[data-testid='connect-button']");
    await connectButton.click();

    await page.waitForSelector("[data-testid='freighter-is-connected='true']", { timeout: 30000 });

    const balance = page.locator("[data-testid='xlm-balance']");
    await expect(balance).toBeVisible({ timeout: 10000 });
    await expect(balance).not.toBeEmpty();
  });
});

test.describe("useTransaction hook", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='app-loaded']", { timeout: 10000 });
  });

  test("should submit a payment transaction", async ({ page }) => {
    const connectButton = page.locator("[data-testid='connect-button']");
    await connectButton.click();

    await page.waitForSelector("[data-testid='freighter-is-connected='true']", { timeout: 30000 });

    const destinationInput = page.locator("[data-testid='payment-destination']");
    const amountInput = page.locator("[data-testid='payment-amount']");
    const submitButton = page.locator("[data-testid='submit-payment']");

    // Use a testnet destination address
    await destinationInput.fill("GD5J6JFZ3VVHCBT2DZVX4JNXGNRQJ2KWL4QWALJ5NQJ4KVPJCEKJW5IQ");
    await amountInput.fill("0.01");
    await submitButton.click();

    // Wait for transaction to complete
    const txStatus = page.locator("[data-testid='transaction-status']");
    await expect(txStatus).toHaveText("success", { timeout: 60000 });
  });
});
