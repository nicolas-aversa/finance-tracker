export type Income = { month: string; amountArs: number };

export type IncomeUse = {
  month: string;
  incomeArs: number;
  spentArs: number;
  /** spent / income; 0 when no income is on record for the month. */
  ratio: number;
  /** Positive = left over, negative = spent beyond what came in. */
  leftoverArs: number;
  status: "ok" | "warn" | "over";
};

/** Comfortable below 70%, tight from there, and over once spend passes income. */
export const TIGHT_RATIO = 0.7;

/**
 * How much of a month's income the spending took. Returns null when there is
 * no income on record — a made-up denominator would be worse than no figure.
 */
export function incomeUse(income: Income[], month: string | null, spentArs: number): IncomeUse | null {
  if (month === null) return null;
  const found = income.find((i) => i.month === month);
  if (!found || found.amountArs <= 0) return null;

  const ratio = spentArs / found.amountArs;
  return {
    month,
    incomeArs: found.amountArs,
    spentArs,
    ratio,
    leftoverArs: found.amountArs - spentArs,
    status: ratio > 1 ? "over" : ratio >= TIGHT_RATIO ? "warn" : "ok",
  };
}
