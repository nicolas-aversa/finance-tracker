import { formatArs } from "@/lib/format";
import type { MonthPoint } from "@/lib/expenses/aggregate";
import { monthDisplay, monthLetter } from "@/lib/expenses/months";

const MAX_MONTHS = 12;

/**
 * This category's spend per billing month. Plain divs rather than SVG — the
 * bars are a simple vertical scale, and CSS heights keep them crisp at any
 * width. The selected month is highlighted; the rest give it context.
 */
export function CategoryTrend({
  monthly,
  activeMonth,
  color,
}: {
  monthly: MonthPoint[];
  activeMonth: string | null;
  color: { light: string; dark: string };
}) {
  const points = monthly.slice(-MAX_MONTHS);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.amountArs));
  const avg = points.reduce((s, p) => s + p.amountArs, 0) / points.length;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Evolución</h2>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          promedio {formatArs(avg)}
        </span>
      </div>

      <div className="mt-4 flex h-32 items-end gap-1.5">
        {points.map((p) => {
          const pct = max > 0 ? (p.amountArs / max) * 100 : 0;
          const isActive = activeMonth === null || p.month === activeMonth;
          return (
            <div key={p.month} className="flex flex-1 flex-col items-center gap-1" title={`${monthDisplay(p.month)}: ${formatArs(p.amountArs)}`}>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`viz-mark w-full rounded-t transition-opacity ${isActive ? "" : "opacity-30"}`}
                  style={{
                    height: `${Math.max(pct, p.amountArs > 0 ? 2 : 0)}%`,
                    // @ts-expect-error custom props
                    "--viz-light": color.light,
                    "--viz-dark": color.dark,
                  }}
                />
              </div>
              <span
                className={`text-[10px] tabular-nums ${
                  p.month === activeMonth
                    ? "font-semibold text-neutral-700 dark:text-neutral-300"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {monthLetter(p.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
