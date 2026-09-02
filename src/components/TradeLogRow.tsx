import Link from "next/link";
import type { DomainTransaction } from "@/lib/domain/types";
import type { ProfitRoi } from "@/lib/domain/transaction-math";
import { computeTransactionDerived } from "@/lib/domain/transaction-math";
import { formatDate, formatPercent, formatQty, formatUsd } from "@/lib/format";

function profitClass(value: number | null | undefined) {
  if (value === null || value === undefined) return "text-neutral-500 dark:text-neutral-400";
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-neutral-500 dark:text-neutral-400";
}

export function TradeLogRow({ tx, metrics }: { tx: DomainTransaction; metrics: ProfitRoi | null }) {
  const { usdPrice, usdAmount } = computeTransactionDerived(tx);

  return (
    <Link
      href={`/log/${tx.id}/edit`}
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{tx.ticker}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              tx.type === "BUY"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
            }`}
          >
            {tx.type === "BUY" ? "Compra" : "Venta"}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {formatDate(tx.tradeDate)} · <span className="money">{formatQty(tx.qty)} u. · {formatUsd(usdPrice)}/u</span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium money tabular-nums text-neutral-900 dark:text-neutral-100">
          {formatUsd(usdAmount)}
        </div>
        {metrics && (
          <div className={`text-xs money tabular-nums ${profitClass(metrics.profit)}`}>
            {formatUsd(metrics.profit)} ({formatPercent(metrics.roi)})
          </div>
        )}
      </div>
    </Link>
  );
}
