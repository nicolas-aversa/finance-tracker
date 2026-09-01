import { computeBuyRowProfitRoi, computeTransactionDerived, type ProfitRoi } from "./transaction-math";
import { byChronology, type DomainTransaction } from "./types";

export type Position = {
  ticker: string;
  /** Current open quantity (buys − sells). */
  qty: number;
  /** Moving weighted-average USD cost per unit of the shares still held. Null if never bought. */
  avgCostUsd: number | null;
  /** USD cost basis of the shares still held (qty · avgCost). */
  costBasisUsd: number;
  /** Realized P&L in USD, locked in from sells, priced against the moving average at sale time. */
  realizedPnlUsd: number;
  /** Total units ever bought (for weighting/aggregations). */
  totalBoughtQty: number;
};

/**
 * Computes a ticker's position with a MOVING weighted-average cost, processing
 * transactions in chronological order:
 *   BUY  → avgCost = (qty·avgCost + buyQty·buyPrice) / (qty + buyQty); qty += buyQty
 *   SELL → realized += sellQty·(sellPrice − avgCost); qty −= sellQty; avgCost unchanged
 *
 * This is the "precio promedio de compra" (PPP) Argentine brokers use, and unlike
 * a simple average of all buys it stays correct when buys happen after a sell.
 */
export function computePosition(transactions: DomainTransaction[], ticker: string): Position {
  const rows = transactions.filter((t) => t.ticker === ticker).sort(byChronology);

  let qty = 0;
  let avgCostUsd = 0;
  let realizedPnlUsd = 0;
  let totalBoughtQty = 0;
  let everBought = false;

  for (const tx of rows) {
    const { usdPrice } = computeTransactionDerived(tx);
    if (tx.type === "BUY") {
      const newQty = qty + tx.qty;
      avgCostUsd = newQty > 0 ? (qty * avgCostUsd + tx.qty * usdPrice) / newQty : 0;
      qty = newQty;
      totalBoughtQty += tx.qty;
      everBought = true;
    } else {
      // Sell against the running average. Clamp at 0 so an over-sell (bad data)
      // doesn't produce a negative position.
      const soldQty = Math.min(tx.qty, qty);
      realizedPnlUsd += soldQty * (usdPrice - avgCostUsd);
      qty -= soldQty;
      if (qty === 0) avgCostUsd = 0;
    }
  }

  return {
    ticker,
    qty,
    avgCostUsd: everBought ? avgCostUsd || null : null,
    costBasisUsd: qty * avgCostUsd,
    realizedPnlUsd,
    totalBoughtQty,
  };
}

/** One Position per distinct ticker in the history, sorted by ticker. */
export function computeAllPositions(transactions: DomainTransaction[]): Position[] {
  const tickers = [...new Set(transactions.map((t) => t.ticker))].sort();
  return tickers.map((ticker) => computePosition(transactions, ticker));
}

/**
 * Realized P&L for every SELL transaction, keyed by transaction id, priced
 * against the moving average at the moment of that sale (one chronological pass
 * per ticker). This is the consistent, correct basis for the Trade Log's
 * per-row realized figures.
 */
export function computeRealizedBySellId(transactions: DomainTransaction[]): Map<string, ProfitRoi> {
  const result = new Map<string, ProfitRoi>();
  const tickers = [...new Set(transactions.map((t) => t.ticker))];

  for (const ticker of tickers) {
    const rows = transactions.filter((t) => t.ticker === ticker).sort(byChronology);
    let qty = 0;
    let avgCostUsd = 0;

    for (const tx of rows) {
      const { usdPrice } = computeTransactionDerived(tx);
      if (tx.type === "BUY") {
        const newQty = qty + tx.qty;
        avgCostUsd = newQty > 0 ? (qty * avgCostUsd + tx.qty * usdPrice) / newQty : 0;
        qty = newQty;
      } else {
        const profit = tx.qty * (usdPrice - avgCostUsd);
        const roi = avgCostUsd > 0 ? usdPrice / avgCostUsd - 1 : null;
        result.set(tx.id, { profit, roi });
        qty = Math.max(0, qty - tx.qty);
        if (qty === 0) avgCostUsd = 0;
      }
    }
  }

  return result;
}

/**
 * Per-row Trade Log metric: unrealized mark-to-market for a BUY (vs. current
 * price), realized for a SELL (from `computeRealizedBySellId`).
 */
export function computeTransactionRowMetrics(
  tx: DomainTransaction,
  currentCedearUsd: number | null,
  realizedBySellId: Map<string, ProfitRoi>
): ProfitRoi | null {
  if (tx.type === "BUY") {
    return currentCedearUsd === null ? null : computeBuyRowProfitRoi(tx, currentCedearUsd);
  }
  return realizedBySellId.get(tx.id) ?? null;
}
