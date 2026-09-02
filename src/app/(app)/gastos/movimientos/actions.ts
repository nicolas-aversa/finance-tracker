"use server";

import { revalidatePath } from "next/cache";
import { deleteExpense, updateExpenseCategory } from "@/lib/db/expenses";

/** Returns how many movements changed — an installment plan moves as a whole. */
export async function updateCategoryAction(id: string, category: string): Promise<number> {
  const changed = await updateExpenseCategory(id, category);
  revalidatePath("/gastos/movimientos");
  revalidatePath("/gastos");
  revalidatePath("/gastos/categoria", "layout");
  return changed;
}

export async function deleteExpenseAction(id: string): Promise<void> {
  await deleteExpense(id);
  revalidatePath("/gastos/movimientos");
  revalidatePath("/gastos");
}
