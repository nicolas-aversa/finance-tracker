import { formatArs, formatUsd } from "@/lib/format";
import type { FilteredTotals } from "@/lib/expenses/filters";

/** Count and total for what the filters actually left on screen. */
export function ResultsSummary({ totals }: { totals: FilteredTotals }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
      <span>
        {totals.count} {totals.count === 1 ? "movimiento" : "movimientos"}
      </span>
      <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
        {formatArs(totals.combinedArs)}
        {totals.totalUsd !== 0 && (
          <span className="ml-1 font-normal text-neutral-400 dark:text-neutral-500">
            (incl. {formatUsd(totals.totalUsd)})
          </span>
        )}
      </span>
    </div>
  );
}
