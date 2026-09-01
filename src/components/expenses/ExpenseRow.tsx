"use client";

import { useState, useTransition } from "react";
import { updateCategoryAction, deleteExpenseAction } from "@/app/(app)/gastos/movimientos/actions";
import { SOURCE_LABEL } from "@/lib/expenses/labels";
import { formatArs, formatDate, formatUsd } from "@/lib/format";
import type { DomainExpense } from "@/lib/expenses/types";

export function ExpenseRow({ expense, categories }: { expense: DomainExpense; categories: string[] }) {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState(expense.category);
  const fmt = expense.currency === "USD" ? formatUsd : formatArs;
  const isCredit = expense.amount < 0 || expense.kind === "refund" || expense.kind === "payment";

  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{expense.merchant}</span>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100"}`}>
          {fmt(expense.amount)}
        </span>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-400 dark:text-neutral-500">
        <span>{formatDate(expense.txDate)}</span>
        <span>· {SOURCE_LABEL[expense.source]}</span>
        {expense.installmentTotal && expense.installmentTotal > 1 && (
          <span>· cuota {expense.installmentCurrent}/{expense.installmentTotal}</span>
        )}
        {isCredit && <span className="text-emerald-600 dark:text-emerald-400">· reintegro</span>}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <select
          value={category}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value;
            setCategory(next);
            startTransition(() => updateCategoryAction(expense.id, next));
          }}
          className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Eliminar "${expense.merchant}"?`)) {
              startTransition(() => deleteExpenseAction(expense.id));
            }
          }}
          className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-400 hover:border-red-300 hover:text-red-500 dark:border-neutral-700"
          aria-label="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
