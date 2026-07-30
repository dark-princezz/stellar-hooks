#!/usr/bin/env node

/**
 * Test that individual hook entry points don't pull in unrelated code.
 * This script analyzes the built dist files to verify tree-shaking works.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DIST_DIR = join(process.cwd(), "dist");
const HOOKS_DIR = join(DIST_DIR, "hooks");

console.log("Testing tree-shaking for individual hook entry points...\n");

// Get all hook files
const hookFiles = readdirSync(HOOKS_DIR)
  .filter(f => f.endsWith(".mjs") && !f.includes("index"))
  .map(f => f.replace(".mjs", ""));

const HOOKS_TO_TEST = [
  "useFreighter",
  "useStellarAccount", 
  "useSorobanContract",
  "useTransaction",
  "useWalletConnect",
].filter(h => hookFiles.includes(h));

const results = [];

for (const hook of HOOKS_TO_TEST) {
  console.log(`Testing ${hook}...`);
  
  const hookFile = join(HOOKS_DIR, `${hook}.mjs`);
  
  try {
    const code = readFileSync(hookFile, "utf-8");
    const size = code.length;
    const sizeKB = (size / 1024).toFixed(2);

    // Check for unrelated hook names in the bundle
    const unrelatedHooks = HOOKS_TO_TEST.filter(h => h !== hook);
    const foundUnrelated = unrelatedHooks.filter(h => 
      code.includes(h) && !code.includes(`// ${h}`)
    );

    results.push({
      hook,
      size,
      sizeKB,
      foundUnrelated,
      passed: foundUnrelated.length === 0,
    });

    if (foundUnrelated.length === 0) {
      console.log(`  ✓ Bundle size: ${sizeKB} KB - No unrelated hooks found`);
    } else {
      console.log(`  ✗ Bundle size: ${sizeKB} KB - Found unrelated hooks: ${foundUnrelated.join(", ")}`);
    }
  } catch (error) {
    console.log(`  ✗ Read failed: ${error.message}`);
    results.push({
      hook,
      size: 0,
      sizeKB: "0.00",
      foundUnrelated: [],
      passed: false,
      error: error.message,
    });
  }
}

// Summary
console.log("\n=== Tree-shaking Test Results ===");
const passed = results.filter(r => r.passed).length;
const total = results.length;

for (const result of results) {
  const status = result.passed ? "✓" : "✗";
  console.log(`${status} ${result.hook}: ${result.sizeKB} KB${result.foundUnrelated.length > 0 ? ` (unrelated: ${result.foundUnrelated.join(", ")})` : ""}`);
}

console.log(`\n${passed}/${total} hooks passed tree-shaking test`);

if (passed === total) {
  console.log("✓ All hooks are properly tree-shakeable!");
  process.exit(0);
} else {
  console.log("✗ Some hooks pull in unrelated code. Review the bundle analysis.");
  process.exit(1);
}
