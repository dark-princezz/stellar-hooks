# Wallet Adapter Implementation Guide

This guide explains how to add support for new Stellar wallets to stellar-hooks by implementing the `WalletAdapter` interface.

## Overview

stellar-hooks uses a wallet adapter pattern to provide a unified interface for interacting with different Stellar wallets. Each wallet (Freighter, Albedo, xBull, Lobstr, etc.) implements the same `WalletAdapter` interface, allowing the library to work with any wallet through a consistent API.

## WalletAdapter Interface

The `WalletAdapter` interface is defined in `src/wallets/types.ts`:

```typescript
export interface WalletAdapter {
  id: WalletId;
  name: string;
  isInstalled(): boolean;
  connect(): Promise<string>;
  disconnect(): void;
  signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
  signMessage?(message: string, opts?: { accountToSign?: string }): Promise<string>;
  signAuthEntry?(entryPreimageXdr: string): Promise<string>;
}
```

### Required Methods

- **`id`**: Unique identifier for the wallet (e.g., `"freighter"`, `"albedo"`)
- **`name`**: Human-readable wallet name (e.g., `"Freighter"`, `"Albedo"`)
- **`isInstalled()`**: Returns `true` if the wallet is available in the current environment
- **`connect()`**: Initiates wallet connection and returns the public key (G...)
- **`disconnect()`**: Clears the active wallet session (if supported)
- **`signTransaction()`**: Signs a Stellar transaction XDR and returns the signed XDR

### Optional Methods

- **`signMessage()`**: Signs an arbitrary message string (for auth/login flows)
- **`signAuthEntry()`**: Signs a Soroban authorization entry preimage XDR

## Implementation Steps

### 1. Create the Adapter File

Create a new file in `src/wallets/` (e.g., `src/wallets/yourwallet.ts`):

```typescript
import type { WalletAdapter } from "./types";
import { UserRejectedError, isUserRejectionMessage } from "../utils/errors";

export function createYourWalletAdapter(): WalletAdapter {
  return {
    id: "yourwallet",
    name: "Your Wallet",

    isInstalled(): boolean {
      // Check if wallet is available
      return typeof window !== "undefined" && !!(window as any).yourWallet;
    },

    async connect(): Promise<string> {
      // Connect to wallet and return public key
      const api = getYourWalletAPI();
      if (!api) throw new Error("Your Wallet is not installed");
      
      try {
        const publicKey = await api.connect();
        if (!publicKey) throw new Error("No public key returned");
        return publicKey;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { 
            cause: err, 
            walletId: "yourwallet", 
            operation: "connect" 
          });
        }
        throw err;
      }
    },

    disconnect(): void {
      // Clear session if wallet supports it
      // Otherwise, this can be a no-op
    },

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      const api = getYourWalletAPI();
      if (!api) throw new Error("Your Wallet is not installed");
      
      try {
        const signedXdr = await api.sign({
          xdr,
          ...(opts?.networkPassphrase && { network: opts.networkPassphrase }),
        });
        
        if (!signedXdr) throw new Error("No signed transaction returned");
        return signedXdr;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { 
            cause: err, 
            walletId: "yourwallet", 
            operation: "signTransaction" 
          });
        }
        throw err;
      }
    },

    async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
      const api = getYourWalletAPI();
      if (!api) throw new Error("Your Wallet is not installed");
      
      try {
        const signature = await api.signMessage({
          message,
          ...(opts?.accountToSign && { pubkey: opts.accountToSign }),
        });
        
        if (!signature) throw new Error("No signature returned");
        return signature;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { 
            cause: err, 
            walletId: "yourwallet", 
            operation: "signMessage" 
          });
        }
        throw err;
      }
    },

    async signAuthEntry(entryPreimageXdr: string): Promise<string> {
      const api = getYourWalletAPI();
      if (!api) throw new Error("Your Wallet is not installed");
      
      try {
        const signedEntry = await api.signAuthEntry(entryPreimageXdr);
        if (!signedEntry) throw new Error("No signed auth entry returned");
        return signedEntry;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { 
            cause: err, 
            walletId: "yourwallet", 
            operation: "signAuthEntry" 
          });
        }
        throw err;
      }
    },
  };
}

// Helper function to get the wallet API
function getYourWalletAPI() {
  if (typeof window === "undefined") return null;
  return (window as any).yourWallet;
}
```

### 2. Update the WalletId Type

Add your wallet to the `WalletId` union type in `src/wallets/types.ts`:

```typescript
export type WalletId = "freighter" | "lobstr" | "xbull" | "albedo" | "rabet" | "yourwallet";
```

### 3. Export from Index

Export your adapter from `src/wallets/index.ts`:

```typescript
export { createYourWalletAdapter } from "./yourwallet";
```

