import type { Expense, ExpenseKind, ExpenseSource } from "@/lib/db/schema";

export type Currency = "ARS" | "USD";
export type { ExpenseKind, ExpenseSource };

/** A single movement produced by a statement parser. */
export type ParsedMovement = {
  date: string; // yyyy-mm-dd
  description: string;
  /** Cleaned-up merchant name for categorization; defaults to `description`. */
  merchant?: string;
  amount: number; // charges positive; credits/refunds negative
  currency: Currency;
  installmentCurrent?: number | null;
  installmentTotal?: number | null;
  kind: ExpenseKind;
};

/** The full result of parsing one uploaded statement PDF. */
export type ParsedStatement = {
  source: ExpenseSource;
  statementPeriod: string; // yyyy-mm-dd (statement close date)
  dueDate?: string | null;
  statementTotalArs?: number | null;
  statementTotalUsd?: number | null;
  minPaymentArs?: number | null;
  /** Prior-period balance carried in; used for reconciliation (opening + Σ movements ≈ total). */
  openingBalanceArs?: number;
  openingBalanceUsd?: number;
  movements: ParsedMovement[];
};

/** A DB expense row with numeric columns parsed to numbers, for pure domain math. */
export type DomainExpense = {
  id: string;
  source: ExpenseSource;
  txDate: string;
  /** Statement month the charge was billed in ("yyyy-mm"), the axis the UI groups by. */
  billingMonth: string;
  description: string;
  merchant: string;
  amount: number;
  currency: Currency;
  category: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  kind: ExpenseKind;
};

export function toDomainExpense(row: Expense): DomainExpense {
  return {
    id: row.id,
    source: row.source,
    txDate: row.txDate,
    billingMonth: row.billingMonth ?? monthOf(row.txDate),
    description: row.description,
    merchant: row.merchant,
    amount: Number(row.amount),
    currency: row.currency as Currency,
    category: row.category,
    installmentCurrent: row.installmentCurrent,
    installmentTotal: row.installmentTotal,
    kind: row.kind,
  };
}

/** "yyyy-mm-dd" -> "yyyy-mm". */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/**
 * Billing month for a statement: the month at (close date − 15 days), so a
 * statement closing early in a month (e.g. the 1st or 2nd) belongs to the prior
 * calendar month's cycle. This aligns all issuers (MP, Galicia, Naranja) onto
 * the same May/June/July axis regardless of their differing close days.
 */
export function billingMonth(closeIso: string): string {
  const d = new Date(`${closeIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 15);
  return d.toISOString().slice(0, 7);
}

/** Converts an amount to ARS using the CCL rate (USD -> ARS); ARS passes through. */
export function toArs(amount: number, currency: Currency, cclRate: number): number {
  return currency === "USD" ? amount * cclRate : amount;
}
