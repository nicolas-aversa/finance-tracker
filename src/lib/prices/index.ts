import { cclLiveSpec } from "./ccl-live";
import { cedearAllSpec, type CedearQuote } from "./cedear-price";
import { stockSpec } from "./stock-price";
import { getOverridesMap, type PriceOverride } from "./overrides";
import { cclHistorySeriesSpec, type RateSeriesEntry } from "./ccl-historical";
import { cedearHistorySpec, type HistoricalBar } from "./cedear-price-historical";
import { sp500Spec, type LevelPoint } from "./benchmark";
import { getManyCached, type CacheSpec } from "./cache";
import type { MarketSnapshot } from "./types";

export { getLiveCclRate } from "./ccl-live";
export { getHistoricalCclRate, getCclRateHistorySeries } from "./ccl-historical";
export { getCedearPriceHistoryArs, type HistoricalBar } from "./cedear-price-historical";
export { getAllCedearPricesArs } from "./cedear-price";
export { getUsStockPriceUsd } from "./stock-price";
export { getSp500History, type LevelPoint } from "./benchmark";
export type { MarketSnapshot } from "./types";

export type BalanceHistorySources = {
  cedearHistoryByTicker: Record<string, HistoricalBar[]>;
  cclHistory: RateSeriesEntry[];
  sp500History: LevelPoint[];
  warnings: string[];
};

export type DashboardData = {
  snapshot: MarketSnapshot;
  balanceSources: BalanceHistorySources;
};

async function safeOverrides(): Promise<Map<string, PriceOverride>> {
  try {
    return await getOverridesMap();
  } catch {
    return new Map();
  }
}

/** Builds the live-price snapshot from an already-resolved batched-cache value map. */
function buildSnapshot(
  values: Map<string, unknown>,
  uniqueTickers: string[],
  overrides: Map<string, PriceOverride>
): MarketSnapshot {
  const warnings: string[] = [];

  const cclRateLive = (values.get(cclLiveSpec().key) as number | undefined) ?? 0;
  if (!values.has(cclLiveSpec().key)) {
    warnings.push("No se pudo obtener la cotización CCL en vivo (dolarapi.com).");
  }

  const cedearQuotes = (values.get(cedearAllSpec().key) as Record<string, CedearQuote> | undefined) ?? {};
  if (!values.has(cedearAllSpec().key)) {
    warnings.push("No se pudieron obtener los precios de CEDEARs (data912.com).");
  }

  const cedearUsd: Record<string, number> = {};
  const dailyChangePct: Record<string, number> = {};
  const stockUsd: Record<string, number> = {};

  for (const ticker of uniqueTickers) {
    const override = overrides.get(ticker);
    const quote = cedearQuotes[ticker];

    if (quote && cclRateLive > 0) {
      cedearUsd[ticker] = quote.price / cclRateLive;
      dailyChangePct[ticker] = quote.pctChange;
    } else if (override?.manualUsdPrice != null) {
      cedearUsd[ticker] = override.manualUsdPrice;
    } else if (override?.manualArsPrice != null && cclRateLive > 0) {
      cedearUsd[ticker] = override.manualArsPrice / cclRateLive;
    } else {
      warnings.push(`No hay precio de CEDEAR para ${ticker} (ni en vivo ni manual).`);
    }

    const stock = values.get(stockSpec(ticker).key) as number | null | undefined;
    if (stock != null) {
      stockUsd[ticker] = stock;
    } else {
      warnings.push(`No se pudo obtener el precio de la acción real de ${ticker} (Yahoo Finance).`);
    }
  }

  return { cclRateLive, cedearUsd, dailyChangePct, stockUsd, warnings };
}

/**
 * Live-price snapshot only (used by the trade log). Resolves through ONE batched
 * cache read + one batched write + one overrides query — never the ~14 concurrent
 * queries that stall Supabase's transaction pooler.
 */
export async function getMarketSnapshot(tickers: string[]): Promise<MarketSnapshot> {
  const uniqueTickers = [...new Set(tickers)];
  const specs: CacheSpec<unknown>[] = [
    cclLiveSpec(),
    cedearAllSpec(),
    ...uniqueTickers.map((t) => stockSpec(t)),
  ];
  const [{ values }, overrides] = await Promise.all([getManyCached(specs), safeOverrides()]);
  return buildSnapshot(values, uniqueTickers, overrides);
}

/**
 * Everything the dashboard needs (live snapshot + balance-history sources),
 * resolved through ONE batched cache read and ONE batched write plus a single
 * overrides query. External HTTP fetches for cache misses run concurrently —
 * they don't touch the DB pool.
 */
export async function getDashboardData(tickers: string[]): Promise<DashboardData> {
  const uniqueTickers = [...new Set(tickers)];

  const specs: CacheSpec<unknown>[] = [
    cclLiveSpec(),
    cedearAllSpec(),
    cclHistorySeriesSpec(),
    sp500Spec(),
    ...uniqueTickers.map((t) => stockSpec(t)),
    ...uniqueTickers.map((t) => cedearHistorySpec(t)),
  ];

  const [{ values }, overrides] = await Promise.all([getManyCached(specs), safeOverrides()]);

  const snapshot = buildSnapshot(values, uniqueTickers, overrides);

  const balanceWarnings: string[] = [];
  const cclHistory = (values.get(cclHistorySeriesSpec().key) as RateSeriesEntry[] | undefined) ?? [];
  if (!values.has(cclHistorySeriesSpec().key)) {
    balanceWarnings.push("No se pudo obtener el histórico de CCL (argentinadatos.com).");
  }

  const sp500History = (values.get(sp500Spec().key) as LevelPoint[] | undefined) ?? [];

  const cedearHistoryByTicker: Record<string, HistoricalBar[]> = {};
  for (const ticker of uniqueTickers) {
    // Missing history falls back to the ticker's own transaction prices in
    // computeBalanceHistory, so no user-facing warning here.
    cedearHistoryByTicker[ticker] = (values.get(cedearHistorySpec(ticker).key) as HistoricalBar[] | undefined) ?? [];
  }

  return {
    snapshot,
    balanceSources: { cedearHistoryByTicker, cclHistory, sp500History, warnings: balanceWarnings },
  };
}
