import { getCached, type CacheSpec } from "./cache";
import { fetchWithTimeout } from "./fetch-with-timeout";

const BENCHMARK_KEY = "benchmark:sp500";
const TTL_SECONDS = 6 * 60 * 60;
// Yahoo's chart endpoint 429s without a browser-like User-Agent.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
// 2y comfortably covers any realistic CEDEAR holding period in this app.
const SP500_URL = "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=2y&interval=1d";

export type LevelPoint = { date: string; value: number };

type YahooChart = {
  chart: {
    result: Array<{
      timestamp?: number[];
      indicators: { quote: Array<{ close?: (number | null)[] }> };
    }> | null;
  };
};

async function fetchSp500History(): Promise<LevelPoint[]> {
  const res = await fetchWithTimeout(SP500_URL, {
    cache: "no-store",
    headers: { "User-Agent": BROWSER_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Yahoo respondió ${res.status} al pedir el histórico del S&P 500`);

  const data = (await res.json()) as YahooChart;
  const result = data.chart.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators.quote[0]?.close ?? [];

  const points: LevelPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (typeof close === "number") {
      points.push({ date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10), value: close });
    }
  }
  return points;
}

export function sp500Spec(): CacheSpec<LevelPoint[]> {
  return { key: BENCHMARK_KEY, ttlSeconds: TTL_SECONDS, fetcher: fetchSp500History };
}

/** Daily S&P 500 (^GSPC) closing levels, sorted ascending by date. */
export async function getSp500History(): Promise<LevelPoint[]> {
  return getCached(BENCHMARK_KEY, TTL_SECONDS, fetchSp500History);
}
