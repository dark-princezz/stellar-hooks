# useLedgerTime

Track the latest closed ledger and an estimated current network time.

## Import

```tsx
import { useLedgerTime } from 'stellar-hooks'
```

## Usage

```tsx
const { latestLedger, estimatedTime, isConnected } = useLedgerTime()
```

The hook seeds from Horizon's most recent ledger, then follows the ledger
stream. `estimatedTime` is a network-synced clock derived from the median
offset between ledger `closed_at` timestamps and local receive times, so it
stays accurate even when the device clock is skewed.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Set `false` to disable fetching/streaming |
| `tickInterval` | `number` | `1000` | ms between `estimatedTime` recomputes (`0` = only on ledger close) |
| `sampleWindow` | `number` | `12` | Ledgers retained for clock-offset stats |
| `onLedger` | `(ledger) => void` | — | Called on each newly observed ledger |
| `onError` | `(error) => void` | — | Called on stream errors |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `latestLedger` | `LedgerTimeSnapshot \| null` | Most recently observed closed ledger |
| `sequence` | `number \| null` | Latest ledger sequence |
| `closedAt` | `string \| null` | Latest ledger close timestamp (ISO-8601) |
| `estimatedTime` | `Date \| null` | Estimated current network time |
| `estimatedTimeIso` | `string \| null` | ISO-8601 form of `estimatedTime` |
| `clockOffsetMs` | `number \| null` | Smoothed `networkTime - localTime` offset |
| `averageCloseIntervalSeconds` | `number \| null` | Mean seconds between ledger closes |
| `isLoading` | `boolean` | Initial fetch in flight |
| `isConnected` | `boolean` | Ledger stream is live |
| `error` | `Error \| null` | Last stream error |
| `refetch` | `() => void` | Re-fetch the latest ledger snapshot |
| `reconnect` | `() => void` | Re-open the ledger stream |

## Related

- [useNetworkStatus](/hooks/use-network-status) - Network health monitoring
- [useLedgerEntry](/hooks/use-ledger-entry) - Direct ledger entry access
