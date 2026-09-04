import { describe, expect, it } from "vitest";
import { computeBalanceHistory, computeInvestedHistory } from "../balance-history";
import type { DomainTransaction } from "../types";

function tx(overrides: Partial<DomainTransaction>): DomainTransaction {
  return {
    id: crypto.randomUUID(),
    ticker: "META",
    type: "BUY",
    tradeDate: "2026-01-02",
    cclRate: 1500,
    arsPrice: 40000,
    qty: 2,
    createdAtMs: 0,
    ...overrides,
  };
}

const CCL_HISTORY = [
  { date: "2026-01-01", rate: 1500 },
  { date: "2026-01-02", rate: 1500 },
  { date: "2026-01-03", rate: 1510 },
  { date: "2026-01-04", rate: 1520 },
  { date: "2026-01-05", rate: 1530 },
];

const META_HISTORY = [
  { date: "2026-01-01", close: 39000 },
  { date: "2026-01-02", close: 40000 },
  { date: "2026-01-03", close: 41000 },
  { date: "2026-01-04", close: 42000 },
  { date: "2026-01-05", close: 43000 },
];

describe("computeBalanceHistory", () => {
  it("only includes dates from the first transaction onward", () => {
    const points = computeBalanceHistory(
      [tx({ tradeDate: "2026-01-03" })],
      { META: META_HISTORY },
      CCL_HISTORY
    );
    expect(points.map((p) => p.date)).toEqual(["2026-01-03", "2026-01-04", "2026-01-05"]);
  });

  it("computes qty * historical price / historical CCL for each date", () => {
    const points = computeBalanceHistory([tx({ tradeDate: "2026-01-02", qty: 2 })], { META: META_HISTORY }, CCL_HISTORY);
    const point = points.find((p) => p.date === "2026-01-04")!;
    expect(point.valueUsd).toBeCloseTo((2 * 42000) / 1520, 9);
  });

  it("drops qty to 0 (and value to 0) after a full sell", () => {
    const points = computeBalanceHistory(
      [tx({ tradeDate: "2026-01-02", type: "BUY", qty: 2 }), tx({ tradeDate: "2026-01-04", type: "SELL", qty: 2 })],
      { META: META_HISTORY },
      CCL_HISTORY
    );
    expect(points.find((p) => p.date === "2026-01-03")!.valueUsd).toBeGreaterThan(0);
    expect(points.find((p) => p.date === "2026-01-04")!.valueUsd).toBe(0);
    expect(points.find((p) => p.date === "2026-01-05")!.valueUsd).toBe(0);
  });

  it("sums across multiple tickers", () => {
    const points = computeBalanceHistory(
      [tx({ ticker: "META", tradeDate: "2026-01-02", qty: 2 }), tx({ ticker: "MELI", tradeDate: "2026-01-02", qty: 3 })],
      { META: META_HISTORY, MELI: META_HISTORY.map((p) => ({ ...p, close: p.close / 2 })) },
      CCL_HISTORY
    );
    const point = points.find((p) => p.date === "2026-01-04")!;
    const expected = (2 * 42000) / 1520 + (3 * 21000) / 1520;
    expect(point.valueUsd).toBeCloseTo(expected, 9);
  });

  it("returns an empty array with no transactions", () => {
    expect(computeBalanceHistory([], { META: META_HISTORY }, CCL_HISTORY)).toEqual([]);
  });

  describe("fallback for tickers with no real historical series (e.g. NU on data912)", () => {
    const ccl = [
      { date: "2026-01-01", rate: 1500 },
      { date: "2026-01-02", rate: 1500 },
      { date: "2026-01-03", rate: 1500 },
      { date: "2026-01-04", rate: 1500 },
      { date: "2026-01-05", rate: 1500 },
    ];

    it("interpolates between the ticker's own buy and sell prices instead of contributing 0", () => {
      const buy = tx({ ticker: "NU", type: "BUY", tradeDate: "2026-01-01", arsPrice: 10000, cclRate: 1500, qty: 10 });
      const sell = tx({ ticker: "NU", type: "SELL", tradeDate: "2026-01-05", arsPrice: 20000, cclRate: 1500, qty: 10 });
      // No entry for NU at all in cedearHistoryByTicker -> ?? [] -> treated the same as [].
      const points = computeBalanceHistory([buy, sell], {}, ccl);

      // Halfway (by date) between 10000 and 20000 ARS should be ~15000 ARS -> 10*15000/1500 = 100 USD.
      const midpoint = points.find((p) => p.date === "2026-01-03")!;
      expect(midpoint.valueUsd).toBeCloseTo((10 * 15000) / 1500, 6);

      // Endpoints should match the exact transaction prices, not 0.
      expect(points.find((p) => p.date === "2026-01-01")!.valueUsd).toBeCloseTo((10 * 10000) / 1500, 6);
      expect(points.find((p) => p.date === "2026-01-04")!.valueUsd).toBeGreaterThan(0);
    });

    it("still uses the real series when one is present, ignoring the fallback", () => {
      const buy = tx({ ticker: "META", tradeDate: "2026-01-02", arsPrice: 999999, qty: 2 }); // way off from META_HISTORY on purpose
      const points = computeBalanceHistory([buy], { META: META_HISTORY }, CCL_HISTORY);
      const point = points.find((p) => p.date === "2026-01-04")!;
      // If it had fallen back to the (wildly different) transaction price, this would be way off.
      expect(point.valueUsd).toBeCloseTo((2 * 42000) / 1520, 9);
    });

    it("flat-carries the last known price past the final transaction for a still-open position", () => {
      const buy = tx({ ticker: "NU", type: "BUY", tradeDate: "2026-01-02", arsPrice: 10000, cclRate: 1500, qty: 10 });
      const points = computeBalanceHistory([buy], {}, ccl);
      expect(points.find((p) => p.date === "2026-01-05")!.valueUsd).toBeCloseTo((10 * 10000) / 1500, 6);
    });
  });
});

describe("computeInvestedHistory", () => {
  const axis = [
    { date: "2026-01-01", valueUsd: 0 },
    { date: "2026-01-02", valueUsd: 0 },
    { date: "2026-01-05", valueUsd: 0 },
    { date: "2026-01-06", valueUsd: 0 },
  ];

  it("accumulates buys and nets out sells", () => {
    const flows = new Map([
      ["2026-01-01", 100],
      ["2026-01-05", 50],
      ["2026-01-06", -30],
    ]);
    expect(computeInvestedHistory(axis, flows)).toEqual([
      { date: "2026-01-01", investedUsd: 100 },
      { date: "2026-01-02", investedUsd: 100 },
      { date: "2026-01-05", investedUsd: 150 },
      { date: "2026-01-06", investedUsd: 120 },
    ]);
  });

  it("counts a flow that falls on a day the axis has no quote for", () => {
    // 2026-01-03 is a weekend: no price quote, but the money moved that day.
    const flows = new Map([["2026-01-03", 200]]);
    expect(computeInvestedHistory(axis, flows).map((p) => p.investedUsd)).toEqual([0, 0, 200, 200]);
  });

  it("is flat at zero with no flows", () => {
    expect(computeInvestedHistory(axis, new Map()).map((p) => p.investedUsd)).toEqual([0, 0, 0, 0]);
  });

  it("returns nothing for an empty axis", () => {
    expect(computeInvestedHistory([], new Map([["2026-01-01", 100]]))).toEqual([]);
  });
});
