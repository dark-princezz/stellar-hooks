#!/usr/bin/env node

/**
 * @file smoke-test-templates.mjs
 * @description Smoke tests every starter template: install, build, and lint.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const templatesDir = join(rootDir, "templates");

if (!existsSync(templatesDir)) {
  console.log("No templates directory found.");
  process.exit(0);
}

const templates = readdirSync(templatesDir).filter((file) => {
  const fullPath = join(templatesDir, file);
  return statSync(fullPath).isDirectory() && existsSync(join(fullPath, "package.json"));
});

if (templates.length === 0) {
  console.log("No templates found to test.");
  process.exit(0);
}

console.log(`\n🔍 Found ${templates.length} starter template(s) to smoke-test: ${templates.join(", ")}\n`);

let hasError = false;

for (const template of templates) {
  const dir = join(templatesDir, template);
  console.log(`=======================================================`);
  console.log(`🧪 Smoke-testing template: ${template}`);
  console.log(`=======================================================`);

  try {
    console.log(`[${template}] 1/3: Installing dependencies...`);
    execSync("npm install", { cwd: dir, stdio: "inherit" });

    console.log(`[${template}] 2/3: Building project...`);
    execSync("npm run build", { cwd: dir, stdio: "inherit" });

    console.log(`[${template}] 3/3: Running linter...`);
    execSync("npm run lint", { cwd: dir, stdio: "inherit" });

    console.log(`✅ [${template}] All checks passed successfully!\n`);
  } catch (err) {
    console.error(`❌ [${template}] Smoke test failed:`, err.message);
    hasError = true;
  }
}

if (hasError) {
  console.error("❌ One or more starter templates failed the smoke test.");
  process.exit(1);
} else {
  console.log("🎉 All starter templates passed the smoke test!");
  process.exit(0);
}
