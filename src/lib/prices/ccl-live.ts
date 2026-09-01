import { getCached, type CacheSpec } from "./cache";
import { fetchWithTimeout } from "./fetch-with-timeout";

const CCL_LIVE_URL = "https://dolarapi.com/v1/dolares/contadoconliqui";
const CCL_LIVE_KEY = "ccl:live";
const TTL_SECONDS = 30;

type DolarApiResponse = {
  compra: number;
  venta: number;
  fechaActualizacion: string;
};

async function fetchLiveCclRate(): Promise<number> {
  const res = await fetchWithTimeout(CCL_LIVE_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`dolarapi.com respondió ${res.status} al pedir el CCL en vivo`);
  }
  const data = (await res.json()) as DolarApiResponse;
  return data.venta;
}

export function cclLiveSpec(): CacheSpec<number> {
  return { key: CCL_LIVE_KEY, ttlSeconds: TTL_SECONDS, fetcher: fetchLiveCclRate };
}

export async function getLiveCclRate(): Promise<number> {
  return getCached(CCL_LIVE_KEY, TTL_SECONDS, fetchLiveCclRate);
}
