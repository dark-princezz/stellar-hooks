/**
 * Opt-in Vitest config for live Futurenet integration tests.
 *
 * These tests hit public Futurenet Horizon / Soroban RPC endpoints and are
 * excluded from the default `npm test` suite. Run with:
 *
 *   npm run test:futurenet
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

if (process.env.RUN_FUTURENET_TESTS !== "1") {
  // eslint-disable-next-line no-console
  console.error(
    [
      "",
      "Futurenet integration tests are opt-in and talk to live network endpoints.",
      "Run them with:  npm run test:futurenet",
      "Or set:         RUN_FUTURENET_TESTS=1",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

export default defineConfig({
  root,
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    // Node avoids jsdom XHR hangs with the Stellar SDK HTTP client.
    environment: "node",
    globals: true,
    include: ["tests/integration/futurenet/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    testTimeout: 60_000,
    hookTimeout: 90_000,
    teardownTimeout: 5_000,
    fileParallelism: false,
    maxConcurrency: 1,
    // Forks isolate open Horizon/undici sockets so the suite can exit cleanly.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      concurrent: false,
    },
    alias: {
      "stellar-hooks": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
});
