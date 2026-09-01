import Link from "next/link";
import { listTransactions } from "@/lib/db/transactions";
import { toDomainTransaction } from "@/lib/domain/types";
import { computeAllTickerRows, computePortfolioTotals } from "@/lib/domain/dashboard";
import { computeBalanceHistory } from "@/lib/domain/balance-history";
import { buildBenchmarkComparison, computePortfolioTwrSeries, netCashflowByDate } from "@/lib/domain/twr";
import { getDashboardData } from "@/lib/prices";
import { KpiHeader } from "@/components/KpiHeader";
import { HoldingsTable } from "@/components/HoldingsTable";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PositionPnlChart } from "@/components/charts/PositionPnlChart";
import { BenchmarkChart } from "@/components/charts/BenchmarkChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const rows = await listTransactions();
  const transactions = rows.map(toDomainTransaction);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-3xl">📊</div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">Todavía no cargaste nada</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Cargá tu primera compra o venta para armar tu dashboard.
          </p>
        </div>
        <Link href="/add" className="btn-accent px-6">
          Cargar la primera
        </Link>
      </div>
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
  const portfolioTwr = computePortfolioTwrSeries(balanceHistory, netCashflowByDate(transactions));
  const benchmark = buildBenchmarkComparison(portfolioTwr, balanceSources.sp500History);

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

      <BenchmarkChart points={benchmark} />
      <AllocationChart rows={tickerRows} />
      <PositionPnlChart rows={tickerRows} />
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
