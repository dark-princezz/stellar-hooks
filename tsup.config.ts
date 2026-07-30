import { defineConfig } from "tsup";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { visualizer } from "rollup-plugin-visualizer";

const hooksDir = join(__dirname, "src/hooks");
const hookFiles = readdirSync(hooksDir)
  .filter((f) => /^use[A-Z].+\.ts$/.test(f) && !f.endsWith(".test.ts"))
  .map((f) => join(hooksDir, f));

export default defineConfig({
  entry: [join(__dirname, "src/index.ts"), ...hookFiles],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  treeshake: true,
  external: [
    "react",
    "@stellar/stellar-sdk",
    "@stellar/stellar-sdk/rpc",
    "@stellar/stellar-sdk/contract",
    "@stellar/freighter-api",
    "@albedo-link/intent",
    "@walletconnect/sign-client",
    "@creit-tech/stellar-wallets-kit/sdk",
  ],
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
});
