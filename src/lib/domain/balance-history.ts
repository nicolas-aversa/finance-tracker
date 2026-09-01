import type { DomainTransaction } from "./types";

export type BalancePoint = { date: string; valueUsd: number };
export type PriceSeriesPoint = { date: string; close: number };
export type RateSeriesPoint = { date: string; rate: number };

function findAsOf<T>(series: T[], targetDate: string, dateOf: (item: T) => string): T | undefined {
  let lo = 0;
  let hi = series.length - 1;
  let result: T | undefined;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dateOf(series[mid]) <= targetDate) {
      result = series[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function qtyAsOf(transactions: DomainTransaction[], ticker: string, date: string): number {
  return transactions
    .filter((t) => t.ticker === ticker && t.tradeDate <= date)
    .reduce((sum, t) => sum + (t.type === "BUY" ? t.qty : -t.qty), 0);
}

/**
 * A ticker's own recorded transaction prices, used as a fallback price series
 * when no real historical series is available (e.g. the data source doesn't
 * track this ticker at all — these are real prices the user actually paid/got,
 * just sparse rather than daily).
 */
function transactionPriceAnchors(transactions: DomainTransaction[], ticker: string): PriceSeriesPoint[] {
  return transactions
    .filter((t) => t.ticker === ticker)
    .map((t) => ({ date: t.tradeDate, close: t.arsPrice }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Linearly interpolates between the two anchors bracketing `date`; flat carry past either end. */
function interpolateAsOf(series: PriceSeriesPoint[], date: string): number | null {
  let before: PriceSeriesPoint | undefined;
  let after: PriceSeriesPoint | undefined;
  for (const p of series) {
    if (p.date <= date) before = p;
    if (p.date >= date) {
      after = p;
      break;
    }
  }
  if (before && after && before.date !== after.date) {
    const span = Date.parse(after.date) - Date.parse(before.date);
    const t = (Date.parse(date) - Date.parse(before.date)) / span;
    return before.close + (after.close - before.close) * t;
  }
  return (before ?? after)?.close ?? null;
}

/**
 * Reconstructs total portfolio value (USD) on every date the CCL series has a
 * quote, from the first transaction's date to the most recent available date.
 * For a ticker with no real historical series (empty array — e.g. the source
 * doesn't track it), falls back to interpolating between that ticker's own
 * recorded transaction prices rather than silently contributing 0.
 */
export function computeBalanceHistory(
  transactions: DomainTransaction[],
  cedearHistoryByTicker: Record<string, PriceSeriesPoint[]>,
  cclHistory: RateSeriesPoint[]
): BalancePoint[] {
  if (transactions.length === 0 || cclHistory.length === 0) return [];

  const firstTradeDate = transactions.reduce(
    (min, t) => (t.tradeDate < min ? t.tradeDate : min),
    transactions[0].tradeDate
  );
  const tickers = [...new Set(transactions.map((t) => t.ticker))];
  const axisDates = cclHistory.map((c) => c.date).filter((d) => d >= firstTradeDate);

  const priceAsOf = new Map<string, (date: string) => number | null>();
  for (const ticker of tickers) {
    const real = cedearHistoryByTicker[ticker] ?? [];
    if (real.length > 0) {
      priceAsOf.set(ticker, (date) => findAsOf(real, date, (p) => p.date)?.close ?? null);
    } else {
      const anchors = transactionPriceAnchors(transactions, ticker);
      priceAsOf.set(ticker, (date) => interpolateAsOf(anchors, date));
    }
  }

  return axisDates.map((date) => {
    const cclEntry = findAsOf(cclHistory, date, (c) => c.date);
    const cclRate = cclEntry?.rate ?? 0;

    let valueUsd = 0;
    if (cclRate > 0) {
      for (const ticker of tickers) {
        const qty = qtyAsOf(transactions, ticker, date);
        if (qty === 0) continue;
        const price = priceAsOf.get(ticker)?.(date) ?? null;
        if (price === null) continue;
        valueUsd += (qty * price) / cclRate;
      }
    }

    return { date, valueUsd };
  });
}
