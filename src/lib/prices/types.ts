export type MarketSnapshot = {
  /** Live CCL ("contado con liquidación") ARS-per-USD rate, `venta` side. */
  cclRateLive: number;
  /** Current CEDEAR price in USD, per ticker (ARS price / cclRateLive), with overrides applied. */
  cedearUsd: Record<string, number>;
  /** Today's price change fraction per ticker (e.g. 0.012 = +1.2%), from data912. */
  dailyChangePct: Record<string, number>;
  /** Current real US stock price in USD, per ticker. Missing when the fetch failed. */
  stockUsd: Record<string, number>;
  /** Human-readable warnings about partial failures, shown in the UI. */
  warnings: string[];
};
