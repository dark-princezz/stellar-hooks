# CHANGELOG Entry Format Guide

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

This guide establishes the standard format for entries in [`CHANGELOG.md`](../../CHANGELOG.md). We adhere strictly to the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standard and follow [Semantic Versioning (SemVer 2.0.0)](https://semver.org/spec/v2.0.0.html) as detailed in [`SEMVER.md`](../../SEMVER.md).

---

## Guiding Principles

1. **Written for Humans**: Changelogs are read by developers consuming `stellar-hooks`. Focus on what changed for them, what behavior they can expect, and how their code is affected—not low-level git commit messages or internal refactors.
2. **One Entry Per Change**: Every user-facing feature, bug fix, or breaking change must have an entry.
3. **Group by Category**: Entries must be classified into the standard categories described below.
4. **Link to Context**: Reference relevant Pull Requests or Issues with markdown links (e.g. `([#123](https://github.com/dark-princezz/stellar-hooks/pull/123))`).
5. **Reverse Chronological Order**: Newest versions and changes appear first.

---

## Standard Categories

Each release or unreleased block uses a subset of these six standard H3 section headings:

| Heading | Description | When to Use |
| :--- | :--- | :--- |
| `### Added` | New capabilities | For new hooks, props, exported types, or utility functions. |
| `### Changed` | Existing functionality updates | For non-breaking modifications to existing behavior, performance boosts, or dependency changes. |
| `### Deprecated` | Soon-to-be removed features | For existing functionality marked for removal in upcoming releases. |
| `### Removed` | Removed functionality | For previously deprecated features or APIs that have been deleted. |
| `### Fixed` | Bug fixes | For any bug fixes, corrected edge cases, or runtime errors resolved. |
| `### Security` | Vulnerability fixes | For patches addressing security advisories or vulnerabilities. |

---

## Format of an Entry

Every entry in the CHANGELOG should follow this structure:

```markdown
- `hookOrModuleName` — concise description of user-facing change ([#PR_NUMBER](https://github.com/dark-princezz/stellar-hooks/pull/PR_NUMBER))
```

### Breaking Changes
Breaking changes must be prominently flagged at the start of the bullet item with `**Breaking:**` and include a brief migration note or a reference to [`MIGRATION.md`](../../MIGRATION.md):

```markdown
- **Breaking:** `useAccountMerge` now returns a `{ submit, status, ... }` action API instead of executing immediately on render. See [MIGRATION.md](MIGRATION.md) for the upgrade path. ([#78](https://github.com/dark-princezz/stellar-hooks/pull/78))
```

---

## What Belongs in the CHANGELOG?

### ✅ Include:
- New React hooks or helper utilities
- New props or options added to existing hooks/providers
- Bug fixes affecting consumers
- Breaking changes and deprecation notices
- Significant performance improvements
- Changes to peer dependencies or minimum Node/React version requirements

### ❌ Do NOT Include:
- Internal code refactoring with no public API or behavioral change
- Test additions or test refactoring (unless documenting test framework changes for contributors)
- Documentation typo fixes (unless revising core API contracts)
- CI/CD workflow updates, linter configuration changes, or devDependency bumps

---

## Instructions for Pull Request Contributors

When submitting a PR that makes user-facing changes:

1. Open [`CHANGELOG.md`](../../CHANGELOG.md).
2. Under the top-level `## [Unreleased]` section, find or add the appropriate category heading (e.g., `### Added`, `### Fixed`).
3. Add your entry bullet following the format above.
4. If your PR introduces a breaking change:
   - Prefix the bullet with `**Breaking:**`.
   - Update [`MIGRATION.md`](../../MIGRATION.md) with migration instructions.
5. Check the box `- [x] I have updated the CHANGELOG.md (if applicable)` in your PR description.

---

## Examples

### Good Examples

```markdown
### Added
- `useFederation` — resolve Stellar federation addresses (SEP-2) to public account keys and memo values ([#812](https://github.com/dark-princezz/stellar-hooks/pull/812))
- `useStellarBalance` — add `assetType` filter option to read native or credit asset balances specifically ([#815](https://github.com/dark-princezz/stellar-hooks/pull/815))

### Fixed
- `useFreighter` — resolve race condition when multiple components call `requestAccess` simultaneously ([#820](https://github.com/dark-princezz/stellar-hooks/pull/820))
- `useTransaction` — prevent memory leak by clearing Horizon polling timer on component unmount ([#823](https://github.com/dark-princezz/stellar-hooks/pull/823))

### Changed
- **Breaking:** `StellarProvider` — rename prop `network` to `networkId` to prevent collision with browser Network API. See [MIGRATION.md](MIGRATION.md). ([#825](https://github.com/dark-princezz/stellar-hooks/pull/825))
```

### Bad Examples (Avoid)

```markdown
- updated freighter hook               <!-- Too vague, no link, no hook specifics -->
- fix: typo in variable name           <!-- Internal detail, not user-facing -->
- bump vitest to 1.6.0                 <!-- devDependency bump does not belong in user changelog -->
- changed code to make it faster       <!-- No context on which hook or what changed -->
```
