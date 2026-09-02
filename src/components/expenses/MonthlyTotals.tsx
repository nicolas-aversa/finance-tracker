import { formatArs } from "@/lib/format";
import { monthDisplay, monthShort } from "@/lib/expenses/months";
import { TICKER_CATEGORICAL_COLORS } from "@/lib/domain/chart-colors";
import type { MonthPoint } from "@/lib/expenses/aggregate";

const MAX_MONTHS = 12;
const BAR = TICKER_CATEGORICAL_COLORS[0]; // one series -> slot 1, no legend needed

/**
 * Total spend per billing month. One series, one color, no breakdown — the
 * question this answers is "how much", and the category split is the donut's
 * job right below it.
 */
export function MonthlyTotals({ points }: { points: MonthPoint[] }) {
  const recent = points.slice(-MAX_MONTHS);
  if (recent.length < 2) return null;

  const max = Math.max(...recent.map((p) => p.amountArs));
  const avg = recent.reduce((s, p) => s + p.amountArs, 0) / recent.length;
  const avgPct = max > 0 ? (avg / max) * 100 : 0;
  const latest = recent[recent.length - 1];

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Gasto por mes</h2>
        <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          promedio {formatArs(avg)}
        </span>
      </div>

      <div className="relative mt-6 h-36">
        {/* Average reference: a solid hairline, one step off the surface. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-neutral-200 dark:border-neutral-700"
          style={{ bottom: `${avgPct}%` }}
          aria-hidden
        />

        <div className="flex h-full items-end gap-2">
          {recent.map((p) => {
            const pct = max > 0 ? (p.amountArs / max) * 100 : 0;
            const isLatest = p.month === latest.month;
            return (
              <div
                key={p.month}
                className="group flex h-full flex-1 flex-col justify-end"
                title={`${monthDisplay(p.month)}: ${formatArs(p.amountArs)}`}
              >
                {/* The newest month carries the only direct label. */}
                {isLatest && (
                  <span className="mb-1 whitespace-nowrap text-center text-[10px] font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                    {formatArs(p.amountArs)}
                  </span>
                )}
                <div
                  className="viz-mark mx-auto w-full max-w-6 rounded-t transition-opacity"
                  style={{
                    height: `${Math.max(pct, p.amountArs > 0 ? 2 : 0)}%`,
                    opacity: isLatest ? 1 : 0.55,
                    // @ts-expect-error custom props
                    "--viz-light": BAR.light,
                    "--viz-dark": BAR.dark,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        {recent.map((p) => (
          <span
            key={p.month}
            className={`flex-1 text-center text-[10px] ${
              p.month === latest.month
                ? "font-semibold text-neutral-700 dark:text-neutral-300"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            {monthShort(p.month)}
          </span>
        ))}
      </div>
    </div>
  );
}
