import Link from "next/link";
import { notFound } from "next/navigation";
import { listExpenses } from "@/lib/db/expenses";
import { listBudgets } from "@/lib/db/budgets";
import { budgetProgress, monthProgressFor } from "@/lib/expenses/budgets";
import { BudgetList } from "@/components/expenses/BudgetList";
import { monthDisplay } from "@/lib/expenses/months";
import { safeCcl } from "@/lib/prices/safe-ccl";
import { toDomainExpense } from "@/lib/expenses/types";
import { categoryDetail, listMonths, periodSummary } from "@/lib/expenses/aggregate";
import { tickerColor, OTHER_BUCKET_COLOR } from "@/lib/domain/chart-colors";
import { formatArs, formatPercent, formatPercentSigned } from "@/lib/format";
import { pnlPillClass } from "@/lib/pnl-color";
import { PageHeader } from "@/components/PageHeader";
import { PeriodToggle } from "@/components/expenses/PeriodToggle";
import { CategoryTrend } from "@/components/expenses/CategoryTrend";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

function Tile({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-100 p-3 dark:border-neutral-800">
      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</p>
      {hint && <p className="mt-0.5 text-[11px]">{hint}</p>}
    </div>
  );
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ nombre: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const [rows, budgets, ccl, { nombre }, { mes }] = await Promise.all([
    listExpenses(),
    listBudgets(),
    safeCcl(),
    params,
    searchParams,
  ]);
  const category = decodeURIComponent(nombre);
  const expenses = rows.map(toDomainExpense);

  if (!expenses.some((e) => e.category === category)) notFound();

  const months = listMonths(expenses);
  const month = mes && mes !== "resumen" && months.includes(mes) ? mes : null;
  const active = month ?? "resumen";

  const detail = categoryDetail(expenses, category, month, ccl);
  const summary = periodSummary(expenses, month, ccl);

  // Reuse the donut's color for this category so the two views agree visually.
  // tickerColor already folds ranks past the palette into the gray bucket,
  // which is exactly what the donut does for the same category.
  const rank = summary.byCategory.findIndex((c) => c.category === category);
  const color = rank >= 0 ? tickerColor(rank) : OTHER_BUCKET_COLOR;

  const monthsWithSpend = detail.monthly.filter((p) => p.amountArs > 0).length;
  const avgArs = monthsWithSpend > 0 ? detail.monthly.reduce((s, p) => s + p.amountArs, 0) / monthsWithSpend : 0;

  // Budgets are monthly; in the accumulated view measure the most recent month.
  const budgetMonth = month ?? months[0] ?? null;
  const budgetSummary = budgetMonth === month ? summary : periodSummary(expenses, budgetMonth, ccl);
  const budgetRows = budgetMonth
    ? budgetProgress(
        budgets.filter((b) => b.category === category),
        budgetSummary.byCategory,
        monthProgressFor(budgetMonth, new Date().toISOString().slice(0, 10))
      )
    : [];

  const backHref = month ? `/gastos?mes=${month}` : "/gastos";
  const listHref = `/gastos/movimientos?cat=${encodeURIComponent(category)}${month ? `&mes=${month}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={category} backHref={backHref} />
      <PeriodToggle
        months={months}
        active={active}
        hrefs={Object.fromEntries(
          ["resumen", ...months].map((value) => [
            value,
            `/gastos/categoria/${encodeURIComponent(category)}${value === "resumen" ? "" : `?mes=${value}`}`,
          ])
        )}
      />

      <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-accent-soft to-white p-5 shadow-sm dark:border-neutral-800 dark:from-neutral-800 dark:to-neutral-900">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {month ? "Gasto del mes" : "Gasto acumulado"}
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {formatArs(detail.totalArs)}
        </p>
        {/* Only meaningful next to a single month's total — a month-over-month
            delta beside an accumulated figure would compare unrelated numbers. */}
        {month !== null && detail.momDeltaPct !== null && (
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${pnlPillClass(detail.momDeltaPct)}`}>
            {formatPercentSigned(detail.momDeltaPct)} vs mes anterior
          </span>
        )}
        {/* Two columns: at 375px a third one wraps "Promedio mensual" onto two
            lines and leaves its amount touching the tile edge. */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Tile label="Del total" value={formatPercent(detail.sharePct)} />
          <Tile label="Movimientos" value={String(detail.count)} />
          <Tile label="Promedio mensual" value={formatArs(avgArs)} />
        </div>
      </div>

      {detail.count === 0 ? (
        <EmptyState
          emoji="🗓️"
          title="Sin gastos en este período"
          hint="Probá con otro mes o mirá el acumulado."
        />
      ) : (
        <>
          {budgetRows.length > 0 && budgetMonth && (
            <BudgetList rows={budgetRows} monthHref="" monthLabel={monthDisplay(budgetMonth)} />
          )}

          <CategoryTrend monthly={detail.monthly} activeMonth={month} color={color} />

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">Dónde gastaste</h2>
            <div className="flex flex-col gap-3">
              {detail.topMerchants.map((m) => (
                <div key={m.merchant}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{m.merchant}</span>
                    <span className="shrink-0 tabular-nums text-neutral-700 dark:text-neutral-300">
                      {formatArs(m.amountArs)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="viz-mark h-full rounded-full"
                      style={{
                        width: `${detail.totalArs > 0 ? (m.amountArs / detail.totalArs) * 100 : 0}%`,
                        // @ts-expect-error custom props
                        "--viz-light": color.light,
                        "--viz-dark": color.dark,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Link
        href={listHref}
        className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
      >
        Ver los {detail.count} movimientos →
      </Link>
    </div>
  );
}
