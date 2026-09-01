import Link from "next/link";
import { listExpenses, listImports } from "@/lib/db/expenses";
import { listBudgets } from "@/lib/db/budgets";
import { budgetProgress, monthProgressFor } from "@/lib/expenses/budgets";
import { monthDisplay } from "@/lib/expenses/months";
import { safeCcl } from "@/lib/prices/safe-ccl";
import { toDomainExpense, billingMonth } from "@/lib/expenses/types";
import { listMonths, monthOverMonth, monthlyCategoryStacks, periodSummary } from "@/lib/expenses/aggregate";
import { computeActiveInstallments, futureCommitmentArs } from "@/lib/expenses/installments";
import { ExpensesKpiHeader } from "@/components/expenses/ExpensesKpiHeader";
import { CategoryDonut } from "@/components/expenses/CategoryDonut";
import { MonthlyCategoryBars } from "@/components/expenses/MonthlyCategoryBars";
import { CardBreakdown } from "@/components/expenses/CardBreakdown";
import { InstallmentsList } from "@/components/expenses/InstallmentsList";
import { PeriodToggle } from "@/components/expenses/PeriodToggle";
import { BudgetList } from "@/components/expenses/BudgetList";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const [rows, imports, budgets, ccl, { mes }] = await Promise.all([
    listExpenses(),
    listImports(),
    listBudgets(),
    safeCcl(),
    searchParams,
  ]);
  const expenses = rows.map(toDomainExpense);

  if (expenses.length === 0) {
    return (
      <EmptyState
        emoji="🧾"
        title="Todavía no hay gastos"
        hint="Subí el PDF del resumen de tus tarjetas para empezar."
        action={{ href: "/gastos/subir", label: "Subir resumen" }}
      />
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

  // Every real category links to its detail; the donut's synthetic "Otros (N)"
  // bucket has no entry here, so it renders inert.
  const categoryHrefs = Object.fromEntries(
    summary.byCategory.map((c) => [
      c.category,
      `/gastos/categoria/${encodeURIComponent(c.category)}${month ? `?mes=${month}` : ""}`,
    ])
  );

  // Budgets are monthly, so they're measured against a month — in the
  // accumulated view fall back to the most recent one rather than summing.
  const budgetMonth = month ?? months[0] ?? null;
  const budgetSummary = budgetMonth === month ? summary : periodSummary(expenses, budgetMonth, ccl);
  const today = new Date().toISOString().slice(0, 10);
  const budgetRows = budgetMonth
    ? budgetProgress(budgets, budgetSummary.byCategory, monthProgressFor(budgetMonth, today))
    : [];

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

      {budgetMonth && (
        <BudgetList
          rows={budgetRows}
          monthHref={month ? `?mes=${month}` : ""}
          monthLabel={monthDisplay(budgetMonth)}
        />
      )}

      {isSummary ? (
        <>
          <MonthlyCategoryBars stacks={monthlyStacks} />
          <CategoryDonut slices={summary.byCategory} hrefs={categoryHrefs} />
          <CardBreakdown cards={summary.byCard} />
          <InstallmentsList items={installments} />
        </>
      ) : (
        <>
          <CategoryDonut slices={summary.byCategory} hrefs={categoryHrefs} />
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
