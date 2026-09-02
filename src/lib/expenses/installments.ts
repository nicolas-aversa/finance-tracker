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

/** "yyyy-mm" as a comparable month number. */
function monthIndex(billingMonth: string): number {
  const [y, m] = billingMonth.split("-").map(Number);
  return y * 12 + m;
}

/**
 * Groups the statement lines belonging to the same purchase.
 *
 * A purchase bills cuota N in month M and cuota N+1 in month M+1, so
 * `month − cuota` is constant across its whole life. That anchor identifies a
 * purchase far more reliably than the amount does: issuers round the first
 * cuota differently from the rest (8756.14 then 8756.10) and revalue cuotas
 * mid-plan, so keying on the amount split every purchase into phantom groups
 * that stayed "active" forever and inflated the future commitment.
 */
function cohortKey(e: DomainExpense): string {
  const anchor = monthIndex(e.billingMonth) - e.installmentCurrent!;
  return `${e.source}|${e.merchant}|${e.installmentTotal}|${e.currency}|${anchor}`;
}

/**
 * Detects purchases still being paid in installments and how much is left.
 *
 * Within a cohort (same merchant, plan length and start month) there can be
 * several parallel purchases — two 3-cuota buys at the same shop in the same
 * month. They're told apart by how many lines share the newest cuota number:
 * each of those lines is one live purchase, carrying its own current amount.
 */
export function computeActiveInstallments(expenses: DomainExpense[]): ActiveInstallment[] {
  const cohorts = new Map<string, DomainExpense[]>();
  for (const e of expenses) {
    if (e.kind !== "purchase") continue;
    if (!e.installmentTotal || !e.installmentCurrent || e.installmentTotal <= 1) continue;
    const key = cohortKey(e);
    const bucket = cohorts.get(key);
    if (bucket) bucket.push(e);
    else cohorts.set(key, [e]);
  }

  const result: ActiveInstallment[] = [];
  for (const rows of cohorts.values()) {
    const total = rows[0].installmentTotal!;
    const current = Math.max(...rows.map((r) => r.installmentCurrent!));
    const remainingCount = total - current;
    if (remainingCount <= 0) continue; // fully paid off

    // One entry per purchase still running, using its latest (revalued) amount.
    for (const row of rows.filter((r) => r.installmentCurrent === current)) {
      const amountPerInstallment = Math.abs(row.amount);
      result.push({
        merchant: row.merchant,
        source: row.source,
        currency: row.currency,
        installmentCurrent: current,
        installmentTotal: total,
        amountPerInstallment,
        remainingCount,
        remainingAmount: amountPerInstallment * remainingCount,
      });
    }
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
