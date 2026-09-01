import { getCached, type CacheSpec } from "./cache";
import { fetchWithTimeout } from "./fetch-with-timeout";

// Full per-ticker history is a few hundred KB and past days never change —
// cache it much longer than the live 30s TTL.
const TTL_SECONDS = 6 * 60 * 60;

const historyKey = (ticker: string) => `cedear:history:${ticker}`;

export type HistoricalBar = { date: string; close: number };

async function fetchCedearHistoryArs(ticker: string): Promise<HistoricalBar[]> {
  const res = await fetchWithTimeout(`https://data912.com/historical/cedears/${ticker}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`data912.com respondió ${res.status} al pedir el histórico de ${ticker}`);
  }
  const data = (await res.json()) as Array<{ date: string; c: number }> | { Error: string };
  // data912 returns HTTP 200 with `{ Error: "..." }` for tickers it doesn't track
  // historically (even if they have live quotes) — that's a known gap, not a fetch failure.
  if (!Array.isArray(data)) return [];
  return data.map((d) => ({ date: d.date, close: d.c })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function cedearHistorySpec(ticker: string): CacheSpec<HistoricalBar[]> {
  return { key: historyKey(ticker), ttlSeconds: TTL_SECONDS, fetcher: () => fetchCedearHistoryArs(ticker) };
}

/** Full daily ARS close-price history for a CEDEAR, sorted ascending by date. Empty if data912 doesn't track it. */
export async function getCedearPriceHistoryArs(ticker: string): Promise<HistoricalBar[]> {
  return getCached(historyKey(ticker), TTL_SECONDS, () => fetchCedearHistoryArs(ticker));
}
