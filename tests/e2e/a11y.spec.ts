import { expect, test } from "./fixtures/a11y";

// The auto-fixture in ./fixtures/a11y scans every page these tests load and fails on new violations.
test.describe("accessibility of the e2e example app", () => {
  test("home page loads without new violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid='app-loaded']")).toBeVisible();
  });

  test("form controls are labelled", async ({ page }) => {
    await page.goto("/");
    // Interactive controls must be reachable by an accessible name; axe checks the rule, this guards the app.
    for (const testId of ["message-input", "connect-button"]) {
      const control = page.locator(`[data-testid='${testId}']`);
      if (await control.count()) {
        const name = (await control.first().getAttribute("aria-label")) ?? (await control.first().innerText().catch(() => ""));
        const placeholder = (await control.first().getAttribute("placeholder")) ?? "";
        expect(name || placeholder, `${testId} needs an accessible name`).not.toBe("");
      }
    }
  });
});
