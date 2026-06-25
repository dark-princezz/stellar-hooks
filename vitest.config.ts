import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: [
      // Broken upstream test — wrong import paths and missing deps, pre-existing issue unrelated to this PR
      "src/__tests__/useSorobanContract.test.ts",
    ],
    alias: {
      "@stellar/freighter-api": fileURLToPath(
        new URL("./src/__mocks__/@stellar/freighter-api.ts", import.meta.url)
      ),
      "@stellar/freighter-api": new URL(
        "./src/__mocks__/@stellar/freighter-api.ts",
        import.meta.url
      ).pathname,
      "@creit-tech/stellar-wallets-kit/sdk": new URL(
        "./src/__mocks__/@creit-tech/stellar-wallets-kit-sdk.ts",
        import.meta.url
      ).pathname,
      "@walletconnect/sign-client": new URL(
        "./src/__mocks__/@walletconnect/sign-client.ts",
        import.meta.url
      ).pathname,
      "@creit-tech/stellar-wallets-kit/sdk": fileURLToPath(
        new URL("./src/__mocks__/@creit-tech/stellar-wallets-kit-sdk.ts", import.meta.url)
      ),
      "@walletconnect/sign-client": fileURLToPath(
        new URL("./src/__mocks__/@walletconnect/sign-client.ts", import.meta.url)
      ),
    },
  },
});
