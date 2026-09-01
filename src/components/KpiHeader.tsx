import type { PortfolioTotals } from "@/lib/domain/dashboard";
import { formatPercent, formatPercentSigned, formatUsd, formatUsdSigned } from "@/lib/format";
import { pnlPillClass, pnlTextClass } from "@/lib/pnl-color";

export function KpiHeader({ totals }: { totals: PortfolioTotals }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Hero: valor de la cartera + variación del día */}
      <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-accent-soft to-white p-5 shadow-sm dark:border-neutral-800 dark:from-accent-soft dark:to-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Valor de la cartera</div>
            <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
              {formatUsd(totals.marketValueUsd)}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${pnlPillClass(totals.dailyChangeUsd)}`}
          >
            {formatPercentSigned(totals.dailyChangePct)} hoy
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2 border-t border-neutral-900/5 pt-3 dark:border-white/5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Resultado total</span>
          <span className={`text-sm font-semibold tabular-nums ${pnlTextClass(totals.totalPnlUsd)}`}>
            {formatUsdSigned(totals.totalPnlUsd)}
          </span>
          <span className={`text-xs tabular-nums ${pnlTextClass(totals.dailyChangeUsd)}`}>
            · {formatUsdSigned(totals.dailyChangeUsd)} hoy
          </span>
        </div>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Resultado no realizado"
          value={formatUsdSigned(totals.unrealizedPnlUsd)}
          sub={formatPercentSigned(totals.unrealizedRoi)}
          valueClass={pnlTextClass(totals.unrealizedPnlUsd)}
        />
        <Tile
          label="Resultado realizado"
          value={formatUsdSigned(totals.realizedPnlUsd)}
          sub="ganancias cerradas"
          valueClass={pnlTextClass(totals.realizedPnlUsd)}
        />
        <Tile
          label="TIR anual (XIRR)"
          value={totals.xirr === null ? "—" : formatPercentSigned(totals.xirr)}
          sub="rendimiento anualizado"
          valueClass={pnlTextClass(totals.xirr)}
        />
        <Tile
          label="Invertido (costo)"
          value={formatUsd(totals.costBasisUsd)}
          sub={`${formatPercent(totals.unrealizedRoi)} de resultado`}
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${valueClass ?? "text-neutral-900 dark:text-neutral-100"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{sub}</div>
    </div>
  );
}
