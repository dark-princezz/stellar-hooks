#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const docsDir = join(rootDir, "docs");
const indexPath = join(rootDir, "src", "index.ts");
const virtualDir = join(rootDir, ".snippet-check");
const codeLanguages = new Set(["ts", "tsx", "typescript", "js", "jsx", "javascript"]);
const placeholder = /(?:["'`](?:G|C)[A-Z0-9]*\.\.\.["'`])|\bTODO\b|@ts-ignore|as any/;

function normalize(path) {
  return resolve(path).split(sep).join("/");
}

function markdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

function collectSnippets() {
  const snippets = [];
  const issues = [];
  let skipped = 0;

  for (const file of markdownFiles(docsDir)) {
    if (relative(rootDir, file).split(sep).join("/").startsWith("docs/api/")) continue;
    const content = readFileSync(file, "utf8");
    const fence = /^```([^\r\n`]*)\r?\n([\s\S]*?)^```/gm;
    let match;
    while ((match = fence.exec(content)) !== null) {
      const tokens = match[1].trim().split(/\s+/).filter(Boolean);
      const language = tokens[0]?.toLowerCase() ?? "";
      if (!codeLanguages.has(language)) continue;
      if (!tokens.slice(1).includes("check")) {
        skipped += 1;
        continue;
      }

      const line = content.slice(0, match.index).split(/\r?\n/).length + 1;
      const location = `${relative(rootDir, file)}:${line}`;
      const code = match[2];
      if (placeholder.test(code)) {
        issues.push(`${location} snippet contains a placeholder; remove it or do not mark it for checking`);
        continue;
      }

      snippets.push({ location, code, language });
    }
  }

  return { snippets, issues, skipped };
}

function compilerOptions() {
  const configPath = join(rootDir, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, rootDir);
  return {
    ...parsed.options,
    noEmit: true,
    allowImportingTsExtensions: true,
    declaration: false,
    declarationMap: false,
    sourceMap: false,
    outDir: undefined,
    rootDir: undefined,
    baseUrl: normalize(rootDir),
    paths: {
      ...(parsed.options.paths ?? {}),
      "stellar-hooks": ["./src/index.ts"],
    },
  };
}

function main() {
  const { snippets, issues, skipped } = collectSnippets();
  if (!snippets.length) {
    console.error("No snippets marked with `check` were found in docs/.");
    process.exit(1);
  }

  const options = compilerOptions();
  const host = ts.createCompilerHost(options, true);
  const sources = new Map();
  const locations = new Map();

  snippets.forEach((snippet, index) => {
    const isTsx = snippet.language === "tsx" || snippet.language === "jsx";
    const fileName = normalize(join(virtualDir, `snippet-${index}.${isTsx ? "tsx" : "ts"}`));
    const source = snippet.code.replace(
      /from\s+(["'])stellar-hooks\1/g,
      `from ${JSON.stringify(normalize(indexPath).split("/").join("/"))}`
    );
    const kind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    sources.set(fileName, ts.createSourceFile(fileName, source, options.target ?? ts.ScriptTarget.ES2020, true, kind));
    locations.set(fileName, snippet.location);
  });

  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);

  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const key = normalize(fileName);
    if (sources.has(key)) return sources.get(key);
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  host.fileExists = (fileName) => sources.has(normalize(fileName)) || originalFileExists(fileName);
  host.readFile = (fileName) => sources.get(normalize(fileName))?.text ?? originalReadFile(fileName);

  const program = ts.createProgram([...sources.keys(), normalize(indexPath)], options, host);
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    if (!diagnostic.file) continue;
    const key = normalize(diagnostic.file.fileName);
    const location = locations.get(key);
    if (!location) continue;
    const position = diagnostic.start === undefined ? { line: 0, character: 0 } : diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    issues.push(`${location}:${position.line + 1}:${position.character + 1} TS${diagnostic.code}: ${message}`);
  }

  if (issues.length) {
    console.error(`${issues.length} snippet problem(s):`);
    for (const issue of issues) console.error(`  ${issue}`);
    process.exit(1);
  }

  console.log(`Checked ${snippets.length} docs snippets; skipped ${skipped} unmarked snippets.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
