import { formatArs } from "@/lib/format";
import { monthDisplay, monthShort } from "@/lib/expenses/months";
import type { MonthPoint } from "@/lib/expenses/aggregate";

const MAX_MONTHS = 12;

/**
 * One category's spend per billing month. Single series, single color — the
 * card's title names it, so no legend. The average hairline is what makes a
 * month readable as high or low without a full y-axis.
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
  if (points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.amountArs));
  const withSpend = points.filter((p) => p.amountArs > 0);
  const avg = withSpend.length > 0 ? withSpend.reduce((s, p) => s + p.amountArs, 0) / withSpend.length : 0;
  const avgPct = max > 0 ? (avg / max) * 100 : 0;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Evolución</h2>
        <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          promedio {formatArs(avg)}
        </span>
      </div>

      <div className="relative mt-5 h-28">
        {avg > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-neutral-200 dark:border-neutral-700"
            style={{ bottom: `${avgPct}%` }}
            aria-hidden
          />
        )}

        <div className="flex h-full items-end gap-1.5">
          {points.map((p) => {
            const pct = max > 0 ? (p.amountArs / max) * 100 : 0;
            const isActive = activeMonth === null || p.month === activeMonth;
            return (
              <div
                key={p.month}
                className="flex h-full flex-1 items-end"
                title={`${monthDisplay(p.month)}: ${formatArs(p.amountArs)}`}
              >
                <div
                  className="viz-mark mx-auto w-full max-w-5 rounded-t"
                  style={{
                    height: `${Math.max(pct, p.amountArs > 0 ? 2 : 0)}%`,
                    opacity: isActive ? 1 : 0.4,
                    // @ts-expect-error custom props
                    "--viz-light": color.light,
                    "--viz-dark": color.dark,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Short month names, not initials: "M" would be both marzo and mayo. */}
      <div className="mt-2 flex gap-1.5">
        {points.map((p) => (
          <span
            key={p.month}
            className={`flex-1 text-center text-[10px] ${
              p.month === activeMonth
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
