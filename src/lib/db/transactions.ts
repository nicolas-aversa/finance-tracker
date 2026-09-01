import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import { transactions, type NewTransaction, type Transaction } from "./schema";

export async function listTransactions(): Promise<Transaction[]> {
  return db.select().from(transactions).orderBy(desc(transactions.tradeDate), desc(transactions.createdAt));
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const rows = await db.select().from(transactions).where(eq(transactions.id, id));
  return rows[0];
}

export async function createTransaction(data: NewTransaction): Promise<Transaction> {
  const rows = await db.insert(transactions).values(data).returning();
  return rows[0];
}

export async function updateTransaction(
  id: string,
  data: Partial<NewTransaction>
): Promise<Transaction | undefined> {
  const rows = await db
    .update(transactions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning();
  return rows[0];
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.delete(transactions).where(eq(transactions.id, id));
}
