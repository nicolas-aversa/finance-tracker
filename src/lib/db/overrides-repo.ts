import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { priceOverrides } from "./schema";

export type PriceOverride = {
  ticker: string;
  manualArsPrice: number | null;
  manualUsdPrice: number | null;
  enabled: boolean;
};

export async function listPriceOverrides(): Promise<PriceOverride[]> {
  const rows = await db.select().from(priceOverrides);
  return rows.map((r) => ({
    ticker: r.ticker,
    manualArsPrice: r.manualArsPrice ? Number(r.manualArsPrice) : null,
    manualUsdPrice: r.manualUsdPrice ? Number(r.manualUsdPrice) : null,
    enabled: r.enabled,
  }));
}

export async function upsertPriceOverride(
  ticker: string,
  data: { manualArsPrice?: number | null; manualUsdPrice?: number | null; enabled?: boolean }
): Promise<void> {
  await db
    .insert(priceOverrides)
    .values({
      ticker,
      manualArsPrice: data.manualArsPrice != null ? data.manualArsPrice.toString() : null,
      manualUsdPrice: data.manualUsdPrice != null ? data.manualUsdPrice.toString() : null,
      enabled: data.enabled ?? true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: priceOverrides.ticker,
      set: {
        manualArsPrice: data.manualArsPrice != null ? data.manualArsPrice.toString() : null,
        manualUsdPrice: data.manualUsdPrice != null ? data.manualUsdPrice.toString() : null,
        enabled: data.enabled ?? true,
        updatedAt: new Date(),
      },
    });
}

export async function deletePriceOverride(ticker: string): Promise<void> {
  await db.delete(priceOverrides).where(eq(priceOverrides.ticker, ticker));
}
