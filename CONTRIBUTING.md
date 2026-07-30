# Contributing to Stellar Hooks

Thank you for your interest in contributing to **Stellar Hooks**. We appreciate your time and effort in helping improve the project. Whether you're fixing bugs, implementing new features, or enhancing documentation, your contributions are valued.

## Getting Started

### 1. Fork and Clone the Repository

Fork the repository to your GitHub account, then clone your fork locally.

```bash
git clone https://github.com/<your-username>/stellar-hooks.git
cd stellar-hooks
```

### 2. Install Dependencies

Install the project dependencies using your preferred package manager.

```bash
npm install
```

### 3. Create a Feature Branch

Create a new branch from the latest `main` using a descriptive name.

```bash
git checkout main
git pull origin main
git checkout -b fix/issue-<number>-short-description
```

#### Branch naming conventions

| Branch type | Prefix | Example |
|-------------|--------|---------|
| Bug fix | `fix/issue-<number>-` | `fix/issue-142-fix-auth-validation` |
| Feature | `feat/` | `feat/add-use-debounce-hook` |
| Documentation | `docs/` | `docs/update-readme-quickstart` |
| Chore / tooling | `chore/` | `chore/update-dependencies` |

Keep branch names short but descriptive. Reference the issue number when applicable.

## Development

Before submitting your changes, ensure the project builds successfully and all tests pass.

### Run Tests

```bash
npm test                    # run all unit/integration (mocked) tests
npm run test:watch          # watch mode
npm run test:types          # type definition tests (tsd)
npm run test:futurenet      # opt-in live Futurenet suite (network required)
```

Live Futurenet tests are excluded from `npm test` so default CI stays offline-friendly.
See [`tests/integration/futurenet/README.md`](tests/integration/futurenet/README.md).

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Build the Project

```bash
npm run build
```

### Development Server (Watch Mode)

```bash
npm run dev                 # builds in watch mode
```

### Documentation Preview

```bash
npm run docs:dev            # VitePress development server
npm run docs:build          # build documentation site
```

### Error handling convention

Every hook in this library that can fail during a transaction (build, sign,
submit, or poll) returns a `StellarTransactionError` object — never a plain
`Error` instance:

```ts
type StellarTransactionError =
  | { type: "network"; message: string }
  | { type: "transaction"; resultCode: string; message: string }
  | { type: "timeout"; message: string };
```

This lets consumers distinguish *why* something failed without parsing
message strings:

```tsx
const { error } = useTransaction(/* ... */);

if (error?.type === "network") {
  // request never reached the network — safe to retry immediately
} else if (error?.type === "transaction") {
  // submitted but failed on-chain — inspect error.resultCode
} else if (error?.type === "timeout") {
  // took too long — may or may not have succeeded, needs manual check
}
```

**When writing a new hook or test:**
- Any `onError` callback, `error` state field, or rejected promise related
  to building/signing/submitting/polling a transaction must use this shape,
  not a bare `Error`.
- Tests should assert against `error.type` and the relevant field
  (`message`, `resultCode`), not against `error instanceof Error` or a raw
  message string — the old plain-`Error` convention was corrected across
  the hooks in a previous cleanup and no longer reflects actual hook
  behavior.

## Submitting Your Contribution

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

| Type | Usage |
|------|-------|
| `fix` | Bug fixes |
| `feat` | New features |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `chore` | Tooling, configuration, dependencies |

Examples:

```
fix(auth): resolve JWT validation for expired tokens
feat(contract): add useSorobanEstimateGas hook
docs(readme): add install-connect-read quickstart
test(soroban): add fixture mocks for RPC responses
```

Keep the description under 70 characters. Reference the issue in the PR body, not the commit message.

### Before Opening a Pull Request

1. Run `npm run typecheck` — ensure zero type errors
2. Run `npm run lint` — ensure zero lint warnings
3. Run `npm test` — ensure all tests pass
4. Run `npm run build` — ensure the project builds
5. Run `npm run changeset` — create a changeset to document your changes

### Pull Request Checklist

- [ ] Only changes related to the issue are included
- [ ] Commit messages follow conventional commit format
- [ ] Branch name follows the naming convention
- [ ] Related issue is referenced in the PR description
- [ ] Type checking passes
- [ ] Linting passes
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Documentation is updated if necessary
- [ ] A changeset has been added to document version changes

## Code Review

Pull requests are automatically assigned to reviewers through the project's **CODEOWNERS** configuration. Please address any feedback promptly to help streamline the review process.

One PR should address exactly one issue. Keep changes minimal and focused — avoid refactoring unrelated code.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

Thank you for helping make **Stellar Hooks** better!
