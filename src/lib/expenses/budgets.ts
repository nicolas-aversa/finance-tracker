import type { CategorySlice } from "./aggregate";

export type Budget = { category: string; amountArs: number };

/** Under 80% of the limit, closing in on it, or past it. */
export type BudgetStatus = "ok" | "warn" | "over";

export const WARN_RATIO = 0.8;

export type BudgetProgress = {
  category: string;
  budgetArs: number;
  spentArs: number;
  /** spent / budget; 0 when the budget is 0 (no division by zero). */
  ratio: number;
  /** Positive = still available, negative = overspent. */
  remainingArs: number;
  status: BudgetStatus;
  /**
   * Where the month is heading at the current pace, or null once the month is
   * complete (there's nothing left to project).
   */
  projectedArs: number | null;
};

function statusFor(ratio: number): BudgetStatus {
  if (ratio > 1) return "over";
  if (ratio >= WARN_RATIO) return "warn";
  return "ok";
}

/**
 * Pairs each budget with what's been spent in that category.
 * Categories without a budget are not included — a budget list should show
 * what you decided to track, not everything you happened to spend on.
 *
 * `monthProgress` (0..1) is how far through the month we are; pass 1 for a
 * closed month. It's a parameter rather than read from the clock so the
 * projection stays deterministic and testable.
 */
export function budgetProgress(
  budgets: Budget[],
  byCategory: CategorySlice[],
  monthProgress = 1
): BudgetProgress[] {
  const spentBy = new Map(byCategory.map((c) => [c.category, c.amountArs]));

  return budgets
    .map((b) => {
      const spentArs = spentBy.get(b.category) ?? 0;
      const ratio = b.amountArs > 0 ? spentArs / b.amountArs : 0;
      return {
        category: b.category,
        budgetArs: b.amountArs,
        spentArs,
        ratio,
        remainingArs: b.amountArs - spentArs,
        status: statusFor(ratio),
        projectedArs: monthProgress > 0 && monthProgress < 1 ? spentArs / monthProgress : null,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** The whole month rolled into one figure, for the header line. */
export function totalBudgetProgress(rows: BudgetProgress[]): {
  budgetArs: number;
  spentArs: number;
  ratio: number;
  status: BudgetStatus;
} {
  const budgetArs = rows.reduce((s, r) => s + r.budgetArs, 0);
  const spentArs = rows.reduce((s, r) => s + r.spentArs, 0);
  const ratio = budgetArs > 0 ? spentArs / budgetArs : 0;
  return { budgetArs, spentArs, ratio, status: statusFor(ratio) };
}

/**
 * How far through `month` ("yyyy-mm") the date `today` ("yyyy-mm-dd") is.
 * A past month is 1 (complete); a future month is 0.
 */
export function monthProgressFor(month: string, today: string): number {
  const currentMonth = today.slice(0, 7);
  if (month < currentMonth) return 1;
  if (month > currentMonth) return 0;

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Number(today.slice(8, 10));
  return Math.min(day / daysInMonth, 1);
}
