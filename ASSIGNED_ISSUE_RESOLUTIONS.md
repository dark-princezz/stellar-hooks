# Assigned Issue Resolutions and analysis

Analysis of the four issues currently assigned to this contributor, confirmed against
`dark-princezz/stellar-hooks` at `c7852b7` (`main`), package version `stellar-hooks@0.2.0`.

| Issue | Subject | Status |
| --- | --- | --- |
| [#909](https://github.com/dark-princezz/stellar-hooks/issues/909) | Document SEP-10 backend requirements | Spec below — unblocked, docs-only |
| [#912](https://github.com/dark-princezz/stellar-hooks/issues/912) | Add `useOraclePrice` | Spec below — blocked on a broken sibling |
| [#910](https://github.com/dark-princezz/stellar-hooks/issues/910) | Add `useSession` | Spec below — blocked on #907, #908 |
| [#911](https://github.com/dark-princezz/stellar-hooks/issues/911) | Gated-content example | Spec below — blocked on #907 |

Read the repository health section first. Three of these four issues cannot be
implemented as written until something unrelated is fixed, and that is the most
important thing this document has to say.

---

## Repository health: `main` does not compile

This is not a precondition of the four issues, but three of them depend on it, and it
is the reason the specs below are specs rather than patches.

### `npx tsc --noEmit -p tsconfig.json` fails with 38 errors

All 38 are **syntax** errors, which means the affected files do not parse:

| File | Errors | Cause |
| --- | --- | --- |
| `src/hooks/useSorobanServer.ts` | 27 | Whole file is inside a malformed block comment; `TS1160: Unterminated template literal` at `52:1` |
| `src/hooks/useTransactionLifecycle.ts` | 10 | Multiple parse errors |
| `src/utils/errorStrings.ts` | 1 | Stray duplicate comma at `:76` |

`src/utils/errorStrings.ts:76` is a one-character fix:

```ts
networkError: "A network error occurred while communicating with the Stellar network.",,
```

`src/hooks/useSorobanServer.ts` is a different problem. Lines 20-31 are commented-out
code inside a doc block:

```
 * }
 *
 * async function simulateTransaction(txXdr: string) {
 *   return server.simulateTransaction(txXdr);
 * }
 *
 * async function getContractData(contractId: string) {
 *   const key = xdr.LedgerKey.contractData(/* ... */);
```

There is a nested `/* ... */` inside a `/** ... */`, so the block closes early and the
remainder of the file is parsed as code. Whatever this file was meant to contain, it
currently contains none of it.

### Parse errors are hiding three more

TypeScript reports syntactic diagnostics and suppresses semantic ones for the rest of
the program. Once the parse errors are gone, three unresolved imports surface.
Typechecking those two files in isolation:

```
src/hooks/index.ts(1,15):          error TS2307: Cannot find module './useOracle'
src/hooks/useOracleHistory.ts(2,41): error TS2307: Cannot find module 'soroban-client'
src/hooks/useOracleHistory.ts(3,26): error TS2307: Cannot find module 'stellar-sdk'
```

Neither `soroban-client` nor `stellar-sdk` is in `package.json`. The repository depends
on `@stellar/stellar-sdk@13.3.0`; bare `stellar-sdk` is the pre-scope package name, and
`soroban-client` is the archived predecessor of the SDK's RPC client. Both imports in
`useOracleHistory.ts` are unresolvable as written.

This matters more than a normal type error, because `tsup.config.ts` builds an entry
per hook file:

```ts
const hookFiles = readdirSync(hooksDir)
  .filter((f) => /^use[A-Z].+\.ts$/.test(f) && !f.endsWith(".test.ts"))
  .map((f) => join(hooksDir, f));

const entry = [join(__dirname, "src/index.ts"), ...hookFiles];
```

Every `src/hooks/use*.ts` is published as its own entrypoint with generated
declarations. So `useOracleHistory.ts` is not dead code that happens to be broken — it
is a broken module in the shipped surface.

### `npm ci` fails

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json or npm-shrinkwrap.json are in sync.
npm error Missing: @stellar-hooks/core@0.2.0 from lock file
npm error Missing: jscodeshift@17.4.0 from lock file
npm error Missing: madge@8.0.0 from lock file
```

Roughly 20 packages are missing from the lockfile. `npm install` succeeds and was used
to produce the results above, but that rewrites the lockfile, so the two commands are
not interchangeable in CI.

### Suggested order

1. `errorStrings.ts:76` — one character.
2. Decide what `useSorobanServer.ts` is meant to be, then rewrite it as valid TypeScript.
3. `useTransactionLifecycle.ts` parse errors.
4. `npm install` and commit the regenerated `package-lock.json`.
5. Only then the `useOracle` / `useOracleHistory` imports (see #912).

Steps 1-4 are a prerequisite for any meaningful `npm run build` or `tsc` gate, and
therefore for reviewing anything in the four issues below.

---

## #909 — Document SEP-10 backend requirements

### The one issue here that is unblocked and fully deliverable as documentation

`useWebAuth` **already exists and fully implements SEP-10**:
`src/hooks/useWebAuth.ts` is 369 lines, `src/hooks/useWebAuth.test.ts` is 552 lines, and
it is exported from the public API at `src/index.ts:584-589` together with
`WebAuthStatus`, `UseWebAuthOptions` and `UseWebAuthReturn`. It drives the real
`WebAuth` class from `@stellar/stellar-sdk` through
`fetch challenge → validate → sign → submit → JWT`.

The gap is documentation. `docs/hooks/` contains 52 pages and none of them covers
`useWebAuth`, `useOracle*` or sessions. `ROADMAP.md` still lists `useWebAuth()` as an
unchecked `- [ ]` under the `v0.3.0` milestone, which is also stale — the hook shipped.

### Naming conflict to settle first

The issue asks for documentation "for `useSignInWithStellar`". **No such hook exists.**
[#907](https://github.com/dark-princezz/stellar-hooks/issues/907) ("Add
`useSignInWithStellar` implementing SEP-10 web authentication") is open and unassigned,
and describes a hook that is functionally identical to the one already in the tree.

One of these needs to happen before the doc lands:

- **Close #907 as a duplicate** and document `useWebAuth` under its real name. Cheapest,
  and matches what the code does.
- **Rename `useWebAuth` → `useSignInWithStellar`**, keeping `useWebAuth` as a deprecated
  alias. Costs a major version bump; `SEMVER.md` and `MIGRATION.md` exist for this.
- **Ship `useSignInWithStellar` as a thin wrapper** over `useWebAuth`. Preserves both
  names, adds a second public name for one behaviour, and leaves the next reader
  guessing which to use.

The first is recommended. A hook name is public API, and the existing one is already
documented by its own test suite and JSDoc.

### What a backend must implement

This is the substance the issue is asking for, independent of which name wins.

**`GET {webAuthEndpoint}?account={G...}` → challenge transaction XDR**

Returns the SEP-10 challenge transaction as base64 XDR in the response body. Per SEP-10
the server must:

- set the transaction's source account to the server's own signing key, with
  `sequenceNumber = 0` (or `"0"`) and `sourceAccountKilled = false`;
- set `timeBounds.minTime` / `maxTime` to a short window — SEP-10 caps this at ~5
  minutes, and it is the main defence against replay of an old challenge;
- add one `signer` operation of type `signer_key_type = signer_key_type_pre_auth_tx`
  whose pre-auth transaction hash is `SHA-256(network passphrase ++ envelope)`, where the
  envelope is the base64 challenge XDR and the passphrase is the one the client is on;
- sign the transaction so the client can verify server identity.

The client validates all of the above via `WebAuth.readChallengeTx`, so a backend that
skips `timeBounds` or the pre-auth signer produces a challenge the library rejects. The
client also needs the anchor's home domain, which `useWebAuth` takes as the `homeDomain`
option — conventionally read from `useStellarToml().webAuthEndpoint`, stripped of scheme,
port and path.

**`POST {webAuthEndpoint}` with `XDR={signed challenge XDR}` → JWT**

The client sends back the challenge it signed with the connected wallet key. The
backend must:

- verify the challenge was signed by the account named in the `GET`, and that the
  signature covers the unmodified pre-auth envelope;
- verify the pre-auth signer, the `timeBounds` window, and that the transaction has not
  been seen before — a nonce or consumed-hash store, or the challenge is replayable
  until `timeBounds` expires;
- return a JWT whose `sub` claim is the account's `G...` public key, scoped to the
  client, and with an `exp` claim. SEP-10 does not standardise the claim set beyond the
  account, so document whatever this backend chooses.

**What the backend must not do**

- Serve the challenge over plain HTTP, or accept a signed XDR over plain HTTP.
- Accept a challenge whose `timeBounds` are absent or wider than SEP-10 permits.
- Issue a JWT with no `exp`.

**What the client library already handles**, so a backend author does not have to:
building the challenge hash, reading and validating the challenge, driving the wallet
signature, and posting the result. See `src/hooks/useWebAuth.ts:76-120` for the exact
call sequence.

**One gap that matters for #910.** `UseWebAuthReturn` exposes `token: string | null` and
nothing else — the JWT is never decoded, so there is no `exp`, no `sub` and no `iat`
(`grep` for `exp|expir|decode|jwt|atob` in `useWebAuth.ts` returns nothing). Any hook
that needs to know when a session expires must decode the payload segment itself. That
is a real constraint on #910, and it is also a reasonable small addition to `useWebAuth`
on its own.

---

## #912 — Add `useOraclePrice`

### The barrel already expects this file, and it does not exist

`src/hooks/index.ts` is the entire oracle surface:

```ts
export * from './useOracle';
export * from './useOracleHistory';
```

`src/hooks/useOracle.ts` **does not exist**. That is the `TS2307` from the health
section, and it means the intended layout was always `useOracle.ts` +
`useOracleHistory.ts`. #912 is asking for the missing half of a pair that is already
half-built and already wired into a barrel.

So #912 should land as `src/hooks/useOracle.ts`. That single placement resolves the
`TS2307` at `src/hooks/index.ts:1` as a side effect.

### `useOracleHistory` is a broken stub

`src/hooks/useOracleHistory.ts` is 87 lines and does not work:

- **Both imports are unresolvable** — `soroban-client` and `stellar-sdk` are not
  dependencies (see health section).
- **`server.callContractFunction('price_history', ...)` is not a Soroban RPC method.**
  It is called on a `Server` imported from `soroban-client`; the RPC client exposes
  `getLedgerEntries` and `simulateTransaction` / `invokeContractFunction`, not this.
  The name suggests a Horizon-era API.
- **`SorobanRpc`, `xdr` and `Contract` are all imported and never used.**
- **It fetches during render.** Lines 76-80:

  ```ts
  useCallback(() => {
    if (records.length === 0 && cursor !== null) {
      fetchPage();
    }
  }, [records, cursor, fetchPage])();
  ```

  `useCallback(...)` returns a function, and the trailing `()` invokes it — in the
  component body, on every render. `fetchPage` calls `setRecords`/`setLoading`/
  `setError`, each of which re-renders, which re-invokes this. The `loading` guard
  inside `fetchPage` is a `useState` read, so it is stale within the same render pass.
  This is an unbounded render/fetch loop, not a style nit.
- **The response shape is assumed, and the code says so** — `// Assuming the contract
  exposes a method 'price_history'` and `// The response format depends on the contract;
  adapt as needed`. There is no test file.
- **It is not in the public API.** `useOracleHistory` appears only in
  `src/hooks/index.ts`, which nothing imports — `src/index.ts` has 162 explicit
  `export` lines and does not re-export the barrel. It reaches consumers only as a
  tsup-generated subpath entrypoint.

Ownership note: [#913](https://github.com/dark-princezz/stellar-hooks/issues/913)
("Add `useOracleHistory` for historical price series") is open and assigned to
`laraba9987-cmyk`. That issue and this stub are the same work. #912 and #913 should be
sequenced rather than run in parallel, and #913 should absorb the rewrite.

### Proposed shape for `useOraclePrice`

Given the analysis, the recommendation is to write `useOraclePrice` against a stated
contract interface rather than guessing, and to fix the transport first.

```ts
export interface UseOraclePriceOptions {
  /** Deployed Reflector-compatible oracle contract ID. */
  contractId: string;
  /** Asset pair, e.g. "USD", "XLM", or a native/issuer pair key. */
  asset: string;
  /** Reject prices older than this. Required for staleness checking to mean anything. */
  maxAgeSeconds: number;
  /** Defaults to the active Soroban RPC from context. */
  rpcUrl?: string;
  refetchIntervalMs?: number;
}

export interface UseOraclePriceReturn {
  /** Latest price, scaled by `decimals`, or null when unavailable. */
  price: bigint | null;
  decimals: number;
  /** Ledger the price was last updated in, for staleness comparison. */
  lastUpdatedLedger: number | null;
  /** true when now - lastUpdated exceeds maxAgeSeconds. */
  isStale: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}
```

Points that decide whether this is usable:

- **Staleness needs a ledger or timestamp, not a boolean.** The issue asks for
  "staleness checking", which is only meaningful against a clock. Reflector-style
  oracles return the last-updated ledger, so compare that against `getLedgerInfo()` —
  or require the oracle to return a timestamp, whichever the chosen oracle provides.
  Deciding this is the first task, and it is why the oracle interface should be pinned
  down first.
- **Transport is `SorobanRpc.Server` from `@stellar/stellar-sdk`,** not
  `soroban-client`. The rest of the repository is already on `@stellar/stellar-sdk@13.3.0`.
- **Bigint for the raw value, `decimals` alongside it.** Reflector prices are i128 with
  a separate decimals field. A JS `number` loses precision above 2^53 and silently
  returns a wrong price rather than throwing.
- **Export from `src/index.ts` with explicit types,** the way `useWebAuth` is
  (`:584-589`). The current oracle surface is reachable only through an orphan barrel.
- **A test with a mocked `SorobanRpc.Server`.** `useOracleHistory` has none, which is
  part of how it reached the state described above.
- **Never fetch in the render body.** If polling is wanted, an effect with cleanup; or
  delegate to the query layer already in `packages/query`.

Related, and unassigned: [#914](https://github.com/dark-princezz/stellar-hooks/issues/914)
documents the supported oracle contract interfaces, and
[#915](https://github.com/dark-princezz/stellar-hooks/issues/915) builds fiat conversion
on `useOraclePrice`. #914 should land first — it is the input this design needs.

---

## #910 — Add `useSession`

### Blocked

[#907](https://github.com/dark-princezz/stellar-hooks/issues/907) (open, unassigned) is
a prerequisite: the issue text says "built on top of `useSignInWithStellar`", and no
such hook exists. If #909 is resolved by closing #907 as a duplicate of `useWebAuth`,
then `useSession` should be built on `useWebAuth` and this dependency disappears.

[#908](https://github.com/dark-princezz/stellar-hooks/issues/908) ("Add session
persistence for Sign-In-with-Stellar tokens", open, unassigned) is the other
prerequisite, and it is the harder one. A session hook that reports `publicKey`, expiry
and `signOut` is only useful across a page reload if the token survives the reload —
that is exactly #908. Building #910 first produces a hook that reports an empty session
after refresh, which is the failure the issue is trying to prevent.

**Recommend landing #908 before #910**, and treating them as one piece of work: a
provider that owns token state, hydrates it from storage, decodes `exp` from the JWT
payload segment, and exposes `signOut` to clear both.

### Design notes for when it is unblocked

- **Expiry has to be decoded.** As noted in #909, `useWebAuth` returns the JWT as an
  opaque string. `useSession` must `atob` the middle segment and read `exp`. Do not
  trust a server-rendered expiry over the token's own claim.
- **Check expiry on hydration, not on a timer alone.** A token can be expired when the
  provider mounts. A timer that only fires on state change will report a live session
  that is not.
- **`signOut` must clear storage and reset auth state together,** or a reload resurrects
  the session.
- **A hook that only reads context is a poor fit for this library's shape.** Everything
  else here is a standalone hook. Consider a `SessionProvider` plus a thin
  `useSession` reader, which is also what #908 wants — that argues for one
  implementation, not two.

---

## #911 — Gated-content example

### Blocked on #907

The example needs `useSignInWithStellar`, which does not exist. Same dependency
resolution as #910: if #907 closes as a duplicate of `useWebAuth`, the example uses
`useWebAuth`.

It is also downstream of #910 in practice. A gated page needs a session to gate on, and
`useWebAuth` alone provides a token, not a persisted identity — so an example built
only on `useWebAuth` would have to re-implement session handling in the example, which
teaches the wrong pattern.

**Recommend this lands after #908 and #910**, and uses both.

### Conventions to follow

`examples/` currently holds 15 directories, including `nextjs-app-router`,
`nextjs-starter` and `minimal-payment`. A new example is a new workspace entry, not just
a directory — check the root `tsconfig.json` (`examples` is in `exclude`, so examples
are not typechecked by the root config) and whatever build or CI config enumerates
`examples/`. `playwright.config.ts` and `docs/sandboxes.md` may also need the new
example registered.

Two things worth building into it deliberately, since both are the usual way a gated
example goes wrong:

- **Render the gated content client-side only after hydration,** or the content flashes
  before the session is read. An SSR build that emits the protected markup and hides it
  with CSS has leaked it.
- **Show the loading and expired states,** not just the happy path. #910's value is
  that the states are handled; an example that only shows the success case hides the
  part that matters.

---

## Summary of what blocks what

```
#909  docs for useWebAuth          unblocked  ── needs only a naming decision
#912  useOracle.ts                 blocked    ── repo does not compile; needs #914 first
#910  useSession                   blocked    ── needs #908 (and #907 resolved)
#911  gated-content example        blocked    ── needs #908, #910
```

And underneath all of it, `main` does not typecheck, which blocks verifying any of it.
The health section is the shortest path to unblocking the most.

## Verification

```
npm install
npx tsc --noEmit -p tsconfig.json
```

Reproduced at `c7852b7`: 38 errors, all syntax, in `useSorobanServer.ts`,
`useTransactionLifecycle.ts` and `errorStrings.ts`. The three `TS2307`s above were
confirmed by typechecking `src/hooks/index.ts` and `src/hooks/useOracleHistory.ts` in
isolation, since the parse errors suppress semantic diagnostics program-wide.
`npm ci` fails with `EUSAGE` on a lockfile that is out of sync with `package.json`.

No source changes are included in this document, so nothing here is compile-verified
beyond the above.
