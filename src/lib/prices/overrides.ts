import { listPriceOverrides, type PriceOverride } from "@/lib/db/overrides-repo";

export { listPriceOverrides, upsertPriceOverride, deletePriceOverride } from "@/lib/db/overrides-repo";
export type { PriceOverride };

/** Manual price overrides are a fallback, applied only when the live source is missing a ticker. */
export async function getOverridesMap(): Promise<Map<string, PriceOverride>> {
  const overrides = await listPriceOverrides();
  return new Map(overrides.filter((o) => o.enabled).map((o) => [o.ticker, o]));
}
