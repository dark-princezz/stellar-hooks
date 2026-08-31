# useFreighterAccounts

Track and switch between multiple Freighter accounts.

## Import

```tsx
import { useFreighterAccounts } from 'stellar-hooks'
```

## Usage

```tsx
const { known, active, switchAccount } = useFreighterAccounts()

return (
  <select onChange={(e) => switchAccount(e.target.value)}>
    {known.map((account) => (
      <option key={account} value={account}>
        {account.slice(0, 8)}...{account.slice(-4)}
      </option>
    ))}
  </select>
)
```

## Related

- [useFreighter](/hooks/use-freighter) - Freighter hook