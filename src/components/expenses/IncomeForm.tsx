"use client";

import { useActionState } from "react";
import { saveIncomeAction, type BudgetState } from "@/app/(app)/gastos/presupuestos/actions";
import { formatArs } from "@/lib/format";
import { monthDisplay } from "@/lib/expenses/months";

/** One row per month with data. Its own form, so saving one never touches another. */
export function IncomeForm({
  month,
  amountArs,
  spentArs,
}: {
  month: string;
  amountArs: number | null;
  spentArs: number;
}) {
  const [state, action, pending] = useActionState<BudgetState, FormData>(saveIncomeAction, undefined);

  return (
    <form action={action} className={`flex flex-col gap-1 ${pending ? "opacity-50" : ""}`}>
      <input type="hidden" name="month" value={month} />
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-sm font-medium capitalize text-neutral-900 dark:text-neutral-100">
          {monthDisplay(month)}
        </span>
        <input
          type="number"
          name="amount"
          inputMode="decimal"
          step="any"
          min="0"
          disabled={pending}
          defaultValue={amountArs ?? ""}
          placeholder="sin dato"
          aria-label={`Ingreso de ${monthDisplay(month)}`}
          className="money w-32 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-right text-sm tabular-nums text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-neutral-200 px-3 py-1 text-xs text-neutral-500 transition-colors hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-400"
        >
          Guardar
        </button>
      </div>
      <p className="money text-[11px] text-neutral-400 dark:text-neutral-500">
        {state?.error ? (
          <span className="text-red-500">{state.error}</span>
        ) : state?.ok ? (
          <span className="text-emerald-600 dark:text-emerald-400">{state.ok}</span>
        ) : (
          `gastaste ${formatArs(spentArs)}`
        )}
      </p>
    </form>
  );
}
