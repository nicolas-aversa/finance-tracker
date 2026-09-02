import { formatArs, formatArsShort } from "@/lib/format";
import { monthDisplay, monthShort } from "@/lib/expenses/months";
import { TICKER_CATEGORICAL_COLORS } from "@/lib/domain/chart-colors";
import type { MonthPoint } from "@/lib/expenses/aggregate";

const MAX_MONTHS = 12;
// Past this many columns the value labels stop fitting side by side on a phone,
// so only the extremes get one and the rest fall back to the tooltip.
const LABEL_EVERY_UP_TO = 7;
// Bars top out at 85% of the plot so the value label always has room above the
// tallest one. Without this the label stacks on top of a full-height bar and
// pushes the whole column out of the container.
const PLOT_SCALE = 0.85;
const BAR = TICKER_CATEGORICAL_COLORS[0]; // one series -> slot 1, no legend needed

/**
 * Total spend per billing month. One series, one color, no breakdown — the
 * question this answers is "how much"; the category split is the donut's job
 * right below it.
 */
export function MonthlyTotals({ points }: { points: MonthPoint[] }) {
  const recent = points.slice(-MAX_MONTHS);
  if (recent.length < 2) return null;

  const max = Math.max(...recent.map((p) => p.amountArs));
  const heightPct = (v: number) => (max > 0 ? (v / max) * 100 * PLOT_SCALE : 0);
  const avg = recent.reduce((s, p) => s + p.amountArs, 0) / recent.length;
  const latest = recent[recent.length - 1].month;
  const labelAll = recent.length <= LABEL_EVERY_UP_TO;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Gasto por mes</h2>
        <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          promedio {formatArs(avg)}
        </span>
      </div>

      <div className="relative mt-4 h-32">
        {/* Average reference: a solid hairline, one step off the surface. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-neutral-200 dark:border-neutral-700"
          style={{ bottom: `${heightPct(avg)}%` }}
          aria-hidden
        />

        {/* `relative` puts the bars above the absolutely-positioned average line,
            which would otherwise paint over them. */}
        <div className="relative flex h-full items-end gap-2">
          {recent.map((p) => {
            const pct = heightPct(p.amountArs);
            const showLabel = labelAll || p.month === latest || p.amountArs === max;
            return (
              <div
                key={p.month}
                className="relative h-full flex-1"
                title={`${monthDisplay(p.month)}: ${formatArs(p.amountArs)}`}
              >
                <div
                  className="viz-mark absolute inset-x-0 bottom-0 mx-auto w-full max-w-6 rounded-t"
                  style={{
                    height: `${Math.max(pct, p.amountArs > 0 ? 2 : 0)}%`,
                    // @ts-expect-error custom props
                    "--viz-light": BAR.light,
                    "--viz-dark": BAR.dark,
                  }}
                />
                {showLabel && (
                  <span
                    className="absolute inset-x-0 whitespace-nowrap text-center text-[10px] font-medium tabular-nums text-neutral-600 dark:text-neutral-400"
                    style={{ bottom: `calc(${Math.max(pct, 2)}% + 4px)` }}
                  >
                    {formatArsShort(p.amountArs)}
                  </span>
                )}
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
              p.month === latest
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
