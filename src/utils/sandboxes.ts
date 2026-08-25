/**
 * @file sandboxes.ts
 * @description One-click CodeSandbox and StackBlitz template generator for stellar-hooks.
 * @package stellar-hooks
 * @license MIT
 */

export interface HookSandboxInfo {
  name: string;
  category: "wallet" | "account" | "soroban" | "transaction" | "utility";
  stackblitzUrl: string;
  codesandboxUrl: string;
  examplePath: string;
}

const REPO_BASE = "github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes";

export const HOOK_SANDBOXES: Record<string, HookSandboxInfo> = {
  useFreighter: {
    name: "useFreighter",
    category: "wallet",
    examplePath: "src/examples/useFreighter.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useFreighter.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useFreighter.example.tsx`,
  },
  useAlbedo: {
    name: "useAlbedo",
    category: "wallet",
    examplePath: "src/examples/useAlbedo.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useAlbedo.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useAlbedo.example.tsx`,
  },
  useXBull: {
    name: "useXBull",
    category: "wallet",
    examplePath: "src/examples/useXBull.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useXBull.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useXBull.example.tsx`,
  },
  useWallet: {
    name: "useWallet",
    category: "wallet",
    examplePath: "src/examples/useWallet.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useWallet.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useWallet.example.tsx`,
  },
  useStellarAccount: {
    name: "useStellarAccount",
    category: "account",
    examplePath: "src/examples/useStellarAccount.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useStellarAccount.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useStellarAccount.example.tsx`,
  },
  useStellarBalance: {
    name: "useStellarBalance",
    category: "account",
    examplePath: "src/examples/useStellarBalance.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useStellarBalance.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useStellarBalance.example.tsx`,
  },
  usePayment: {
    name: "usePayment",
    category: "transaction",
    examplePath: "src/examples/usePayment.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/usePayment.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/usePayment.example.tsx`,
  },
  useSorobanContract: {
    name: "useSorobanContract",
    category: "soroban",
    examplePath: "src/examples/useSorobanContract.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useSorobanContract.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useSorobanContract.example.tsx`,
  },
  useSorobanRead: {
    name: "useSorobanRead",
    category: "soroban",
    examplePath: "src/examples/useSorobanRead.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useSorobanRead.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useSorobanRead.example.tsx`,
  },
  useLedgerEntry: {
    name: "useLedgerEntry",
    category: "soroban",
    examplePath: "src/examples/useLedgerEntry.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useLedgerEntry.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useLedgerEntry.example.tsx`,
  },
  useLedgerEntries: {
    name: "useLedgerEntries",
    category: "soroban",
    examplePath: "src/examples/useLedgerEntries.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useLedgerEntries.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useLedgerEntries.example.tsx`,
  },
  useTrustline: {
    name: "useTrustline",
    category: "account",
    examplePath: "src/examples/useTrustline.example.tsx",
    stackblitzUrl: `https://stackblitz.com/${REPO_BASE}?file=src/examples/useTrustline.example.tsx`,
    codesandboxUrl: `https://codesandbox.io/s/${REPO_BASE}?file=/src/examples/useTrustline.example.tsx`,
  },
};

/**
 * Get 1-click CodeSandbox and StackBlitz URLs for a specific hook.
 */
export function getSandboxUrls(hookName: string): { stackblitzUrl: string; codesandboxUrl: string } | null {
  const sandbox = HOOK_SANDBOXES[hookName];
  if (!sandbox) return null;
  return {
    stackblitzUrl: sandbox.stackblitzUrl,
    codesandboxUrl: sandbox.codesandboxUrl,
  };
}
