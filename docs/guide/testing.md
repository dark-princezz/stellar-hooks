# Testing

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

Test your stellar-hooks applications effectively.

## Testing Overview

stellar-hooks is designed to be testable with standard React testing tools:

- React Testing Library for component testing
- Jest for unit testing
- MSW (Mock Service Worker) for API mocking
- Custom hooks for wallet mocking

## Component Testing

### Testing Wallet Connection

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { StellarProvider, useFreighter } from 'stellar-hooks'

// Mock the Freighter API
jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn(() => Promise.resolve({ isConnected: true })),
  getAddress: jest.fn(() => Promise.resolve({ address: 'GTEST...' })),
}))

function TestComponent() {
  const { isConnected, publicKey, connect } = useFreighter()

  if (!isConnected) {
    return <button onClick={connect}>Connect</button>
  }

  return <div>Connected: {publicKey}</div>
}

test('connects to Freighter wallet', async () => {
  render(
    <StellarProvider network="testnet">
      <TestComponent />
    </StellarProvider>
  )

  const connectButton = screen.getByText('Connect')
  fireEvent.click(connectButton)

  await waitFor(() => {
    expect(screen.getByText('Connected: GTEST...')).toBeInTheDocument()
  })
})
```

### Testing Account Data

```tsx
import { renderHook, act } from '@testing-library/react'
import { StellarProvider, useStellarAccount } from 'stellar-hooks'

// Mock Horizon API
jest.mock('@stellar/stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn(() => ({
      loadAccount: jest.fn(() => Promise.resolve({
        sequence: "123456",
        balances: [{ balance: "1000", asset_type: "native" }],
      })),
    })),
  },
}))

test('fetches account data', async () => {
  const wrapper = ({ children }) => (
    <StellarProvider network="testnet">{children}</StellarProvider>
  )

  const { result } = renderHook(() => useStellarAccount("GTEST..."), { wrapper })

  await act(async () => {
    await result.current.refetch()
  })

  expect(result.current.data).toBeDefined()
  expect(result.current.data.sequence).toBe("123456")
})
```

## API Mocking

### Using MSW

```tsx
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('https://horizon-testnet.stellar.org/accounts/:publicKey', (req, res, ctx) => {
    return res(
      ctx.json({
        sequence: "123456",
        balances: [{ balance: "1000", asset_type: "native" }],
      })
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Custom Hooks for Testing

```tsx
// test-utils.tsx
import { StellarProvider } from 'stellar-hooks'

export function createTestWrapper(network = 'testnet') {
  return ({ children }) => (
    <StellarProvider network={network}>
      {children}
    </StellarProvider>
  )
}

export function mockFreighterState(overrides = {}) {
  return {
    isInstalled: true,
    isConnected: false,
    publicKey: null,
    ...overrides,
  }
}
```

## Integration Testing

### End-to-End Wallet Flow

```tsx
describe('Wallet Integration Flow', () => {
  test('complete payment flow', async () => {
    render(<PaymentApp />)

    // Connect wallet
    const connectButton = screen.getByText('Connect Wallet')
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText(/Connected:/)).toBeInTheDocument()
    })

    // Enter payment details
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Destination'), { 
      target: { value: 'GBDEST...' } 
    })

    // Submit payment
    fireEvent.click(screen.getByText('Send'))

    await waitFor(() => {
      expect(screen.getByText(/Payment successful/)).toBeInTheDocument()
    })
  })
})
```

## Wallet Testing

### Mock Wallet Adapter

```tsx
import { createFreighterAdapter } from 'stellar-hooks/wallets'

const mockFreighterAdapter = {
  id: 'freighter',
  isInstalled: () => true,
  connect: async () => 'GMOCK...',
  signTransaction: async (xdr) => 'SIGNED_XDR',
  signMessage: async (message) => 'SIGNATURE',
  disconnect: () => {},
}

jest.mock('stellar-hooks/wallets', () => ({
  createFreighterAdapter: () => mockFreighterAdapter,
}))
```

### Test Network Mismatch

```tsx
test('detects network mismatch', () => {
  const { result } = renderHook(() => useFreighter({
    expectedNetworkPassphrase: "Test SDF Network ; September 2015",
  }), { wrapper: createTestWrapper('mainnet') })

  expect(result.current.networkPassphraseMismatch).toBe(true)
  expect(result.current.networkPassphraseWarning).toContain('network mismatch')
})
```

## Sandbox and Mock RPC Testing

### Configuring the mock RPC in a consumer test suite

stellar-hooks ships MSW handlers and a mock server for deterministic tests. Configure them in your test setup:

```ts
// vitest.setup.ts / jest.setup.ts
import { server } from 'stellar-hooks/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Loading a scenario in tests

Use the scenario helpers to simulate common failure modes without hand-writing fixtures:

```ts
import { server } from 'stellar-hooks/mocks/server';
import { scenarios } from 'stellar-hooks/mocks/scenarios';

test('handles insufficient balance', async () => {
  server.use(...scenarios.insufficientBalance());
  // render hook/component and assert error handling
});

test('handles bad sequence number', async () => {
  server.use(...scenarios.badSequence());
});

test('handles RPC timeout', async () => {
  server.use(...scenarios.rpcTimeout());
});
```

### Record and replay RPC responses

For deterministic CI runs, record real RPC responses once and replay them:

```ts
import { createRpcRecorder, createRpcReplay } from 'stellar-hooks/mocks/recordReplay';

const recorder = createRpcRecorder({ fixturePath: 'fixtures/horizon.json' });
await recorder.record(async () => {
  // exercise real calls once
});
await recorder.save();

// In CI / later runs
const replay = await createRpcReplay({ fixturePath: 'fixtures/horizon.json' });
server.use(...replay.handlers());
```

## Transaction Testing

### Mock Transaction Submission

```tsx
jest.mock('@stellar/stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn(() => ({
      submitTransaction: jest.fn(() => Promise.resolve({
        id: 'tx-id',
        successful: true,
      })),
    })),
  },
}))

