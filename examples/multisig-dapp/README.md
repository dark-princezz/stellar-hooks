# Multi-Signature Signing Workflow Example

An example app demonstrating how to collect signatures from multiple signers for a multisig account transaction using `useMultiSig`.

## Features

- **Transaction Construction**: Use `build()` to construct an unsigned transaction XDR from arbitrary operations.
- **Signature Collection**: Use `sign()` to append signatures from connected wallets or past XDR payloads.
- **Signature Tracking**: Track the count of unique valid signatures present on the transaction payload.
- **Network Broadcast**: Use `submit()` to broadcast the fully signed XDR to the network once signature threshold is reached.
