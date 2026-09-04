import Link from "next/link";
import { requireUserId } from "@/lib/auth/session";
import { EmptyState } from "@/components/EmptyState";
import { listTransactions } from "@/lib/db/transactions";
import { toDomainTransaction } from "@/lib/domain/types";
import { computeAllTickerRows, computePortfolioTotals } from "@/lib/domain/dashboard";
import { computeBalanceHistory } from "@/lib/domain/balance-history";
import { computeInvestedHistory } from "@/lib/domain/balance-history";
import { buildBenchmarkComparison, computePortfolioTwrSeries, netCashflowByDate } from "@/lib/domain/twr";
import { getDashboardData } from "@/lib/prices";
import { KpiHeader } from "@/components/KpiHeader";
import { HoldingsTable } from "@/components/HoldingsTable";
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart";
import { BenchmarkChart } from "@/components/charts/BenchmarkChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const rows = await listTransactions(userId);
  const transactions = rows.map(toDomainTransaction);

  if (transactions.length === 0) {
    return (
      <EmptyState
        emoji="📊"
        title="Todavía no cargaste nada"
        hint="Cargá tu primera compra o venta para armar tu dashboard."
        action={{ href: "/add", label: "Cargar la primera" }}
      />
    );
  }

  const tickers = [...new Set(transactions.map((t) => t.ticker))];
  const { snapshot, balanceSources } = await getDashboardData(tickers);
  const today = new Date().toISOString().slice(0, 10);

  const tickerRows = computeAllTickerRows(transactions, snapshot);
  const totals = computePortfolioTotals(transactions, tickerRows, today);
  const openCount = tickerRows.filter((r) => r.qty > 0).length;
  const closedCount = tickerRows.length - openCount;

  const balanceHistory = computeBalanceHistory(
    transactions,
    balanceSources.cedearHistoryByTicker,
    balanceSources.cclHistory
  );
  const cashflows = netCashflowByDate(transactions);
  const investedHistory = computeInvestedHistory(balanceHistory, cashflows);
  const portfolioTwr = computePortfolioTwrSeries(balanceHistory, cashflows);
  const benchmark = buildBenchmarkComparison(portfolioTwr, balanceSources.sp500History);

  // The reconstructed series ends at the last *published* close, which lags the
  // live quote by a day, and its CCL comes from a different provider than the
  // live one. Left alone, the chart's "Ganancia" and the header's "Resultado
  // total" disagree by a few dollars even though they are the same formula
  // (value − net capital). Anchoring the last point to the live market value
  // makes them reconcile, and is what "value over time" should mean anyway:
  // the last point is *now*, not yesterday's close.
  //
  // Done here rather than inside computeBalanceHistory on purpose — the TWR
  // series below feeds off the same history, and a live price in its final
  // point would contaminate that day's return.
  const chartBalance =
    balanceHistory.length > 0
      ? [
          ...balanceHistory.slice(0, -1),
          { ...balanceHistory[balanceHistory.length - 1], valueUsd: totals.marketValueUsd },
        ]
      : balanceHistory;

  const warnings = [...snapshot.warnings, ...balanceSources.warnings];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Dashboard</h1>

      <KpiHeader totals={totals} />

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      {/* Three cards, three different questions: how much do I have and how
          much of it did I put in; am I beating the market; what is it made of.
          The allocation and per-position P&L charts were dropped — the holdings
          list already carries both, weight bar and result per row. */}
      <PortfolioValueChart balance={chartBalance} invested={investedHistory} />
      <BenchmarkChart points={benchmark} />
      <HoldingsTable rows={tickerRows} />

      {closedCount > 0 && (
        <Link
          href="/log"
          className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-accent hover:underline dark:text-neutral-500"
        >
          + {closedCount} posición{closedCount > 1 ? "es" : ""} cerrada{closedCount > 1 ? "s" : ""} — ver en el
          historial
        </Link>
      )}
    </div>
  );
}
