import { http, HttpResponse } from 'msw';

/**
 * MSW handlers for common Horizon API endpoints.
 * Provides realistic fixture responses so hook tests run without network access.
 *
 * Horizon base URL: https://horizon-testnet.stellar.org
 * (or mainnet — match what the hooks actually call)
 */
const HORIZON_BASE = 'https://horizon-testnet.stellar.org';

// ── Fixture data ──────────────────────────────────────────────────────────────
export const MOCK_ACCOUNT_ID = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

export const mockAccount = {
  id: MOCK_ACCOUNT_ID,
  account_id: MOCK_ACCOUNT_ID,
  sequence: '100',
  subentry_count: 0,
  last_modified_ledger: 100,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: { auth_required: false, auth_revocable: false, auth_immutable: false },
  balances: [
    {
      balance: '100.0000000',
      asset_type: 'native',
      buying_liabilities: '0.0000000',
      selling_liabilities: '0.0000000',
    },
  ],
  signers: [{ weight: 1, key: MOCK_ACCOUNT_ID, type: 'ed25519_public_key' }],
  data: {},
  _links: {
    self: { href: `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}` },
    transactions: { href: `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions` },
    operations: { href: `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations` },
  },
};

export const mockTransactionsList = {
  _embedded: {
    records: [
      {
        id: 'txhash1',
        hash: 'txhash1',
        ledger: 100,
        created_at: '2024-01-01T00:00:00Z',
        source_account: MOCK_ACCOUNT_ID,
        source_account_sequence: '99',
        fee_account: MOCK_ACCOUNT_ID,
        fee_charged: '100',
        max_fee: '100',
        operation_count: 1,
        envelope_xdr: 'AAAA',
        result_xdr: 'AAAA',
        result_meta_xdr: 'AAAA',
        memo_type: 'none',
        successful: true,
      },
    ],
  },
  _links: {
    self: { href: `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions` },
    next: { href: '' },
    prev: { href: '' },
  },
};

export const mockOperationsList = {
  _embedded: {
    records: [
      {
        id: '1',
        paging_token: '1',
        transaction_successful: true,
        source_account: MOCK_ACCOUNT_ID,
        type: 'payment',
        type_i: 1,
        created_at: '2024-01-01T00:00:00Z',
        transaction_hash: 'txhash1',
        asset_type: 'native',
        from: MOCK_ACCOUNT_ID,
        to: 'GBOVKZBEM2YYLOCDCUXJ4IMRKHN4LCJAE7WEAEA2KF562XFAGDBOB64',
        amount: '10.0000000',
      },
    ],
  },
  _links: {
    self: { href: `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations` },
    next: { href: '' },
    prev: { href: '' },
  },
};

// ── Handlers ──────────────────────────────────────────────────────────────────
export const handlers = [
  /**
   * GET /accounts/:account_id
   * Returns mock account details.
   */
  http.get(`${HORIZON_BASE}/accounts/:accountId`, ({ params }) => {
    const { accountId } = params;
    if (accountId === MOCK_ACCOUNT_ID) {
      return HttpResponse.json(mockAccount);
    }
    return HttpResponse.json(
      {
        type: 'https://stellar.org/horizon-errors/not_found',
        title: 'Resource Missing',
        status: 404,
      },
      { status: 404 }
    );
  }),

  /**
   * GET /accounts/:account_id/transactions
   * Returns paginated transaction list for the account.
   */
  http.get(`${HORIZON_BASE}/accounts/:accountId/transactions`, ({ params }) => {
    const { accountId } = params;
    if (accountId === MOCK_ACCOUNT_ID) {
      return HttpResponse.json(mockTransactionsList);
    }
    return HttpResponse.json(
      {
        type: 'https://stellar.org/horizon-errors/not_found',
        title: 'Resource Missing',
        status: 404,
      },
      { status: 404 }
    );
  }),

  /**
   * GET /accounts/:account_id/operations
   * Returns paginated operations list for the account.
   */
  http.get(`${HORIZON_BASE}/accounts/:accountId/operations`, ({ params }) => {
    const { accountId } = params;
    if (accountId === MOCK_ACCOUNT_ID) {
      return HttpResponse.json(mockOperationsList);
    }
    return HttpResponse.json(
      {
        type: 'https://stellar.org/horizon-errors/not_found',
        title: 'Resource Missing',
        status: 404,
      },
      { status: 404 }
    );
  }),

  /**
   * GET /transactions/:hash
   * Returns a single transaction by hash.
   */
  http.get(`${HORIZON_BASE}/transactions/:hash`, ({ params }) => {
    const { hash } = params;
    const tx = mockTransactionsList._embedded.records.find((t) => t.hash === hash);
    if (tx) return HttpResponse.json(tx);
    return HttpResponse.json(
      {
        type: 'https://stellar.org/horizon-errors/not_found',
        title: 'Resource Missing',
        status: 404,
      },
      { status: 404 }
    );
  }),
];

/**
 * Error handler — simulates Horizon being unreachable.
 * Use this in tests that need to verify error states.
 */
export const errorHandlers = [
  http.get(`${HORIZON_BASE}/accounts/:accountId`, () => {
    return HttpResponse.error();
  }),
  http.get(`${HORIZON_BASE}/accounts/:accountId/transactions`, () => {
    return HttpResponse.error();
  }),
  http.get(`${HORIZON_BASE}/accounts/:accountId/operations`, () => {
    return HttpResponse.error();
  }),
];
