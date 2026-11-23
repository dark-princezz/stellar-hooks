# Public Roadmap & Milestones

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

This page outlines the public development roadmap for **stellar-hooks**.

We track issues, features, and release planning using our public **[GitHub Projects Roadmap Board](https://github.com/dark-princezz/stellar-hooks/projects)**, where open issues are organized by milestone so contributors can see what's planned next at a glance.

- 📋 **Roadmap Board:** [GitHub Projects](https://github.com/dark-princezz/stellar-hooks/projects)
- 🎯 **Milestones:** [GitHub Milestones](https://github.com/dark-princezz/stellar-hooks/milestones)

---

## Roadmap Milestones

### Milestone v0.3.0 — Advanced Soroban & Ecosystem Integrations
- `useFederation()` — SEP-2 federated address resolution
- `useWebAuth()` — SEP-10 challenge/response cryptographic authentication
- `useAllowance()` — Soroban token allowance management
- `useContractEvents()` v2 — Advanced event subscription with RPC filtering
- Soroban simulation helpers and inspection tools

### Milestone v0.4.0 — Cross-Platform & Streaming Support
- `useAnchorTransfer()` — SEP-6 / SEP-24 interactive deposit and withdrawal flows
- `useAnchorQuote()` — SEP-38 firm quotes
- Real-time streaming (SSE) hooks for account events, balances, and payments
- React Native / Expo adapter support for wallet hooks
- WalletConnect v2 session persistence and reconnection improvements

### Milestone v1.0.0 — Production Readiness & API Stabilization
- Universal `StellarTransactionError` taxonomy
- 100% test coverage across transaction pipelines
- Zero-leak TypeScript declaration maps and strict types
- Production-grade caching and optimistic UI state management

---

## Contributing to Roadmap Goals

Interested in helping build these features?
- Check out the [GitHub Projects Board](https://github.com/dark-princezz/stellar-hooks/projects) to find issues ready for development.
- Refer to the [Contributing Guide](https://github.com/dark-princezz/stellar-hooks/blob/main/CONTRIBUTING.md) for instructions on submitting pull requests.
