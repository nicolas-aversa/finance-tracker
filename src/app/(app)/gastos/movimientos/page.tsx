import Link from "next/link";
import { getCategories, listExpenses } from "@/lib/db/expenses";
import { safeCcl } from "@/lib/prices/safe-ccl";
import { toDomainExpense } from "@/lib/expenses/types";
import { listMonths } from "@/lib/expenses/aggregate";
import {
  buildHref,
  filterExpenses,
  filteredTotals,
  parseExpenseFilters,
  sortExpenses,
  type RawSearchParams,
} from "@/lib/expenses/filters";
import { PeriodToggle } from "@/components/expenses/PeriodToggle";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { FilterBar } from "@/components/expenses/FilterBar";
import { ActiveFilterChips } from "@/components/expenses/ActiveFilterChips";
import { ResultsSummary } from "@/components/expenses/ResultsSummary";
import { SortControl } from "@/components/expenses/SortControl";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const BASE = "/gastos/movimientos";

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [rows, categories, ccl, raw] = await Promise.all([
    listExpenses(),
    getCategories(),
    safeCcl(),
    searchParams,
  ]);
  const expenses = rows.map(toDomainExpense);

  if (expenses.length === 0) {
    return (
      <EmptyState
        emoji="📜"
        title="Todavía no hay movimientos"
        hint="Subí el PDF del resumen de tus tarjetas para empezar."
        action={{ href: "/gastos/subir", label: "Subir resumen" }}
      />
    );
  }

  const months = listMonths(expenses);
  const categoryNames = categories.map((c) => c.name);
  const filters = parseExpenseFilters(raw, { months, categories: categoryNames });

  const visible = sortExpenses(filterExpenses(expenses, filters, ccl), filters.sort, filters.dir, ccl);
  const totals = filteredTotals(visible, ccl);

  // Switching month must keep the rest of the filters, so build each pill's href here.
  const periodHrefs = Object.fromEntries(
    ["resumen", ...months].map((value) => [
      value,
      buildHref(BASE, filters, { month: value === "resumen" ? null : value }),
    ])
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Movimientos</h1>
          <Link
            href={buildHref("/gastos", { ...filters, categories: [], sources: [], query: "" })}
            className="text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
          >
            ← Volver
          </Link>
        </div>
        <PeriodToggle
          months={months}
          active={filters.month ?? "resumen"}
          basePath={BASE}
          hrefs={periodHrefs}
        />
      </div>

      <FilterBar basePath={BASE} filters={filters} categories={categoryNames} />
      <ActiveFilterChips basePath={BASE} filters={filters} />
      <SortControl basePath={BASE} filters={filters} />
      <ResultsSummary totals={totals} />

      {visible.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="Ningún movimiento coincide"
          hint="Probá quitando algún filtro o ampliando el rango de fechas."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((e) => (
            <ExpenseRow key={e.id} expense={e} categories={categoryNames} />
          ))}
        </div>
      )}
    </div>
  );
}
