import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'stellar-hooks',
  description: 'React hooks for Stellar and Soroban — useFreighter, useStellarAccount, useSorobanContract, useTransaction, and more.',
  base: '/stellar-hooks/',
  
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'API', link: '/api/provider' },
      { text: 'Guides', link: '/guides/migration-guide' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Provider & Context', link: '/api/provider' },
          {
            text: 'Wallet Hooks',
            collapsed: false,
            items: [
              { text: 'useFreighter', link: '/api/hooks/use-freighter' }
            ]
          },
          {
            text: 'Account Hooks',
            collapsed: false,
            items: [
              { text: 'useStellarAccount', link: '/api/hooks/use-stellar-account' },
              { text: 'useStellarBalance', link: '/api/hooks/use-stellar-balance' },
              { text: 'useStellarOffers', link: '/api/hooks/use-stellar-offers' }
            ]
          },
          {
            text: 'Transaction Hooks',
            collapsed: false,
            items: [
              { text: 'usePayment', link: '/api/hooks/use-payment' },
              { text: 'usePathPayment', link: '/api/hooks/use-path-payment' },
              { text: 'useTransaction', link: '/api/hooks/use-transaction' }
            ]
          },
          {
            text: 'Soroban Hooks',
            collapsed: false,
            items: [
              { text: 'useSorobanContract', link: '/api/hooks/use-soroban-contract' },
              { text: 'useLedgerEntry', link: '/api/hooks/use-ledger-entry' },
              { text: 'useSorobanTokenBalance', link: '/api/hooks/use-soroban-token-balance' }
            ]
          },
          {
            text: 'Metadata Hooks',
            collapsed: false,
            items: [
              { text: 'useStellarToml', link: '/api/hooks/use-stellar-toml' },
              { text: 'useAssetMetadata', link: '/api/hooks/use-asset-metadata' }
            ]
          },
          {
            text: 'Network Hooks',
            collapsed: false,
            items: [
              { text: 'useNetwork', link: '/api/hooks/use-network' }
            ]
          }
        ]
      },
      {
        text: 'Guides',
        items: [
          { text: 'Migration Guide', link: '/guides/migration-guide' },
          { text: 'Error Handling Patterns', link: '/guides/error-handling' },
          { text: 'Release Runbook', link: '/guides/release-runbook' },
          { text: 'Soroban Cookbook', link: '/guides/soroban-cookbook' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/spiffamani/stellar-hooks' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present stellar-hooks contributors'
    }
  }
})
