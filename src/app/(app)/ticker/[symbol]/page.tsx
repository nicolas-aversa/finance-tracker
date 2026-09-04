import Link from "next/link";
import { notFound } from "next/navigation";
import { listTransactions } from "@/lib/db/transactions";
import { toDomainTransaction } from "@/lib/domain/types";
import { computeAllTickerRows } from "@/lib/domain/dashboard";
import { computeRealizedBySellId, computeTransactionRowMetrics } from "@/lib/domain/position";
import { sortTransactions } from "@/lib/domain/trade-filters";
import { computeTransactionDerived } from "@/lib/domain/transaction-math";
import { getMarketSnapshot } from "@/lib/prices";
import { tickerColor, OTHER_BUCKET_COLOR } from "@/lib/domain/chart-colors";
import { formatPercent, formatPercentSigned, formatQty, formatUsd, formatUsdSigned } from "@/lib/format";
import { pnlPillClass, pnlTextClass } from "@/lib/pnl-color";
import { PageHeader } from "@/components/PageHeader";
import { TradeLogRow } from "@/components/TradeLogRow";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

function Tile({ label, value, sub, money }: { label: string; value: string; sub?: string; money?: boolean }) {
  return (
    <div className="rounded-2xl border border-neutral-100 p-3 dark:border-neutral-800">
      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 ${money ? "money" : ""}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{sub}</p>}
    </div>
  );
}

export default async function TickerPage({ params }: { params: Promise<{ symbol: string }> }) {
  const [rows, { symbol }] = await Promise.all([listTransactions(), params]);
  const ticker = decodeURIComponent(symbol).toUpperCase();
  const transactions = rows.map(toDomainTransaction);

  if (!transactions.some((t) => t.ticker === ticker)) notFound();

  const allTickers = [...new Set(transactions.map((t) => t.ticker))];
  const snapshot = await getMarketSnapshot(allTickers);

  // Weights come from the whole portfolio, so compute every row and pick ours.
  const tickerRows = computeAllTickerRows(transactions, snapshot);
  const row = tickerRows.find((r) => r.ticker === ticker)!;

  const mine = transactions.filter((t) => t.ticker === ticker);
  const trades = sortTransactions(mine, "fecha", "desc");
  const realizedBySellId = computeRealizedBySellId(transactions);

  const buys = mine.filter((t) => t.type === "BUY");
  const sells = mine.filter((t) => t.type === "SELL");
  const investedUsd = buys.reduce((s, t) => s + computeTransactionDerived(t).usdAmount, 0);

  // Same colour the allocation chart gives this ticker, so the two views agree.
  const held = tickerRows
    .filter((r) => (r.marketValueUsd ?? 0) > 0)
    .sort((a, b) => (b.marketValueUsd ?? 0) - (a.marketValueUsd ?? 0));
  const rank = held.findIndex((r) => r.ticker === ticker);
  const color = rank >= 0 ? tickerColor(rank) : OTHER_BUCKET_COLOR;

  const isOpen = row.qty > 0;
  const totalPnl = (row.unrealizedPnlUsd ?? 0) + row.realizedPnlUsd;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={ticker} backHref="/" />

      <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-accent-soft to-white p-5 shadow-sm dark:border-neutral-800 dark:from-accent-soft dark:to-neutral-900">
        <div className="flex items-center gap-2">
          <span
            className="viz-mark h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              // @ts-expect-error custom props
              "--viz-light": color.light,
              "--viz-dark": color.dark,
            }}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isOpen ? "Tenencia actual" : "Posición cerrada"}
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="money text-2xl font-semibold text-neutral-900 min-[360px]:text-3xl dark:text-neutral-100">
            {isOpen ? formatUsd(row.marketValueUsd) : formatUsdSigned(row.realizedPnlUsd)}
          </span>
          {isOpen && row.unrealizedRoi !== null && (
            <>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${pnlPillClass(row.unrealizedRoi)}`}
              >
                {formatPercentSigned(row.unrealizedRoi)}
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">sin realizar</span>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {isOpen ? (
            <>
              <Tile label="Cantidad" value={`${formatQty(row.qty)} u`} money />
              <Tile label="Del total" value={row.weightPct !== null ? formatPercent(row.weightPct) : "—"} />
              <Tile label="Precio prom." value={formatUsd(row.avgCostUsd)} money />
              <Tile label="Precio actual" value={formatUsd(row.currentPriceUsd)} money />
            </>
          ) : (
            <>
              <Tile label="Operaciones" value={String(mine.length)} />
              <Tile label="Invertido" value={formatUsd(investedUsd)} money />
            </>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Resultado</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {isOpen && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-neutral-500 dark:text-neutral-400">Sin realizar</span>
              <span className={`money tabular-nums font-medium ${pnlTextClass(row.unrealizedPnlUsd)}`}>
                {formatUsdSigned(row.unrealizedPnlUsd)}
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-neutral-500 dark:text-neutral-400">
              Realizado
              <span className="ml-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                {sells.length} {sells.length === 1 ? "venta" : "ventas"}
              </span>
            </span>
            <span className={`money tabular-nums font-medium ${pnlTextClass(row.realizedPnlUsd)}`}>
              {formatUsdSigned(row.realizedPnlUsd)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Total</span>
            <span className={`money tabular-nums font-semibold ${pnlTextClass(totalPnl)}`}>
              {formatUsdSigned(totalPnl)}
            </span>
          </div>
        </div>
      </div>

      {trades.length === 0 ? (
        <EmptyState emoji="📜" title="Sin operaciones" />
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Operaciones · {trades.length}
          </h2>
          {trades.map((tx) => (
            <TradeLogRow
              key={tx.id}
              tx={tx}
              metrics={computeTransactionRowMetrics(tx, snapshot.cedearUsd[tx.ticker] ?? null, realizedBySellId)}
            />
          ))}
        </div>
      )}

      <Link
        href={`/log?ticker=${encodeURIComponent(ticker)}`}
        className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
      >
        Ver en el historial →
      </Link>
    </div>
  );
}
