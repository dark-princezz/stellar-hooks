# Release runbook

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

## Overview

`stellar-hooks` uses **semantic-release** for automated versioning, changelog generation, and npm publishing. Releases are fully automated: no manual version bumps, no manual changelog edits. The only human action required is writing conventional commits.

## How it works

1. A developer merges a PR into `main` with conventional commits.
2. The **CI** workflow runs typecheck, lint, tests, and bundle size checks.
3. If CI passes, the **Release** workflow fires automatically via `workflow_run`.
4. `semantic-release` analyses all commits since the last release, determines the version bump, updates `CHANGELOG.md`, bumps `package.json`, creates a GitHub release with tag, and publishes to npm.

If no releasable commits are found (only `chore:`, `ci:`, `docs:`, etc.), no release is made.

## Commit convention

Commits must follow the [Angular Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer — BREAKING CHANGE: <description>]
```

### Release rules

| Commit type / footer | Version bump |
|---|---|
| `BREAKING CHANGE:` in footer (any type) | **major** |
| `feat:` | **minor** |
| `fix:`, `perf:`, `revert:` | **patch** |
| `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:` | no release |

### Examples

```
feat: add useStellarToml hook
fix: handle null publicKey in useFreighter
perf: memoize network config lookup
feat!: rename StellarProvider prop `network` to `networkId`

BREAKING CHANGE: the `network` prop on StellarProvider has been renamed to
`networkId` to avoid collision with the browser Network Information API.
```

## Local dry run

To preview what the next release would be without pushing anything:

```bash
# Requires GITHUB_TOKEN and NPM_TOKEN set in your shell
export GITHUB_TOKEN=ghp_...
export NPM_TOKEN=npm_...
npm run release:dry-run
```

The dry run will print the determined version bump, the generated changelog entry, and what would be published — but makes no changes.

## Required repository secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | Publishes to npm. Create an Automation token at npmjs.com with Read/Write access to `stellar-hooks`. |
| `GITHUB_TOKEN` | Provided automatically by GitHub Actions. No manual setup needed. |

## Changesets compatibility

This repository previously used **Changesets** (`@changesets/cli`) for release management. Semantic-release has replaced the Changesets release workflow. The two tools are incompatible as co-release managers because both write to `CHANGELOG.md` and `package.json` version — running both would produce conflicts.

**What remains from Changesets:**
- `@changesets/cli` is still installed as a devDependency and the `npm run changeset` script still works. You can use it to draft changenote files during development as a discussion/review aid, but these files are **not consumed by the release pipeline** — only conventional commits are.
- `.changeset/config.json` is left intact.
- The `changeset:version` and `changeset:publish` scripts remain but are no longer invoked by CI.

If you want to fully remove Changesets you can run:

```bash
npm uninstall @changesets/cli @changesets/changelog-github
rm -rf .changeset
```

and remove the `changeset*` scripts from `package.json`. This is optional.

## Workflow files

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Runs on every push/PR: typecheck, lint, test, bundle size |
| `.github/workflows/release.yml` | Runs after CI passes on `main`: semantic-release |
| `.releaserc.json` | semantic-release configuration |

## First release from this setup

Because the repository already has `version: "0.1.0"` in `package.json` and a handwritten `CHANGELOG.md`, semantic-release will look at git history for a tag named `v0.1.0`. If that tag does not exist, it will treat all reachable commits as unreleased and determine the next version from them.

To anchor the history correctly before merging this branch, create the tag:

```bash
git tag v0.1.0 <commit-sha-of-0.1.0-release>
git push origin v0.1.0
```

If the tag already exists, semantic-release will pick up only commits after it.
