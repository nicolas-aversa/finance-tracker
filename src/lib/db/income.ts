import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { monthlyIncome } from "./schema";

export type Income = { month: string; amountArs: number };

export async function listIncome(userId: string): Promise<Income[]> {
  const rows = await db
    .select()
    .from(monthlyIncome)
    .where(eq(monthlyIncome.userId, userId))
    .orderBy(monthlyIncome.month);
  return rows.map((r) => ({ month: r.month, amountArs: Number(r.amountArs) }));
}

export async function upsertIncome(userId: string, month: string, amountArs: number): Promise<void> {
  await db
    .insert(monthlyIncome)
    .values({ userId, month, amountArs: amountArs.toFixed(2) })
    .onConflictDoUpdate({
      target: [monthlyIncome.userId, monthlyIncome.month],
      set: { amountArs: amountArs.toFixed(2), updatedAt: new Date() },
    });
}

export async function deleteIncome(userId: string, month: string): Promise<void> {
  await db
    .delete(monthlyIncome)
    .where(and(eq(monthlyIncome.userId, userId), eq(monthlyIncome.month, month)));
}
