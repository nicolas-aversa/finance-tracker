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
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{totalLabel}</div>
            <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
              {formatArs(summary.combinedArs)}
            </div>
          </div>
          {momDeltaPct !== null && (
            // More spend vs last month is "bad" (red), less is "good" (green) → invert the sign for coloring.
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${pnlPillClass(-momDeltaPct)}`}>
              {formatPercentSigned(momDeltaPct)} vs mes ant.
            </span>
          )}
        </div>
        {summary.totalUsd > 0 && (
          <div className="mt-2 border-t border-neutral-900/5 pt-2 text-xs text-neutral-500 dark:border-white/5 dark:text-neutral-400">
            Incluye {formatUsd(summary.totalUsd)} en consumos en dólares.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isSummary ? (
          <>
            <Tile label="Comprometido en cuotas" value={formatArs(futureCommitmentArs)} sub="cuotas por vencer" />
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

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</div>
      <div className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{sub}</div>
    </div>
  );
}