test('submits transaction successfully', async () => {
  const { result } = renderHook(() => useTransaction(), { wrapper })

  await act(async () => {
    await result.current.submit([mockOperation])
  })

  expect(result.current.isSuccess).toBe(true)
  expect(result.current.hash).toBe('tx-id')
})
```

## Best Practices

### 1. Isolate Tests

```tsx
// Good: Each test is independent
test('fetches account', async () => {
  const { result } = renderHook(() => useStellarAccount('G...'))
  await act(() => result.current.refetch())
  expect(result.current.data).toBeDefined()
})

test('handles errors', async () => {
  const { result } = renderHook(() => useStellarAccount('INVALID'))
  await act(() => result.current.refetch())
  expect(result.current.error).toBeDefined()
})
```

### 2. Use Test Wrappers

```tsx
const wrapper = ({ children }) => (
  <StellarProvider network="testnet">
    {children}
  </StellarProvider>
)

// Reuse across tests
const { result } = renderHook(() => useStellarAccount('G...'), { wrapper })
```

### 3. Mock External Dependencies

```tsx
// Mock Freighter, Horizon, and RPC consistently
jest.mock('@stellar/freighter-api')
jest.mock('@stellar/stellar-sdk')
jest.mock('@stellar/stellar-sdk/rpc')
```

### 4. Test Error States

```tsx
test('handles connection failure', async () => {
  mockFreighterAdapter.connect.mockRejectedValue(new Error('Connection failed'))
  
  const { result } = renderHook(() => useFreighter(), { wrapper })
  await act(() => result.current.connect())
  
  expect(result.current.error).toBeDefined()
  expect(result.current.error.message).toBe('Connection failed')
})
```

## Next Steps

- [Error Handling](/guide/error-handling) - Test error scenarios
- [API Reference](/hooks/) - Hook-specific testing considerations