### 4. Add to Wallet Registry

If there's a central wallet registry (check `src/wallets/index.ts`), add your adapter:

```typescript
import { createYourWalletAdapter } from "./yourwallet";

export const walletAdapters = {
  freighter: createFreighterAdapter(),
  albedo: createAlbedoAdapter(),
  xbull: createXBullAdapter(),
  yourwallet: createYourWalletAdapter(),
};
```

## Implementation Patterns

### Installation Detection

Most wallets inject themselves into the `window` object. Check for the wallet's global object:

```typescript
isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).YOUR_WALLET_GLOBAL;
}
```

For wallets that use intent-based connections (like Albedo), `isInstalled` may always return `true` since they work via URL schemes.

### Connection Flow

The `connect()` method should:
1. Check if the wallet is available
2. Initiate the connection process (may open popup/redirect)
3. Return the user's public key (G-prefixed strkey)
4. Handle user rejection with `UserRejectedError`

```typescript
async connect(): Promise<string> {
  try {
    const result = await walletAPI.connect();
    const publicKey = extractPublicKey(result);
    if (!publicKey) throw new Error("No public key returned");
    return publicKey;
  } catch (err) {
    if (isUserRejectionMessage(err.message)) {
      throw new UserRejectedError(err.message, { 
        cause: err, 
        walletId: "yourwallet", 
        operation: "connect" 
      });
    }
    throw err;
  }
}
```

### Transaction Signing

The `signTransaction()` method should:
1. Accept a base64-encoded XDR string
2. Optionally accept `networkPassphrase` for network-specific signing
3. Return the signed XDR as a string
4. Handle user rejection with `UserRejectedError`

```typescript
async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
  try {
    const result = await walletAPI.sign({
      xdr,
      ...(opts?.networkPassphrase && { network: opts.networkPassphrase }),
    });
    
    const signedXdr = extractSignedXdr(result);
    if (!signedXdr) throw new Error("No signed transaction returned");
    return signedXdr;
  } catch (err) {
    if (isUserRejectionMessage(err.message)) {
      throw new UserRejectedError(err.message, { 
        cause: err, 
        walletId: "yourwallet", 
        operation: "signTransaction" 
      });
    }
    throw err;
  }
}
```

### Message Signing

The `signMessage()` method should:
1. Accept a message string
2. Optionally accept `accountToSign` for multi-account wallets
3. Return the signature as a string
4. Handle user rejection with `UserRejectedError`

```typescript
async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
  try {
    const result = await walletAPI.signMessage({
      message,
      ...(opts?.accountToSign && { pubkey: opts.accountToSign }),
    });
    
    const signature = extractSignature(result);
    if (!signature) throw new Error("No signature returned");
    return signature;
  } catch (err) {
    if (isUserRejectionMessage(err.message)) {
      throw new UserRejectedError(err.message, { 
        cause: err, 
        walletId: "yourwallet", 
        operation: "signMessage" 
      });
    }
    throw err;
  }
}
```

### Auth Entry Signing

The `signAuthEntry()` method is for Soroban smart contract authorization:
1. Accept an auth entry preimage XDR
2. Return the signed entry as a string
3. Handle user rejection with `UserRejectedError`

```typescript
async signAuthEntry(entryPreimageXdr: string): Promise<string> {
  try {
    const result = await walletAPI.signAuthEntry(entryPreimageXdr);
    const signedEntry = extractSignedEntry(result);
    if (!signedEntry) throw new Error("No signed auth entry returned");
    return signedEntry;
  } catch (err) {
    if (isUserRejectionMessage(err.message)) {
      throw new UserRejectedError(err.message, { 
        cause: err, 
        walletId: "yourwallet", 
        operation: "signAuthEntry" 
      });
    }
    throw err;
  }
}
```

## Error Handling

### User Rejection

Always check for user rejection and throw `UserRejectedError`:

```typescript
import { UserRejectedError, isUserRejectionMessage } from "../utils/errors";

// In each async method:
catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (isUserRejectionMessage(msg)) {
    throw new UserRejectedError(msg, { 
      cause: err, 
      walletId: "yourwallet", 
      operation: "currentOperation" 
    });
  }
  throw err;
}
```

Common user rejection messages include:
- "User rejected"
- "User denied"
- "User cancelled"
- "Declined by user"

### Installation Errors

Throw descriptive errors when the wallet is not installed:

```typescript
if (!walletAPI) {
  throw new Error("Your Wallet is not installed");
}
```

### Missing Return Values

Always validate that the wallet returned expected data:

```typescript
if (!publicKey) {
  throw new Error("No public key returned from Your Wallet");
}
if (!signedXdr) {
  throw new Error("No signed transaction returned from Your Wallet");
}
```

## Testing

