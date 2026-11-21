/**
 * Pure helpers for the accessibility baseline (no Playwright import, so they can be unit tested with Vitest).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface A11yViolation {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: string[];
}

export type Baseline = { pages: Record<string, string[]> };

const BASELINE_PATH = join(__dirname, "..", "a11y-baseline.json");

export function loadBaseline(path: string = BASELINE_PATH): Baseline {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Baseline;
  } catch {
    return { pages: {} };
  }
}

/** Stable name for a page: its path, with `/` as `home`. */
export function pageName(url: string): string {
  const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  return path === "" ? "home" : path;
}

/** Violations whose rule id is not accepted in the baseline for `name`. */
export function newViolations(name: string, violations: A11yViolation[], baseline: Baseline = loadBaseline()): A11yViolation[] {
  const accepted = new Set(baseline.pages[name] ?? []);
  return violations.filter((v) => !accepted.has(v.id));
}
