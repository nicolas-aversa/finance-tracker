import { listBudgets } from "@/lib/db/budgets";
import { getCategories, listExpenses } from "@/lib/db/expenses";
import { safeCcl } from "@/lib/prices/safe-ccl";
import { toDomainExpense } from "@/lib/expenses/types";
import { categoryDetail, listMonths } from "@/lib/expenses/aggregate";
import { formatArs } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { BudgetForm } from "@/components/expenses/BudgetForm";

export const dynamic = "force-dynamic";

export default async function PresupuestosPage() {
  const [rows, categories, budgets, ccl] = await Promise.all([
    listExpenses(),
    getCategories(),
    listBudgets(),
    safeCcl(),
  ]);
  const expenses = rows.map(toDomainExpense);
  const months = listMonths(expenses);
  const budgetBy = new Map(budgets.map((b) => [b.category, b.amountArs]));

  // Offer every category that either has a budget already or has ever been used,
  // so the list stays useful without listing dead categories.
  const used = new Set(expenses.map((e) => e.category));
  const names = categories
    .map((c) => c.name)
    .filter((name) => used.has(name) || budgetBy.has(name));

  // A category's own monthly average is the most useful anchor when picking a limit.
  const avgBy = new Map(
    names.map((name) => {
      const detail = categoryDetail(expenses, name, null, ccl);
      const active = detail.monthly.filter((p) => p.amountArs > 0);
      const avg = active.length > 0 ? active.reduce((s, p) => s + p.amountArs, 0) / active.length : 0;
      return [name, avg];
    })
  );

  const totalBudget = budgets.reduce((s, b) => s + b.amountArs, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Presupuestos" backHref="/gastos" />

      <p className="px-1 text-xs text-neutral-500 dark:text-neutral-400">
        Un límite mensual por categoría, que se repite todos los meses. Dejá el campo vacío para quitarlo.
        {months.length > 0 && " El promedio es sobre los meses en que hubo gasto."}
      </p>

      {totalBudget > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-neutral-500 dark:text-neutral-400">Presupuesto mensual total</span>
          <span className="float-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatArs(totalBudget)}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {names.map((name) => (
          <BudgetForm
            key={name}
            category={name}
            amountArs={budgetBy.get(name) ?? null}
            avgArs={avgBy.get(name) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
