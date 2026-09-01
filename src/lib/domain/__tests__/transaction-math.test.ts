import { describe, expect, it } from "vitest";
import { computeBuyRowProfitRoi, computeTransactionDerived } from "../transaction-math";
import type { DomainTransaction } from "../types";

function tx(overrides: Partial<DomainTransaction>): DomainTransaction {
  return {
    id: "test-id",
    ticker: "META",
    type: "BUY",
    tradeDate: "2025-12-01",
    cclRate: 1517.5,
    arsPrice: 40560,
    qty: 3,
    createdAtMs: 0,
    ...overrides,
  };
}

describe("computeTransactionDerived", () => {
  it("matches the original sheet's META row exactly", () => {
    // META BUY 1/12/2025: ARS 40560 @ CCL 1517.50, qty 3 -> USD 26.73, ARS amount 121680, USD amount 80.18
    const { usdPrice, arsAmount, usdAmount } = computeTransactionDerived(tx({}));
    expect(usdPrice).toBeCloseTo(26.73, 2);
    expect(arsAmount).toBe(121680);
    expect(usdAmount).toBeCloseTo(80.18, 2);
  });
});

describe("computeBuyRowProfitRoi", () => {
  it("computes unrealized mark-to-market gain against the current price", () => {
    const t = tx({});
    const { usdPrice } = computeTransactionDerived(t);
    const currentCedearUsd = usdPrice + 0.24; // matches the sheet's META example (+$0.72 / 3 qty)
    const { profit, roi } = computeBuyRowProfitRoi(t, currentCedearUsd);
    expect(profit).toBeCloseTo(0.72, 2);
    expect(roi).toBeCloseTo(0.9 / 100, 3);
  });

  it("profit and roi always share sign for a buy lot", () => {
    const t = tx({});
    const { usdPrice } = computeTransactionDerived(t);
    for (const price of [usdPrice * 0.5, usdPrice, usdPrice * 1.5]) {
      const { profit, roi } = computeBuyRowProfitRoi(t, price);
      expect(Math.sign(profit)).toBe(Math.sign(roi ?? 0));
    }
  });
});
