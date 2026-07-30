import { execFileSync } from "node:child_process";

const output = execFileSync("git", ["ls-files"], {
  encoding: "utf8",
});

const seen = new Map();
const collisions = [];

for (const rawPath of output.split("\n")) {
  const path = rawPath.trim();
  if (!path) continue;

  const folded = path.toLowerCase();
  const existing = seen.get(folded);

  if (existing && existing !== path) {
    collisions.push([existing, path]);
    continue;
  }

  seen.set(folded, path);
}

if (collisions.length > 0) {
  console.error("Case-only path collisions detected:");
  for (const [first, second] of collisions) {
    console.error(`- ${first}`);
    console.error(`  ${second}`);
  }
  process.exit(1);
}

console.log("No case-only path collisions detected.");
