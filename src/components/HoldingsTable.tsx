import Link from "next/link";
import type { TickerRow } from "@/lib/domain/dashboard";
import { tickerColor } from "@/lib/domain/chart-colors";
import { formatPercent, formatPercentSigned, formatQty, formatUsd, formatUsdSigned } from "@/lib/format";
import { pnlTextClass } from "@/lib/pnl-color";

export function HoldingsTable({ rows }: { rows: TickerRow[] }) {
  const held = rows
    .filter((r) => r.qty > 0)
    .sort((a, b) => (b.marketValueUsd ?? 0) - (a.marketValueUsd ?? 0));

  if (held.length === 0) return null;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">Tenencia</h2>
      <div className="flex flex-col gap-3">
        {held.map((row, i) => {
          const color = tickerColor(i);
          const weight = row.weightPct ?? 0;
          return (
            <Link
              key={row.ticker}
              href={`/ticker/${encodeURIComponent(row.ticker)}`}
              className="block rounded-2xl border border-neutral-100 p-3 transition-colors hover:border-accent dark:border-neutral-800 dark:hover:border-accent"
            >
              {/* Header: ticker + value + weight badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="viz-mark h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      // @ts-expect-error -- custom properties aren't in the CSSProperties type
                      "--viz-light": color.light,
                      "--viz-dark": color.dark,
                    }}
                  />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{row.ticker}</span>
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {formatPercent(row.weightPct)}
                  </span>
                </div>
                <span className="text-base font-semibold money tabular-nums text-neutral-900 dark:text-neutral-100">
                  {formatUsd(row.marketValueUsd)}
                </span>
              </div>

              {/* Weight bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="viz-mark h-full rounded-full"
                  style={{
                    width: `${Math.max(2, weight * 100)}%`,
                    // @ts-expect-error -- custom properties aren't in the CSSProperties type
                    "--viz-light": color.light,
                    "--viz-dark": color.dark,
                  }}
                />
              </div>

              {/* Detail grid: cantidad / PPC / precio actual */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Cantidad" value={`${formatQty(row.qty)} u`} money />
                <Metric label="Precio prom." value={formatUsd(row.avgCostUsd)} money />
                <Metric label="Precio actual" value={formatUsd(row.currentPriceUsd)} money />
              </div>

              {/* Result + today */}
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-100 pt-2 text-xs dark:border-neutral-800">
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500">Resultado </span>
                  <span className={`font-semibold money tabular-nums ${pnlTextClass(row.unrealizedPnlUsd)}`}>
                    {formatUsdSigned(row.unrealizedPnlUsd)} ({formatPercentSigned(row.unrealizedRoi)})
                  </span>
                </div>
                {row.dailyChangeUsd !== null && (
                  <div>
                    <span className="text-neutral-400 dark:text-neutral-500">Hoy </span>
                    <span className={`font-semibold tabular-nums ${pnlTextClass(row.dailyChangeUsd)}`}>
                      {formatPercentSigned(row.dailyChangePct)}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-neutral-400 dark:text-neutral-500">{label}</div>
      <div
        className={`text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100 ${money ? "money" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
