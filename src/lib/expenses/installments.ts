import { toArs, type DomainExpense } from "./types";

export type ActiveInstallment = {
  merchant: string;
  source: DomainExpense["source"];
  currency: DomainExpense["currency"];
  installmentCurrent: number;
  installmentTotal: number;
  amountPerInstallment: number;
  remainingCount: number;
  remainingAmount: number; // in the movement's own currency
};

/** Groups installment lines of the same purchase by merchant + total count + per-cuota amount. */
function groupKey(e: DomainExpense): string {
  return `${e.source}|${e.merchant}|${e.installmentTotal}|${e.amount.toFixed(2)}|${e.currency}`;
}

/**
 * Detects purchases still being paid in installments and how much is left.
 * A statement shows each installment purchase once per period as "cuota N/M";
 * we group identical lines and take the highest N seen as the current progress.
 */
export function computeActiveInstallments(expenses: DomainExpense[]): ActiveInstallment[] {
  const groups = new Map<string, DomainExpense[]>();
  for (const e of expenses) {
    if (e.kind !== "purchase") continue;
    if (!e.installmentTotal || !e.installmentCurrent || e.installmentTotal <= 1) continue;
    const key = groupKey(e);
    const bucket = groups.get(key);
    if (bucket) bucket.push(e);
    else groups.set(key, [e]);
  }

  const result: ActiveInstallment[] = [];
  for (const rows of groups.values()) {
    const total = rows[0].installmentTotal!;
    const current = Math.max(...rows.map((r) => r.installmentCurrent!));
    const remainingCount = Math.max(0, total - current);
    if (remainingCount === 0) continue; // fully paid off
    const amountPerInstallment = Math.abs(rows[0].amount);
    result.push({
      merchant: rows[0].merchant,
      source: rows[0].source,
      currency: rows[0].currency,
      installmentCurrent: current,
      installmentTotal: total,
      amountPerInstallment,
      remainingCount,
      remainingAmount: amountPerInstallment * remainingCount,
    });
  }

  return result.sort((a, b) => b.remainingAmount - a.remainingAmount);
}

/** Total future commitment (remaining installments) expressed in ARS. */
export function futureCommitmentArs(expenses: DomainExpense[], cclRate: number): number {
  return computeActiveInstallments(expenses).reduce(
    (sum, i) => sum + toArs(i.remainingAmount, i.currency, cclRate),
    0
  );
}
