import { http, HttpResponse } from 'msw';

const HORIZON_BASE = 'https://horizon-testnet.stellar.org';

export const scenarios = {
  insufficientBalance: (accountId = '*') => [
    http.get(`${HORIZON_BASE}/accounts/${accountId}`, () =>
      HttpResponse.json({
        id: accountId,
        sequence: '1',
        balances: [{ balance: '0.0000001', asset_type: 'native' }],
        subentry_count: 0,
        thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
        flags: { auth_required: false, auth_revocable: false, auth_immutable: false },
        signers: [],
        data: {},
      }),
    ),
    http.post(`${HORIZON_BASE}/transactions`, () =>
      HttpResponse.json(
        {
          type: 'https://stellar.org/horizon-errors/transaction_failed',
          title: 'Transaction Failed',
          status: 400,
          extras: { result_codes: { transaction: 'tx_failed', operations: ['op_underfunded'] } },
        },
        { status: 400 },
      ),
    ),
  ],

  badSequence: () => [
    http.post(`${HORIZON_BASE}/transactions`, () =>
      HttpResponse.json(
        {
          type: 'https://stellar.org/horizon-errors/transaction_failed',
          title: 'Transaction Failed',
          status: 400,
          extras: { result_codes: { transaction: 'tx_bad_seq' } },
        },
        { status: 400 },
      ),
    ),
  ],

  rpcTimeout: () => [
    http.get(`${HORIZON_BASE}/*`, async () => {
      await new Promise((r) => setTimeout(r, 30_000));
      return HttpResponse.json({ error: 'timeout' }, { status: 504 });
    }),
    http.post(`${HORIZON_BASE}/*`, async () => {
      await new Promise((r) => setTimeout(r, 30_000));
      return HttpResponse.json({ error: 'timeout' }, { status: 504 });
    }),
  ],

  accountNotFound: (accountId = '*') => [
    http.get(`${HORIZON_BASE}/accounts/${accountId}`, () =>
      HttpResponse.json(
        { type: 'https://stellar.org/horizon-errors/not_found', title: 'Resource Missing', status: 404 },
        { status: 404 },
      ),
    ),
  ],
};

export type ScenarioName = keyof typeof scenarios;
