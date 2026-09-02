import Link from "next/link";
import { formatArs, formatPercent } from "@/lib/format";
import { STATUS_COLOR } from "@/lib/domain/chart-colors";
import type { IncomeUse } from "@/lib/expenses/income";

const BAR: Record<IncomeUse["status"], { light: string; dark: string }> = {
  ok: STATUS_COLOR.good,
  warn: { light: "#d97706", dark: "#f59e0b" },
  over: STATUS_COLOR.critical,
};

const TEXT: Record<IncomeUse["status"], string> = {
  ok: "text-neutral-500 dark:text-neutral-400",
  warn: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
};

/** What share of the month's income the spending took. */
export function IncomeUseBar({ use, monthLabel }: { use: IncomeUse; monthLabel: string }) {
  const color = BAR[use.status];

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Sobre tus ingresos
          <span className="ml-1.5 font-normal text-neutral-400 dark:text-neutral-500">· {monthLabel}</span>
        </h2>
        <Link
          href="/gastos/presupuestos"
          className="text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
        >
          Editar
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="money whitespace-nowrap text-neutral-500 dark:text-neutral-400">
          {formatArs(use.spentArs)} de {formatArs(use.incomeArs)}
        </span>
        <span className={`whitespace-nowrap text-xs font-medium ${TEXT[use.status]}`}>
          {formatPercent(use.ratio)}
        </span>
      </div>

      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="viz-mark h-full rounded-full"
          style={{
            width: `${Math.min(use.ratio, 1) * 100}%`,
            // @ts-expect-error custom props
            "--viz-light": color.light,
            "--viz-dark": color.dark,
          }}
        />
      </div>

      <p className={`money mt-1.5 text-[11px] ${TEXT[use.status]}`}>
        {use.leftoverArs >= 0
          ? `Te quedaron ${formatArs(use.leftoverArs)}`
          : `Gastaste ${formatArs(-use.leftoverArs)} más de lo que entró`}
      </p>
    </div>
  );
}
