import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { server } from './src/mocks/server';

/**
 * MSW test setup for Vitest.
 * Configures server mocking before all tests and cleans up after each test.
 */

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});
