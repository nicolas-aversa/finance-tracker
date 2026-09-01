import { getCached, type CacheSpec } from "./cache";
import { fetchWithTimeout } from "./fetch-with-timeout";

const TTL_SECONDS = 30;
// Yahoo's unofficial chart endpoint 429s without a browser-like User-Agent.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const stockKey = (ticker: string) => `stock:${ticker}`;

type YahooChartResponse = {
  chart: {
    result: Array<{ meta: { regularMarketPrice: number } }> | null;
  };
};

async function fetchUsStockPriceUsd(ticker: string): Promise<number | null> {
  const res = await fetchWithTimeout(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
    cache: "no-store",
    headers: { "User-Agent": BROWSER_USER_AGENT },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as YahooChartResponse;
  return data.chart.result?.[0]?.meta.regularMarketPrice ?? null;
}

export function stockSpec(ticker: string): CacheSpec<number | null> {
  return { key: stockKey(ticker), ttlSeconds: TTL_SECONDS, fetcher: () => fetchUsStockPriceUsd(ticker) };
}

/** Current real US stock price in USD, or null if unavailable for this ticker. */
export async function getUsStockPriceUsd(ticker: string): Promise<number | null> {
  return getCached(stockKey(ticker), TTL_SECONDS, () => fetchUsStockPriceUsd(ticker));
}
