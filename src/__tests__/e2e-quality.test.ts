import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadBaseline, newViolations, pageName } from "../../tests/e2e/fixtures/a11y-baseline";
import { isQuarantined, renderSummary } from "../../tests/e2e/reporters/flaky-reporter";

describe("a11y baseline (#1202)", () => {
  const baseline = { pages: { home: ["color-contrast"] } };
  const v = (id: string) => ({ id, impact: "serious", help: id, nodes: [] });

  it("names pages by path", () => {
    expect(pageName("http://localhost:3000/")).toBe("home");
    expect(pageName("http://localhost:3000/send/")).toBe("send");
  });

  it("only reports violations missing from the baseline", () => {
    expect(newViolations("home", [v("color-contrast"), v("label")], baseline).map((x) => x.id)).toEqual(["label"]);
  });

  it("treats a page with no baseline entry as having none accepted", () => {
    expect(newViolations("other", [v("label")], baseline)).toHaveLength(1);
  });

  it("falls back to an empty baseline when the file is missing or invalid", () => {
    expect(loadBaseline("/does/not/exist.json")).toEqual({ pages: {} });
    const file = join(mkdtempSync(join(tmpdir(), "a11y-")), "b.json");
    writeFileSync(file, "{not json");
    expect(loadBaseline(file)).toEqual({ pages: {} });
  });
});

describe("flaky reporter (#1203)", () => {
  it("recognises quarantined tests by title or tag", () => {
    expect(isQuarantined({ title: "connects @quarantine", tags: [] })).toBe(true);
    expect(isQuarantined({ title: "connects", tags: ["@quarantine"] })).toBe(true);
    expect(isQuarantined({ title: "connects", tags: [] })).toBe(false);
  });

  it("renders a summary with flaky and quarantined sections", () => {
    const entry = { title: "wallet › connects", file: "tests/e2e/a.spec.ts", project: "p", attempts: 2, outcome: "flaky" };
    const text = renderSummary([entry], [{ ...entry, outcome: "expected" }]);
    expect(text).toContain("Flaky tests (passed only after a retry): 1");
    expect(text).toContain("| wallet › connects | `tests/e2e/a.spec.ts` | 2 |");
    expect(text).toContain("candidate to un-quarantine");
  });

  it("says when there is nothing to report", () => {
    expect(renderSummary([], [])).toContain("None.");
  });
});
