import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for Node.js test environment (Jest/Vitest).
 * Import and use in test setup files.
 */
export const server = setupServer(...handlers);
