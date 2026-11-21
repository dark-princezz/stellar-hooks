import React from "react";
import { WalletConnect } from "../components/WalletConnect";
import { BalanceCard } from "../components/BalanceCard";

export default function Home() {
  return (
    <main className="main-container">
      <header className="page-header">
        <div className="badge">Next.js App Router</div>
        <h1>Stellar Hooks Starter</h1>
        <p className="description">
          Demonstrates how to use <code>stellar-hooks</code> in Next.js 15+ App Router
          with React hooks strictly confined to client components (<code>&quot;use client&quot;</code>).
        </p>
      </header>

      <div className="content-stack">
        <WalletConnect />
        <BalanceCard />
      </div>

      <footer className="page-footer">
        <p>
          Powered by{" "}
          <a
            href="https://github.com/dark-princezz/stellar-hooks"
            target="_blank"
            rel="noreferrer"
          >
            stellar-hooks
          </a>
        </p>
      </footer>
    </main>
  );
}
