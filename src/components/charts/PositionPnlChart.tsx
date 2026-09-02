import type { TickerRow } from "@/lib/domain/dashboard";
import { STATUS_COLOR } from "@/lib/domain/chart-colors";
import { formatPercentSigned, formatUsdSigned } from "@/lib/format";
import { pnlTextClass } from "@/lib/pnl-color";

/**
 * Unrealized P&L per open position, as diverging bars from a zero baseline.
 * Profit ($) and return (%) now share the same basis, so the bar direction and
 * the % label always agree — this replaces the old separate Profit/ROI charts
 * that could disagree in sign.
 */
export function PositionPnlChart({ rows }: { rows: TickerRow[] }) {
  const withPnl = rows
    .filter((r): r is TickerRow & { unrealizedPnlUsd: number } => r.qty > 0 && r.unrealizedPnlUsd !== null)
    .sort((a, b) => b.unrealizedPnlUsd - a.unrealizedPnlUsd);

  if (withPnl.length === 0) return null;

  const maxAbs = Math.max(...withPnl.map((r) => Math.abs(r.unrealizedPnlUsd)), 0.01);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Resultado por posición</h2>

      <div className="mt-4 flex flex-col gap-2.5">
        {withPnl.map((r) => {
          const isPositive = r.unrealizedPnlUsd >= 0;
          const color = isPositive ? STATUS_COLOR.good : STATUS_COLOR.critical;
          const widthPct = (Math.abs(r.unrealizedPnlUsd) / maxAbs) * 50;

          return (
            <div key={r.ticker} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0 font-medium text-neutral-700 dark:text-neutral-300">{r.ticker}</span>

              <div className="relative h-4 flex-1">
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-neutral-300 dark:bg-neutral-700" />
                <div
                  className={`viz-mark absolute inset-y-0 h-4 ${isPositive ? "left-1/2 rounded-r-[4px]" : "right-1/2 rounded-l-[4px]"}`}
                  style={{
                    width: `${widthPct}%`,
                    // @ts-expect-error -- custom properties aren't in the CSSProperties type
                    "--viz-light": color.light,
                    "--viz-dark": color.dark,
                  }}
                  title={`${r.ticker}: ${formatUsdSigned(r.unrealizedPnlUsd)} (${formatPercentSigned(r.unrealizedRoi)})`}
                />
              </div>

              <span className={`w-28 shrink-0 text-right text-xs money tabular-nums ${pnlTextClass(r.unrealizedPnlUsd)}`}>
                {formatUsdSigned(r.unrealizedPnlUsd)}
                <span className="text-neutral-400 dark:text-neutral-500"> ({formatPercentSigned(r.unrealizedRoi)})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
