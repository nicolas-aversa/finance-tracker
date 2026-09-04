import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import {
  categoryRules,
  expenseCategories,
  expenseImports,
  expenses,
  type Expense,
  type ExpenseImport,
} from "./schema";
import { categorizeMerchant, normalizeMerchant, type CategoryRule } from "@/lib/expenses/categorize";
import { billingMonth, type ParsedStatement } from "@/lib/expenses/types";

export type SaveStatementResult = {
  importId: string;
  source: string;
  statementPeriod: string;
  movementCount: number;
  statementTotalArs: number | null;
  statementTotalUsd: number | null;
  /** opening balance + Σ signed movements — should equal the printed total. */
  reconciledArs: number;
  reconciledUsd: number;
  reconciledOk: boolean;
  replaced: boolean;
};

function categoryForMovement(
  kind: ParsedStatement["movements"][number]["kind"],
  merchant: string,
  rules: CategoryRule[]
): string {
  if (kind === "payment") return "Pagos";
  if (kind === "tax" || kind === "fee" || kind === "interest") return "Impuestos";
  return categorizeMerchant(merchant, rules);
}

/**
 * Persists a parsed statement: deletes any prior import for the same
 * (source, period) — cascading its expenses — then inserts the fresh import and
 * its categorized movements. All in one transaction, so a re-upload replaces
 * rather than duplicates.
 */
export async function saveStatement(
  userId: string,
  parsed: ParsedStatement,
  fileName: string
): Promise<SaveStatementResult> {
  const rules = await getCategoryRules(userId);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: expenseImports.id })
      .from(expenseImports)
      .where(
        and(
          eq(expenseImports.userId, userId),
          eq(expenseImports.source, parsed.source),
          eq(expenseImports.statementPeriod, parsed.statementPeriod)
        )
      );
    const replaced = existing.length > 0;
    if (replaced) {
      await tx
        .delete(expenseImports)
        .where(and(eq(expenseImports.userId, userId), eq(expenseImports.id, existing[0].id)));
    }

    // Reconciliation: opening balance + Σ(signed movements) should equal the
    // printed statement total (a strong correctness check on the parse).
    const openingArs = parsed.openingBalanceArs ?? 0;
    const openingUsd = parsed.openingBalanceUsd ?? 0;
    let reconciledArs = openingArs;
    let reconciledUsd = openingUsd;
    for (const m of parsed.movements) {
      if (m.currency === "USD") reconciledUsd += m.amount;
      else reconciledArs += m.amount;
    }
    const reconciledOk =
      (parsed.statementTotalArs == null || Math.abs(reconciledArs - parsed.statementTotalArs) < 1) &&
      (parsed.statementTotalUsd == null || Math.abs(reconciledUsd - parsed.statementTotalUsd) < 0.5);

    const [imp] = await tx
      .insert(expenseImports)
      .values({
        userId,
        source: parsed.source,
        statementPeriod: parsed.statementPeriod,
        fileName,
        statementTotalArs: parsed.statementTotalArs?.toString() ?? null,
        statementTotalUsd: parsed.statementTotalUsd?.toString() ?? null,
        dueDate: parsed.dueDate ?? null,
        minPaymentArs: parsed.minPaymentArs?.toString() ?? null,
        rawMeta: { openingBalanceArs: openingArs, openingBalanceUsd: openingUsd, reconciledOk },
      })
      .returning({ id: expenseImports.id });

    const period = billingMonth(parsed.statementPeriod);
    if (parsed.movements.length > 0) {
      await tx.insert(expenses).values(
        parsed.movements.map((m) => {
          const merchant = normalizeMerchant(m.merchant ?? m.description);
          return {
            userId,
            importId: imp.id,
            source: parsed.source,
            txDate: m.date,
            billingMonth: period,
            description: m.description,
            merchant,
            amount: m.amount.toString(),
            currency: m.currency,
            category: categoryForMovement(m.kind, merchant, rules),
            installmentCurrent: m.installmentCurrent ?? null,
            installmentTotal: m.installmentTotal ?? null,
            kind: m.kind,
          };
        })
      );
    }

    return {
      importId: imp.id,
      source: parsed.source,
      statementPeriod: parsed.statementPeriod,
      movementCount: parsed.movements.length,
      statementTotalArs: parsed.statementTotalArs ?? null,
      statementTotalUsd: parsed.statementTotalUsd ?? null,
      reconciledArs,
      reconciledUsd,
      reconciledOk,
      replaced,
    };
  });
}

export async function listExpenses(userId: string): Promise<Expense[]> {
  return db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.txDate));
}

export async function listImports(userId: string): Promise<ExpenseImport[]> {
  return db
    .select()
    .from(expenseImports)
    .where(eq(expenseImports.userId, userId))
    .orderBy(desc(expenseImports.statementPeriod));
}

/**
 * Recategorizes a movement — and, when it belongs to an installment plan, every
 * other cuota of the same purchase. Recategorizing "cuota 3/6" and leaving the
 * other five where they were would split one purchase across two categories and
 * quietly corrupt every total.
 *
 * The other cuotas are found the same way `computeActiveInstallments` groups
 * them: same card, merchant, plan length and currency, and the same anchor
 * (`billing month − cuota number`), which stays constant across a purchase's
 * life even when the issuer rounds or revalues individual cuotas.
 *
 * Returns how many rows changed, so the UI can say when it touched more than one.
 */
export async function updateExpenseCategory(userId: string, id: string, category: string): Promise<number> {
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.id, id)));
  if (!row) return 0;

  const isInstallment = row.installmentTotal !== null && row.installmentTotal > 1 && row.installmentCurrent !== null;
  if (!isInstallment || !row.billingMonth) {
    await db
      .update(expenses)
      .set({ category, updatedAt: new Date() })
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)));
    return 1;
  }

  const [y, m] = row.billingMonth.split("-").map(Number);
  const anchor = y * 12 + m - row.installmentCurrent!;

  const updated = await db
    .update(expenses)
    .set({ category, updatedAt: new Date() })
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.source, row.source),
        eq(expenses.merchant, row.merchant),
        eq(expenses.installmentTotal, row.installmentTotal!),
        eq(expenses.currency, row.currency),
        sql`(split_part(${expenses.billingMonth}, '-', 1)::int * 12
             + split_part(${expenses.billingMonth}, '-', 2)::int
             - ${expenses.installmentCurrent}) = ${anchor}`
      )
    )
    .returning({ id: expenses.id });

  return updated.length;
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  await db.delete(expenses).where(and(eq(expenses.userId, userId), eq(expenses.id, id)));
}

export async function getCategories(userId: string): Promise<{ name: string; emoji: string }[]> {
  const rows = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId))
    .orderBy(expenseCategories.sort);
  return rows.map((r) => ({ name: r.name, emoji: r.emoji }));
}

export async function getCategoryRules(userId: string): Promise<CategoryRule[]> {
  const rows = await db
    .select()
    .from(categoryRules)
    .where(eq(categoryRules.userId, userId))
    .orderBy(desc(categoryRules.priority));
  return rows.map((r) => ({ pattern: r.pattern, category: r.category, priority: r.priority }));
}
