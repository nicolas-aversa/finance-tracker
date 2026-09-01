import { notFound } from "next/navigation";
import { getTransaction, listTransactions } from "@/lib/db/transactions";
import { toDomainTransaction } from "@/lib/domain/types";
import { computeHeldTickers } from "@/lib/domain/dashboard";
import { TransactionForm } from "@/components/TransactionForm";
import { PageHeader } from "@/components/PageHeader";
import { updateTransactionAction, deleteTransactionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = await getTransaction(id);
  if (!transaction) notFound();

  const allTransactions = await listTransactions();
  // Held tickers plus this transaction's own ticker, so it stays selectable
  // in the dropdown even if the position is now closed.
  const tickerOptions = [
    ...new Set([...computeHeldTickers(allTransactions.map(toDomainTransaction)), transaction.ticker]),
  ].sort();

  const boundUpdate = updateTransactionAction.bind(null, id);
  const boundDelete = deleteTransactionAction.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Editar transacción" backHref="/log" />

      <TransactionForm
        tickerOptions={tickerOptions}
        action={boundUpdate}
        submitLabel="Guardar cambios"
        cancelHref="/log"
        initial={{
          ticker: transaction.ticker,
          type: transaction.type as "BUY" | "SELL",
          tradeDate: transaction.tradeDate,
          arsPrice: transaction.arsPrice,
          qty: transaction.qty,
          cclRate: transaction.cclRate,
        }}
      />

      <form action={boundDelete}>
        <button
          type="submit"
          className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:border-red-400 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Eliminar transacción
        </button>
      </form>
    </div>
  );
}
