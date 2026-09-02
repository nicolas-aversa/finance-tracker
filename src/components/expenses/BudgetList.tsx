import Link from "next/link";
import { formatArs } from "@/lib/format";
import { STATUS_COLOR } from "@/lib/domain/chart-colors";
import type { BudgetProgress, BudgetStatus } from "@/lib/expenses/budgets";
import { totalBudgetProgress } from "@/lib/expenses/budgets";

const BAR_COLOR: Record<BudgetStatus, { light: string; dark: string }> = {
  ok: STATUS_COLOR.good,
  warn: { light: "#d97706", dark: "#f59e0b" },
  over: STATUS_COLOR.critical,
};

const TEXT_CLASS: Record<BudgetStatus, string> = {
  ok: "text-neutral-500 dark:text-neutral-400",
  warn: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
};

function Bar({ ratio, status }: { ratio: number; status: BudgetStatus }) {
  const color = BAR_COLOR[status];
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
      <div
        className="viz-mark h-full rounded-full"
        style={{
          width: `${Math.min(ratio, 1) * 100}%`,
          // @ts-expect-error custom props
          "--viz-light": color.light,
          "--viz-dark": color.dark,
        }}
      />
    </div>
  );
}

/**
 * Budget progress for the selected month. Shows only categories with a limit
 * set — the point is what you decided to watch, not everything you spent on.
 */
export function BudgetList({
  rows,
  monthHref,
  monthLabel,
}: {
  rows: BudgetProgress[];
  /** Suffix carrying the selected month through to the category detail links. */
  monthHref: string;
  /** Which month the progress refers to — budgets are monthly, so in the
   *  accumulated view this says which one is being measured. */
  monthLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 p-5 text-center dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sin presupuestos</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Poné un límite mensual por categoría para saber cómo venís.
        </p>
        <Link href="/gastos/presupuestos" className="btn-accent mt-3 inline-block px-5">
          Definir presupuestos
        </Link>
      </div>
    );
  }

  const total = totalBudgetProgress(rows);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Presupuestos
          <span className="ml-1.5 font-normal text-neutral-400 dark:text-neutral-500">· {monthLabel}</span>
        </h2>
        <Link
          href="/gastos/presupuestos"
          className="text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
        >
          Editar
        </Link>
      </div>

      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="money text-neutral-500 dark:text-neutral-400">
          {formatArs(total.spentArs)} de {formatArs(total.budgetArs)}
        </span>
        <span className={`text-xs font-medium ${TEXT_CLASS[total.status]}`}>
          {(total.ratio * 100).toFixed(0)}%
        </span>
      </div>
      <Bar ratio={total.ratio} status={total.status} />

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <Link
            key={r.category}
            href={`/gastos/categoria/${encodeURIComponent(r.category)}${monthHref}`}
            className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{r.category}</span>
              <span className="shrink-0 money tabular-nums text-neutral-700 dark:text-neutral-300">
                {formatArs(r.spentArs)}
                <span className="text-neutral-400 dark:text-neutral-500"> / {formatArs(r.budgetArs)}</span>
              </span>
            </div>
            <Bar ratio={r.ratio} status={r.status} />
            <p className={`money mt-1 text-[11px] ${TEXT_CLASS[r.status]}`}>
              {r.status === "over"
                ? `te pasaste ${formatArs(-r.remainingArs)}`
                : `te quedan ${formatArs(r.remainingArs)}`}
              {r.projectedArs !== null && (
                <span className="text-neutral-400 dark:text-neutral-500">
                  {" · "}proyectado {formatArs(r.projectedArs)}
                </span>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
