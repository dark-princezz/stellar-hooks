/**
 * Playwright reporter that reports flaky and quarantined end-to-end tests (#1203).
 *
 * - A test is **flaky** when it failed and then passed on a retry.
 * - A test is **quarantined** when its title or tags contain `@quarantine`. The main run excludes them
 *   (see `grepInvert` in playwright.config.ts); a separate non-blocking run executes only them, and this
 *   reporter says which of them passed, so they can be un-quarantined once stable.
 *
 * Writes `flaky-report.json` and, in GitHub Actions, appends a Markdown table to the job summary.
 */
import type { FullResult, Reporter, Suite, TestCase } from "@playwright/test/reporter";
import { appendFileSync, writeFileSync } from "node:fs";

interface Entry {
  title: string;
  file: string;
  project: string;
  attempts: number;
  outcome: string;
}

export function isQuarantined(test: Pick<TestCase, "title" | "tags">): boolean {
  return test.title.includes("@quarantine") || (test.tags ?? []).includes("@quarantine");
}

export function classify(test: TestCase): "flaky" | "quarantined" | null {
  if (isQuarantined(test)) return "quarantined";
  return test.outcome() === "flaky" ? "flaky" : null;
}

function toEntry(test: TestCase): Entry {
  return {
    title: test.titlePath().slice(2).join(" › "),
    file: test.location.file.replace(process.cwd() + "/", ""),
    project: test.parent.project()?.name ?? "",
    attempts: test.results.length,
    outcome: test.outcome(),
  };
}

export function renderSummary(flaky: Entry[], quarantined: Entry[]): string {
  const lines: string[] = ["## End-to-end test health", ""];
  lines.push(`### Flaky tests (passed only after a retry): ${flaky.length}`);
  if (flaky.length) {
    lines.push("", "| Test | File | Attempts |", "| --- | --- | --- |");
    for (const e of flaky) lines.push(`| ${e.title} | \`${e.file}\` | ${e.attempts} |`);
    lines.push("", "Tag a flaky test `@quarantine` and open an issue; see `tests/e2e/README.md`.");
  } else {
    lines.push("", "None.");
  }
  lines.push("", `### Quarantined tests that ran: ${quarantined.length}`);
  if (quarantined.length) {
    lines.push("", "| Test | Result | Attempts |", "| --- | --- | --- |");
    for (const e of quarantined) lines.push(`| ${e.title} | ${e.outcome === "expected" ? "passed (candidate to un-quarantine)" : e.outcome} | ${e.attempts} |`);
  } else {
    lines.push("", "None.");
  }
  return lines.join("\n") + "\n";
}

export default class FlakyReporter implements Reporter {
  private suite!: Suite;

  onBegin(_config: unknown, suite: Suite): void {
    this.suite = suite;
  }

  onEnd(_result: FullResult): void {
    const flaky: Entry[] = [];
    const quarantined: Entry[] = [];
    for (const test of this.suite.allTests()) {
      const kind = classify(test);
      if (kind === "flaky") flaky.push(toEntry(test));
      if (kind === "quarantined" && test.results.length > 0) quarantined.push(toEntry(test));
    }

    writeFileSync("flaky-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), flaky, quarantined }, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(flaky, quarantined));
  }
}
