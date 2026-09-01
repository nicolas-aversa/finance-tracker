import { getCached, type CacheSpec } from "./cache";
import { fetchWithTimeout } from "./fetch-with-timeout";

const CEDEARS_URL = "https://data912.com/live/arg_cedears";
// v2: cached value shape changed from number to { price, pctChange }.
const CEDEARS_KEY = "cedear:all:v2";
const TTL_SECONDS = 30;

type Data912Cedear = {
  symbol: string;
  px_bid?: number;
  px_ask?: number;
  c?: number;
  pct_change?: number;
};

export type CedearQuote = { price: number; pctChange: number };

async function fetchAllCedearQuotes(): Promise<Record<string, CedearQuote>> {
  const res = await fetchWithTimeout(CEDEARS_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`data912.com respondió ${res.status} al pedir precios de CEDEARs`);
  }
  const data = (await res.json()) as Data912Cedear[];
  const quotes: Record<string, CedearQuote> = {};
  for (const item of data) {
    if (typeof item.c === "number") {
      // data912's pct_change is in percent units (e.g. -1.36 = -1.36%).
      quotes[item.symbol] = { price: item.c, pctChange: (item.pct_change ?? 0) / 100 };
    }
  }
  return quotes;
}

export function cedearAllSpec(): CacheSpec<Record<string, CedearQuote>> {
  return { key: CEDEARS_KEY, ttlSeconds: TTL_SECONDS, fetcher: fetchAllCedearQuotes };
}

/** Current ARS price + daily change of every CEDEAR on BYMA, keyed by ticker symbol. */
export async function getAllCedearQuotes(): Promise<Record<string, CedearQuote>> {
  return getCached(CEDEARS_KEY, TTL_SECONDS, fetchAllCedearQuotes);
}

/** Current ARS price of every CEDEAR on BYMA, keyed by ticker symbol. */
export async function getAllCedearPricesArs(): Promise<Record<string, number>> {
  const quotes = await getAllCedearQuotes();
  return Object.fromEntries(Object.entries(quotes).map(([sym, q]) => [sym, q.price]));
}
