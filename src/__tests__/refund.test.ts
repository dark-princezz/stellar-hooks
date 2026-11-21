/**
 * @file refund.test.ts
 * @description Unit tests for refund helper and validation.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect } from "vitest";
import { validateRefund, buildRefundPayment } from "../utils/refund";

const SENDER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const RECEIVER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("refund helper", () => {
  it("validates a full refund successfully", () => {
    const payment = {
      from: SENDER,
      to: RECEIVER,
      amount: "25.00",
    };

    const validation = validateRefund(payment);
    expect(validation.isValid).toBe(true);
    expect(validation.isFull).toBe(true);
    expect(validation.isPartial).toBe(false);
    expect(validation.validatedRefundAmount).toBe("25.00");
  });

  it("validates a partial refund successfully", () => {
    const payment = {
      from: SENDER,
      to: RECEIVER,
      amount: "50",
    };

    const validation = validateRefund(payment, { refundAmount: "20" });
    expect(validation.isValid).toBe(true);
    expect(validation.isPartial).toBe(true);
    expect(validation.isFull).toBe(false);
    expect(validation.validatedRefundAmount).toBe("20");
  });

  it("rejects refund amounts exceeding the original payment", () => {
    const payment = {
      from: SENDER,
      to: RECEIVER,
      amount: "10",
    };

    const validation = validateRefund(payment, { refundAmount: "15" });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((e) => e.includes("cannot exceed original payment amount"))).toBe(true);
  });

  it("builds a return payment operation destined to the sender", () => {
    const payment = {
      from: SENDER,
      to: RECEIVER,
      amount: "100",
      assetCode: "XLM",
    };

    const result = buildRefundPayment(payment, { refundAmount: "50" });
    expect(result.recipient).toBe(SENDER);
    expect(result.amount).toBe("50");
    expect(result.operation.type).toBe("payment");
    expect(result.operation.destination).toBe(SENDER);
  });
});
