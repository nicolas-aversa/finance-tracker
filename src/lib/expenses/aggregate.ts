import type { ExpenseSource } from "@/lib/db/schema";
import { toArs, type DomainExpense } from "./types";

/** Payments (paying your bill) aren't spending; everything else is (refunds are negative). */
export function isSpend(e: DomainExpense): boolean {
  return e.kind !== "payment";
}

/** An expense's amount in ARS-equivalent — the unit every total in this section uses. */
export function spendArs(e: DomainExpense, cclRate: number): number {
  return toArs(e.amount, e.currency, cclRate);
}

export type CategorySlice = { category: string; amountArs: number };
export type CardSlice = { source: ExpenseSource; amountArs: number };
export type MonthPoint = { month: string; amountArs: number };
export type MerchantSlice = { merchant: string; amountArs: number };

export type PeriodSummary = {
  month: string | null; // null = accumulated across all months (Resumen)
  totalArs: number; // native-ARS spend
  totalUsd: number; // native-USD spend
  combinedArs: number; // everything expressed in ARS
  byCategory: CategorySlice[];
  byCard: CardSlice[];
  topMerchants: MerchantSlice[];
  count: number;
};

/** Distinct billing months present, newest first. */
export function listMonths(expenses: DomainExpense[]): string[] {
  return [...new Set(expenses.map((e) => e.billingMonth))].sort().reverse();
}

/** Total spend (in ARS-equivalent) per billing month, oldest first (for progression bars). */
export function monthlyTotals(expenses: DomainExpense[], cclRate: number): MonthPoint[] {
  const byMonth = new Map<string, number>();
  for (const e of expenses) {
    if (!isSpend(e)) continue;
    byMonth.set(e.billingMonth, (byMonth.get(e.billingMonth) ?? 0) + spendArs(e, cclRate));
  }
  return [...byMonth.entries()].map(([month, amountArs]) => ({ month, amountArs })).sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** Summary for one billing month, or the whole dataset when `month` is null (Resumen). */
export function periodSummary(expenses: DomainExpense[], month: string | null, cclRate: number): PeriodSummary {
  const inMonth = expenses.filter((e) => (month === null || e.billingMonth === month) && isSpend(e));

  let totalArs = 0;
  let totalUsd = 0;
  const catMap = new Map<string, number>();
  const cardMap = new Map<ExpenseSource, number>();
  const merchantMap = new Map<string, number>();

  for (const e of inMonth) {
    const ars = spendArs(e, cclRate);
    if (e.currency === "USD") totalUsd += e.amount;
    else totalArs += e.amount;
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + ars);
    cardMap.set(e.source, (cardMap.get(e.source) ?? 0) + ars);
    merchantMap.set(e.merchant, (merchantMap.get(e.merchant) ?? 0) + ars);
  }

  const byCategory = [...catMap.entries()]
    .map(([category, amountArs]) => ({ category, amountArs }))
    .sort((a, b) => b.amountArs - a.amountArs);
  const byCard = [...cardMap.entries()]
    .map(([source, amountArs]) => ({ source, amountArs }))
    .sort((a, b) => b.amountArs - a.amountArs);
  const topMerchants = [...merchantMap.entries()]
    .map(([merchant, amountArs]) => ({ merchant, amountArs }))
    .sort((a, b) => b.amountArs - a.amountArs)
    .slice(0, 8);

  return {
    month,
    totalArs,
    totalUsd,
    combinedArs: totalArs + totalUsd * cclRate,
    byCategory,
    byCard,
    topMerchants,
    count: inMonth.length,
  };
}

export type CategoryDetail = {
  category: string;
  totalArs: number;
  /** Share of the period's total spend, 0..1. */
  sharePct: number;
  count: number;
  /** This category per billing month, oldest first, including months at zero. */
  monthly: MonthPoint[];
  topMerchants: MerchantSlice[];
  /** Change vs the previous month in the series; null when there's nothing to compare. */
  momDeltaPct: number | null;
};

/**
 * Everything the category drill-down page needs. `month` scopes the headline
 * figures (null = accumulated), while `monthly` always spans the full history
 * so the trend chart has context.
 */
export function categoryDetail(
  expenses: DomainExpense[],
  category: string,
  month: string | null,
  cclRate: number
): CategoryDetail {
  const allMonths = [...new Set(expenses.map((e) => e.billingMonth))].sort();

  const perMonth = new Map<string, number>();
  for (const e of expenses) {
    if (!isSpend(e) || e.category !== category) continue;
    perMonth.set(e.billingMonth, (perMonth.get(e.billingMonth) ?? 0) + spendArs(e, cclRate));
  }
  const monthly = allMonths.map((m) => ({ month: m, amountArs: perMonth.get(m) ?? 0 }));

  const inPeriod = expenses.filter(
    (e) => isSpend(e) && e.category === category && (month === null || e.billingMonth === month)
  );
  const totalArs = inPeriod.reduce((s, e) => s + spendArs(e, cclRate), 0);

  const periodTotal = expenses
    .filter((e) => isSpend(e) && (month === null || e.billingMonth === month))
    .reduce((s, e) => s + spendArs(e, cclRate), 0);

  const merchantMap = new Map<string, number>();
  for (const e of inPeriod) {
    merchantMap.set(e.merchant, (merchantMap.get(e.merchant) ?? 0) + spendArs(e, cclRate));
  }
  const topMerchants = [...merchantMap.entries()]
    .map(([merchant, amountArs]) => ({ merchant, amountArs }))
    .sort((a, b) => b.amountArs - a.amountArs)
    .slice(0, 8);

  // Compare the selected month (or the latest one, in the accumulated view)
  // against the month before it in this category's own series.
  const idx = month === null ? monthly.length - 1 : monthly.findIndex((p) => p.month === month);
  const current = idx >= 0 ? monthly[idx].amountArs : 0;
  const previous = idx > 0 ? monthly[idx - 1].amountArs : null;
  const momDeltaPct = previous !== null && previous !== 0 ? current / previous - 1 : null;

  return {
    category,
    totalArs,
    sharePct: periodTotal !== 0 ? totalArs / periodTotal : 0,
    count: inPeriod.length,
    monthly,
    topMerchants,
    momDeltaPct,
  };
}

/** Month-over-month change in combined ARS spend for `month` vs the previous month present. */
export function monthOverMonth(
  expenses: DomainExpense[],
  month: string | null,
  cclRate: number
): { current: number; previous: number | null; deltaPct: number | null } {
  if (month === null) return { current: 0, previous: null, deltaPct: null };
  const totals = monthlyTotals(expenses, cclRate);
  const idx = totals.findIndex((t) => t.month === month);
  const current = idx >= 0 ? totals[idx].amountArs : 0;
  const previous = idx > 0 ? totals[idx - 1].amountArs : null;
  const deltaPct = previous && previous !== 0 ? current / previous - 1 : null;
  return { current, previous, deltaPct };
}
