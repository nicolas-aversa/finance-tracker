import { computeTransactionDerived } from "./transaction-math";
import type { DomainTransaction, TxType } from "./types";

export type TradeSortKey = "fecha" | "monto";
export type SortDir = "asc" | "desc";

const SORT_KEYS: TradeSortKey[] = ["fecha", "monto"];
const SORT_DIRS: SortDir[] = ["asc", "desc"];
const TX_TYPES: TxType[] = ["BUY", "SELL"];

/** Every filter the trade log understands. All of it lives in the URL. */
export type TradeFilters = {
  tickers: string[];
  types: TxType[];
  sort: TradeSortKey;
  dir: SortDir;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_TRADE_FILTERS: TradeFilters = {
  tickers: [],
  types: [],
  sort: "fecha",
  dir: "desc",
};

function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean);
}

function toSingle(value: string | string[] | undefined): string {
  const [first] = toList(value);
  return first ?? "";
}

/**
 * Reads filters out of the URL. Never throws: anything unrecognized falls back
 * to its default, so a stale or hand-edited link still renders a valid page.
 * `validTickers` scopes the ticker filter to what actually exists in the data.
 */
export function parseTradeFilters(raw: RawSearchParams, validTickers: string[]): TradeFilters {
  const known = new Set(validTickers);
  const tickers = [...new Set(toList(raw.ticker))].map((t) => t.toUpperCase()).filter((t) => known.has(t));

  const types = [...new Set(toList(raw.tipo))]
    .map((t) => t.toUpperCase())
    .filter((t): t is TxType => (TX_TYPES as string[]).includes(t));

  const sortRaw = toSingle(raw.orden) as TradeSortKey;
  const dirRaw = toSingle(raw.dir) as SortDir;

  return {
    tickers,
    types,
    sort: SORT_KEYS.includes(sortRaw) ? sortRaw : DEFAULT_TRADE_FILTERS.sort,
    dir: SORT_DIRS.includes(dirRaw) ? dirRaw : DEFAULT_TRADE_FILTERS.dir,
  };
}

/** Serializes filters back to a query string, omitting everything at its default. */
export function tradeFiltersToSearchParams(f: TradeFilters): URLSearchParams {
  const p = new URLSearchParams();
  for (const t of f.tickers) p.append("ticker", t);
  for (const t of f.types) p.append("tipo", t);
  if (f.sort !== DEFAULT_TRADE_FILTERS.sort) p.set("orden", f.sort);
  if (f.dir !== DEFAULT_TRADE_FILTERS.dir) p.set("dir", f.dir);
  return p;
}

/** Builds a link that keeps every current filter and changes only `patch`. */
export function buildTradeHref(
  basePath: string,
  f: TradeFilters,
  patch: Partial<TradeFilters> = {}
): string {
  const qs = tradeFiltersToSearchParams({ ...f, ...patch }).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export type TradeChip = { key: string; label: string; clear: Partial<TradeFilters> };

/** One removable chip per active filter. */
export function activeTradeChips(f: TradeFilters): TradeChip[] {
  const chips: TradeChip[] = [];
  for (const t of f.tickers) {
    chips.push({ key: `tk:${t}`, label: t, clear: { tickers: f.tickers.filter((x) => x !== t) } });
  }
  for (const t of f.types) {
    chips.push({
      key: `tp:${t}`,
      label: t === "BUY" ? "Compras" : "Ventas",
      clear: { types: f.types.filter((x) => x !== t) },
    });
  }
  return chips;
}

export function activeTradeFilterCount(f: TradeFilters): number {
  return activeTradeChips(f).length;
}

/** Clears the narrowing filters but keeps the sort. */
export function clearedTradeFilters(f: TradeFilters): TradeFilters {
  return { ...DEFAULT_TRADE_FILTERS, sort: f.sort, dir: f.dir };
}

export function filterTransactions(txs: DomainTransaction[], f: TradeFilters): DomainTransaction[] {
  const tickers = f.tickers.length ? new Set(f.tickers) : null;
  const types = f.types.length ? new Set<string>(f.types) : null;

  return txs.filter((t) => {
    if (tickers && !tickers.has(t.ticker)) return false;
    if (types && !types.has(t.type)) return false;
    return true;
  });
}

/**
 * Sorts a copy. Ties break on date then creation time, the same chronology the
 * position engine uses, so the order is always deterministic.
 */
export function sortTransactions(
  list: DomainTransaction[],
  sort: TradeSortKey,
  dir: SortDir
): DomainTransaction[] {
  const sign = dir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "fecha":
        cmp = a.tradeDate < b.tradeDate ? -1 : a.tradeDate > b.tradeDate ? 1 : 0;
        break;
      case "monto":
        cmp = computeTransactionDerived(a).usdAmount - computeTransactionDerived(b).usdAmount;
        break;
    }
    if (cmp !== 0) return cmp * sign;
    if (a.tradeDate !== b.tradeDate) return a.tradeDate < b.tradeDate ? 1 : -1; // newest first
    return b.createdAtMs - a.createdAtMs;
  });
}

export type TradeTotals = {
  count: number;
  /** What went out on buys, minus what came back on sells. */
  netUsd: number;
  boughtUsd: number;
  soldUsd: number;
};

/** Totals for whatever the filters left, so the header reflects the filter. */
export function tradeTotals(list: DomainTransaction[]): TradeTotals {
  let boughtUsd = 0;
  let soldUsd = 0;
  for (const t of list) {
    const { usdAmount } = computeTransactionDerived(t);
    if (t.type === "BUY") boughtUsd += usdAmount;
    else soldUsd += usdAmount;
  }
  return { count: list.length, boughtUsd, soldUsd, netUsd: boughtUsd - soldUsd };
}
