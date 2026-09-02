import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { monthlyIncome } from "./schema";

export type Income = { month: string; amountArs: number };

export async function listIncome(): Promise<Income[]> {
  const rows = await db.select().from(monthlyIncome).orderBy(monthlyIncome.month);
  return rows.map((r) => ({ month: r.month, amountArs: Number(r.amountArs) }));
}

export async function upsertIncome(month: string, amountArs: number): Promise<void> {
  await db
    .insert(monthlyIncome)
    .values({ month, amountArs: amountArs.toFixed(2) })
    .onConflictDoUpdate({
      target: monthlyIncome.month,
      set: { amountArs: amountArs.toFixed(2), updatedAt: new Date() },
    });
}

export async function deleteIncome(month: string): Promise<void> {
  await db.delete(monthlyIncome).where(eq(monthlyIncome.month, month));
}
