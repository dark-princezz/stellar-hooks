/**
 * Accessibility scanning for the end-to-end suite (#1202).
 *
 * `test` is a drop-in replacement for Playwright's `test`: every page a test loads is scanned with axe-core and the
 * test fails if a rule is violated that is not in `tests/e2e/a11y-baseline.json` for that page. Existing violations
 * are recorded in the baseline so they do not block unrelated work, and new ones fail. The full results are attached
 * to the test as `a11y-<page>.json`.
 */
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import { newViolations, pageName, type A11yViolation } from "./a11y-baseline";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export async function scanPage(page: Page): Promise<A11yViolation[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5),
  }));
}

/** Scan the current page and fail on new violations. Use for states a plain load does not reach (open modal, etc.). */
export async function expectNoNewA11yViolations(page: Page, name: string, testInfo?: TestInfo): Promise<void> {
  const violations = await scanPage(page);
  if (testInfo) {
    await testInfo.attach(`a11y-${name}.json`, { body: JSON.stringify(violations, null, 2), contentType: "application/json" });
  }
  const fresh = newViolations(name, violations);
  expect(fresh, `New accessibility violations on "${name}":\n${fresh.map((v) => `- ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.join("\n    ")}`).join("\n")}`).toEqual([]);
}

export const test = base.extend<{ a11yScanOnLoad: void }>({
  a11yScanOnLoad: [
    async ({ page }, use, testInfo) => {
      const scans = new Map<string, Promise<A11yViolation[]>>();

      page.on("load", () => {
        const url = page.url();
        if (!url.startsWith("http")) return;
        const name = pageName(url);
        // One scan per page per test; later loads of the same page are not re-scanned.
        if (!scans.has(name)) scans.set(name, scanPage(page).catch(() => []));
      });

      await use();

      const failures: string[] = [];
      for (const [name, pending] of scans) {
        const violations = await pending;
        await testInfo.attach(`a11y-${name}.json`, { body: JSON.stringify(violations, null, 2), contentType: "application/json" });
        const fresh = newViolations(name, violations);
        for (const v of fresh) failures.push(`${name}: ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.join("\n    ")}`);
      }
      expect(failures, `New accessibility violations:\n${failures.join("\n")}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
