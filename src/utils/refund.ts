/**
 * @file refund.ts
 * @description Helper functions for validating and building return/refund payments to the sender.
 * @package stellar-hooks
 * @license MIT
 */

import {
  Asset,
  Memo,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export interface ReceivedPaymentInfo {
  /** Original sender address (who sent the payment) */
  from: string;
  /** Original recipient address (who received the payment) */
  to: string;
  /** Amount originally received as a string, e.g. "50.00" */
  amount: string | number;
  /** Asset code or type */
  assetType?: string;
  /** Asset code if credit asset */
  assetCode?: string;
  /** Asset issuer if credit asset */
  assetIssuer?: string;
  /** Transaction hash of the original received payment */
  transactionHash?: string;
}

export interface RefundPaymentOptions {
  /**
   * Amount to refund.
   * If omitted, defaults to the full amount from `originalPayment.amount`.
   */
  refundAmount?: string | number;
  /**
   * Custom memo for the refund. Defaults to MEMO_TEXT "Refund" or memo return.
   */
  memo?: string;
  /**
   * Type of memo to attach. Defaults to "text".
   */
  memoType?: "text" | "id" | "hash" | "return";
  /**
   * Network passphrase for transaction builder.
   */
  networkPassphrase?: string;
  /**
   * Source account sequence number (if building a complete Transaction).
   */
  sequenceNumber?: string;
  /**
   * Fee in stroops. Default: 100.
   */
  fee?: number | string;
  /**
   * Allow refund amount to exceed the original payment amount. Default: false.
   */
  allowExcess?: boolean;
}

export interface RefundValidationResult {
  isValid: boolean;
  errors: string[];
  validatedRefundAmount: string;
  isPartial: boolean;
  isFull: boolean;
}

export interface RefundPaymentResult {
  /** Validated refund amount string */
  amount: string;
  /** Recipient of the refund (the original sender) */
  recipient: string;
  /** Payment operation object ready to be added to a transaction */
  operation: ReturnType<typeof Operation.payment>;
  /** Complete Transaction object if sequenceNumber was supplied */
  transaction?: Transaction;
  /** Validation details */
  validation: RefundValidationResult;
}

/**
 * Validates a proposed refund against the original received payment.
 */
export function validateRefund(
  originalPayment: ReceivedPaymentInfo,
  options: RefundPaymentOptions = {}
): RefundValidationResult {
  const errors: string[] = [];

  if (!originalPayment || !originalPayment.from) {
    errors.push("Original payment sender address ('from') is required.");
  } else if (!StrKey.isValidEd25519PublicKey(originalPayment.from) && !StrKey.isValidMed25519PublicKey(originalPayment.from)) {
    errors.push("Original sender address is not a valid Stellar public key.");
  }

  const origAmount = Number(originalPayment.amount);
  if (isNaN(origAmount) || origAmount <= 0) {
    errors.push("Original payment amount must be a valid positive number.");
  }

  const refundAmtVal = options.refundAmount !== undefined ? Number(options.refundAmount) : origAmount;
  if (isNaN(refundAmtVal) || refundAmtVal <= 0) {
    errors.push("Refund amount must be a positive number.");
  }

  if (!options.allowExcess && origAmount > 0 && refundAmtVal > origAmount) {
    errors.push(`Refund amount (${refundAmtVal}) cannot exceed original payment amount (${origAmount}).`);
  }

  const validatedRefundAmount = !isNaN(refundAmtVal) && refundAmtVal > 0 ? String(options.refundAmount ?? originalPayment.amount) : "0";
  const isFull = origAmount > 0 && Math.abs(refundAmtVal - origAmount) < 0.0000001;
  const isPartial = origAmount > 0 && refundAmtVal < origAmount && refundAmtVal > 0;

  return {
    isValid: errors.length === 0,
    errors,
    validatedRefundAmount,
    isPartial,
    isFull,
  };
}

/**
 * Builds a Stellar payment operation and optional Transaction returning funds to the sender.
 */
export function buildRefundPayment(
  originalPayment: ReceivedPaymentInfo,
  options: RefundPaymentOptions = {}
): RefundPaymentResult {
  const validation = validateRefund(originalPayment, options);
  if (!validation.isValid) {
    throw new Error(`Refund validation failed: ${validation.errors.join("; ")}`);
  }

  // Resolve Stellar SDK Asset
  let asset: Asset;
  const isNative =
    !originalPayment.assetCode ||
    originalPayment.assetCode.toUpperCase() === "XLM" ||
    originalPayment.assetType === "native";

  if (isNative) {
    asset = Asset.native();
  } else {
    if (!originalPayment.assetCode || !originalPayment.assetIssuer) {
      throw new Error("Credit asset requires both assetCode and assetIssuer.");
    }
    asset = new Asset(originalPayment.assetCode, originalPayment.assetIssuer);
  }

  // Create payment operation destined to original sender
  const paymentOp = Operation.payment({
    destination: originalPayment.from,
    asset,
    amount: validation.validatedRefundAmount,
  });

  let transaction: Transaction | undefined;

  if (options.sequenceNumber && options.networkPassphrase && originalPayment.to) {
    const defaultMemo = options.memo ?? (originalPayment.transactionHash ? `Refund:${originalPayment.transactionHash.slice(0, 20)}` : "Refund");
    let memoObj: Memo;

    if (options.memoType === "id") {
      memoObj = Memo.id(defaultMemo);
    } else if (options.memoType === "hash") {
      memoObj = Memo.hash(defaultMemo);
    } else if (options.memoType === "return") {
      memoObj = Memo.return(defaultMemo);
    } else {
      memoObj = Memo.text(defaultMemo.slice(0, 28));
    }

    const txBuilder = new TransactionBuilder(
      {
        accountId: () => originalPayment.to,
        sequenceNumber: () => options.sequenceNumber!,
        incrementSequenceNumber: () => {},
      },
      {
        fee: String(options.fee ?? 100),
        networkPassphrase: options.networkPassphrase,
      }
    )
      .addOperation(paymentOp)
      .addMemo(memoObj)
      .setTimeout(60);

    transaction = txBuilder.build();
  }

  return {
    amount: validation.validatedRefundAmount,
    recipient: originalPayment.from,
    operation: paymentOp,
    transaction,
    validation,
  };
}
