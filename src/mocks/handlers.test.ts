/**
 * @file handlers.test.ts
 * @description Tests for MSW Horizon API handlers and mocks.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { server } from './server';
import { errorHandlers, MOCK_ACCOUNT_ID, mockAccount, mockTransactionsList, mockOperationsList } from './handlers';

const HORIZON_BASE = 'https://horizon-testnet.stellar.org';

describe('MSW Horizon Handlers', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('GET /accounts/:accountId', () => {
    it('returns mock account for known ID', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.account_id).toBe(MOCK_ACCOUNT_ID);
      expect(data.sequence).toBe('100');
      expect(data.balances).toHaveLength(1);
      expect(data.balances[0].asset_type).toBe('native');
    });

    it('returns 404 for unknown account ID', async () => {
      const unknownId = 'GBOVKZBEM2YYLOCDCUXJ4IMRKHN4LCJAE7WEAEA2KF562XFAGDBOB64';
      const response = await fetch(`${HORIZON_BASE}/accounts/${unknownId}`);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.type).toBe('https://stellar.org/horizon-errors/not_found');
      expect(data.title).toBe('Resource Missing');
    });

    it('returns complete account structure with links', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}`);
      const data = await response.json();

      expect(data._links).toBeDefined();
      expect(data._links.self.href).toContain(MOCK_ACCOUNT_ID);
      expect(data._links.transactions.href).toContain('transactions');
      expect(data._links.operations.href).toContain('operations');
    });

    it('includes signers and flags in account response', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}`);
      const data = await response.json();

      expect(data.signers).toHaveLength(1);
      expect(data.signers[0].key).toBe(MOCK_ACCOUNT_ID);
      expect(data.signers[0].type).toBe('ed25519_public_key');
      expect(data.flags.auth_required).toBe(false);
      expect(data.flags.auth_revocable).toBe(false);
      expect(data.flags.auth_immutable).toBe(false);
    });
  });

  describe('GET /accounts/:accountId/transactions', () => {
    it('returns transaction list for known account', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data._embedded.records).toBeDefined();
      expect(data._embedded.records).toHaveLength(1);
      expect(data._embedded.records[0].hash).toBe('txhash1');
      expect(data._embedded.records[0].source_account).toBe(MOCK_ACCOUNT_ID);
    });

    it('returns paginated structure with links', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions`);
      const data = await response.json();

      expect(data._links).toBeDefined();
      expect(data._links.self.href).toContain('transactions');
      expect(data._links.next).toBeDefined();
      expect(data._links.prev).toBeDefined();
    });

    it('returns 404 for unknown account', async () => {
      const unknownId = 'GBOVKZBEM2YYLOCDCUXJ4IMRKHN4LCJAE7WEAEA2KF562XFAGDBOB64';
      const response = await fetch(`${HORIZON_BASE}/accounts/${unknownId}/transactions`);

      expect(response.status).toBe(404);
    });

    it('includes transaction details', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions`);
      const data = await response.json();
      const tx = data._embedded.records[0];

      expect(tx.id).toBe('txhash1');
      expect(tx.ledger).toBe(100);
      expect(tx.created_at).toBe('2024-01-01T00:00:00Z');
      expect(tx.operation_count).toBe(1);
      expect(tx.fee_charged).toBe('100');
      expect(tx.successful).toBe(true);
    });
  });

  describe('GET /accounts/:accountId/operations', () => {
    it('returns operation list for known account', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data._embedded.records).toBeDefined();
      expect(data._embedded.records).toHaveLength(1);
      expect(data._embedded.records[0].type).toBe('payment');
    });

    it('includes payment operation details', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations`);
      const data = await response.json();
      const op = data._embedded.records[0];

      expect(op.type).toBe('payment');
      expect(op.type_i).toBe(1);
      expect(op.asset_type).toBe('native');
      expect(op.from).toBe(MOCK_ACCOUNT_ID);
      expect(op.to).toBe('GBOVKZBEM2YYLOCDCUXJ4IMRKHN4LCJAE7WEAEA2KF562XFAGDBOB64');
      expect(op.amount).toBe('10.0000000');
    });

    it('returns 404 for unknown account', async () => {
      const unknownId = 'GBOVKZBEM2YYLOCDCUXJ4IMRKHN4LCJAE7WEAEA2KF562XFAGDBOB64';
      const response = await fetch(`${HORIZON_BASE}/accounts/${unknownId}/operations`);

      expect(response.status).toBe(404);
    });

    it('returns paginated structure with links', async () => {
      const response = await fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations`);
      const data = await response.json();

      expect(data._links.self.href).toContain('operations');
      expect(data._links.next).toBeDefined();
      expect(data._links.prev).toBeDefined();
    });
  });

  describe('GET /transactions/:hash', () => {
    it('returns transaction by hash', async () => {
      const response = await fetch(`${HORIZON_BASE}/transactions/txhash1`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.hash).toBe('txhash1');
      expect(data.source_account).toBe(MOCK_ACCOUNT_ID);
      expect(data.successful).toBe(true);
    });

    it('returns 404 for unknown transaction hash', async () => {
      const response = await fetch(`${HORIZON_BASE}/transactions/unknown_hash`);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.type).toBe('https://stellar.org/horizon-errors/not_found');
    });
  });

  describe('Error handlers', () => {
    it('simulates network failure when using errorHandlers', async () => {
      server.use(...errorHandlers);

      const promise = fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}`);
      await expect(promise).rejects.toThrow();
    });

    it('simulates error on transactions endpoint', async () => {
      server.use(...errorHandlers);

      const promise = fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/transactions`);
      await expect(promise).rejects.toThrow();
    });

    it('simulates error on operations endpoint', async () => {
      server.use(...errorHandlers);

      const promise = fetch(`${HORIZON_BASE}/accounts/${MOCK_ACCOUNT_ID}/operations`);
      await expect(promise).rejects.toThrow();
    });
  });

  describe('Fixture data integrity', () => {
    it('mockAccount has required fields', () => {
      expect(mockAccount.account_id).toBe(MOCK_ACCOUNT_ID);
      expect(mockAccount.sequence).toBeDefined();
      expect(mockAccount.balances).toBeDefined();
      expect(Array.isArray(mockAccount.balances)).toBe(true);
    });

    it('mockTransactionsList has required structure', () => {
      expect(mockTransactionsList._embedded).toBeDefined();
      expect(mockTransactionsList._embedded.records).toBeDefined();
      expect(Array.isArray(mockTransactionsList._embedded.records)).toBe(true);
    });

    it('mockOperationsList has required structure', () => {
      expect(mockOperationsList._embedded).toBeDefined();
      expect(mockOperationsList._embedded.records).toBeDefined();
      expect(Array.isArray(mockOperationsList._embedded.records)).toBe(true);
    });
  });
});
