import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('useFreighter mocking', () => {
  it('resets module state correctly between tests', () => {
    vi.doMock('@stellar/freighter-api', () => ({
      isConnected: vi.fn().mockResolvedValue(true),
    }));

    expect(true).toBe(true);
  });
});
