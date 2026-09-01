import Link from "next/link";
import { getCategories, listExpenses } from "@/lib/db/expenses";
import { toDomainExpense } from "@/lib/expenses/types";
import { listMonths } from "@/lib/expenses/aggregate";
import { PeriodToggle } from "@/components/expenses/PeriodToggle";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";

export const dynamic = "force-dynamic";

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const [rows, categories, { mes }] = await Promise.all([listExpenses(), getCategories(), searchParams]);
  const expenses = rows.map(toDomainExpense);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-3xl">📜</div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Todavía no hay movimientos.</p>
        <Link href="/gastos/subir" className="btn-accent px-6">
          Subir resumen
        </Link>
      </div>
    );
  }

  const months = listMonths(expenses);
  const isSummary = !mes || mes === "resumen" || !months.includes(mes);
  const active = isSummary ? "resumen" : mes;

  // Payments (paying last month's bill) aren't spending — hide them from the list.
  const visible = expenses
    .filter((e) => e.kind !== "payment")
    .filter((e) => isSummary || e.billingMonth === active)
    .sort((a, b) => (a.txDate < b.txDate ? 1 : -1));
  const categoryNames = categories.map((c) => c.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Movimientos</h1>
          <Link
            href={`/gastos${isSummary ? "" : `?mes=${active}`}`}
            className="text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
          >
            ← Volver
          </Link>
        </div>
        <PeriodToggle months={months} active={active} basePath="/gastos/movimientos" />
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((e) => (
          <ExpenseRow key={e.id} expense={e} categories={categoryNames} />
        ))}
      </div>
    </div>
  );
}
