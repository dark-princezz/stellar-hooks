import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * One screenshot per story under "Components/" (the optional UI components). Stories are discovered from the
 * built Storybook's index.json, so adding a story adds a visual test; the first run for it fails until its baseline
 * is generated (see playwright.visual.config.ts).
 */
interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: "story" | "docs";
}

const indexPath = join(process.cwd(), "storybook-static", "index.json");

function componentStories(): IndexEntry[] {
  if (!existsSync(indexPath)) return [];
  const { entries } = JSON.parse(readFileSync(indexPath, "utf8")) as { entries: Record<string, IndexEntry> };
  return Object.values(entries).filter((e) => e.type === "story" && e.title.startsWith("Components/"));
}

const stories = componentStories();

test("storybook build is present and has component stories", () => {
  expect(stories.length, "Run `npx storybook build` first; no Components/* stories were found").toBeGreaterThan(0);
});

for (const story of stories) {
  test(`${story.title} / ${story.name}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await page.waitForSelector("#storybook-root > *", { state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("#storybook-root")).toHaveScreenshot(`${story.id}.png`);
  });
}
