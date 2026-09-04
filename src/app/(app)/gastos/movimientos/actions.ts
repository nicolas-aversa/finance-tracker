"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { deleteExpense, updateExpenseCategory } from "@/lib/db/expenses";

/** Returns how many movements changed — an installment plan moves as a whole. */
export async function updateCategoryAction(id: string, category: string): Promise<number> {
  const userId = await requireUserId();
  const changed = await updateExpenseCategory(userId, id, category);
  revalidatePath("/gastos/movimientos");
  revalidatePath("/gastos");
  revalidatePath("/gastos/categoria", "layout");
  return changed;
}

export async function deleteExpenseAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await deleteExpense(userId, id);
  revalidatePath("/gastos/movimientos");
  revalidatePath("/gastos");
}
