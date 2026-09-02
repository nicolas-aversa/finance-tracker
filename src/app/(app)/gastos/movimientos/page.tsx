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
import { EXPENSE_SOURCES } from "@/lib/db/schema";
import { SOURCE_LABEL } from "@/lib/expenses/labels";
import { PeriodToggle } from "@/components/expenses/PeriodToggle";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { FilterBar } from "@/components/expenses/FilterBar";
import { FilterDropdown } from "@/components/expenses/FilterDropdown";
import { ActiveFilterChips } from "@/components/expenses/ActiveFilterChips";
import { ResultsSummary } from "@/components/expenses/ResultsSummary";
import { SortMenu } from "@/components/expenses/SortMenu";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const BASE = "/gastos/movimientos";

// "manual" is the source for hand-entered movements; there are none, and it
// isn't a card, so it has no place in a card filter.
const FILTERABLE_SOURCES = EXPENSE_SOURCES.filter((s) => s !== "manual");

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
            href={buildHref("/gastos", { ...filters, categories: [], sources: [] })}
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

      {/* Two rows: the three controls side by side truncate to "Cat…" on a
          320px screen. */}
      <div className="flex items-start gap-2">
        <FilterDropdown
          basePath={BASE}
          filters={filters}
          label="Categoría"
          allLabel="Todas las categorías"
          options={categoryNames.map((c) => ({ value: c, label: c }))}
          selected={filters.categories}
          patchFor={(categories) => ({ categories })}
        />
        <FilterDropdown
          basePath={BASE}
          filters={filters}
          label="Tarjeta"
          allLabel="Todas las tarjetas"
          options={FILTERABLE_SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
          selected={filters.sources}
          patchFor={(sources) => ({ sources: sources as typeof filters.sources })}
        />
      </div>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <FilterBar basePath={BASE} filters={filters} />
        </div>
        <SortMenu basePath={BASE} filters={filters} />
      </div>

      <ActiveFilterChips basePath={BASE} filters={filters} />
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
