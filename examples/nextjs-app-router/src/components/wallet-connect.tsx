"use client";

import { useFreighter } from "stellar-hooks";

// This is a Client Component. stellar-hooks hooks are built on browser-only
// APIs (window, wallet extensions), so they must never run on the server.
// The leading `"use client"` directive is what keeps this hook usage on the
// client while page.tsx and layout.tsx remain Server Components.
export function WalletConnect() {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading,
    error,
    connect,
    disconnect,
  } = useFreighter();

  if (!isInstalled) {
    return (
      <p>
        Freighter wallet not detected. Install it from{" "}
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          freighter.app
        </a>{" "}
        to connect.
      </p>
    );
  }

  if (!isConnected) {
    return (
      <button onClick={connect} disabled={isLoading} type="button">
        {isLoading ? "Connecting…" : "Connect Freighter"}
      </button>
    );
  }

  return (
    <div>
      <p>
        Connected: <code>{publicKey}</code>
      </p>
      <button onClick={disconnect} type="button">
        Disconnect
      </button>
      {error && <p>{error.message}</p>}
    </div>
  );
}
