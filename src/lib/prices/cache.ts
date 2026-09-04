import { getLiveCache, getManyLiveCache, setLiveCache, setManyLiveCache } from "@/lib/db/cache-repo";

export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getLiveCache<T>(key, ttlSeconds);
  if (cached !== undefined) return cached;

  const fresh = await fetcher();
  await setLiveCache(key, fresh);
  return fresh;
}

export type CacheSpec<T> = { key: string; ttlSeconds: number; fetcher: () => Promise<T> };

export type BatchedCacheResult = {
  /** key -> resolved value (from cache if fresh, otherwise freshly fetched). Missing if the fetch failed. */
  values: Map<string, unknown>;
  /** key -> error, for specs whose fetcher rejected (and had no fresh cache). */
  errors: Map<string, unknown>;
};

/**
 * Resolves many cache specs with exactly TWO database round-trips total — one
 * batched read up front and one batched write at the end — regardless of how
 * many keys are involved. Only the external HTTP fetches for cache misses run
 * concurrently (those don't touch the DB pool). This is what keeps the dashboard
 * from fanning out ~14 concurrent queries onto Supabase's transaction pooler,
 * which hangs under that concurrency.
 */
export async function getManyCached(specs: CacheSpec<unknown>[]): Promise<BatchedCacheResult> {
  const values = new Map<string, unknown>();
  const errors = new Map<string, unknown>();

  const cachedRows = await getManyLiveCache(specs.map((s) => s.key));
  const now = Date.now();

  const misses: CacheSpec<unknown>[] = [];
  for (const spec of specs) {
    const row = cachedRows.get(spec.key);
    if (row && (now - row.fetchedAt.getTime()) / 1000 <= spec.ttlSeconds) {
      values.set(spec.key, row.value);
    } else {
      misses.push(spec);
    }
  }

  if (misses.length > 0) {
    const results = await Promise.allSettled(misses.map((s) => s.fetcher()));
    const toWrite: { key: string; value: unknown }[] = [];
    results.forEach((result, i) => {
      const spec = misses[i];
      if (result.status === "fulfilled") {
        values.set(spec.key, result.value);
        // A fetch can succeed and still have nothing to say — the source simply
        // doesn't carry that ticker. Caching that as NULL violates the column
        // and 500s the page for every ticker the feed doesn't know, so an empty
        // result is treated as a miss rather than persisted.
        if (result.value !== undefined && result.value !== null) {
          toWrite.push({ key: spec.key, value: result.value });
        }
      } else {
        errors.set(spec.key, result.reason);
        // Fall back to a stale cached value if one exists — better than nothing.
        const stale = cachedRows.get(spec.key);
        if (stale) values.set(spec.key, stale.value);
      }
    });
    await setManyLiveCache(toWrite);
  }

  return { values, errors };
}
