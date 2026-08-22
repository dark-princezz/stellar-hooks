#!/usr/bin/env node
/**
 * check-duplicate-exports.mjs
 * Fails with exit code 1 if dist/index.d.ts contains any duplicate
 * exported identifier names. Run after `npm run build`.
 *
 * Usage: node scripts/check-duplicate-exports.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const dtsPath = resolve(process.cwd(), "dist/index.d.ts");

let content;
try {
  content = readFileSync(dtsPath, "utf8");
} catch {
  console.error(`ERROR: Could not read ${dtsPath}`);
  console.error("Run 'npm run build' first.");
  process.exit(1);
}

// Match all top-level export names:
// export { Foo, Bar } from ...
// export { local as Public, ... } from ...
// export type { Baz } from ...
// export declare function/class/const/type/interface Identifier
const EXPORT_RE =
  /^export\s+(?:declare\s+)?(?:function|class|const|let|var|type|interface|abstract\s+class)\s+([A-Za-z_$][\w$]*)|^export\s+(?:type\s+)?\{([^}]+)\}/gm;

const seen = new Map(); // name → first line number
const duplicates = [];

for (const match of content.matchAll(EXPORT_RE)) {
  const names = match[1]
    ? [match[1]]
    : match[2]
        .split(",")
        .map((s) => {
          const trimmed = s.trim();
          // For "local as Public", the actual exported (public) identifier
          // is the one after "as" — not the local alias before it.
          const asMatch = trimmed.match(/\bas\s+(\S+)$/);
          return asMatch ? asMatch[1] : trimmed;
        })
        .filter(Boolean);

  for (const name of names) {
    if (seen.has(name)) {
      duplicates.push(name);
    } else {
      seen.set(name, true);
    }
  }
}

if (duplicates.length > 0) {
  console.error("❌  Duplicate exports found in dist/index.d.ts:");
  for (const name of [...new Set(duplicates)]) {
    console.error(`    - ${name}`);
  }
  console.error(
    "\nFix duplicate exports in src/index.ts or src/hooks/index.ts before merging."
  );
  process.exit(1);
}

console.log("✅  No duplicate exports found in dist/index.d.ts.");
process.exit(0);