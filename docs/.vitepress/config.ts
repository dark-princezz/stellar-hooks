import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'stellar-hooks',
  description: 'React hooks for Stellar and Soroban — useFreighter, useStellarAccount, useSorobanContract, useTransaction, and more.',
  
  lang: 'en-US',
  
  base: '/',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Hooks', link: '/hooks/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Configuration', link: '/guide/configuration' },
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Provider Setup', link: '/guide/provider' },
            { text: 'Network Management', link: '/guide/network' },
            { text: 'Wallet Integration', link: '/guide/wallets' },
            { text: 'Error Handling', link: '/guide/error-handling' },
          ]
        },
        {
          text: 'Network Configuration',
          items: [
            { text: 'RPC Endpoint Configuration', link: '/guides/rpc-endpoint-configuration' },
            { text: 'Network Switching', link: '/guides/network-switching' },
          ]
        },
        {
          text: 'Advanced Topics',
          items: [
            { text: 'Soroban Contracts', link: '/guide/soroban' },
            { text: 'Transaction Building', link: '/guide/transactions' },
            { text: 'Caching & Performance', link: '/guide/caching' },
            { text: 'Testing', link: '/guide/testing' },
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'Migration Guide', link: '/guide/migration' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
            { text: 'Changelog', link: '/guide/changelog' },
          ]
        }
      ],
      
      '/hooks/': [
        {
          text: 'Wallet Hooks',
          items: [
            { text: 'useFreighter', link: '/hooks/use-freighter' },
            { text: 'useWallet', link: '/hooks/use-wallet' },
            { text: 'useWalletKit', link: '/hooks/use-wallet-kit' },
            { text: 'useFreighterAccounts', link: '/hooks/use-freighter-accounts' },
            { text: 'useAlbedo', link: '/hooks/use-albedo' },
            { text: 'useXBull', link: '/hooks/use-xbull' },
            { text: 'useRabet', link: '/hooks/use-rabet' },
          ]
        },
        {
          text: 'Account Hooks',
          items: [
            { text: 'useStellarAccount', link: '/hooks/use-stellar-account' },
            { text: 'useStellarAccounts', link: '/hooks/use-stellar-accounts' },
            { text: 'useStellarBalance', link: '/hooks/use-stellar-balance' },
            { text: 'useAssetBalance', link: '/hooks/use-asset-balance' },
            { text: 'useAssetMetadata', link: '/hooks/use-asset-metadata' },
          ]
        },
        {
          text: 'Transaction Hooks',
          items: [
            { text: 'usePayment', link: '/hooks/use-payment' },
            { text: 'usePathPayment', link: '/hooks/use-path-payment' },
            { text: 'useTransaction', link: '/hooks/use-transaction' },
            { text: 'useMultiOperationTransaction', link: '/hooks/use-multi-operation-transaction' },
          ]
        },
        {
          text: 'Soroban Hooks',
          items: [
            { text: 'useSorobanContract', link: '/hooks/use-soroban-contract' },
            { text: 'useSorobanRead', link: '/hooks/use-soroban-read' },
            { text: 'useSorobanServer', link: '/hooks/use-soroban-server' },
            { text: 'useLedgerEntry', link: '/hooks/use-ledger-entry' },
            { text: 'useContractEvents', link: '/hooks/use-contract-events' },
          ]
        },
        {
          text: 'Network Hooks',
          items: [
            { text: 'useNetwork', link: '/hooks/use-network' },
            { text: 'useStellarNetwork', link: '/hooks/use-stellar-network' },
            { text: 'useNetworkConfig', link: '/hooks/use-network-config' },
            { text: 'useHorizonServer', link: '/hooks/use-horizon-server' },
            { text: 'useNetworkStatus', link: '/hooks/use-network-status' },
          ]
        },
        {
          text: 'DEX Hooks',
          items: [
            { text: 'useOrderBook', link: '/hooks/use-order-book' },
            { text: 'useOffers', link: '/hooks/use-offers' },
            { text: 'useStellarOffers', link: '/hooks/use-stellar-offers' },
            { text: 'useTrade', link: '/hooks/use-trade' },
            { text: 'useLiquidityPool', link: '/hooks/use-liquidity-pool' },
          ]
        },
        {
          text: 'Utility Hooks',
          items: [
            { text: 'useStellarToml', link: '/hooks/use-stellar-toml' },
            { text: 'useOperations', link: '/hooks/use-operations' },
            { text: 'useEffects', link: '/hooks/use-effects' },
            { text: 'useTrustline', link: '/hooks/use-trustline' },
            { text: 'useCreateAccount', link: '/hooks/use-create-account' },
            { text: 'useFeeStats', link: '/hooks/use-fee-stats' },
            { text: 'useTransactionHistory', link: '/hooks/use-transaction-history' },
            { text: 'useAssets', link: '/hooks/use-assets' },
            { text: 'useAssetSearch', link: '/hooks/use-asset-search' },
          ]
        },
        {
          text: 'Account Management',
          items: [
            { text: 'useAccountFlags', link: '/hooks/use-account-flags' },
            { text: 'useAccountMerge', link: '/hooks/use-account-merge' },
            { text: 'useBumpSequence', link: '/hooks/use-bump-sequence' },
            { text: 'useManageData', link: '/hooks/use-manage-data' },
            { text: 'useInflation', link: '/hooks/use-inflation' },
            { text: 'useMultiSig', link: '/hooks/use-multi-sig' },
          ]
        },
        {
          text: 'Claimable Balances',
          items: [
            { text: 'useClaimableBalance', link: '/hooks/use-claimable-balance' },
            { text: 'useCreateClaimableBalance', link: '/hooks/use-create-claimable-balance' },
          ]
        },
        {
          text: 'Advanced Wallet',
          items: [
            { text: 'useWalletsKit', link: '/hooks/use-wallets-kit' },
            { text: 'useWalletConnect', link: '/hooks/use-wallet-connect' },
          ]
        },
        {
          text: 'Advanced Network',
          items: [
            { text: 'useLedgerEntries', link: '/hooks/use-ledger-entries' },
          ]
        }
      ],
      
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Provider', link: '/api/provider' },
            { text: 'Types', link: '/api/types' },
            { text: 'Utilities', link: '/api/utilities' },
          ]
        }
      ],
      
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Setup', link: '/examples/basic-setup' },
            { text: 'Wallet Connection', link: '/examples/wallet-connection' },
            { text: 'Payment Flow', link: '/examples/payment-flow' },
            { text: 'Soroban Contract', link: '/examples/soroban-contract' },
            { text: 'Multi-wallet', link: '/examples/multi-wallet' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/dark-princezz/stellar-hooks' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/stellar-hooks' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present dark-princezz',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },

  vite: {
    build: {
      target: 'esnext',
    },
  },
})