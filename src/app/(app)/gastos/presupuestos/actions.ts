"use server";

import { revalidatePath } from "next/cache";
import { deleteBudget, upsertBudget } from "@/lib/db/budgets";
import { deleteIncome, upsertIncome } from "@/lib/db/income";

export type BudgetState = { ok?: string; error?: string } | undefined;

function revalidateBudgetViews(): void {
  revalidatePath("/gastos");
  revalidatePath("/gastos/presupuestos");
  revalidatePath("/gastos/categoria", "layout"); // every category detail page
}

/**
 * Saves one category's monthly limit. An empty amount clears the budget, so the
 * same row does double duty as "set" and "remove".
 */
export async function saveBudgetAction(_prev: BudgetState, formData: FormData): Promise<BudgetState> {
  const category = String(formData.get("category") ?? "").trim();
  if (!category) return { error: "Falta la categoría." };

  const raw = String(formData.get("amount") ?? "").trim();
  if (raw === "") {
    await deleteBudget(category);
    revalidateBudgetViews();
    return { ok: `Se quitó el presupuesto de ${category}.` };
  }

  const amount = Number(raw.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return { error: "El monto no es válido." };

  await upsertBudget(category, amount);
  revalidateBudgetViews();
  return { ok: `Presupuesto de ${category} guardado.` };
}

export async function deleteBudgetAction(category: string): Promise<void> {
  await deleteBudget(category);
  revalidateBudgetViews();
}

/** Records what came in for one month; an empty amount clears it. */
export async function saveIncomeAction(_prev: BudgetState, formData: FormData): Promise<BudgetState> {
  const month = String(formData.get("month") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Mes inválido." };

  const raw = String(formData.get("amount") ?? "").trim();
  if (raw === "") {
    await deleteIncome(month);
    revalidateBudgetViews();
    return { ok: "Ingreso quitado." };
  }

  const amount = Number(raw.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return { error: "El monto no es válido." };

  await upsertIncome(month, amount);
  revalidateBudgetViews();
  return { ok: "Ingreso guardado." };
}
