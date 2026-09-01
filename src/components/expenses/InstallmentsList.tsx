import { formatArs, formatUsd } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/expenses/labels";
import type { ActiveInstallment } from "@/lib/expenses/installments";

export function InstallmentsList({ items }: { items: ActiveInstallment[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">Cuotas activas</h2>
      <div className="flex flex-col gap-3">
        {items.slice(0, 10).map((it, i) => {
          const fmt = it.currency === "USD" ? formatUsd : formatArs;
          const progress = (it.installmentCurrent / it.installmentTotal) * 100;
          return (
            <div key={`${it.merchant}-${i}`}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{it.merchant}</span>
                <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                  cuota {it.installmentCurrent}/{it.installmentTotal}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="viz-mark h-full rounded-full"
                  style={{ width: `${progress}%`, "--viz-light": "#1baf7a", "--viz-dark": "#199e70" } as React.CSSProperties}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                <span>{fmt(it.amountPerInstallment)}/mes · {SOURCE_LABEL[it.source]}</span>
                <span>quedan {fmt(it.remainingAmount)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
