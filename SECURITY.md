# Security Policy

## Supported Versions

We take the security of `stellar-hooks` and the applications built with it very seriously. Because this library interacts directly with user cryptographic keys, browser extension wallets (Freighter, Albedo, LOBSTR), and Soroban smart contract RPC endpoints, we actively maintain and patch the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability within `stellar-hooks`—especially concerning key handling, transaction payload tampering, signing logic flaws, or unintended exposure of sensitive data—please **do not open a public GitHub issue**.

Instead, please report it via one of the following channels for responsible disclosure:

1. **GitHub Security Advisories:** Use the [Private Vulnerability Reporting](https://github.com/Empyrean-Code/stellar-hooks/security/advisories/new) feature on the repository.
2. **Direct Maintainer Contact:** Reach out directly to the core maintainers via the repository organization contact.

Please include as much detail as possible to help us reproduce and remediate the issue quickly:
* Type of vulnerability (e.g., signing bypass, key extraction, injection).
* Full paths of source file(s) related to the vulnerability.
* Step-by-step instructions to reproduce the issue.
* Proof-of-concept or exploit code if applicable.

You can expect an acknowledgment of your report within **48 hours**, followed by regular updates on progress towards a fix and coordinated public disclosure.

---

## Scope & Security Best Practices

When building Stellar and Soroban dApps using `stellar-hooks`, keep the following security considerations in mind:

### 1. Wallet Interaction & Key Handling
* **No Private Keys in State:** `stellar-hooks` never stores, caches, or exposes raw user private keys or seed phrases in React state or local storage. All signing operations are delegated securely to external browser extensions (Freighter, LOBSTR, Albedo) or WalletConnect bridges.
* **Network Passphrase Verification:** Always ensure your dApp's expected network passphrase matches the active wallet provider network to prevent transaction replay attacks across Mainnet and Testnet.

### 2. Soroban Contract Execution
* Carefully inspect transaction simulation results and contract arguments (`args`) before triggering `useSorobanContract` or `useTransaction`.
* Validate all user inputs and account addresses prior to passing them into hooks like `useStellarAccount` or `usePayment`.

### 3. Dependencies
* Keep `@stellar/stellar-sdk` and wallet connector packages updated to their latest secure patch releases.
