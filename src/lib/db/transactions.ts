import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { transactions, type NewTransaction, type Transaction } from "./schema";

/**
 * Every function here takes `userId` first and filters by it — including the
 * ones that already have a primary key. Trusting the id alone would let anyone
 * read or edit someone else's row by guessing a uuid; taking the owner as a
 * required first argument makes forgetting it a compile error rather than a
 * silent privacy hole.
 */

export async function listTransactions(userId: string): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.tradeDate), desc(transactions.createdAt));
}

export async function getTransaction(userId: string, id: string): Promise<Transaction | undefined> {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
  return rows[0];
}

export async function createTransaction(
  userId: string,
  data: Omit<NewTransaction, "userId">
): Promise<Transaction> {
  const rows = await db
    .insert(transactions)
    .values({ ...data, userId })
    .returning();
  return rows[0];
}

export async function updateTransaction(
  userId: string,
  id: string,
  data: Partial<Omit<NewTransaction, "userId">>
): Promise<Transaction | undefined> {
  const rows = await db
    .update(transactions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning();
  return rows[0];
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  await db.delete(transactions).where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
}
