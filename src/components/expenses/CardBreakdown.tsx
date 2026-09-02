import { formatArs } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/expenses/labels";
import type { CardSlice } from "@/lib/expenses/aggregate";

export function CardBreakdown({ cards }: { cards: CardSlice[] }) {
  if (cards.length === 0) return null;
  const total = cards.reduce((s, c) => s + c.amountArs, 0);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">Gasto por tarjeta</h2>
      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <div key={c.source}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{SOURCE_LABEL[c.source]}</span>
              <span className="tabular-nums text-neutral-700 dark:text-neutral-300">{formatArs(c.amountArs)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="viz-mark h-full rounded-full" style={{ width: `${(c.amountArs / total) * 100}%`, "--viz-light": "#2a78d6", "--viz-dark": "#3987e5" } as React.CSSProperties} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
