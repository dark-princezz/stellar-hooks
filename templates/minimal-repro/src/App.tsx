import { useFreighter, useStellarAccount } from "stellar-hooks";

export default function App() {
  const { isConnected, isInstalled, publicKey, error: walletError, connect } = useFreighter();
  const { data, isLoading, error: accountError } = useStellarAccount(publicKey, {
    enabled: isConnected && !!publicKey,
  });

  return (
    <main>
      <h1>stellar-hooks minimal reproduction</h1>
      <p>
        Change only the code in <code>src/App.tsx</code> to reproduce your bug.
      </p>

      {!isInstalled && <p>Freighter is not installed.</p>}
      {isInstalled && !isConnected && <button onClick={connect}>Connect Freighter</button>}

      {walletError && <pre>{walletError.message}</pre>}
      {accountError && <pre>{accountError.message}</pre>}
      {isLoading && <p>Loading account…</p>}
      {data && <pre>{JSON.stringify(data.balances, null, 2)}</pre>}
    </main>
  );
}
