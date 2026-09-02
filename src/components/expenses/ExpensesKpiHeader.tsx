import { formatArs, formatDate, formatPercentSigned, formatUsd } from "@/lib/format";
import { pnlPillClass } from "@/lib/pnl-color";
import type { PeriodSummary } from "@/lib/expenses/aggregate";

export function ExpensesKpiHeader({
  summary,
  momDeltaPct,
  futureCommitmentArs,
  dueDate,
  totalLabel = "Gasto del mes",
  variant = "month",
}: {
  summary: PeriodSummary;
  momDeltaPct: number | null;
  futureCommitmentArs: number;
  dueDate: string | null;
  totalLabel?: string;
  variant?: "summary" | "month";
}) {
  const isSummary = variant === "summary";
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-accent-soft to-white p-5 shadow-sm dark:border-neutral-800 dark:from-accent-soft dark:to-neutral-900">
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{totalLabel}</div>
          {/* The delta sits beside the amount. Only the percentage rides there —
              "vs mes anterior" is a caption that may wrap — and the amount steps
              down a size on narrow phones so the pair always fits on one line. */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="money text-2xl font-semibold text-neutral-900 min-[360px]:text-3xl dark:text-neutral-100">
              {formatArs(summary.combinedArs)}
            </span>
            {momDeltaPct !== null && (
              <>
                {/* More spend vs last month is "bad" (red), less is "good" (green) → invert the sign for coloring. */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${pnlPillClass(-momDeltaPct)}`}
                >
                  {formatPercentSigned(momDeltaPct)}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">vs mes anterior</span>
              </>
            )}
          </div>
        </div>
        {summary.totalUsd > 0 && (
          <div className="money mt-2 border-t border-neutral-900/5 pt-2 text-xs text-neutral-500 dark:border-white/5 dark:text-neutral-400">
            Incluye {formatUsd(summary.totalUsd)} en consumos en dólares.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isSummary ? (
          <>
            <Tile label="Comprometido en cuotas" value={formatArs(futureCommitmentArs)} sub="cuotas por vencer" money />
            <Tile label="Movimientos" value={String(summary.count)} sub="en todos los meses" />
          </>
        ) : (
          <>
            <Tile label="Movimientos" value={String(summary.count)} sub="en el período" />
            <Tile label="Vencimiento" value={dueDate ? formatDate(dueDate) : "—"} sub="fecha de pago" />
          </>
        )}
      </div>
    </div>
  );
}

/** `money` marks the values the privacy toggle should blur — a count or a
 *  due date is not an amount. */
function Tile({ label, value, sub, money }: { label: string; value: string; sub: string; money?: boolean }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 ${money ? "money" : ""}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{sub}</div>
    </div>
  );
}
