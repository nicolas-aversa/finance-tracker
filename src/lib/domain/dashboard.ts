import type { MarketSnapshot } from "@/lib/prices/types";
import { computeTransactionDerived } from "./transaction-math";
import { computePosition } from "./position";
import { computeXirr, type CashFlow } from "./xirr";
import type { DomainTransaction } from "./types";

export type TickerRow = {
  ticker: string;
  qty: number;
  avgCostUsd: number | null;
  currentPriceUsd: number | null;
  stockUsd: number | null;
  marketValueUsd: number | null;
  costBasisUsd: number;
  /** Unrealized mark-to-market P&L. Same sign as `unrealizedRoi`, always. */
  unrealizedPnlUsd: number | null;
  /** Unrealized return: currentPrice/avgCost − 1. Same sign as `unrealizedPnlUsd`, always. */
  unrealizedRoi: number | null;
  realizedPnlUsd: number;
  dailyChangePct: number | null;
  dailyChangeUsd: number | null;
  /** Share of total open-position market value (0–1). Filled by the aggregator. */
  weightPct: number | null;
};

export type PortfolioTotals = {
  marketValueUsd: number;
  costBasisUsd: number;
  unrealizedPnlUsd: number;
  unrealizedRoi: number | null;
  realizedPnlUsd: number;
  totalPnlUsd: number;
  dailyChangeUsd: number;
  dailyChangePct: number | null;
  totalArsNetInvested: number;
  /** Money-weighted annualized return (XIRR), or null if it can't be computed. */
  xirr: number | null;
};

/** One Dashboard row per ticker, computed from the moving-average position engine. */
export function computeTickerRow(
  ticker: string,
  transactions: DomainTransaction[],
  snapshot: MarketSnapshot
): TickerRow {
  const pos = computePosition(transactions, ticker);
  const currentPriceUsd = snapshot.cedearUsd[ticker] ?? null;
  const stockUsd = snapshot.stockUsd[ticker] ?? null;
  const dailyChangePctRaw = snapshot.dailyChangePct[ticker];

  const marketValueUsd = currentPriceUsd !== null ? pos.qty * currentPriceUsd : null;

  const unrealizedPnlUsd =
    marketValueUsd !== null && pos.avgCostUsd !== null ? marketValueUsd - pos.costBasisUsd : null;
  const unrealizedRoi =
    currentPriceUsd !== null && pos.avgCostUsd !== null && pos.avgCostUsd !== 0
      ? currentPriceUsd / pos.avgCostUsd - 1
      : null;

  // Today's USD change on the position: value − value/(1+p).
  const dailyChangePct = pos.qty > 0 && dailyChangePctRaw !== undefined ? dailyChangePctRaw : null;
  const dailyChangeUsd =
    marketValueUsd !== null && dailyChangePct !== null
      ? marketValueUsd - marketValueUsd / (1 + dailyChangePct)
      : null;

  return {
    ticker,
    qty: pos.qty,
    avgCostUsd: pos.avgCostUsd,
    currentPriceUsd,
    stockUsd,
    marketValueUsd,
    costBasisUsd: pos.costBasisUsd,
    unrealizedPnlUsd,
    unrealizedRoi,
    realizedPnlUsd: pos.realizedPnlUsd,
    dailyChangePct,
    dailyChangeUsd,
    weightPct: null,
  };
}

/** One row per distinct ticker in the history, with portfolio weights filled in. */
export function computeAllTickerRows(
  transactions: DomainTransaction[],
  snapshot: MarketSnapshot
): TickerRow[] {
  const tickers = [...new Set(transactions.map((t) => t.ticker))].sort();
  const rows = tickers.map((ticker) => computeTickerRow(ticker, transactions, snapshot));

  const totalMarketValue = rows.reduce((sum, r) => sum + (r.marketValueUsd ?? 0), 0);
  if (totalMarketValue > 0) {
    for (const row of rows) {
      if (row.marketValueUsd !== null && row.qty > 0) {
        row.weightPct = row.marketValueUsd / totalMarketValue;
      }
    }
  }
  return rows;
}

/** Tickers with an open position (net qty > 0), sorted — what the user "currently has". */
export function computeHeldTickers(transactions: DomainTransaction[]): string[] {
  const netQty = new Map<string, number>();
  for (const t of transactions) {
    netQty.set(t.ticker, (netQty.get(t.ticker) ?? 0) + (t.type === "BUY" ? t.qty : -t.qty));
  }
  return [...netQty.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([ticker]) => ticker)
    .sort();
}

export function computePortfolioTotals(
  transactions: DomainTransaction[],
  tickerRows: TickerRow[],
  asOfDate: string
): PortfolioTotals {
  const totalArsNetInvested = transactions.reduce((sum, t) => {
    const arsAmount = computeTransactionDerived(t).arsAmount;
    return sum + (t.type === "BUY" ? arsAmount : -arsAmount);
  }, 0);

  const marketValueUsd = tickerRows.reduce((sum, r) => sum + (r.marketValueUsd ?? 0), 0);
  const costBasisUsd = tickerRows.reduce((sum, r) => sum + r.costBasisUsd, 0);
  const unrealizedPnlUsd = marketValueUsd - costBasisUsd;
  const unrealizedRoi = costBasisUsd !== 0 ? marketValueUsd / costBasisUsd - 1 : null;
  const realizedPnlUsd = tickerRows.reduce((sum, r) => sum + r.realizedPnlUsd, 0);
  const totalPnlUsd = unrealizedPnlUsd + realizedPnlUsd;
  const dailyChangeUsd = tickerRows.reduce((sum, r) => sum + (r.dailyChangeUsd ?? 0), 0);
  const prevValue = marketValueUsd - dailyChangeUsd;
  const dailyChangePct = prevValue > 0 ? dailyChangeUsd / prevValue : null;

  // XIRR: each transaction is a dated cash flow (buy out, sell in), plus the
  // current market value as a final inflow today.
  const cashflows: CashFlow[] = transactions.map((t) => {
    const { usdAmount } = computeTransactionDerived(t);
    return { date: t.tradeDate, amount: t.type === "BUY" ? -usdAmount : usdAmount };
  });
  if (marketValueUsd > 0) cashflows.push({ date: asOfDate, amount: marketValueUsd });
  const xirr = computeXirr(cashflows);

  return {
    marketValueUsd,
    costBasisUsd,
    unrealizedPnlUsd,
    unrealizedRoi,
    realizedPnlUsd,
    totalPnlUsd,
    dailyChangeUsd,
    dailyChangePct,
    totalArsNetInvested,
    xirr,
  };
}
