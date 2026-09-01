import Link from "next/link";
import { listTransactions } from "@/lib/db/transactions";
import { toDomainTransaction } from "@/lib/domain/types";
import { computeRealizedBySellId, computeTransactionRowMetrics } from "@/lib/domain/position";
import { getMarketSnapshot } from "@/lib/prices";
import { TradeLogRow } from "@/components/TradeLogRow";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const rows = await listTransactions();
  const transactions = rows.map(toDomainTransaction);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-3xl">📜</div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">Todavía no hay historial</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Acá vas a ver todas tus compras y ventas.
          </p>
        </div>
        <Link href="/add" className="btn-accent px-6">
          Cargar la primera
        </Link>
      </div>
    );
  }

  const tickers = [...new Set(transactions.map((t) => t.ticker))];
  const snapshot = await getMarketSnapshot(tickers);
  const realizedBySellId = computeRealizedBySellId(transactions);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Historial</h1>
        <Link href="/add" className="text-sm font-medium text-accent hover:text-accent-hover">
          + Cargar
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {transactions.map((tx) => (
          <TradeLogRow
            key={tx.id}
            tx={tx}
            metrics={computeTransactionRowMetrics(tx, snapshot.cedearUsd[tx.ticker] ?? null, realizedBySellId)}
          />
        ))}
      </div>
    </div>
  );
}
