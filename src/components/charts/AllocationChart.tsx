import type { TickerRow } from "@/lib/domain/dashboard";
import { OTHER_BUCKET_COLOR, tickerColor } from "@/lib/domain/chart-colors";
import { formatUsd } from "@/lib/format";

const MAX_DISTINCT = 6;

type Slice = { key: string; label: string; valueUsd: number; color: { light: string; dark: string } };

/**
 * Portfolio weight per ticker as a single 100% bar plus a legend.
 *
 * A donut here was the wrong form: with two or three holdings it is a 2-slice
 * pie, and comparing close arcs is harder than comparing lengths on one line.
 * The bar reads the same at 2 holdings and at 8, and the legend carries the
 * numbers so nothing depends on matching colors by eye.
 */
export function AllocationChart({ rows }: { rows: TickerRow[] }) {
  const held = rows
    .filter((r) => (r.marketValueUsd ?? 0) > 0)
    .sort((a, b) => (b.marketValueUsd ?? 0) - (a.marketValueUsd ?? 0));

  if (held.length === 0) return null;

  const slices: Slice[] = held.slice(0, MAX_DISTINCT).map((r, i) => ({
    key: r.ticker,
    label: r.ticker,
    valueUsd: r.marketValueUsd ?? 0,
    color: tickerColor(i),
  }));

  const rest = held.slice(MAX_DISTINCT);
  if (rest.length > 0) {
    slices.push({
      key: "__other__",
      label: `Otros (${rest.length})`,
      valueUsd: rest.reduce((s, r) => s + (r.marketValueUsd ?? 0), 0),
      color: OTHER_BUCKET_COLOR,
    });
  }

  const total = slices.reduce((s, x) => s + x.valueUsd, 0);
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Distribución</h2>
        <span className="money text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatUsd(total)}</span>
      </div>

      {/* gap-[2px] is the surface gap that separates segments — no borders drawn on the marks */}
      <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
        {slices.map((s) => (
          <div
            key={s.key}
            className="viz-mark h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${pct(s.valueUsd)}%`,
              // @ts-expect-error custom props
              "--viz-light": s.color.light,
              "--viz-dark": s.color.dark,
            }}
            title={`${s.label}: ${formatUsd(s.valueUsd)} (${pct(s.valueUsd).toFixed(1)}%)`}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span
              className="viz-mark h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                // @ts-expect-error custom props
                "--viz-light": s.color.light,
                "--viz-dark": s.color.dark,
              }}
            />
            <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">{s.label}</span>
            <span className="money tabular-nums text-neutral-500 dark:text-neutral-400">{formatUsd(s.valueUsd)}</span>
            <span className="w-11 text-right tabular-nums text-neutral-400 dark:text-neutral-500">
              {pct(s.valueUsd).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
