import { describe, expect, it } from "vitest";
import { computePortfolioTwrSeries, netCashflowByDate, rebaseToIndex } from "../twr";
import type { BalancePoint } from "../balance-history";
import type { DomainTransaction } from "../types";

let seq = 0;
function tx(overrides: Partial<DomainTransaction>): DomainTransaction {
  return {
    id: `id-${seq++}`,
    ticker: "MELI",
    type: "BUY",
    tradeDate: "2026-01-01",
    cclRate: 1000,
    arsPrice: 1000,
    qty: 1,
    createdAtMs: seq,
    ...overrides,
  };
}

describe("computePortfolioTwrSeries", () => {
  it("tracks pure price movement when there are no cash flows", () => {
    // Value 100 -> 110 -> 121 with no external flows = +10% each day, index 100->110->121.
    const balance: BalancePoint[] = [
      { date: "2026-01-01", valueUsd: 100 },
      { date: "2026-01-02", valueUsd: 110 },
      { date: "2026-01-03", valueUsd: 121 },
    ];
    const series = computePortfolioTwrSeries(balance, new Map());
    expect(series[0].index).toBeCloseTo(100, 9);
    expect(series[1].index).toBeCloseTo(110, 9);
    expect(series[2].index).toBeCloseTo(121, 9);
  });

  it("a deposit does NOT inflate the return (the key TWR invariant)", () => {
    // Day 2 the value jumps 100->210 but 100 of that is a fresh deposit (cash flow),
    // so the real return that day is +10% (110 grown from 100), not +110%.
    const balance: BalancePoint[] = [
      { date: "2026-01-01", valueUsd: 100 },
      { date: "2026-01-02", valueUsd: 210 },
    ];
    const cashflows = new Map([["2026-01-02", 100]]);
    const series = computePortfolioTwrSeries(balance, cashflows);
    expect(series[1].index).toBeCloseTo(110, 6); // +10%, not +110%
  });
});

describe("netCashflowByDate", () => {
  it("buys add, sells subtract, netted per date", () => {
    const map = netCashflowByDate([
      tx({ type: "BUY", tradeDate: "2026-01-01", cclRate: 1, arsPrice: 100, qty: 1 }), // +100
      tx({ type: "SELL", tradeDate: "2026-01-01", cclRate: 1, arsPrice: 30, qty: 1 }), // -30
    ]);
    expect(map.get("2026-01-01")).toBeCloseTo(70, 9);
  });
});

describe("rebaseToIndex", () => {
  it("normalizes a level series to 100 at the first eligible date", () => {
    const idx = rebaseToIndex(
      [
        { date: "2026-01-01", value: 4000 },
        { date: "2026-01-02", value: 4400 },
      ],
      "2026-01-01"
    );
    expect(idx[0].index).toBe(100);
    expect(idx[1].index).toBeCloseTo(110, 9);
  });
});
