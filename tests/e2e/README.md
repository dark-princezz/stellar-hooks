# E2E Testing with Playwright and Freighter

This directory contains end-to-end tests using Playwright with the real Freighter browser extension on Stellar testnet.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install --save-dev @playwright/test
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Get Freighter Extension

Download the Freighter extension CRX file for testing:

**Option A: Download from Releases**
- Visit https://github.com/freighter-wallet/freighter-extension/releases
- Download the latest `.crx` file
- Place it in `tests/e2e/fixtures/freighter.crx`

**Option B: Build from Source**
```bash
git clone https://github.com/freighter-wallet/freighter-extension.git
cd freighter-extension
npm install
npm run build
# The built extension will be in the dist/ directory
# You may need to package it as a CRX file
```

### 4. Configure Testnet Account

1. Install Freighter in your browser (for manual setup)
2. Create or import a testnet account
3. Fund it with testnet XLM from https://friendbot.stellar.org
4. Note your public key for testing

### 5. Create Test App

The tests expect a test app running on `http://localhost:3000`. Create a simple test app in `examples/e2e-test-app/` or use an existing example.

## Running Tests

### Run all e2e tests:
```bash
npm run test:e2e
```

### Run with UI:
```bash
npx playwright test --ui
```

### Run headed (see browser):
```bash
npx playwright test --headed
```

### Debug mode:
```bash
npx playwright test --debug
```

## Test Configuration

The Playwright configuration is in `playwright.config.ts`. It:
- Uses Chrome with the Freighter extension loaded
- Runs tests serially to avoid wallet state conflicts
- Starts a dev server on port 3000
- Takes screenshots on failure
- Generates HTML reports

## Test Coverage

Current tests cover:
- `useFreighter` hook: connection, public key display, message signing
- `useStellarAccount` hook: account data fetching, balance display
- `useTransaction` hook: payment transaction submission

## Notes

- Tests require manual approval of Freighter popups (not fully automated)
- Extension state persists between tests - use `--project` to run isolated tests
- Testnet transactions use real XLM - ensure your test account is funded
- Network passphrase mismatch tests require specific app configuration

## Troubleshooting

**Extension not loading:**
- Verify the CRX file path in `playwright.config.ts`
- Ensure the CRX file is compatible with your Chrome version

**Connection timeout:**
- Manually unlock Freighter before running tests
- Check that Freighter is set to testnet

**Transaction failures:**
- Ensure test account has sufficient XLM balance
- Verify destination address is valid on testnet
- Check network status at https://status.stellar.org
