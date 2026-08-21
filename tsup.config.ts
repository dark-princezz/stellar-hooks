import { defineConfig } from "tsup";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { visualizer } from "rollup-plugin-visualizer";

const hooksDir = join(__dirname, "src/hooks");
const hookFiles = readdirSync(hooksDir)
  .filter((f) => /^use[A-Z].+\.ts$/.test(f) && !f.endsWith(".test.ts"))
  .map((f) => join(hooksDir, f));

const entry = [join(__dirname, "src/index.ts"), ...hookFiles];
const external = [
  "react",
  "@stellar/stellar-sdk",
  "@stellar/stellar-sdk/rpc",
  "@stellar/stellar-sdk/contract",
  "@stellar/freighter-api",
  "@albedo-link/intent",
  "@walletconnect/sign-client",
  "@creit-tech/stellar-wallets-kit/sdk",
];

// tsup runs `dts` generation in a worker thread and passes the full resolved
// config to it via `postMessage`. Functions (like a custom `rollup()` hook)
// can't be structured-cloned, which crashes the DTS worker. So JS bundling
// (with the visualizer plugin) and declaration-file generation are split into
// two separate configs — the DTS pass carries no rollup hook.
export default defineConfig([
  {
    entry,
    format: ["cjs", "esm"],
    dts: false,
    clean: true,
    treeshake: true,
    external,
    rollup(options) {
      options.plugins = options.plugins || [];
      options.plugins.push(
        visualizer({
          filename: "dist/stats.html",
          open: false,
          gzipSize: true,
          brotliSize: true,
        })
      );
    },
  },
  {
    entry,
    format: ["cjs", "esm"],
    dts: { only: true },
    clean: false,
    external,
  },
]);
