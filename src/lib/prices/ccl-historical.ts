import { format, subDays } from "date-fns";
import { getCclRateHistory, setCclRateHistory } from "@/lib/db/cache-repo";
import { getCached, type CacheSpec } from "./cache";
import { fetchWithTimeout } from "./fetch-with-timeout";

const MAX_LOOKBACK_DAYS = 10;
const SERIES_TTL_SECONDS = 6 * 60 * 60;
const SERIES_KEY = "ccl:history:series";

export type RateSeriesEntry = { date: string; rate: number };

type ArgentinaDatosResponse = {
  casa: string;
  compra: number;
  venta: number;
  fecha: string;
};

async function fetchCclRateForExactDate(date: Date): Promise<number | undefined> {
  const path = format(date, "yyyy/MM/dd");
  const res = await fetchWithTimeout(
    `https://api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui/${path}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return undefined;
  if (!res.ok) {
    throw new Error(`argentinadatos.com respondió ${res.status} al pedir el CCL histórico`);
  }
  const data = (await res.json()) as ArgentinaDatosResponse;
  return data.venta;
}

/** Historical CCL rate for a given date (falls back to the nearest earlier trading day). */
export async function getHistoricalCclRate(isoDate: string): Promise<number> {
  const cached = await getCclRateHistory(isoDate);
  if (cached !== undefined) return cached;

  let cursor = new Date(`${isoDate}T00:00:00Z`);
  for (let i = 0; i <= MAX_LOOKBACK_DAYS; i++) {
    const rate = await fetchCclRateForExactDate(cursor);
    if (rate !== undefined) {
      await setCclRateHistory(isoDate, rate, "argentinadatos");
      return rate;
    }
    cursor = subDays(cursor, 1);
  }

  throw new Error(
    `No se encontró cotización CCL histórica para ${isoDate} ni los ${MAX_LOOKBACK_DAYS} días anteriores.`
  );
}

async function fetchCclRateSeries(): Promise<RateSeriesEntry[]> {
  const res = await fetchWithTimeout("https://api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui", {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`argentinadatos.com respondió ${res.status} al pedir la serie histórica de CCL`);
  }
  const data = (await res.json()) as ArgentinaDatosResponse[];
  return data.map((d) => ({ date: d.fecha, rate: d.venta })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function cclHistorySeriesSpec(): CacheSpec<RateSeriesEntry[]> {
  return { key: SERIES_KEY, ttlSeconds: SERIES_TTL_SECONDS, fetcher: fetchCclRateSeries };
}

/** Full CCL rate history in one call, sorted ascending by date — for building time series. */
export async function getCclRateHistorySeries(): Promise<RateSeriesEntry[]> {
  return getCached(SERIES_KEY, SERIES_TTL_SECONDS, fetchCclRateSeries);
}
