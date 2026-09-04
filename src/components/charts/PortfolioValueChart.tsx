"use client";

import { useMemo, useRef, useState } from "react";
import type { BalancePoint, InvestedPoint } from "@/lib/domain/balance-history";
import { TICKER_CATEGORICAL_COLORS } from "@/lib/domain/chart-colors";
import { formatDate, formatUsd, formatUsdSigned } from "@/lib/format";
import { pnlTextClass } from "@/lib/pnl-color";

const WIDTH = 600;
const HEIGHT = 200;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

const VALUE_COLOR = TICKER_CATEGORICAL_COLORS[0];
// The capital line is a reference, not a competing category, so it stays
// neutral and lets the value line carry the only colour in the plot.
const INVESTED_COLOR = { light: "#8d8c82", dark: "#6b6a62" };

/**
 * Portfolio value over time against the capital actually put in.
 *
 * The distance between the two lines is the gain — the one thing neither the
 * benchmark chart (relative, in %) nor the holdings list (today's snapshot)
 * shows. Both series are in USD on one axis, so the comparison is honest.
 */
export function PortfolioValueChart({
  balance,
  invested,
}: {
  balance: BalancePoint[];
  invested: InvestedPoint[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (balance.length < 2) return null;

    const values = balance.map((p) => p.valueUsd);
    const capitals = invested.map((p) => p.investedUsd);
    const maxV = Math.max(...values, ...capitals);
    // Anchored at zero: this is money, and a truncated axis would exaggerate
    // every wobble in the portfolio's value.
    const range = maxV || 1;
    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const x = (i: number) => PAD_X + (i / (balance.length - 1)) * innerW;
    const y = (v: number) => PAD_TOP + innerH - (v / range) * innerH;

    const line = (series: number[]) =>
      series.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

    // The band BETWEEN the two lines, not from zero: the gain is a few percent
    // of the value, so a fill down to the axis would swamp the one quantity
    // this chart exists to show.
    const backwards = capitals
      .map((v, i) => ({ v, i }))
      .reverse()
      .map(({ v, i }) => `L ${x(i)} ${y(v)}`)
      .join(" ");
    const area = `${line(values)} ${backwards} Z`;

    return { x, y, valuePath: line(values), investedPath: line(capitals), area };
  }, [balance, invested]);

  if (!chart) return null;

  const i = activeIndex ?? balance.length - 1;
  const value = balance[i].valueUsd;
  const capital = invested[i]?.investedUsd ?? 0;
  const gain = value - capital;

  function handlePointer(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    const idx = Math.round(((relX - PAD_X) / (WIDTH - PAD_X * 2)) * (balance.length - 1));
    setActiveIndex(Math.max(0, Math.min(balance.length - 1, idx)));
  }

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Valor y capital</h2>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {activeIndex !== null ? formatDate(balance[i].date) : "período"}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <Legend label="Valor" color={VALUE_COLOR} value={formatUsd(value)} />
        <Legend label="Invertido" color={INVESTED_COLOR} value={formatUsd(capital)} />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Ganancia</span>
          <span className={`money whitespace-nowrap text-xs font-semibold tabular-nums ${pnlTextClass(gain)}`}>
            {formatUsdSigned(gain)}
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full touch-none select-none"
        onPointerMove={(e) => handlePointer(e.clientX)}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {/* A wash over the gain, never a saturated block. */}
        <path
          d={chart.area}
          className="viz-fill"
          opacity={0.18}
          style={{
            // @ts-expect-error custom props
            "--viz-light": VALUE_COLOR.light,
            "--viz-dark": VALUE_COLOR.dark,
          }}
        />

        <path
          d={chart.investedPath}
          fill="none"
          className="viz-stroke"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{
            // @ts-expect-error custom props
            "--viz-light": INVESTED_COLOR.light,
            "--viz-dark": INVESTED_COLOR.dark,
          }}
        />
        <path
          d={chart.valuePath}
          fill="none"
          className="viz-stroke"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{
            // @ts-expect-error custom props
            "--viz-light": VALUE_COLOR.light,
            "--viz-dark": VALUE_COLOR.dark,
          }}
        />

        {/* End markers carry a 2px surface ring so they stay legible where the lines meet. */}
        {(
          [
            [invested[invested.length - 1]?.investedUsd ?? 0, INVESTED_COLOR] as const,
            [balance[balance.length - 1].valueUsd, VALUE_COLOR] as const,
          ]
        ).map(([v, color], idx) => (
          <circle
            key={idx}
            cx={chart.x(balance.length - 1)}
            cy={chart.y(v)}
            r={4}
            className="viz-fill stroke-white dark:stroke-neutral-900"
            strokeWidth={2}
            style={{
              // @ts-expect-error custom props
              "--viz-light": color.light,
              "--viz-dark": color.dark,
            }}
          />
        ))}

        {activeIndex !== null && (
          <line
            x1={chart.x(activeIndex)}
            y1={PAD_TOP}
            x2={chart.x(activeIndex)}
            y2={HEIGHT - PAD_BOTTOM}
            className="stroke-neutral-300 dark:stroke-neutral-700"
            strokeWidth={1}
          />
        )}

        <text x={PAD_X} y={HEIGHT - 6} fontSize={9} className="fill-neutral-400 dark:fill-neutral-500">
          {formatDate(balance[0].date)}
        </text>
        <text
          x={WIDTH - PAD_X}
          y={HEIGHT - 6}
          textAnchor="end"
          fontSize={9}
          className="fill-neutral-400 dark:fill-neutral-500"
        >
          {formatDate(balance[balance.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}

function Legend({
  label,
  color,
  value,
}: {
  label: string;
  color: { light: string; dark: string };
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="viz-mark h-2.5 w-2.5 rounded-full"
        style={{
          // @ts-expect-error custom props
          "--viz-light": color.light,
          "--viz-dark": color.dark,
        }}
      />
      <span className="whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="money whitespace-nowrap text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
    </div>
  );
}
