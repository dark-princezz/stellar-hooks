#!/usr/bin/env node

/**
 * @file cli.js
 * @description CLI entry point for create-stellar-hooks-app.
 */

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const PACKAGE_JSON_PATH = path.join(__dirname, "../package.json");
const PKG_VERSION = fs.existsSync(PACKAGE_JSON_PATH)
  ? JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8")).version
  : "0.1.0";

const HELP_TEXT = `
create-stellar-hooks-app v${PKG_VERSION}

Usage:
  npx create-stellar-hooks-app [project-directory] [options]

Options:
  -t, --template <name>    Template to use (default: vite-react)
  -f, --force              Overwrite target directory if it already exists and is non-empty
  -h, --help               Display this help message
  -v, --version            Display version number

Available Templates:
  - vite-react (Vite + React 18 + TypeScript + Freighter wallet connection)
`;

function parseArgs(args) {
  const result = {
    targetDir: null,
    template: null,
    force: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      result.help = true;
    } else if (arg === "-v" || arg === "--version") {
      result.version = true;
    } else if (arg === "-f" || arg === "--force") {
      result.force = true;
    } else if (arg === "-t" || arg === "--template") {
      result.template = args[++i];
    } else if (!arg.startsWith("-") && !result.targetDir) {
      result.targetDir = arg;
    }
  }

  return result;
}

function prompt(question, defaultVal = "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

function findTemplatesDir() {
  const candidatePaths = [
    path.resolve(__dirname, "../templates"),
    path.resolve(__dirname, "../../templates"),
    path.resolve(__dirname, "../../../templates"),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error("Could not locate starter templates directory.");
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;
    if (destName === "_gitignore") destName = ".gitignore";
    const destPath = path.join(dest, destName);

    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function run() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv);

  if (options.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (options.version) {
    console.log(`v${PKG_VERSION}`);
    process.exit(0);
  }

  console.log("\n🚀 Welcome to create-stellar-hooks-app!\n");

  let targetDir = options.targetDir;
  if (!targetDir) {
    targetDir = await prompt("Project directory name (default: my-stellar-app): ", "my-stellar-app");
  }

  const rootPath = path.resolve(process.cwd(), targetDir);
  const projectName = path.basename(rootPath);

  if (fs.existsSync(rootPath)) {
    const existingFiles = fs.readdirSync(rootPath);
    if (existingFiles.length > 0 && !options.force) {
      console.error(
        `❌ Target directory '${targetDir}' already exists and is not empty. Use --force to proceed anyway.`
      );
      process.exit(1);
    }
  }

  const templatesDir = findTemplatesDir();
  const availableTemplates = fs
    .readdirSync(templatesDir)
    .filter((file) => fs.statSync(path.join(templatesDir, file)).isDirectory());

  let template = options.template || "vite-react";
  if (!availableTemplates.includes(template)) {
    console.log(`Template '${template}' not found. Available templates: ${availableTemplates.join(", ")}`);
    template = await prompt(`Choose a template (${availableTemplates.join("/")}) [default: vite-react]: `, "vite-react");
  }

  const selectedTemplateDir = path.join(templatesDir, template);
  if (!fs.existsSync(selectedTemplateDir)) {
    console.error(`❌ Template '${template}' does not exist.`);
    process.exit(1);
  }

  console.log(`\nScaffolding project in ${rootPath}...`);
  copyDirectory(selectedTemplateDir, rootPath);

  // Update target package.json
  const targetPkgPath = path.join(rootPath, "package.json");
  if (fs.existsSync(targetPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(targetPkgPath, "utf8"));
      pkg.name = projectName;
      fs.writeFileSync(targetPkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    } catch {
      // Ignore package.json parsing issue
    }
  }

  console.log(`\n✨ Success! Created ${projectName} at ${rootPath}`);
  console.log("\nInside that directory, you can run:\n");
  console.log(`  cd ${targetDir}`);
  console.log("  npm install");
  console.log("  npm run dev\n");
  console.log("Happy building on Stellar! 🚀\n");
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Error creating project:", err);
    process.exit(1);
  });
}

module.exports = { run, parseArgs, findTemplatesDir, copyDirectory };
