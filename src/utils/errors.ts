/**
 * @file errors.ts
 * @description Standardized error structures for all stellar-hooks.
 * @package stellar-hooks
 * @license MIT
 */

/**
 * Standardized error class thrown or returned by all hooks in the library.
 * Replaces raw generic Error objects to provide predictable shape: { message, code, cause, context }
 */
export class StellarHookError extends Error {
  public code: string | undefined;
  public context: Record<string, unknown> | undefined;

  constructor(
    message: string,
    options?: { code?: string; cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(message);
    
    this.name = 'StellarHookError';
    this.code = options?.code;
    this.context = options?.context;

    if (options?.cause !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).cause = options.cause;
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StellarHookError);
    }
  }

  /**
   * Helper to wrap unknown caught errors into a StellarHookError
   */
  static from(err: unknown, fallbackMessage = "An unknown error occurred", additionalContext?: Record<string, unknown>): StellarHookError {
    if (err instanceof StellarHookError) {
      if (additionalContext) {
        err.context = { ...err.context, ...additionalContext };
      }
      return err;
    }

    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : fallbackMessage;
    const code = err instanceof Error && 'code' in err ? String((err as { code?: unknown }).code) : undefined;
    
    const opts: { code?: string; cause?: unknown; context?: Record<string, unknown> } = {
      cause: err,
    };
    if (code !== undefined) opts.code = code;
    if (additionalContext !== undefined) opts.context = additionalContext;
    return new StellarHookError(message, opts);
  }
}

// ─── UserRejectedError ──────────────────────────────────────────────────────────

/**
 * Error thrown when the user explicitly rejects a wallet interaction
 * (e.g. dismissing a Freighter signature popup, denying a connection request).
 *
 * Extends {@link StellarHookError} with a fixed `code` of `"USER_REJECTED"` so
 * consumers can reliably distinguish intentional user cancellations from
 * unexpected failures:
 *
 * @example
 * ```ts
 * try {
 *   await signTransaction(xdr);
 * } catch (err) {
 *   if (err instanceof UserRejectedError) {
 *     // User dismissed the popup — no error report needed
 *     return;
 *   }
 *   // Handle real errors (network, on-chain failure, etc.)
 *   console.error(err);
 * }
 * ```
 */
export class UserRejectedError extends StellarHookError {
  /** Wallet ID that triggered the rejection (e.g. `"freighter"`, `"albedo"`). */
  public readonly walletId: string | undefined;
  /** The operation the user rejected (e.g. `"signTransaction"`, `"connect"`). */
  public readonly operation: string | undefined;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      walletId?: string;
      operation?: string;
    }
  ) {
    super(message, {
      code: 'USER_REJECTED',
      cause: options?.cause,
      context: {
        walletId: options?.walletId,
        operation: options?.operation,
      },
    });

    this.name = 'UserRejectedError';
    this.walletId = options?.walletId;
    this.operation = options?.operation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserRejectedError);
    }
  }
}

// ─── User Rejection Detection ────────────────────────────────────────────────────

/**
 * Patterns that indicate a user deliberately rejected or cancelled a wallet
 * interaction rather than encountering a technical failure.
 *
 * These are matched case-insensitively against the error message.
 */
const USER_REJECTION_PATTERNS = [
  /user\s*rejected/i,
  /user\s*denied/i,
  /user\s*declined/i,
  /user\s*cancelled/i,
  /user\s*canceled/i,
  /rejected\s*by\s*user/i,
  /denied\s*by\s*user/i,
  /transaction\s*rejected/i,
  /request\s*rejected/i,
  /access\s*denied/i,
  /permission\s*denied/i,
  /signing\s*rejected/i,
  /popup\s*closed/i,
  /user\s*closed/i,
];

/**
 * Checks whether an error message indicates the user deliberately rejected
 * or cancelled a wallet interaction.
 *
 * @param message - The error message to inspect.
 * @returns `true` if the message matches known user-rejection patterns.
 *
 * @example
 * ```ts
 * if (isUserRejectionMessage(error.message)) {
 *   throw new UserRejectedError(error.message, { cause: error });
 * }
 * ```
 */
export function isUserRejectionMessage(message: string): boolean {
  if (!message) return false;
  return USER_REJECTION_PATTERNS.some((pattern) => pattern.test(message));
}
