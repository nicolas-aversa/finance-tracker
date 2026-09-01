import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import { cclRateHistory, livePriceCache } from "./schema";

export async function getLiveCache<T>(key: string, ttlSeconds: number): Promise<T | undefined> {
  const rows = await db.select().from(livePriceCache).where(eq(livePriceCache.cacheKey, key));
  const row = rows[0];
  if (!row) return undefined;
  const ageSeconds = (Date.now() - row.fetchedAt.getTime()) / 1000;
  if (ageSeconds > ttlSeconds) return undefined;
  return row.value as T;
}

export async function setLiveCache(key: string, value: unknown): Promise<void> {
  await db
    .insert(livePriceCache)
    .values({ cacheKey: key, value: value as object, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: livePriceCache.cacheKey,
      set: { value: value as object, fetchedAt: new Date() },
    });
}

export type CachedRow = { value: unknown; fetchedAt: Date };

/** Reads many cache keys in ONE query. Returns raw rows (freshness decided by the caller). */
export async function getManyLiveCache(keys: string[]): Promise<Map<string, CachedRow>> {
  if (keys.length === 0) return new Map();
  const rows = await db.select().from(livePriceCache).where(inArray(livePriceCache.cacheKey, keys));
  return new Map(rows.map((r) => [r.cacheKey, { value: r.value, fetchedAt: r.fetchedAt }]));
}

/** Writes many cache entries in ONE upsert query. */
export async function setManyLiveCache(entries: { key: string; value: unknown }[]): Promise<void> {
  if (entries.length === 0) return;
  const now = new Date();
  await db
    .insert(livePriceCache)
    .values(entries.map((e) => ({ cacheKey: e.key, value: e.value as object, fetchedAt: now })))
    .onConflictDoUpdate({
      target: livePriceCache.cacheKey,
      set: { value: sql`excluded.value`, fetchedAt: sql`excluded.fetched_at` },
    });
}

export async function getCclRateHistory(isoDate: string): Promise<number | undefined> {
  const rows = await db.select().from(cclRateHistory).where(eq(cclRateHistory.rateDate, isoDate));
  const row = rows[0];
  return row ? Number(row.rate) : undefined;
}

export async function setCclRateHistory(isoDate: string, rate: number, source: string): Promise<void> {
  await db
    .insert(cclRateHistory)
    .values({ rateDate: isoDate, rate: rate.toString(), source })
    .onConflictDoNothing({ target: cclRateHistory.rateDate });
}
