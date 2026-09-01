import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { expenseBudgets } from "./schema";
import type { Budget } from "@/lib/expenses/budgets";

/** Every category budget, as plain numbers for the domain layer. */
export async function listBudgets(): Promise<Budget[]> {
  const rows = await db.select().from(expenseBudgets).orderBy(expenseBudgets.category);
  return rows.map((r) => ({ category: r.category, amountArs: Number(r.amountArs) }));
}

/** Sets (or replaces) the monthly limit for a category. */
export async function upsertBudget(category: string, amountArs: number): Promise<void> {
  await db
    .insert(expenseBudgets)
    .values({ category, amountArs: amountArs.toFixed(2) })
    .onConflictDoUpdate({
      target: expenseBudgets.category,
      set: { amountArs: amountArs.toFixed(2), updatedAt: new Date() },
    });
}

export async function deleteBudget(category: string): Promise<void> {
  await db.delete(expenseBudgets).where(eq(expenseBudgets.category, category));
}
