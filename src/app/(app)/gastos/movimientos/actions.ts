"use server";

import { revalidatePath } from "next/cache";
import { deleteExpense, updateExpenseCategory } from "@/lib/db/expenses";

export async function updateCategoryAction(id: string, category: string): Promise<void> {
  await updateExpenseCategory(id, category);
  revalidatePath("/gastos/movimientos");
  revalidatePath("/gastos");
}

export async function deleteExpenseAction(id: string): Promise<void> {
  await deleteExpense(id);
  revalidatePath("/gastos/movimientos");
  revalidatePath("/gastos");
}
