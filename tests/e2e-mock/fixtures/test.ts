import { test as base, expect } from "@playwright/test";
import { installMockWallet, type MockWallet, type MockWalletOptions } from "./mock-wallet";

/** `test` with a `wallet` fixture: a mock Freighter installed before the page loads. */
export const test = base.extend<{ wallet: MockWallet; walletOptions: MockWalletOptions }>({
  walletOptions: [{}, { option: true }],
  wallet: async ({ page, walletOptions }, use) => {
    await use(await installMockWallet(page, walletOptions));
  },
});

export { expect };
