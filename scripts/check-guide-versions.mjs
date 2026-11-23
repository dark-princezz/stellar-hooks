#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const docsDir = join(rootDir, "docs");

function guidesIn(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...guidesIn(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

const missing = [];
const files = [...guidesIn(join(docsDir, "guide")), ...guidesIn(join(docsDir, "guides"))];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!/\*\*Last verified:\*\*\s+stellar-hooks v[\d.]+\s+\(\d{4}-\d{2}-\d{2}\)/.test(content)) {
    missing.push(relative(rootDir, file));
  }
}

if (missing.length) {
  console.error(`Missing last-verified notes in ${missing.length} guide(s):`);
  for (const file of missing) console.error(`  ${file}`);
  process.exit(1);
}

console.log(`All ${files.length} guides include a last-verified version note.`);
