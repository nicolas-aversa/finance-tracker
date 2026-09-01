import type { TickerRow } from "@/lib/domain/dashboard";
import { OTHER_BUCKET_COLOR, tickerColor } from "@/lib/domain/chart-colors";
import { formatUsd, formatUsdCompact } from "@/lib/format";

const MAX_DISTINCT_SLICES = 6;
const CENTER = 100;
const OUTER_R = 80;
const INNER_R = 50;
const GAP_ANGLE = 2 / OUTER_R; // ~2px gap between slices, as an angle at the outer radius

type Slice = {
  key: string;
  label: string;
  valueUsd: number;
  color: { light: string; dark: string };
};

function polarToCartesian(radius: number, angleRad: number) {
  return { x: CENTER + radius * Math.sin(angleRad), y: CENTER - radius * Math.cos(angleRad) };
}

function donutSlicePath(a0: number, a1: number): string {
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  const outerStart = polarToCartesian(OUTER_R, a0);
  const outerEnd = polarToCartesian(OUTER_R, a1);
  const innerEnd = polarToCartesian(INNER_R, a1);
  const innerStart = polarToCartesian(INNER_R, a0);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function AllocationChart({ rows }: { rows: TickerRow[] }) {
  const held = rows
    .filter((r) => (r.marketValueUsd ?? 0) > 0)
    .sort((a, b) => (b.marketValueUsd ?? 0) - (a.marketValueUsd ?? 0));

  if (held.length === 0) return null;

  const distinct = held.slice(0, MAX_DISTINCT_SLICES);
  const rest = held.slice(MAX_DISTINCT_SLICES);

  const slices: Slice[] = distinct.map((r, i) => ({
    key: r.ticker,
    label: r.ticker,
    valueUsd: r.marketValueUsd ?? 0,
    color: tickerColor(i),
  }));

  if (rest.length > 0) {
    slices.push({
      key: "__other__",
      label: `Otros (${rest.length})`,
      valueUsd: rest.reduce((sum, r) => sum + (r.marketValueUsd ?? 0), 0),
      color: OTHER_BUCKET_COLOR,
    });
  }

  const total = slices.reduce((sum, s) => sum + s.valueUsd, 0);

  const arcs = slices.reduce<{ slice: Slice; path: string; endAngle: number }[]>((acc, s) => {
    const cumulative = acc.length === 0 ? 0 : acc[acc.length - 1].endAngle;
    const sliceAngle = (s.valueUsd / total) * 2 * Math.PI;
    const pad = Math.min(GAP_ANGLE / 2, (sliceAngle / 2) * 0.9);
    const a0 = cumulative + pad;
    const a1 = cumulative + sliceAngle - pad;
    acc.push({ slice: s, path: donutSlicePath(a0, Math.max(a1, a0)), endAngle: cumulative + sliceAngle });
    return acc;
  }, []);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Distribución</h2>

      <div className="relative mx-auto mt-3 w-full max-w-[220px]">
        <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label="Distribución de la posición por ticker">
          {arcs.map(({ slice, path }) => (
            <path
              key={slice.key}
              d={path}
              className="viz-fill"
              style={{
                // @ts-expect-error -- custom properties aren't in the CSSProperties type
                "--viz-light": slice.color.light,
                "--viz-dark": slice.color.dark,
              }}
            >
              <title>
                {slice.label}: {formatUsd(slice.valueUsd)} ({((slice.valueUsd / total) * 100).toFixed(1)}%)
              </title>
            </path>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Total</span>
          <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatUsdCompact(total)}
          </span>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span
              className="viz-mark h-3 w-3 shrink-0 rounded-full"
              style={{
                // @ts-expect-error -- custom properties aren't in the CSSProperties type
                "--viz-light": s.color.light,
                "--viz-dark": s.color.dark,
              }}
            />
            <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">{s.label}</span>
            <span className="text-neutral-500 dark:text-neutral-400">{formatUsd(s.valueUsd)}</span>
            <span className="w-12 text-right text-neutral-400 dark:text-neutral-500">
              {((s.valueUsd / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
