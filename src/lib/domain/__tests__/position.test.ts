import { describe, expect, it } from "vitest";
import {
  computePosition,
  computeRealizedBySellId,
  computeTransactionRowMetrics,
} from "../position";
import type { DomainTransaction } from "../types";

let seq = 0;
function tx(overrides: Partial<DomainTransaction>): DomainTransaction {
  return {
    id: `id-${seq++}`,
    ticker: "MELI",
    type: "BUY",
    tradeDate: "2026-01-01",
    cclRate: 1000,
    arsPrice: 1000, // usdPrice = 1 by default
    qty: 1,
    createdAtMs: seq,
    ...overrides,
  };
}

describe("computePosition — moving weighted-average cost", () => {
  it("buy-sell-buy: avg cost resets correctly after a full exit (the simple-average bug)", () => {
    // Buy 10 @ $1, sell all 10 @ $2, buy 5 @ $3.
    // Correct moving average of the remaining position is $3 (not (10·1+5·3)/15 = $1.67).
    const transactions = [
      tx({ type: "BUY", tradeDate: "2026-01-01", cclRate: 1, arsPrice: 1, qty: 10 }),
      tx({ type: "SELL", tradeDate: "2026-01-02", cclRate: 1, arsPrice: 2, qty: 10 }),
      tx({ type: "BUY", tradeDate: "2026-01-03", cclRate: 1, arsPrice: 3, qty: 5 }),
    ];
    const pos = computePosition(transactions, "MELI");
    expect(pos.qty).toBe(5);
    expect(pos.avgCostUsd).toBeCloseTo(3, 9);
    expect(pos.realizedPnlUsd).toBeCloseTo(10 * (2 - 1), 9); // sold 10 @ $2 vs $1 cost = +$10
  });

  it("weighted average across two buys at different prices", () => {
    const transactions = [
      tx({ type: "BUY", cclRate: 1, arsPrice: 10, qty: 2 }), // 2 @ $10
      tx({ type: "BUY", cclRate: 1, arsPrice: 20, qty: 2 }), // 2 @ $20
    ];
    const pos = computePosition(transactions, "MELI");
    expect(pos.avgCostUsd).toBeCloseTo(15, 9); // (2·10 + 2·20)/4
    expect(pos.costBasisUsd).toBeCloseTo(60, 9);
  });

  it("AMZN closed position (85+4 bought, 20+20+49 sold -> qty 0) realized is price-independent", () => {
    const amzn: DomainTransaction[] = [
      tx({ ticker: "AMZN", type: "BUY", tradeDate: "2026-02-06", cclRate: 1489.2, arsPrice: 2114, qty: 85 }),
      tx({ ticker: "AMZN", type: "SELL", tradeDate: "2026-02-27", cclRate: 1462.7, arsPrice: 2147, qty: 20 }),
      tx({ ticker: "AMZN", type: "SELL", tradeDate: "2026-02-27", cclRate: 1462.7, arsPrice: 2150, qty: 20 }),
      tx({ ticker: "AMZN", type: "BUY", tradeDate: "2026-03-09", cclRate: 1473.0, arsPrice: 2154, qty: 4 }),
      tx({ ticker: "AMZN", type: "SELL", tradeDate: "2026-05-05", cclRate: 1494.1, arsPrice: 2850, qty: 49 }),
    ];
    const pos = computePosition(amzn, "AMZN");
    expect(pos.qty).toBe(0);
    expect(pos.costBasisUsd).toBe(0);
    // Realized is well-defined and independent of any live price. Hand-computed
    // via the moving average: 20·(1.4678−1.4196) + 20·(1.4699−1.4196) + 49·(1.9075−1.4230) ≈ 25.71.
    // Matches the ~US$25.71 seen on the closed AMZN position earlier.
    expect(pos.realizedPnlUsd).toBeCloseTo(25.71, 1);
  });

  it("returns null avg cost for a ticker never bought", () => {
    expect(computePosition([], "NU").avgCostUsd).toBeNull();
  });
});

describe("computeRealizedBySellId", () => {
  it("prices each sell against the moving average at the moment of sale", () => {
    const buy1 = tx({ type: "BUY", tradeDate: "2026-01-01", cclRate: 1, arsPrice: 10, qty: 10 });
    const sell = tx({ type: "SELL", tradeDate: "2026-01-02", cclRate: 1, arsPrice: 15, qty: 5 });
    const buy2 = tx({ type: "BUY", tradeDate: "2026-01-03", cclRate: 1, arsPrice: 100, qty: 10 }); // after the sell
    const map = computeRealizedBySellId([buy1, sell, buy2]);
    // The sell is priced against $10 (avg before it), NOT influenced by the later $100 buy.
    expect(map.get(sell.id)!.profit).toBeCloseTo(5 * (15 - 10), 9);
    expect(map.get(sell.id)!.roi).toBeCloseTo(15 / 10 - 1, 9);
  });
});

describe("computeTransactionRowMetrics", () => {
  it("a BUY uses current price; null when no price available", () => {
    const buy = tx({ type: "BUY", cclRate: 1, arsPrice: 10, qty: 2 });
    const withPrice = computeTransactionRowMetrics(buy, 12, new Map())!;
    expect(withPrice.profit).toBeCloseTo(2 * (12 - 10), 9);
    expect(computeTransactionRowMetrics(buy, null, new Map())).toBeNull();
  });

  it("a SELL reads its realized entry from the map", () => {
    const sell = tx({ type: "SELL" });
    const realized = new Map([[sell.id, { profit: 42, roi: 0.1 }]]);
    expect(computeTransactionRowMetrics(sell, 999, realized)).toEqual({ profit: 42, roi: 0.1 });
  });
});
