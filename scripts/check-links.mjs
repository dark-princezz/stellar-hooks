#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const docsDir = join(rootDir, "docs");
const timeoutMs = 10_000;
const concurrency = 8;
const allowlistPath = join(__dirname, "link-allowlist.json");
const allowlist = existsSync(allowlistPath) ? JSON.parse(readFileSync(allowlistPath, "utf8")) : {};

const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const htmlLink = /\bhref\s*=\s*["']([^"']+)["']/g;

function collectMarkdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectMarkdownFiles(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/[^\w\- ]/g, "")
    .replace(/ /g, "-")
    .replace(/^-|-$/g, "");
}

const anchorCache = new Map();

function anchorsFor(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const anchors = new Set();
  const content = readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const match = /^#{1,6}\s+(.*)$/.exec(line.trim());
    if (match) anchors.add(slugify(match[1].replace(/\s+#+\s*$/, "")));
  }
  anchorCache.set(file, anchors);
  return anchors;
}

function resolveLocal(file, href) {
  const clean = decodeURIComponent(href.split("#")[0].split("?")[0]);
  const isRootRelative = href.startsWith("/");
  const base = isRootRelative ? (file.startsWith(docsDir) ? docsDir : rootDir) : dirname(file);
  let target = resolve(base, isRootRelative ? clean.slice(1) : clean || ".");

  if (existsSync(target) && statSync(target).isDirectory() && existsSync(join(target, "index.md"))) target = join(target, "index.md");
  else if (!extname(target) && existsSync(`${target}.md`)) target = `${target}.md`;
  else if (!extname(target) && existsSync(join(target, "index.md"))) target = join(target, "index.md");

  return target;
}

async function checkExternal(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "stellar-hooks-link-checker/1.0" },
      });
    } catch {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "stellar-hooks-link-checker/1.0" },
      });
    }
    return { status: response.status };
  } catch (error) {
    return { error: error.name === "AbortError" ? "timed out" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

function findLinks(file) {
  const content = readFileSync(file, "utf8");
  const links = [];
  for (const [pattern, isHtml] of [[markdownLink, false], [htmlLink, true]]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (isHtml === false && match[0].startsWith("!")) continue;
      const raw = match[1].trim();
      if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("data:") || raw.startsWith("javascript:")) continue;
      if (Object.hasOwn(allowlist, raw)) continue;
      if (/^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(raw)) continue;
      const line = content.slice(0, match.index).split("\n").length;
      links.push({ raw, line, isHtml });
    }
  }
  return links;
}

async function main() {
  const files = [...collectMarkdownFiles(docsDir), join(rootDir, "README.md")];
  const external = new Map();
  const errors = [];
  const warnings = [];

  for (const file of files) {
    const location = relative(rootDir, file);
    const isGenerated = location.startsWith("docs/api/");
    for (const { raw, line } of findLinks(file)) {
      const [withoutHash, ...hashParts] = raw.split("#");
      const hash = hashParts.join("#");
      const sameFileAnchor = raw.startsWith("#");

      if (/^https?:\/\//i.test(raw)) {
        if (!external.has(raw)) external.set(raw, []);
        external.get(raw).push(`${location}:${line}`);
        continue;
      }

      if (isGenerated) continue;

      const target = sameFileAnchor ? file : resolveLocal(file, withoutHash);
      if (!existsSync(target)) {
        errors.push(`${location}:${line} missing local target: ${raw} -> ${relative(rootDir, target)}`);
        continue;
      }
      if (!hash || target.includes("/api/")) continue;
      if (!anchorsFor(target).has(decodeURIComponent(hash).toLowerCase())) {
        errors.push(`${location}:${line} missing anchor "#${hash}" in ${relative(rootDir, target)}`);
      }
    }
  }

  const queue = [...external.entries()];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      const [url, locations] = item;
      const result = await checkExternal(url);
      for (const location of locations) {
        if (result.error) errors.push(`${location} external link failed (${result.error}): ${url}`);
        else if (result.status >= 400 && result.status !== 403 && result.status !== 429) {
          errors.push(`${location} external link HTTP ${result.status}: ${url}`);
        } else if (result.status === 403 || result.status === 429) {
          warnings.push(`${location} external link HTTP ${result.status} (may be rate limited): ${url}`);
        }
      }
    }
  });
  await Promise.all(workers);

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const warning of warnings) console.log(`  ${warning}`);
  }
  if (errors.length) {
    console.error(`\n${errors.length} broken link(s):`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log(`Checked ${files.length} markdown files: all links resolved.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
