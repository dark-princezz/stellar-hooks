/**
 * @file create-stellar-hooks-app.test.ts
 * @description Unit tests for create-stellar-hooks-app CLI parser and directory helpers.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect } from "vitest";
import { parseArgs, findTemplatesDir } from "../../packages/create-stellar-hooks-app/bin/cli.js";
import fs from "node:fs";

describe("create-stellar-hooks-app CLI", () => {
  it("parses CLI arguments correctly", () => {
    const opts = parseArgs(["my-app", "--template", "vite-react", "--force"]);
    expect(opts.targetDir).toBe("my-app");
    expect(opts.template).toBe("vite-react");
    expect(opts.force).toBe(true);
    expect(opts.help).toBe(false);
  });

  it("handles help and version flags", () => {
    expect(parseArgs(["-h"]).help).toBe(true);
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-v"]).version).toBe(true);
    expect(parseArgs(["--version"]).version).toBe(true);
  });

  it("finds the templates directory", () => {
    const dir = findTemplatesDir();
    expect(fs.existsSync(dir)).toBe(true);
    const contents = fs.readdirSync(dir);
    expect(contents).toContain("vite-react");
  });
});
