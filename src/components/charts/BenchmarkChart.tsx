"use client";

import { useMemo, useRef, useState } from "react";
import type { BenchmarkPoint } from "@/lib/domain/twr";
import { formatDate, formatPercentSigned } from "@/lib/format";
import { pnlTextClass } from "@/lib/pnl-color";

const WIDTH = 600;
const HEIGHT = 220;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

const PORTFOLIO_COLOR = { light: "#2a78d6", dark: "#3987e5" }; // accent blue (series 1)
const BENCHMARK_COLOR = { light: "#eb6834", dark: "#d95926" }; // orange (series 6) — clears CVD vs blue

export function BenchmarkChart({ points }: { points: BenchmarkPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    const withBench = points.filter((p) => p.benchmark !== null);
    if (points.length < 2 || withBench.length < 2) return null;

    const all = points.flatMap((p) => (p.benchmark !== null ? [p.portfolio, p.benchmark] : [p.portfolio]));
    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const range = maxV - minV || 1;
    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const x = (i: number) => PAD_X + (i / (points.length - 1)) * innerW;
    const y = (v: number) => PAD_TOP + innerH - ((v - minV) / range) * innerH;
    // Both series are indexed to 100 at t0, so 100 is the "flat" line. Without
    // it you can't tell gains from losses — it's the chart's only real gridline.
    const baselineY = minV <= 100 && maxV >= 100 ? y(100) : null;

    const line = (key: "portfolio" | "benchmark") =>
      points
        .map((p, i) => (p[key] === null ? null : `${x(i)} ${y(p[key] as number)}`))
        .filter((s): s is string => s !== null)
        .map((s, i) => `${i === 0 ? "M" : "L"} ${s}`)
        .join(" ");

    return { x, y, baselineY, portfolioPath: line("portfolio"), benchmarkPath: line("benchmark") };
  }, [points]);

  if (!chart) return null;

  const last = points[points.length - 1];
  const portfolioReturn = last.portfolio / 100 - 1;
  const benchmarkReturn = last.benchmark !== null ? last.benchmark / 100 - 1 : null;
  const active = activeIndex !== null ? points[activeIndex] : last;

  function handlePointer(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    const i = Math.round(((relX - PAD_X) / (WIDTH - PAD_X * 2)) * (points.length - 1));
    setActiveIndex(Math.max(0, Math.min(points.length - 1, i)));
  }

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Tu cartera vs S&amp;P 500</h2>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {activeIndex !== null ? formatDate(active.date) : "período"}
        </span>
      </div>

      <div className="mt-1 flex gap-4">
        <LegendValue
          label="Tu cartera"
          color={PORTFOLIO_COLOR}
          value={formatPercentSigned(activeIndex !== null ? active.portfolio / 100 - 1 : portfolioReturn)}
          valueClass={pnlTextClass(activeIndex !== null ? active.portfolio / 100 - 1 : portfolioReturn)}
        />
        <LegendValue
          label="S&P 500"
          color={BENCHMARK_COLOR}
          value={
            active.benchmark !== null
              ? formatPercentSigned(active.benchmark / 100 - 1)
              : formatPercentSigned(benchmarkReturn)
          }
          valueClass={pnlTextClass(active.benchmark !== null ? active.benchmark / 100 - 1 : benchmarkReturn)}
        />
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full touch-none select-none"
        onPointerMove={(e) => handlePointer(e.clientX)}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {chart.baselineY !== null && (
          <>
            <line
              x1={PAD_X}
              y1={chart.baselineY}
              x2={WIDTH - PAD_X}
              y2={chart.baselineY}
              className="stroke-neutral-200 dark:stroke-neutral-700"
              strokeWidth={1}
            />
            <text
              x={PAD_X}
              y={chart.baselineY - 4}
              fontSize={9}
              className="fill-neutral-400 dark:fill-neutral-500"
            >
              0%
            </text>
          </>
        )}

        <path
          d={chart.benchmarkPath}
          fill="none"
          className="viz-stroke"
          style={{
            // @ts-expect-error -- custom properties aren't in the CSSProperties type
            "--viz-light": BENCHMARK_COLOR.light,
            "--viz-dark": BENCHMARK_COLOR.dark,
          }}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={chart.portfolioPath}
          fill="none"
          className="viz-stroke"
          style={{
            // @ts-expect-error -- custom properties aren't in the CSSProperties type
            "--viz-light": PORTFOLIO_COLOR.light,
            "--viz-dark": PORTFOLIO_COLOR.dark,
          }}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* End markers: 2px surface ring so they stay legible where the lines cross */}
        {([
          ["benchmark", BENCHMARK_COLOR] as const,
          ["portfolio", PORTFOLIO_COLOR] as const,
        ]).map(([key, color]) => {
          const value = last[key];
          if (value === null) return null;
          return (
            <circle
              key={key}
              cx={chart.x(points.length - 1)}
              cy={chart.y(value)}
              r={4}
              className="viz-fill stroke-white dark:stroke-neutral-900"
              strokeWidth={2}
              style={{
                // @ts-expect-error custom props
                "--viz-light": color.light,
                "--viz-dark": color.dark,
              }}
            />
          );
        })}

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
          {formatDate(points[0].date)}
        </text>
        <text
          x={WIDTH - PAD_X}
          y={HEIGHT - 6}
          textAnchor="end"
          fontSize={9}
          className="fill-neutral-400 dark:fill-neutral-500"
        >
          {formatDate(points[points.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}

function LegendValue({
  label,
  color,
  value,
  valueClass,
}: {
  label: string;
  color: { light: string; dark: string };
  value: string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="viz-mark h-2.5 w-2.5 rounded-full"
        style={{
          // @ts-expect-error -- custom properties aren't in the CSSProperties type
          "--viz-light": color.light,
          "--viz-dark": color.dark,
        }}
      />
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
