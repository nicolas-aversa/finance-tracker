import { listTransactions } from "@/lib/db/transactions";
import { requireUserId } from "@/lib/auth/session";
import { toDomainTransaction } from "@/lib/domain/types";
import { computeHeldTickers } from "@/lib/domain/dashboard";
import { TransactionForm } from "@/components/TransactionForm";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const userId = await requireUserId();
  const rows = await listTransactions(userId);
  const heldTickers = computeHeldTickers(rows.map(toDomainTransaction));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Cargar transacción" backHref="/" />
      <TransactionForm tickerOptions={heldTickers} cancelHref="/" />
    </div>
  );
}
