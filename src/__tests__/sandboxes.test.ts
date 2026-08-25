import { describe, it, expect } from "vitest";
import { getSandboxUrls, HOOK_SANDBOXES } from "../utils/sandboxes";

describe("Sandbox Templates Utility", () => {
  it("provides sandbox info for core hooks", () => {
    expect(HOOK_SANDBOXES.useFreighter).toBeDefined();
    expect(HOOK_SANDBOXES.useAlbedo).toBeDefined();
    expect(HOOK_SANDBOXES.useXBull).toBeDefined();
    expect(HOOK_SANDBOXES.useLedgerEntries).toBeDefined();
  });

  it("returns StackBlitz and CodeSandbox URLs via getSandboxUrls", () => {
    const urls = getSandboxUrls("usePayment");
    expect(urls).not.toBeNull();
    expect(urls?.stackblitzUrl).toContain("stackblitz.com");
    expect(urls?.codesandboxUrl).toContain("codesandbox.io");
  });

  it("returns null for unknown hook name", () => {
    expect(getSandboxUrls("useNonExistentHook")).toBeNull();
  });
});
