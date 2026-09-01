import { describe, expect, it } from "vitest";
import { computeAllTickerRows, computeHeldTickers, computePortfolioTotals, computeTickerRow } from "../dashboard";
import type { DomainTransaction } from "../types";
import type { MarketSnapshot } from "@/lib/prices/types";

let seq = 0;
function tx(overrides: Partial<DomainTransaction>): DomainTransaction {
  return {
    id: `id-${seq++}`,
    ticker: "MELI",
    type: "BUY",
    tradeDate: "2026-01-01",
    cclRate: 1000,
    arsPrice: 15000, // usdPrice = 15
    qty: 4,
    createdAtMs: seq,
    ...overrides,
  };
}

function snap(overrides: Partial<MarketSnapshot>): MarketSnapshot {
  return { cclRateLive: 1000, cedearUsd: {}, dailyChangePct: {}, stockUsd: {}, warnings: [], ...overrides };
}

describe("computeTickerRow — profit and ROI always share sign (the reported bug)", () => {
  const transactions = [
    tx({ ticker: "MELI", type: "BUY", cclRate: 1000, arsPrice: 15000, qty: 4 }), // $15
    tx({ ticker: "MELI", type: "BUY", cclRate: 1000, arsPrice: 17000, qty: 4 }), // $17
    tx({ ticker: "MELI", type: "SELL", cclRate: 1000, arsPrice: 25000, qty: 4 }), // realized gain
  ];

  it("holds across a range of current prices, including where the old code disagreed", () => {
    // avg cost after buy,buy,sell = (4·15 + 4·17)/8 = 16, qty = 4.
    // The realized sell was profitable, so the OLD total-profit could be positive
    // while the price sits below $16 (old ROI negative). Now both are unrealized-based.
    for (const price of [8, 12, 16, 20, 30]) {
      const row = computeTickerRow("MELI", transactions, snap({ cedearUsd: { MELI: price } }));
      expect(Math.sign(row.unrealizedPnlUsd ?? 0)).toBe(Math.sign(row.unrealizedRoi ?? 0));
    }
  });

  it("unrealized pnl equals qty·(price − avgCost) and roi equals price/avgCost − 1", () => {
    const row = computeTickerRow("MELI", transactions, snap({ cedearUsd: { MELI: 20 } }));
    expect(row.avgCostUsd).toBeCloseTo(16, 9);
    expect(row.qty).toBe(4);
    expect(row.unrealizedPnlUsd).toBeCloseTo(4 * (20 - 16), 9);
    expect(row.unrealizedRoi).toBeCloseTo(20 / 16 - 1, 9);
    expect(row.marketValueUsd).toBeCloseTo(80, 9);
  });
});

describe("computeTickerRow — daily change", () => {
  it("computes today's USD change from the pct and market value", () => {
    const transactions = [tx({ ticker: "META", type: "BUY", cclRate: 1000, arsPrice: 10000, qty: 2 })];
    const row = computeTickerRow(
      "META",
      transactions,
      snap({ cedearUsd: { META: 11 }, dailyChangePct: { META: 0.1 } })
    );
    // value 22, +10% today -> yesterday value 20, change +2.
    expect(row.dailyChangeUsd).toBeCloseTo(22 - 22 / 1.1, 9);
    expect(row.dailyChangeUsd).toBeCloseTo(2, 6);
  });
});

describe("computeAllTickerRows — weights", () => {
  it("weights open positions by market value share", () => {
    const transactions = [
      tx({ ticker: "META", type: "BUY", cclRate: 1000, arsPrice: 10000, qty: 3 }),
      tx({ ticker: "MELI", type: "BUY", cclRate: 1000, arsPrice: 10000, qty: 1 }),
    ];
    const rows = computeAllTickerRows(transactions, snap({ cedearUsd: { META: 30, MELI: 10 } }));
    const meta = rows.find((r) => r.ticker === "META")!;
    const meli = rows.find((r) => r.ticker === "MELI")!;
    // META value 90, MELI value 10 -> weights 0.9 / 0.1
    expect(meta.weightPct).toBeCloseTo(0.9, 9);
    expect(meli.weightPct).toBeCloseTo(0.1, 9);
  });
});

describe("computeHeldTickers", () => {
  it("returns only tickers with an open position (net qty > 0), sorted", () => {
    const transactions: DomainTransaction[] = [
      tx({ ticker: "META", type: "BUY", qty: 3 }),
      tx({ ticker: "MELI", type: "BUY", qty: 5 }),
      tx({ ticker: "AMZN", type: "BUY", qty: 4 }),
      tx({ ticker: "AMZN", type: "SELL", qty: 4 }),
    ];
    expect(computeHeldTickers(transactions)).toEqual(["MELI", "META"]);
  });
});

describe("computePortfolioTotals", () => {
  it("separates realized (all tickers) from unrealized (open), and total = sum", () => {
    const transactions = [
      // MELI: open, unrealized gain
      tx({ ticker: "MELI", type: "BUY", cclRate: 1000, arsPrice: 10000, qty: 2 }), // $10, cost 20
      // AMZN: closed with realized gain
      tx({ ticker: "AMZN", type: "BUY", cclRate: 1000, arsPrice: 10000, qty: 5 }), // $10
      tx({ ticker: "AMZN", type: "SELL", cclRate: 1000, arsPrice: 15000, qty: 5 }), // $15 -> realized +25
    ];
    const snapshot = snap({ cedearUsd: { MELI: 12, AMZN: 12 } });
    const rows = computeAllTickerRows(transactions, snapshot);
    const totals = computePortfolioTotals(transactions, rows, "2026-06-01");

    expect(totals.marketValueUsd).toBeCloseTo(2 * 12, 9); // only MELI held
    expect(totals.unrealizedPnlUsd).toBeCloseTo(2 * (12 - 10), 9); // +4
    expect(totals.realizedPnlUsd).toBeCloseTo(5 * (15 - 10), 9); // +25 from AMZN
    expect(totals.totalPnlUsd).toBeCloseTo(4 + 25, 9);
  });

  it("computes a positive XIRR for a profitable holding", () => {
    const transactions = [tx({ ticker: "MELI", type: "BUY", tradeDate: "2025-06-01", cclRate: 1000, arsPrice: 10000, qty: 10 })];
    const snapshot = snap({ cedearUsd: { MELI: 20 } }); // doubled
    const rows = computeAllTickerRows(transactions, snapshot);
    const totals = computePortfolioTotals(transactions, rows, "2026-06-01"); // ~1 year later
    expect(totals.xirr).not.toBeNull();
    expect(totals.xirr!).toBeGreaterThan(0.8); // ~doubling in a year ≈ +100%
  });
});
