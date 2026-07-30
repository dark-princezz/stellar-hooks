import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW worker for browser environment (development/Storybook).
 * Useful for testing in the browser during development.
 */
export const worker = setupWorker(...handlers);
