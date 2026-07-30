/**
 * @file msw.integration.test.ts
 * @description Integration tests demonstrating MSW usage with Stellar hooks.
 * These tests show how to use the mocked Horizon API for testing hook behavior.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect } from 'vitest';
import { MOCK_ACCOUNT_ID, mockAccount, mockTransactionsList, mockOperationsList } from '../mocks/handlers';

/**
 * These tests demonstrate that:
 * 1. MSW mocks are active and intercept HTTP requests
 * 2. Fixtures contain realistic Horizon API response structures
 * 3. Tests can run without any network access
 */
describe('MSW Integration - Horizon API Mocking', () => {
  describe('Account Endpoint', () => {
    it('fetches account data via mocked Horizon endpoint', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}`);

      expect(response.status).toBe(200);
      const account = await response.json();

      // Verify fixture structure
      expect(account.account_id).toBe(MOCK_ACCOUNT_ID);
      expect(account.sequence).toBe('100');
      expect(account.balances).toBeDefined();
      expect(Array.isArray(account.balances)).toBe(true);
      expect(account.signers).toBeDefined();
      expect(account.flags).toBeDefined();
    });

    it('returns native (XLM) balance in fixture', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}`);
      const account = await response.json();

      const nativeBalance = account.balances.find(
        (b: any) => b.asset_type === 'native'
      );
      expect(nativeBalance).toBeDefined();
      expect(nativeBalance.balance).toBe('100.0000000');
    });

    it('includes HATEOAS links for account navigation', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}`);
      const account = await response.json();

      expect(account._links).toBeDefined();
      expect(account._links.self).toBeDefined();
      expect(account._links.transactions).toBeDefined();
      expect(account._links.operations).toBeDefined();
    });
  });

  describe('Transactions Endpoint', () => {
    it('fetches transactions for account via mocked endpoint', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(
        `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions`
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data._embedded).toBeDefined();
      expect(Array.isArray(data._embedded.records)).toBe(true);
      expect(data._embedded.records.length).toBeGreaterThan(0);
    });

    it('includes transaction metadata in response', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(
        `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions`
      );
      const data = await response.json();
      const tx = data._embedded.records[0];

      expect(tx.hash).toBeDefined();
      expect(tx.ledger).toBeDefined();
      expect(tx.created_at).toBeDefined();
      expect(tx.source_account).toBe(MOCK_ACCOUNT_ID);
      expect(tx.fee_charged).toBeDefined();
      expect(tx.successful).toBe(true);
    });

    it('includes XDR fields in transaction response', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(
        `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions`
      );
      const data = await response.json();
      const tx = data._embedded.records[0];

      expect(tx.envelope_xdr).toBeDefined();
      expect(tx.result_xdr).toBeDefined();
      expect(tx.result_meta_xdr).toBeDefined();
    });
  });

  describe('Operations Endpoint', () => {
    it('fetches operations for account via mocked endpoint', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(
        `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations`
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data._embedded).toBeDefined();
      expect(Array.isArray(data._embedded.records)).toBe(true);
      expect(data._embedded.records.length).toBeGreaterThan(0);
    });

    it('includes payment operation details', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(
        `${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations`
      );
      const data = await response.json();
      const op = data._embedded.records[0];

      expect(op.type).toBe('payment');
      expect(op.type_i).toBe(1);
      expect(op.from).toBeDefined();
      expect(op.to).toBeDefined();
      expect(op.amount).toBeDefined();
      expect(op.asset_type).toBe('native');
    });
  });

  describe('Fixture Realism', () => {
    it('mockAccount matches actual Horizon API structure', () => {
      expect(mockAccount).toMatchObject({
        account_id: expect.any(String),
        sequence: expect.any(String),
        subentry_count: expect.any(Number),
        thresholds: expect.objectContaining({
          low_threshold: expect.any(Number),
          med_threshold: expect.any(Number),
          high_threshold: expect.any(Number),
        }),
        flags: expect.objectContaining({
          auth_required: expect.any(Boolean),
          auth_revocable: expect.any(Boolean),
          auth_immutable: expect.any(Boolean),
        }),
        balances: expect.arrayContaining([
          expect.objectContaining({
            balance: expect.any(String),
            asset_type: expect.any(String),
          }),
        ]),
        signers: expect.arrayContaining([
          expect.objectContaining({
            weight: expect.any(Number),
            key: expect.any(String),
            type: expect.any(String),
          }),
        ]),
        _links: expect.objectContaining({
          self: expect.any(Object),
          transactions: expect.any(Object),
          operations: expect.any(Object),
        }),
      });
    });

    it('mockTransactionsList matches pagination structure', () => {
      expect(mockTransactionsList).toMatchObject({
        _embedded: expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              hash: expect.any(String),
              ledger: expect.any(Number),
              created_at: expect.any(String),
              source_account: expect.any(String),
              fee_charged: expect.any(String),
              successful: expect.any(Boolean),
            }),
          ]),
        }),
        _links: expect.objectContaining({
          self: expect.any(Object),
          next: expect.any(Object),
          prev: expect.any(Object),
        }),
      });
    });

    it('mockOperationsList matches pagination structure', () => {
      expect(mockOperationsList).toMatchObject({
        _embedded: expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: expect.any(String),
              type_i: expect.any(Number),
              source_account: expect.any(String),
              created_at: expect.any(String),
            }),
          ]),
        }),
        _links: expect.objectContaining({
          self: expect.any(Object),
          next: expect.any(Object),
          prev: expect.any(Object),
        }),
      });
    });
  });

  describe('Error Scenarios', () => {
    it('returns 404 for unknown account ID', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const unknownId = 'GBOVKZBEM2YYLOCDCUXJ4IMRKHN4LCJAE7WEAEA2KF562XFAGDBOB64';
      const response = await fetch(`${HORIZON_BASE}/accounts/${unknownId}`);

      expect(response.status).toBe(404);
      const error = await response.json();
      expect(error.type).toContain('not_found');
    });

    it('returns 404 for unknown transaction hash', async () => {
      const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
      const response = await fetch(`${HORIZON_BASE}/transactions/unknown_hash`);

      expect(response.status).toBe(404);
    });
  });

  describe('Mock Data Consistency', () => {
    it('transactions list contains valid source account', () => {
      expect(mockTransactionsList._embedded.records[0].source_account).toBe(
        MOCK_ACCOUNT_ID
      );
    });

    it('operations list contains valid source account', () => {
      expect(mockOperationsList._embedded.records[0].source_account).toBe(
        MOCK_ACCOUNT_ID
      );
    });

    it('account ID is consistent across all fixtures', () => {
      expect(mockAccount.account_id).toBe(MOCK_ACCOUNT_ID);
      expect(mockTransactionsList._embedded.records[0].source_account).toBe(
        MOCK_ACCOUNT_ID
      );
      expect(mockOperationsList._embedded.records[0].source_account).toBe(
        MOCK_ACCOUNT_ID
      );
    });
  });
});
