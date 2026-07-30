# MSW Horizon API Mocks

This directory contains Mock Service Worker (MSW) configurations for mocking Horizon API responses in tests. This allows hook tests to run without making real network calls to the Stellar network.

## Files

- **handlers.ts** — Defines MSW HTTP handlers and fixture data for common Horizon endpoints
- **server.ts** — Sets up MSW server for Node.js test environment (Vitest/Jest)
- **browser.ts** — Optional: Sets up MSW worker for browser/Storybook development
- **handlers.test.ts** — Comprehensive tests for the MSW handlers

## Setup

The MSW setup is automatically configured in `vitest.setup.ts`. The setup file:

1. Starts the MSW server before all tests (`beforeAll`)
2. Resets handlers after each test (`afterEach`)
3. Closes the server after all tests (`afterAll`)

This is referenced in `vitest.config.ts` via the `setupFiles` option.

## Fixtures

The following fixtures are available for use in tests:

### MOCK_ACCOUNT_ID
A valid Stellar account ID used across all fixtures:
```
GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7
```

### mockAccount
Full account response object with:
- Account ID and sequence number
- Single native (XLM) balance
- Signers array with the account itself
- Auth flags and thresholds
- HATEOAS links

### mockTransactionsList
Paginated transaction list containing:
- One sample payment transaction
- Transaction metadata (hash, ledger, timestamps)
- XDR data fields (envelope_xdr, result_xdr, result_meta_xdr)
- Pagination links

### mockOperationsList
Paginated operations list containing:
- One sample payment operation
- Operation metadata (type, source, destination)
- Asset details
- Pagination links

## Mocked Endpoints

The handlers mock the following Horizon API endpoints:

| Method | Endpoint | Behavior |
|--------|----------|----------|
| GET | `/accounts/:accountId` | Returns `mockAccount` for `MOCK_ACCOUNT_ID`, 404 for others |
| GET | `/accounts/:accountId/transactions` | Returns `mockTransactionsList` for known accounts |
| GET | `/accounts/:accountId/operations` | Returns `mockOperationsList` for known accounts |
| GET | `/transactions/:hash` | Returns transaction by hash or 404 |

## Usage in Tests

### Standard Usage

Tests automatically get MSW mocking:

```typescript
import { describe, it, expect } from 'vitest';
import { MOCK_ACCOUNT_ID, mockAccount } from '../mocks/handlers';

describe('My Hook', () => {
  it('fetches account data', async () => {
    const response = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${MOCK_ACCOUNT_ID}`
    );
    const data = await response.json();
    
    expect(data.account_id).toBe(MOCK_ACCOUNT_ID);
    expect(data.balances).toHaveLength(1);
  });
});
```

### Simulating Network Errors

Use `errorHandlers` to test error states:

```typescript
import { server } from '../mocks/server';
import { errorHandlers, MOCK_ACCOUNT_ID } from '../mocks/handlers';

describe('Error handling', () => {
  it('handles network errors', async () => {
    // Override default handlers with error handlers
    server.use(...errorHandlers);

    const promise = fetch(
      `https://horizon-testnet.stellar.org/accounts/${MOCK_ACCOUNT_ID}`
    );
    
    await expect(promise).rejects.toThrow();
  });
});
```

### Custom Handlers

Override MSW handlers for specific test cases:

```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Custom response', () => {
  it('handles custom account data', async () => {
    const customAccount = { account_id: MOCK_ACCOUNT_ID, sequence: '999' };
    
    server.use(
      http.get(
        'https://horizon-testnet.stellar.org/accounts/:accountId',
        () => HttpResponse.json(customAccount)
      )
    );

    const response = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${MOCK_ACCOUNT_ID}`
    );
    const data = await response.json();
    
    expect(data.sequence).toBe('999');
  });
});
```

## Testing Hooks with MSW

When testing Stellar hooks that use Horizon (e.g., `useStellarAccount`), the hooks will automatically use MSW-mocked responses:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useStellarAccount } from '../hooks/useStellarAccount';
import { MOCK_ACCOUNT_ID } from '../mocks/handlers';

describe('useStellarAccount with MSW', () => {
  it('loads account data', async () => {
    const { result } = renderHook(() => useStellarAccount(MOCK_ACCOUNT_ID));

    // Hook will use MSW-mocked response from loadAccount
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.account_id).toBe(MOCK_ACCOUNT_ID);
  });
});
```

Note: This requires that the hook is using the Horizon Server from stellar-sdk, which makes HTTP requests that MSW can intercept.

## Adding New Handlers

To add mocks for new endpoints:

1. Add fixture data in `handlers.ts`
2. Add handler in the `handlers` array
3. Add tests in `handlers.test.ts`

Example:

```typescript
// handlers.ts
export const mockLedger = { /* fixture */ };

export const handlers = [
  // ... existing handlers
  http.get(`${HORIZON_BASE}/ledgers/:sequence`, ({ params }) => {
    if (params.sequence === '100') {
      return HttpResponse.json(mockLedger);
    }
    return HttpResponse.json({ status: 404 }, { status: 404 });
  }),
];
```

## Browser Usage (Optional)

For development or Storybook, import the worker:

```typescript
// src/main.tsx or storybook setup
import { worker } from './mocks/browser';

if (process.env.NODE_ENV === 'development') {
  await worker.start();
}
```

## Resources

- [MSW Documentation](https://mswjs.io/)
- [Horizon API Reference](https://developers.stellar.org/api/introduction/appending_base_url/)
- [Stellar SDK TypeScript](https://github.com/stellar/py-stellar-base)
