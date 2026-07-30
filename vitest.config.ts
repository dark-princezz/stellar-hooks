import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import path from "node:path";

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
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.test-d.ts", "examples/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "src/types/branded.test-d.ts",
      "tests/integration/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    alias: {
      "@albedo-link/intent": fileURLToPath(
        new URL("./src/__mocks__/@albedo-link/intent.ts", import.meta.url)
      ),
      "@stellar/freighter-api": fileURLToPath(
        new URL("./src/__mocks__/@stellar/freighter-api.ts", import.meta.url)
      ),
      "@creit-tech/stellar-wallets-kit/sdk": fileURLToPath(
        new URL("./src/__mocks__/@creit-tech/stellar-wallets-kit-sdk.ts", import.meta.url)
      ),
      "@walletconnect/sign-client": fileURLToPath(
        new URL("./src/__mocks__/@walletconnect/sign-client.ts", import.meta.url)
      ),
      "stellar-hooks": fileURLToPath(
        new URL("./src/index.ts", import.meta.url)
      ),
    },
  },
});
