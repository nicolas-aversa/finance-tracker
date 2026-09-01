import { getLiveCclRate } from "./index";

/** CCL fallback so USD consumos still convert to a ballpark ARS if the feed is down. */
export const CCL_FALLBACK = 1000;

/** Live CCL rate, degrading to a fixed rate rather than failing the whole page. */
export async function safeCcl(): Promise<number> {
  try {
    return await getLiveCclRate();
  } catch {
    return CCL_FALLBACK;
  }
}
