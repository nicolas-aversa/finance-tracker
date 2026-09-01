import type { BalancePoint } from "./balance-history";
import { computeTransactionDerived } from "./transaction-math";
import type { DomainTransaction } from "./types";

export type IndexPoint = { date: string; index: number };

/**
 * Net external cash flow (USD) per date: buys add capital (+), sells remove it (−).
 * This is the money the investor moved in/out, which TWR must neutralize.
 */
export function netCashflowByDate(transactions: DomainTransaction[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    const { usdAmount } = computeTransactionDerived(tx);
    const signed = tx.type === "BUY" ? usdAmount : -usdAmount;
    map.set(tx.tradeDate, (map.get(tx.tradeDate) ?? 0) + signed);
  }
  return map;
}

/**
 * Time-weighted return index (starts at 100), chaining daily returns computed
 * with the daily-valuation method: r_t = (V_t − CF_t) / V_{t−1} − 1, where CF_t
 * is the net external cash flow on day t. This removes the effect of deposit/
 * withdrawal timing, so the result reflects how the *holdings* performed — the
 * only apples-to-apples basis for comparing against a market index.
 */
export function computePortfolioTwrSeries(
  balanceHistory: BalancePoint[],
  cashflowByDate: Map<string, number>
): IndexPoint[] {
  if (balanceHistory.length === 0) return [];

  const series: IndexPoint[] = [{ date: balanceHistory[0].date, index: 100 }];
  let index = 100;

  for (let i = 1; i < balanceHistory.length; i++) {
    const prev = balanceHistory[i - 1].valueUsd;
    const curr = balanceHistory[i].valueUsd;
    const cf = cashflowByDate.get(balanceHistory[i].date) ?? 0;

    // With no prior capital, a return isn't defined yet — the day's flow just
    // establishes the base. Carry the index flat until there's something invested.
    if (prev > 0) {
      const r = (curr - cf) / prev - 1;
      index *= 1 + r;
    }
    series.push({ date: balanceHistory[i].date, index });
  }

  return series;
}

/** Rebases a raw price/level series to start at 100 on/after `fromDate`. */
export function rebaseToIndex(series: { date: string; value: number }[], fromDate: string): IndexPoint[] {
  const from = series.find((p) => p.date >= fromDate && p.value > 0);
  if (!from) return [];
  return series
    .filter((p) => p.date >= from.date && p.value > 0)
    .map((p) => ({ date: p.date, index: (p.value / from.value) * 100 }));
}

export type BenchmarkPoint = { date: string; portfolio: number; benchmark: number | null };

/** Last-known value on/before `date` in an ascending `{date,value}` series. */
function valueAsOf(series: { date: string; value: number }[], date: string): number | null {
  let result: number | null = null;
  for (const p of series) {
    if (p.date <= date) result = p.value;
    else break;
  }
  return result;
}

/**
 * Aligns the portfolio TWR index with the benchmark on the portfolio's own date
 * axis. The benchmark is rebased to 100 at the portfolio's start date and carried
 * forward for days the benchmark didn't trade (BYMA vs NYSE calendars differ).
 */
export function buildBenchmarkComparison(
  portfolioTwr: IndexPoint[],
  benchmarkLevels: { date: string; value: number }[]
): BenchmarkPoint[] {
  if (portfolioTwr.length === 0) return [];
  const startDate = portfolioTwr[0].date;
  const base = valueAsOf(benchmarkLevels, startDate) ?? benchmarkLevels.find((p) => p.date >= startDate)?.value ?? null;

  return portfolioTwr.map((p) => {
    const level = base !== null ? valueAsOf(benchmarkLevels, p.date) : null;
    return {
      date: p.date,
      portfolio: p.index,
      benchmark: level !== null && base ? (level / base) * 100 : null,
    };
  });
}