Create a test file in `src/wallets/__tests__/yourwallet.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createYourWalletAdapter } from "../yourwallet";

describe("Your Wallet Adapter", () => {
  let adapter: ReturnType<typeof createYourWalletAdapter>;

  beforeEach(() => {
    adapter = createYourWalletAdapter();
  });

  describe("isInstalled", () => {
    it("returns true when wallet is available", () => {
      // Mock window object
      (window as any).yourWallet = {};
      expect(adapter.isInstalled()).toBe(true);
    });

    it("returns false when wallet is not available", () => {
      delete (window as any).yourWallet;
      expect(adapter.isInstalled()).toBe(false);
    });
  });

  describe("connect", () => {
    it("connects and returns public key", async () => {
      const mockAPI = { connect: vi.fn().mockResolvedValue("GABC...XYZ") };
      (window as any).yourWallet = mockAPI;
      
      const publicKey = await adapter.connect();
      expect(publicKey).toBe("GABC...XYZ");
    });

    it("throws UserRejectedError when user rejects", async () => {
      const mockAPI = { 
        connect: vi.fn().mockRejectedValue(new Error("User rejected")) 
      };
      (window as any).yourWallet = mockAPI;
      
      await expect(adapter.connect()).rejects.toThrow("User rejected");
    });
  });

  describe("signTransaction", () => {
    it("signs transaction XDR", async () => {
      const mockAPI = { 
        sign: vi.fn().mockResolvedValue("AAA...signedXDR") 
      };
      (window as any).yourWallet = mockAPI;
      
      const signedXdr = await adapter.signTransaction("AAA...unsignedXDR");
      expect(signedXdr).toBe("AAA...signedXDR");
    });
  });

  // Add more tests for signMessage, signAuthEntry, etc.
});
```

## Examples

### Freighter Adapter

Reference implementation: `src/wallets/freighter.ts`

Key patterns:
- Uses `@stellar/freighter-api` package
- Normalizes responses via `freighter-normalization.ts`
- Handles network passphrase mismatches
- Supports all signing methods

### Albedo Adapter

Reference implementation: `src/wallets/albedo.ts`

Key patterns:
- Uses `@albedo-link/intent` package
- Intent-based connection (no installation check needed)
- Stateless (no disconnect needed)
- Supports all signing methods

### xBull Adapter

Reference implementation: `src/wallets/xbull.ts`

Key patterns:
- Checks for `window.xBullSDK` or `window.xBull`
- Handles multiple API versions
- Gracefully handles missing optional methods
- Supports all signing methods

## Best Practices

1. **Type Safety**: Use TypeScript types for wallet API responses when available
2. **Error Messages**: Provide clear, actionable error messages
3. **User Rejection**: Always detect and properly handle user rejection
4. **Null Checks**: Validate all return values from wallet APIs
5. **Network Support**: Handle network passphrase parameter for mainnet/testnet
6. **Multi-account**: Support `accountToSign` parameter when applicable
7. **Documentation**: Add JSDoc comments to your adapter functions
8. **Testing**: Write comprehensive unit tests for all methods
9. **SSR Safety**: Check `typeof window !== "undefined"` before accessing globals
10. **Graceful Degradation**: Handle missing optional methods gracefully

## Adding a Hook

After implementing the adapter, you may want to create a dedicated hook (e.g., `useYourWallet`). Follow the pattern of existing hooks like `useFreighter`:

```typescript
// src/hooks/useYourWallet.ts
import { useCallback, useEffect, useState } from "react";
import { createYourWalletAdapter } from "../wallets/yourwallet";
import type { YourWalletState, YourWalletOptions } from "../types";

export function useYourWallet(options?: YourWalletOptions) {
  const [state, setState] = useState<YourWalletState>({
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    isLoading: true,
    error: null,
  });

  const adapter = createYourWalletAdapter();

  useEffect(() => {
    setState(prev => ({ ...prev, isInstalled: adapter.isInstalled(), isLoading: false }));
  }, [adapter]);

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const publicKey = await adapter.connect();
      setState({
        isInstalled: true,
        isConnected: true,
        publicKey,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [adapter]);

  const disconnect = useCallback(() => {
    adapter.disconnect();
    setState({
      isInstalled: true,
      isConnected: false,
      publicKey: null,
      isLoading: false,
      error: null,
    });
  }, [adapter]);

  const signTransaction = useCallback(async (xdr: string, opts?: { networkPassphrase?: string }) => {
    return await adapter.signTransaction(xdr, opts);
  }, [adapter]);

  // Add other methods...

  return { ...state, connect, disconnect, signTransaction };
}
```

## Questions?

- Check existing adapter implementations in `src/wallets/`
- Review the error handling utilities in `src/utils/errors.ts`
- Open an issue on GitHub for specific questions
