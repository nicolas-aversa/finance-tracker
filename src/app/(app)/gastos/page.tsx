import Link from "next/link";
import { listExpenses, listImports } from "@/lib/db/expenses";
import { getLiveCclRate } from "@/lib/prices";
import { toDomainExpense, billingMonth } from "@/lib/expenses/types";
import { listMonths, monthOverMonth, monthlyCategoryStacks, periodSummary } from "@/lib/expenses/aggregate";
import { computeActiveInstallments, futureCommitmentArs } from "@/lib/expenses/installments";
import { ExpensesKpiHeader } from "@/components/expenses/ExpensesKpiHeader";
import { CategoryDonut } from "@/components/expenses/CategoryDonut";
import { MonthlyCategoryBars } from "@/components/expenses/MonthlyCategoryBars";
import { CardBreakdown } from "@/components/expenses/CardBreakdown";
import { InstallmentsList } from "@/components/expenses/InstallmentsList";
import { PeriodToggle } from "@/components/expenses/PeriodToggle";

export const dynamic = "force-dynamic";

async function safeCcl(): Promise<number> {
  try {
    return await getLiveCclRate();
  } catch {
    return 1000; // fallback so USD consumos still convert to a ballpark ARS
  }
}

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const [rows, imports, ccl, { mes }] = await Promise.all([
    listExpenses(),
    listImports(),
    safeCcl(),
    searchParams,
  ]);
  const expenses = rows.map(toDomainExpense);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-3xl">🧾</div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">Todavía no hay gastos</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Subí el PDF del resumen de tus tarjetas para empezar.
          </p>
        </div>
        <Link href="/gastos/subir" className="btn-accent px-6">
          Subir resumen
        </Link>
      </div>
    );
  }

  const months = listMonths(expenses);
  // "resumen" (accumulated) is the default view; otherwise a valid billing month.
  const isSummary = !mes || mes === "resumen" || !months.includes(mes);
  const active = isSummary ? "resumen" : mes;
  const month = isSummary ? null : mes;

  const summary = periodSummary(expenses, month, ccl);
  const mom = monthOverMonth(expenses, month, ccl);
  const monthlyStacks = monthlyCategoryStacks(expenses, ccl);
  const installments = computeActiveInstallments(expenses);
  const future = futureCommitmentArs(expenses, ccl);

  const periodDue = imports
    .filter((i) => i.dueDate && month !== null && billingMonth(i.statementPeriod) === month)
    .map((i) => i.dueDate as string)
    .sort();
  const dueDate = periodDue.length ? periodDue[0] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Gastos</h1>
        <PeriodToggle months={months} active={active} />
      </div>

      <ExpensesKpiHeader
        summary={summary}
        momDeltaPct={mom.deltaPct}
        futureCommitmentArs={future}
        dueDate={dueDate}
        totalLabel={isSummary ? "Gasto acumulado" : "Gasto del mes"}
        variant={isSummary ? "summary" : "month"}
      />

      {isSummary ? (
        <>
          <MonthlyCategoryBars stacks={monthlyStacks} />
          <CategoryDonut slices={summary.byCategory} />
          <CardBreakdown cards={summary.byCard} />
          <InstallmentsList items={installments} />
        </>
      ) : (
        <>
          <CategoryDonut slices={summary.byCategory} />
          <CardBreakdown cards={summary.byCard} />
        </>
      )}

      <Link
        href={`/gastos/movimientos${isSummary ? "" : `?mes=${active}`}`}
        className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
      >
        Ver todos los movimientos →
      </Link>
    </div>
  );
}
